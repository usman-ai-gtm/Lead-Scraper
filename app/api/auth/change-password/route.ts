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

export async function POST(req: Request) {
  try {
    const currentUser = getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ detail: "Invalid or expired token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const oldPassword = String(body.old_password || "");
    const newPassword = String(body.new_password || "");
    if (!oldPassword || newPassword.length < 8) {
      return NextResponse.json(
        { detail: "New password must be at least 8 characters long" },
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
          return NextResponse.json({ detail: "User account not found" }, { status: 404 });
        }
        const u = rows[0];
        const tokenSv = currentUser.sv != null ? Number(currentUser.sv) : 1;
        if (tokenSv !== Number(u.session_version || 1)) {
          return NextResponse.json({ detail: "Session invalidated. Please sign in again." }, { status: 401 });
        }
        if (!verifyPassword(oldPassword, u.password_hash)) {
          return NextResponse.json({ detail: "Current password is incorrect" }, { status: 400 });
        }
        const newHash = hashPassword(newPassword);
        const updRows = await sql.query(
          `UPDATE users
           SET password_hash = $1,
               must_change_password = FALSE,
               session_version = COALESCE(session_version, 1) + 1,
               updated_at = $2
           WHERE id = $3
           RETURNING COALESCE(session_version, 1) AS session_version`,
          [newHash, new Date().toISOString(), u.id]
        );
        const nextSv = Number(updRows?.[0]?.session_version || Number(u.session_version || 1) + 1);
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
          message: "Password updated successfully",
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

    const ok = changeServerlessUserPassword(currentUser.email, oldPassword, newPassword);
    if (!ok) {
      return NextResponse.json({ detail: "Current password is incorrect" }, { status: 400 });
    }
    return NextResponse.json({ status: "success", message: "Password updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to update password" }, { status: 400 });
  }
}

