import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { hashPassword, verifyPassword } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  return NextResponse.json({
    status: "active",
    auth: "master_recovery_v2",
    updated_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const recoveryKey = String(body.recoveryKey || "").trim();
    const newPassword = String(body.newPassword || "").trim();

    if (!username || !recoveryKey || !newPassword) {
      return NextResponse.json(
        { detail: "Admin username, master recovery key, and new password are required." },
        { status: 400 }
      );
    }

    console.log(`[Admin Password Reset] Attempt initiated for user: ${username}`);
    if (newPassword.length < 8) {
      return NextResponse.json(
        { detail: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database service unavailable." }, { status: 503 });
    }

    const sql = getNeonSql();
    if (!sql) {
      return NextResponse.json({ detail: "Database connection failed." }, { status: 503 });
    }

    // Lookup user by username or email
    const users = await sql`
      SELECT id, username, email, role, account_type, recovery_key_hash
      FROM users
      WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${username})
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json({ detail: "Admin account not found." }, { status: 404 });
    }

    const user = users[0];
    const roleUpper = String(user.role || "").toUpperCase();
    const accountTypeUpper = String(user.account_type || "").toUpperCase();
    const usernameLower = String(user.username || "").toLowerCase();

    const isMasterAdmin =
      roleUpper === "SUPER_ADMIN" ||
      roleUpper === "ADMIN" ||
      accountTypeUpper === "MASTER_OWNER" ||
      usernameLower === "master_owner_usman";

    if (!isMasterAdmin) {
      return NextResponse.json(
        { detail: "Forbidden: Only Master Administrator accounts can use this recovery endpoint." },
        { status: 403 }
      );
    }

    // Cryptographic recovery key verification against DB hash or env
    const isRecoveryValid = user.recovery_key_hash
      ? verifyPassword(recoveryKey, user.recovery_key_hash)
      : (process.env.MASTER_RECOVERY_KEY && recoveryKey === process.env.MASTER_RECOVERY_KEY);

    if (!isRecoveryValid) {
      await logAccountAudit({
        clientId: user.id,
        action: "ADMIN_RECOVERY_KEY_FAILED",
        result: "FAILED",
        adminEmail: username,
        details: { reason: "Invalid recovery key provided" },
      });
      return NextResponse.json(
        { detail: "Invalid master recovery key." },
        { status: 401 }
      );
    }

    // Hash new password
    const newHash = hashPassword(newPassword);

    await sql`
      UPDATE users
      SET password_hash = ${newHash},
          updated_at = NOW()
      WHERE id = ${user.id}
    `;

    await logAccountAudit({
      clientId: user.id,
      action: "ADMIN_PASSWORD_RESET_SUCCESS",
      result: "SUCCESS",
      adminEmail: user.username || user.email,
      details: { method: "RECOVERY_KEY_RESET" },
    });

    return NextResponse.json({
      success: true,
      message: "Master Owner password has been successfully reset. You may now log in with your new password.",
    });
  } catch (err: any) {
    console.error("[Admin Password Reset] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to reset password." },
      { status: 500 }
    );
  }
}
