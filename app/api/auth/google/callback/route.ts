import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
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
  const redirectUri = isVercel
    ? "https://lead-scraper-mxs5.vercel.app/api/auth/google/callback"
    : `${origin}/api/auth/google/callback`;

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
    const picture = profile.picture || "";

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

    // Check if user exists
    const users = await sql`
      SELECT id, email, username, full_name, role, workspace_id, status
      FROM users
      WHERE LOWER(email) = LOWER(${email}) OR LOWER(username) = LOWER(${email})
      LIMIT 1
    `;

    const isOwner = [
      "admin@usmanai.com",
      "mu0602503@gmail.com",
      "admin@usmangtm.com",
      "selftest_founder_2026@usmanai.com",
      "transaction000001@gmail.com"
    ].includes(email);

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
      // First-time Google login: Provision brand new, completely empty isolated workspace
      const nowIso = new Date().toISOString();
      const wsName = `${fullName}'s Workspace`;
      const uniqueWsName = `${wsName} #${Date.now().toString().slice(-4)}`;

      let workspaceId: number;
      try {
        const wsRes = await sql`
          INSERT INTO workspaces (name, created_at, tenant_id, description)
          VALUES (${uniqueWsName}, ${nowIso}, 1, 'Google OAuth Workspace')
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

      const assignedRole = isOwner ? 'ADMIN' : 'CLIENT';
      const initialStatus = isOwner ? 'ACTIVE' : 'LOCKED';

      const newUserRes = await sql`
        INSERT INTO users (username, email, full_name, role, workspace_id, status, created_at, tenant_id, password_hash)
        VALUES (${email}, ${email}, ${fullName}, ${assignedRole}, ${workspaceId}, ${initialStatus}, ${nowIso}, 1, 'GOOGLE_OAUTH_USER')
        ON CONFLICT (username) DO UPDATE
          SET email = EXCLUDED.email,
              full_name = COALESCE(users.full_name, EXCLUDED.full_name)
        RETURNING id, email, full_name, role, workspace_id, status
      `;
      activeUser = newUserRes[0];
    }

    // 4. Generate signed session JWT token
    const sessionToken = createJwtToken({
      sub: String(activeUser.id),
      email: activeUser.email,
      full_name: activeUser.full_name,
      role: activeUser.role,
      workspace_id: activeUser.workspace_id,
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
