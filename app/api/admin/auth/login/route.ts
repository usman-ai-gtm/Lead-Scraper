import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { verifyPassword, createJwtToken } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

// In-memory rate limiting map: identifier -> { count, firstFailedAt }
const failedAttempts = new Map<string, { count: number; firstFailedAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(key: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = failedAttempts.get(key);
  if (!record) return { allowed: true };

  if (now - record.firstFailedAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(key);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingMs = LOCKOUT_WINDOW_MS - (now - record.firstFailedAt);
    return { allowed: false, waitMinutes: Math.ceil(remainingMs / 60000) };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = failedAttempts.get(key);
  if (!record || now - record.firstFailedAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstFailedAt: now });
  } else {
    record.count += 1;
  }
}

function clearRateLimit(key: string) {
  failedAttempts.delete(key);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const origin = new URL(request.url).origin;
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || body.email || "").trim();
    const password = String(body.password || "").trim();
    const rememberMe = Boolean(body.rememberMe);

    if (!username || !password) {
      return NextResponse.json(
        { detail: "Admin username and password are required." },
        { status: 400 }
      );
    }

    const rateKey = `${ip}:${username.toLowerCase()}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { detail: `Too many failed login attempts. Please wait ${rateCheck.waitMinutes} minute(s) before trying again.` },
        { status: 429 }
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
      SELECT id, username, email, full_name, role, account_type, workspace_id, status, password_hash, tenant_id, plan,
             COALESCE(session_version, 1) AS session_version
      FROM users
      WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${username})
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      recordFailedAttempt(rateKey);
      await logAccountAudit({
        clientId: 0,
        action: "ADMIN_LOGIN_FAILED",
        result: "FAILED",
        adminEmail: username,
        details: { reason: "User not found", ip },
      });
      return NextResponse.json({ detail: "Invalid admin username or password." }, { status: 401 });
    }

    const user = users[0];

    // Strict RBAC: Must be SUPER_ADMIN, MASTER_OWNER, or master_owner_usman
    const roleUpper = String(user.role || "").toUpperCase();
    const accountTypeUpper = String(user.account_type || "").toUpperCase();
    const usernameLower = String(user.username || "").toLowerCase();
    const emailLower = String(user.email || "").toLowerCase();

    const isMasterAdmin =
      roleUpper === "SUPER_ADMIN" ||
      roleUpper === "ADMIN" ||
      accountTypeUpper === "MASTER_OWNER" ||
      usernameLower === "master_owner_usman" ||
      emailLower === "master_owner@usmanai.internal" ||
      emailLower === "transaction000501@gmail.com";

    if (!isMasterAdmin) {
      recordFailedAttempt(rateKey);
      await logAccountAudit({
        clientId: user.id,
        action: "ADMIN_LOGIN_FORBIDDEN",
        result: "FORBIDDEN",
        adminEmail: username,
        details: { reason: "Client attempted admin login", ip },
      });
      return NextResponse.json(
        { detail: "Access Denied: This portal is strictly restricted to the Master Administrator." },
        { status: 403 }
      );
    }

    // Verify password securely
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      recordFailedAttempt(rateKey);
      await logAccountAudit({
        clientId: user.id,
        action: "ADMIN_LOGIN_FAILED",
        result: "FAILED",
        adminEmail: username,
        details: { reason: "Invalid password", ip },
      });
      return NextResponse.json({ detail: "Invalid admin username or password." }, { status: 401 });
    }

    // Password verified! Clear failed attempts
    clearRateLimit(rateKey);

    // Record login audit log
    await logAccountAudit({
      clientId: user.id,
      action: "ADMIN_MANUAL_LOGIN_SUCCESS",
      result: "SUCCESS",
      adminEmail: user.username || user.email,
      details: { ip, authMethod: "MANUAL_CREDENTIALS" },
    });

    // Generate signed JWT
    const sessionToken = createJwtToken({
      sub: String(user.id),
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      role: "SUPER_ADMIN",
      account_type: "MASTER_OWNER",
      workspace_id: user.workspace_id || 1,
      tenant_id: user.tenant_id || 1,
      status: "ACTIVE",
      plan: "OWNER_LIFETIME",
      sv: Number(user.session_version) || 1,
    });

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      access_token: sessionToken,
      token_type: "bearer",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: "SUPER_ADMIN",
        account_type: "MASTER_OWNER",
        workspace_id: user.workspace_id || 1,
        status: "ACTIVE",
        plan: "OWNER_LIFETIME",
      },
      redirectUrl: "/app/admin/clients",
    });

    // Set secure HTTP-only cookie
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    response.cookies.set("usman_gtm_token", sessionToken, {
      path: "/",
      maxAge,
      secure: isVercel,
      httpOnly: true,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("[Admin Auth API] Unexpected error:", err);
    return NextResponse.json(
      { detail: "An error occurred during authentication. Please try again." },
      { status: 500 }
    );
  }
}
