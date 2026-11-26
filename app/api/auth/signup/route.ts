import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { createJwtToken, hashPassword } from "@/lib/serverless-auth";
import { createSystemNotification } from "@/lib/notifications-db";
import { consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));

    const fullName = String(body.full_name || body.fullName || "").trim();
    const rawUsername = String(body.username || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const rl = await consumeRateLimit({
      bucket: "public_signup",
      identifier: ip,
      limit: 10,
      windowSeconds: 900,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(
        rl.retryAfterSeconds,
        `Too many signup attempts. Please retry in ${rl.retryAfterSeconds} seconds.`
      );
    }

    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ detail: "Please enter your full name." }, { status: 400 });
    }
    if (!rawUsername || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(rawUsername)) {
      return NextResponse.json(
        {
          detail:
            "Username must be 3-32 characters (letters, numbers, '.', '-', or '_') and start with a letter or digit.",
        },
        { status: 400 }
      );
    }
    if (
      ["master_owner_usman", "admin", "superadmin", "administrator", "root", "owner"].includes(rawUsername)
    ) {
      return NextResponse.json({ detail: "That username is reserved. Please pick another username." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ detail: "Please provide a valid email address." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { detail: "Password must be at least 8 characters long." },
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

    // Reject duplicate username or email cleanly
    const dupCheck = await sql`
      SELECT id, username, email
      FROM users
      WHERE LOWER(username) = LOWER(${rawUsername})
         OR LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    if (dupCheck && dupCheck.length > 0) {
      return NextResponse.json(
        {
          detail:
            dupCheck[0].username?.toLowerCase() === rawUsername
              ? "This username is already taken. Please sign in or pick another username."
              : "An account with this email already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    // Create dedicated isolated workspace for the new customer
    const nowIso = new Date().toISOString();
    const wsName = `${fullName}'s Workspace #${Date.now().toString().slice(-4)}`;
    let workspaceId: number;
    try {
      const wsRes = await sql`
        INSERT INTO workspaces (name, created_at, tenant_id, description)
        VALUES (${wsName}, ${nowIso}, 1, 'Self-Service Registered Preview Workspace')
        RETURNING id
      `;
      workspaceId = Number(wsRes[0].id);
    } catch {
      const wsRes = await sql`
        INSERT INTO workspaces (name, created_at, tenant_id)
        VALUES (${`${wsName}-${Math.floor(Math.random() * 1000)}`}, ${nowIso}, 1)
        RETURNING id
      `;
      workspaceId = Number(wsRes[0].id);
    }

    const pwHash = hashPassword(password);
    // Strict security: public signup ALWAYS creates a locked/FREE_PREVIEW client account until Owner verifies payment
    const inserted = await sql`
      INSERT INTO users (
        username, email, full_name, role, account_type, workspace_id, status,
        subscription_status, plan, plan_type, plan_label, active, is_active,
        password_hash, hashed_password, tenant_id, google_maps_enabled,
        daily_email_limit, created_at, updated_at, session_version
      ) VALUES (
        ${rawUsername}, ${email}, ${fullName}, 'CLIENT', 'FREE_PREVIEW', ${workspaceId}, 'PREVIEW_ONLY',
        'FREE_PREVIEW', 'FREE_PREVIEW', 'FREE_PREVIEW', 'Free Preview Account', 0, 0,
        ${pwHash}, ${pwHash}, 1, FALSE,
        0, ${nowIso}, ${nowIso}, 1
      )
      RETURNING id, username, email, full_name, role, account_type, workspace_id, status, plan, plan_type, session_version
    `;

    const u = inserted[0];
    const token = createJwtToken({
      sub: String(u.id),
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      role: "CLIENT",
      account_type: "FREE_PREVIEW",
      workspace_id: workspaceId,
      tenant_id: 1,
      status: "PREVIEW_ONLY",
      plan: "FREE_PREVIEW",
      sv: Number(u.session_version || 1),
    });

    await logAccountAudit({
      adminId: Number(u.id),
      adminEmail: u.email,
      clientId: Number(u.id),
      clientEmail: u.email,
      workspaceId,
      action: "CUSTOMER_PUBLIC_SIGNUP",
      details: { username: u.username, account_type: "FREE_PREVIEW" },
    }).catch(() => {});

    await createSystemNotification({
      workspaceId: 1,
      userId: null,
      isAdminTarget: true,
      title: `New Customer Registered: ${u.username}`,
      message: `${u.full_name} (${u.username}) created a Free Preview workspace #${workspaceId} and may select a plan or upload payment proof soon.`,
      type: "info",
      category: "new_customer_signup",
      link: "/app/admin/clients",
      refType: "user",
      refId: String(u.id),
    }).catch(() => {});

    const res = NextResponse.json({
      status: "success",
      token,
      access_token: token,
      workspace_id: workspaceId,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        full_name: u.full_name,
        role: "CLIENT",
        account_type: "FREE_PREVIEW",
        workspace_id: workspaceId,
        status: "PREVIEW_ONLY",
        plan: "FREE_PREVIEW",
      },
      message: "Account created cleanly in Free Preview mode. Select Basic, Lifetime, or Custom plan to activate.",
    });

    res.cookies.set("usman_gtm_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return res;
  } catch (err: any) {
    console.error("[Signup POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
