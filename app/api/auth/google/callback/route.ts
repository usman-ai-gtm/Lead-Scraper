import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { createJwtToken } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const stateRaw = url.searchParams.get("state");
  const origin = url.origin;

  if (error || !code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error || "Google sign-in was cancelled.")}`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI
    ? process.env.GOOGLE_GMAIL_REDIRECT_URI
    : isVercel
    ? "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback"
    : `${origin}/api/integrations/gmail/callback`;

  try {
    // 1. Exchange authorization code for Google tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      console.error("[Google OAuth Login] Token exchange error:", errJson);
      return NextResponse.redirect(`${origin}/login?error=Google+authentication+token+exchange+failed.`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // 2. Fetch authenticated Google profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=Failed+to+retrieve+Google+user+profile.`);
    }

    const profile = await profileRes.json();
    const email = String(profile.email || "").trim().toLowerCase();
    const fullName = String(profile.name || email.split("@")[0]).trim();
    const profileGoogleSub = String(profile.id || profile.sub || "").trim() || null;

    if (!email || !email.includes("@")) {
      return NextResponse.redirect(`${origin}/login?error=Invalid+email+returned+from+Google.`);
    }

    // 3. Authenticate against Authoritative Neon PostgreSQL
    if (!isNeonConfigured()) {
      return NextResponse.redirect(`${origin}/login?error=Database+service+unavailable.`);
    }

    const sql = getNeonSql();
    if (!sql) {
      return NextResponse.redirect(`${origin}/login?error=Database+connection+failed.`);
    }

    await Promise.all([
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_google_signin_at TIMESTAMPTZ`.catch(() => {}),
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_google_signin_at TIMESTAMPTZ`.catch(() => {}),
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT`.catch(() => {}),
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT`.catch(() => {}),
    ]);

    // Check if user exists by persistent google_sub first, then normalized email or username
    const users = await sql`
      SELECT id, email, username, full_name, role, account_type, workspace_id, status, plan,
             google_sub, COALESCE(session_version, 1) AS session_version
      FROM users
      WHERE (${profileGoogleSub}::text IS NOT NULL AND google_sub = ${profileGoogleSub}::text)
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
        return NextResponse.redirect(
          `${origin}/login?error=Your+account+has+been+suspended+or+revoked.+Please+contact+administrator+on+WhatsApp+(%2B923174383702).`
        );
      }
      activeUser = u;
    } else {
      // First-time Google login: Create separate FREE_PREVIEW account
      const nowIso = new Date().toISOString();
      const wsName = `${fullName}'s Workspace`;
      const uniqueWsName = `${wsName} #${Date.now().toString().slice(-4)}`;

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
            ${email}, ${email}, ${fullName}, ${assignedRole}, ${assignedAccountType}, ${workspaceId}, ${initialStatus},
            ${initialSubStatus}, ${nowIso}, 1, 'GOOGLE_PREVIEW_USER', 0, 0,
            ${initialPlan}, ${profileGoogleSub}, 'google', NOW(), NOW()
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
        console.warn("[Google Sign-in] Insert conflict handled, fetching existing user:", insertErr);
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
              ${safeUsername}, ${email}, ${fullName}, ${assignedRole}, ${assignedAccountType}, ${workspaceId}, ${initialStatus},
              ${initialSubStatus}, ${nowIso}, 1, 'GOOGLE_PREVIEW_USER', 0, 0,
              ${initialPlan}, ${profileGoogleSub}, 'google', NOW(), NOW()
            )
            RETURNING id, email, username, full_name, role, account_type, workspace_id, status, plan, active, is_active, COALESCE(session_version, 1) AS session_version
          `;
          activeUser = safeInsert[0];
        }
      }
    }

    // 4. Record exact UTC Google sign-in timestamps and generate signed session JWT token
    await sql`
      UPDATE users
      SET last_login = NOW(),
          last_activity_at = NOW(),
          google_sub = COALESCE(google_sub, ${profileGoogleSub}),
          auth_provider = COALESCE(auth_provider, 'google'),
          first_google_signin_at = COALESCE(first_google_signin_at, NOW()),
          last_google_signin_at = NOW()
      WHERE id = ${activeUser.id}
    `.catch(() => {});
    await logAccountAudit({
      adminId: activeUser.id,
      adminEmail: email,
      clientId: activeUser.id,
      clientEmail: email,
      workspaceId: activeUser.workspace_id,
      action: "USER_LOGIN_GOOGLE",
      details: { email },
    });

    const sessionToken = createJwtToken({
      sub: String(activeUser.id),
      email: activeUser.email,
      username: activeUser.username || email,
      account_type: activeUser.account_type || "FREE_PREVIEW",
      full_name: activeUser.full_name,
      role: activeUser.role,
      workspace_id: activeUser.workspace_id,
      status: activeUser.status,
      plan: activeUser.plan,
      sv: Number(activeUser.session_version) || 1,
    });

    const sessionPayload = encodeURIComponent(
      JSON.stringify({
        token: sessionToken,
        user: {
          id: activeUser.id,
          email: activeUser.email,
          full_name: activeUser.full_name,
          role: activeUser.role,
          workspace_id: activeUser.workspace_id,
        },
        workspace_id: activeUser.workspace_id,
      })
    );

    const redirectResponse = NextResponse.redirect(
      `${origin}/login?google_session=${sessionPayload}`
    );

    // Set secure HTTP-only cookie
    redirectResponse.cookies.set("usman_gtm_token", sessionToken, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      secure: isVercel,
      sameSite: "lax",
    });

    return redirectResponse;
  } catch (err: any) {
    console.error("[Google OAuth Callback] Unexpected error:", err);
    return NextResponse.redirect(`${origin}/login?error=An+unexpected+authentication+error+occurred.`);
  }
}
