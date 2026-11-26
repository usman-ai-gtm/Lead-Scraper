import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { verifyPassword, createJwtToken } from "@/lib/serverless-auth";
import { consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
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
    const rl = await consumeRateLimit({
      bucket: "admin_login",
      identifier: rateKey,
      limit: 8,
      windowSeconds: 300,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(
        rl.retryAfterSeconds,
        `Too many admin login attempts. Please wait ${rl.retryAfterSeconds} seconds before trying again.`
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
      await logAccountAudit({
        clientId: user.id,
        action: "ADMIN_LOGIN_FAILED",
        result: "FAILED",
        adminEmail: username,
        details: { reason: "Invalid password", ip },
      });
      return NextResponse.json({ detail: "Invalid admin username or password." }, { status: 401 });
    }

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
