import { NextResponse } from "next/server";
import crypto from "crypto";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { hashPassword } from "@/lib/serverless-auth";
import { consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await consumeRateLimit({
      bucket: "reset_password",
      identifier: ip,
      limit: 10,
      windowSeconds: 900,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const newPassword = String(body.new_password || "");

    if (!token || token.length < 32 || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { detail: "Valid reset token and new password (minimum 8 characters) are required." },
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

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const rows = await sql.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { detail: "Invalid or expired password reset token." },
        { status: 400 }
      );
    }

    const rec = rows[0];
    const newHash = hashPassword(newPassword);

    await sql.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = FALSE,
           session_version = COALESCE(session_version, 1) + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [newHash, rec.user_id]
    );

    await sql.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [rec.id]
    );

    await logAccountAudit({
      clientId: Number(rec.user_id),
      action: "PASSWORD_RESET_COMPLETED",
      result: "SUCCESS",
      details: { ip },
    }).catch(() => {});

    return NextResponse.json({
      status: "success",
      message: "Password updated successfully. You may now sign in with your new credentials.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Unable to reset password at this time." },
      { status: 400 }
    );
  }
}
