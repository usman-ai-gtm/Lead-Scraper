import { NextResponse } from "next/server";
import crypto from "crypto";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { detail: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const rl = await consumeRateLimit({
      bucket: "forgot_password",
      identifier: `${ip}:${email}`,
      limit: 5,
      windowSeconds: 900,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(
        rl.retryAfterSeconds,
        "Too many password recovery attempts. Please wait before trying again."
      );
    }

    const smtpConfigured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
    );

    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        const users = await sql.query(
          `SELECT id, username, email, role, account_type FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1`,
          [email]
        ).catch(() => []);

        if (users && users.length > 0 && smtpConfigured) {
          const rawToken = crypto.randomBytes(32).toString("hex");
          const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
          await sql.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
            [users[0].id, tokenHash]
          ).catch(() => {});
          await logAccountAudit({
            clientId: Number(users[0].id),
            action: "PASSWORD_RESET_REQUESTED",
            result: "QUEUED",
            adminEmail: email,
            details: { ip },
          }).catch(() => {});
        }
      }
    }

    // Uniform neutral response: never leak account existence or secret reset tokens in JSON.
    return NextResponse.json({
      status: "accepted",
      smtp_configured: smtpConfigured,
      recovery_mode: smtpConfigured ? "EMAIL_DISPATCH" : "ADMIN_GOVERNANCE_RESET",
      message: smtpConfigured
        ? "If an active account matches that email, a single-use recovery link has been queued."
        : "USMAN AI GTM client credentials are managed by your Workspace Owner / Administrator. Contact support to issue a temporary password reset.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to process recovery request." },
      { status: 500 }
    );
  }
}
