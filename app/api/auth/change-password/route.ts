import { NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hashPassword,
  verifyPassword,
  createJwtToken,
  changeServerlessUserPassword,
} from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

const COMMON_WEAK_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwertyui",
  "admin123",
  "welcome123",
  "letmein123",
  "iloveyou",
  "changeme",
]);

function validateNewPasswordPolicy(
  newPassword: string,
  username?: string,
  oldPassword?: string
): string | null {
  if (!newPassword || newPassword.length < 8) {
    return "New password must be at least 8 characters long.";
  }
  if (newPassword.length > 128) {
    return "New password must be 128 characters or fewer.";
  }
  if (/^\s|\s$/.test(newPassword)) {
    return "New password cannot start or end with spaces.";
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(newPassword)) {
    return "New password must include letters plus at least one number or special character.";
  }
  const lower = newPassword.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lower)) {
    return "That password is too common. Please choose a stronger password.";
  }
  if (username && username.length >= 3 && lower.includes(username.toLowerCase())) {
    return "New password cannot contain your username.";
  }
  if (oldPassword && newPassword === oldPassword) {
    return "New password must be different from your current password.";
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const currentUser = getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ detail: "Authentication required. Please sign in again." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const oldPassword = String(body.old_password || "");
    const newPassword = String(body.new_password || "");
    const confirmPassword = body.confirm_password !== undefined ? String(body.confirm_password) : newPassword;

    if (!oldPassword) {
      return NextResponse.json(
        { detail: "Current password is required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { detail: "New password and confirmation password do not match." },
        { status: 400 }
      );
    }

    const userId = Number(currentUser.id || currentUser.sub) || 0;
    if (isNeonConfigured() && userId > 0) {
      const sql = getNeonSql();
      if (sql) {
        const rows = await sql.query(
          `SELECT id, username, email, full_name, role, account_type, workspace_id, tenant_id, status, password_hash, COALESCE(session_version, 1) AS session_version
           FROM users WHERE id = $1 LIMIT 1`,
          [userId]
        );
        if (!rows || rows.length === 0) {
          return NextResponse.json({ detail: "User account not found." }, { status: 404 });
        }
        const u = rows[0];
        const tokenSv = currentUser.sv != null ? Number(currentUser.sv) : 1;
        if (tokenSv !== Number(u.session_version || 1)) {
          return NextResponse.json({ detail: "Session invalidated. Please sign in again." }, { status: 401 });
        }

        if (u.password_hash === "GOOGLE_PREVIEW_USER" || !u.password_hash) {
          return NextResponse.json(
            {
              detail:
                "This account uses Google Sign-In without a local password. Contact the Workspace Owner if you need local password credentials.",
            },
            { status: 400 }
          );
        }

        if (!verifyPassword(oldPassword, u.password_hash)) {
          return NextResponse.json({ detail: "Current password is incorrect." }, { status: 400 });
        }

        const policyErr = validateNewPasswordPolicy(newPassword, String(u.username || ""), oldPassword);
        if (policyErr) {
          return NextResponse.json({ detail: policyErr }, { status: 400 });
        }

        const newHash = hashPassword(newPassword);
        const updRows = await sql.query(
          `UPDATE users
           SET password_hash = $1,
               hashed_password = $1,
               must_change_password = FALSE,
               session_version = COALESCE(session_version, 1) + 1,
               updated_at = $2
           WHERE id = $3
           RETURNING id, password_hash, COALESCE(session_version, 1) AS session_version`,
          [newHash, new Date().toISOString(), u.id]
        );

        const verifiedRow = updRows?.[0];
        if (!verifiedRow || !verifyPassword(newPassword, verifiedRow.password_hash)) {
          return NextResponse.json(
            { detail: "Password update could not be verified in database. Please retry." },
            { status: 500 }
          );
        }

        const nextSv = Number(verifiedRow.session_version || Number(u.session_version || 1) + 1);
        await logAccountAudit({
          adminId: u.id,
          adminEmail: u.username || u.email || "user",
          clientId: u.id,
          clientEmail: u.email || u.username || "",
          workspaceId: u.workspace_id || 1,
          action: "USER_CHANGE_PASSWORD",
          details: { self_updated: true, session_version: nextSv },
        });

        const nextToken = createJwtToken({
          sub: String(u.id),
          email: u.email,
          username: u.username,
          full_name: u.full_name,
          role: u.role || "CLIENT",
          account_type: u.account_type || "PAID_CLIENT",
          workspace_id: u.workspace_id || 1,
          tenant_id: u.tenant_id || 1,
          status: u.status || "ACTIVE",
          sv: nextSv,
        });

        const response = NextResponse.json({
          status: "success",
          access_token: nextToken,
          token: nextToken,
          session_version: nextSv,
          message: "Password updated successfully. Your other active sessions have been signed out.",
        });
        response.cookies.set("usman_gtm_token", nextToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
        return response;
      }
    }

    const policyErr = validateNewPasswordPolicy(newPassword, currentUser.email, oldPassword);
    if (policyErr) {
      return NextResponse.json({ detail: policyErr }, { status: 400 });
    }
    const ok = changeServerlessUserPassword(currentUser.email, oldPassword, newPassword);
    if (!ok) {
      return NextResponse.json({ detail: "Current password is incorrect." }, { status: 400 });
    }
    return NextResponse.json({ status: "success", message: "Password updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to update password" }, { status: 400 });
  }
}
