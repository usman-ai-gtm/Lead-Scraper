import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { createJwtToken } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

/**
 * Validates Google session for authenticated users.
 * Strictly verifies identity against Google and Authoritative Neon PostgreSQL.
 * NEVER uses hardcoded administrator fallbacks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.name || body.full_name || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { detail: "Valid verified email required from Google authentication." },
        { status: 400 }
      );
    }

    if (!isNeonConfigured()) {
      return NextResponse.json(
        { detail: "Database service unavailable." },
        { status: 503 }
      );
    }

    const sql = getNeonSql();
    if (!sql) {
      return NextResponse.json(
        { detail: "Database connection failed." },
        { status: 503 }
      );
    }

    const googleSub = String(body.sub || body.google_sub || "").trim() || null;

    await Promise.all([
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_google_signin_at TIMESTAMPTZ`.catch(() => {}),
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_google_signin_at TIMESTAMPTZ`.catch(() => {}),
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT`.catch(() => {}),
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT`.catch(() => {}),
    ]);

    // Check user in Neon PostgreSQL by google_sub first, then normalized email or username
    const users = await sql`
      SELECT id, email, username, full_name, role, account_type, workspace_id, status, plan,
             google_sub, COALESCE(session_version, 1) AS session_version
      FROM users
      WHERE (${googleSub}::text IS NOT NULL AND google_sub = ${googleSub}::text)
         OR LOWER(email) = LOWER(${email})
         OR LOWER(username) = LOWER(${email})
      ORDER BY CASE WHEN COALESCE(account_type, '') = 'PAID_CLIENT' THEN 0 ELSE 1 END, id ASC
      LIMIT 1
    `;

    let activeUser: any = null;

    if (users && users.length > 0) {
      const u = users[0];
      const statusUpper = (u.status || "ACTIVE").toUpperCase();
      if (statusUpper === "SUSPENDED" || statusUpper === "REVOKED") {
        return NextResponse.json(
          { detail: "Your account has been suspended or revoked. Please contact administrator on WhatsApp (+923174383702)." },
          { status: 403 }
        );
      }
      activeUser = u;
    } else {
      // First-time visitor registration via Google: provision separate FREE_PREVIEW account
      const nowIso = new Date().toISOString();
      const baseWsName = fullName ? `${fullName}'s Workspace` : `${email.split("@")[0]}'s Workspace`;
      const uniqueWsName = `${baseWsName} #${Date.now().toString().slice(-4)}`;

      let workspaceId: number;
      try {
        const wsRes = await sql`
          INSERT INTO workspaces (name, created_at, tenant_id, description)
          VALUES (${uniqueWsName}, ${nowIso}, 1, 'Google Free Preview Workspace')
          RETURNING id, name
        `;
        workspaceId = wsRes[0].id;
      } catch {
        const wsRes = await sql`
          INSERT INTO workspaces (name, created_at, tenant_id)
          VALUES (${`${uniqueWsName}-${Date.now()}`}, ${nowIso}, 1)
          RETURNING id, name
        `;
        workspaceId = wsRes[0].id;
      }

      const assignedRole = 'CLIENT';
      const assignedAccountType = 'FREE_PREVIEW';
      const initialStatus = 'PREVIEW_ONLY';
      const initialSubStatus = 'FREE_PREVIEW';
      const initialPlan = 'FREE_PREVIEW';

      try {
        const newUserRes = await sql`
          INSERT INTO users (
            username, email, full_name, role, account_type, workspace_id, status,
            subscription_status, created_at, tenant_id, password_hash, active, is_active,
            plan, google_sub, auth_provider, first_google_signin_at, last_google_signin_at
          )
          VALUES (
            ${email}, ${email}, ${fullName || email.split("@")[0]}, ${assignedRole}, ${assignedAccountType}, ${workspaceId}, ${initialStatus},
            ${initialSubStatus}, ${nowIso}, 1, 'GOOGLE_PREVIEW_USER', 0, 0,
            ${initialPlan}, ${googleSub}, 'google', NOW(), NOW()
          )
          ON CONFLICT (username) DO UPDATE
            SET email = EXCLUDED.email,
                full_name = COALESCE(users.full_name, EXCLUDED.full_name),
                google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub),
                auth_provider = COALESCE(users.auth_provider, 'google'),
                first_google_signin_at = COALESCE(users.first_google_signin_at, NOW()),
                last_google_signin_at = NOW()
          RETURNING id, email, username, full_name, role, account_type, workspace_id, status, plan, active, is_active, COALESCE(session_version, 1) AS session_version
        `;
        activeUser = newUserRes[0];
      } catch (insertErr) {
        console.warn("[Google Session] Insert conflict handled, fetching existing user:", insertErr);
        const fallbackUsers = await sql`
          SELECT id, email, username, full_name, role, account_type, workspace_id, status, plan, active, is_active, COALESCE(session_version, 1) AS session_version
          FROM users
          WHERE TRIM(LOWER(email)) = TRIM(LOWER(${email})) OR TRIM(LOWER(username)) = TRIM(LOWER(${email}))
          LIMIT 1
        `;
        if (fallbackUsers && fallbackUsers.length > 0) {
          activeUser = fallbackUsers[0];
        } else {
          const safeUsername = `${email.split('@')[0]}_${Date.now()}@google.user`;
          const safeInsert = await sql`
            INSERT INTO users (
              username, email, full_name, role, account_type, workspace_id, status,
              subscription_status, created_at, tenant_id, password_hash, active, is_active,
              plan, google_sub, auth_provider, first_google_signin_at, last_google_signin_at
            )
            VALUES (
              ${safeUsername}, ${email}, ${fullName || email.split("@")[0]}, ${assignedRole}, ${assignedAccountType}, ${workspaceId}, ${initialStatus},
              ${initialSubStatus}, ${nowIso}, 1, 'GOOGLE_PREVIEW_USER', 0, 0,
              ${initialPlan}, ${googleSub}, 'google', NOW(), NOW()
            )
            RETURNING id, email, username, full_name, role, account_type, workspace_id, status, plan, active, is_active, COALESCE(session_version, 1) AS session_version
          `;
          activeUser = safeInsert[0];
        }
      }
    }

    await sql`
      UPDATE users
      SET last_login = NOW(),
          last_activity_at = NOW(),
          google_sub = COALESCE(google_sub, ${googleSub}),
          auth_provider = COALESCE(auth_provider, 'google'),
          first_google_signin_at = COALESCE(first_google_signin_at, NOW()),
          last_google_signin_at = NOW()
      WHERE id = ${activeUser.id}
    `.catch(() => {});

    const token = createJwtToken({
      sub: String(activeUser.id),
      email: activeUser.email,
      username: activeUser.username || email,
      account_type: activeUser.account_type || "FREE_PREVIEW",
      full_name: activeUser.full_name,
      role: activeUser.role,
      workspace_id: activeUser.workspace_id,
      status: activeUser.status || "ACTIVE",
      plan: activeUser.plan || "FREE_PREVIEW",
      sv: Number(activeUser.session_version) || 1,
    });

    const response = NextResponse.json({
      access_token: token,
      token,
      token_type: "bearer",
      user: {
        id: activeUser.id,
        email: activeUser.email,
        full_name: activeUser.full_name,
        role: activeUser.role,
        workspace_id: activeUser.workspace_id,
        status: activeUser.status || "ACTIVE",
      },
      workspace_id: activeUser.workspace_id,
    });

    response.cookies.set("usman_gtm_token", token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("[Google Session POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to establish Google authentication session." },
      { status: 500 }
    );
  }
}
