import { NextResponse } from "next/server";
import { saveNeonGmailAccount, getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { createJwtToken } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

function getExactRedirectUri(request: Request): string {
  if (process.env.GOOGLE_GMAIL_REDIRECT_URI) {
    return process.env.GOOGLE_GMAIL_REDIRECT_URI;
  }
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return `${url.origin}/api/integrations/gmail/callback`;
  }
  return "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback";
}

function getAppBaseUrl(request: Request): string {
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return url.origin;
  }
  return "https://lead-scraper-mxs5.vercel.app";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const appBase = getAppBaseUrl(request);
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  // Parse state
  let stateAction = "gmail_connect";
  let workspaceId = 1;
  let userId = 1;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (decoded.action) stateAction = decoded.action;
      if (decoded.workspace_id) workspaceId = Number(decoded.workspace_id);
      if (decoded.user_id) userId = Number(decoded.user_id);
    } catch (e) {
      console.warn("[OAuth Callback] Failed to decode state token:", e);
    }
  }

  // Handle cancelled or failed auth
  if (error || !code) {
    const errorMsg = error || "Google authorization was cancelled or failed.";
    if (stateAction === "google_login") {
      return NextResponse.redirect(`${appBase}/login?error=${encodeURIComponent(errorMsg)}`);
    }
    return NextResponse.redirect(`${appBase}/app/accounts?status=error&message=${encodeURIComponent(errorMsg)}`);
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const redirectUri = getExactRedirectUri(request);

  try {
    // 1. Exchange authorization code for tokens
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
      console.error("[OAuth Callback] Token exchange failed:", errJson);
      const errText = errJson.error_description || "Google token exchange failed.";
      if (stateAction === "google_login") {
        return NextResponse.redirect(`${appBase}/login?error=${encodeURIComponent(errText)}`);
      }
      return NextResponse.redirect(`${appBase}/app/accounts?status=error&message=${encodeURIComponent(errText)}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // 2. Fetch authenticated Google profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      const msg = "Could not retrieve authenticated Google profile.";
      if (stateAction === "google_login") {
        return NextResponse.redirect(`${appBase}/login?error=${encodeURIComponent(msg)}`);
      }
      return NextResponse.redirect(`${appBase}/app/accounts?status=error&message=${encodeURIComponent(msg)}`);
    }

    const profile = await profileRes.json();
    const profileEmail = String(profile.email || "").trim().toLowerCase();
    const profileName = String(profile.name || profileEmail.split("@")[0]).trim();

    // ========================================================
    // CASE A: GOOGLE SIGN-IN / AUTHENTICATION FLOW
    // ========================================================
    if (stateAction === "google_login") {
      if (!isNeonConfigured()) {
        return NextResponse.redirect(`${appBase}/login?error=Database+service+unavailable.`);
      }
      const sql = getNeonSql();
      if (!sql) {
        return NextResponse.redirect(`${appBase}/login?error=Database+connection+failed.`);
      }

      const users = await sql`
        SELECT id, email, username, full_name, role, workspace_id, status
        FROM users
        WHERE LOWER(email) = LOWER(${profileEmail}) OR LOWER(username) = LOWER(${profileEmail})
        LIMIT 1
      `;

      const isOwner = [
        "admin@usmanai.com",
        "mu0602503@gmail.com",
        "admin@usmangtm.com",
        "selftest_founder_2026@usmanai.com",
        "transaction000001@gmail.com"
      ].includes(profileEmail);

      let activeUser: any = null;

      if (users && users.length > 0) {
        const u = users[0];
        const statusUpper = (u.status || "ACTIVE").toUpperCase();
        if (statusUpper === "SUSPENDED" || statusUpper === "REVOKED") {
          return NextResponse.redirect(
            `${appBase}/login?error=Your+account+has+been+suspended+or+revoked.+Please+contact+administrator+on+WhatsApp+(%2B923174383702).`
          );
        }
        activeUser = u;
      } else {
        // Automatically create isolated workspace for new client
        const nowIso = new Date().toISOString();
        const baseWsName = `${profileName}'s Workspace`;
        const uniqueWsName = `${baseWsName} #${Date.now().toString().slice(-4)}`;

        let newWsId: number;
        try {
          const wsRes = await sql`
            INSERT INTO workspaces (name, created_at, tenant_id, description)
            VALUES (${uniqueWsName}, ${nowIso}, 1, 'Google OAuth Workspace')
            RETURNING id, name
          `;
          newWsId = wsRes[0].id;
        } catch {
          const wsRes = await sql`
            INSERT INTO workspaces (name, created_at, tenant_id)
            VALUES (${`${uniqueWsName}-${Date.now()}`}, ${nowIso}, 1)
            RETURNING id, name
          `;
          newWsId = wsRes[0].id;
        }

        const assignedRole = isOwner ? 'ADMIN' : 'CLIENT';
        const initialStatus = isOwner ? 'ACTIVE' : 'LOCKED';

        try {
          const newUserRes = await sql`
            INSERT INTO users (username, email, full_name, role, workspace_id, status, created_at, tenant_id, password_hash)
            VALUES (${profileEmail}, ${profileEmail}, ${profileName}, ${assignedRole}, ${newWsId}, ${initialStatus}, ${nowIso}, 1, 'GOOGLE_OAUTH_USER')
            ON CONFLICT (username) DO UPDATE
              SET email = EXCLUDED.email,
                  full_name = COALESCE(users.full_name, EXCLUDED.full_name)
            RETURNING id, email, full_name, role, workspace_id, status
          `;
          activeUser = newUserRes[0];
        } catch (insertErr) {
          console.warn("[Google Sign-in] Insert conflict handled, fetching existing user:", insertErr);
          const fallbackUsers = await sql`
            SELECT id, email, username, full_name, role, workspace_id, status
            FROM users
            WHERE LOWER(email) = LOWER(${profileEmail}) OR LOWER(username) = LOWER(${profileEmail})
            LIMIT 1
          `;
          if (fallbackUsers && fallbackUsers.length > 0) {
            activeUser = fallbackUsers[0];
          } else {
            throw insertErr;
          }
        }
      }

      const sessionToken = createJwtToken({
        sub: String(activeUser.id),
        email: activeUser.email,
        full_name: activeUser.full_name,
        role: activeUser.role,
        workspace_id: activeUser.workspace_id,
        status: activeUser.status || "ACTIVE",
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
            status: activeUser.status || "ACTIVE",
          },
          workspace_id: activeUser.workspace_id,
        })
      );

      const redirectRes = NextResponse.redirect(
        `${appBase}/login?google_session=${sessionPayload}`
      );
      redirectRes.cookies.set("usman_gtm_token", sessionToken, {
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
        secure: isVercel,
        sameSite: "lax",
      });
      return redirectRes;
    }

    // ========================================================
    // CASE B: CLIENT GMAIL MAILBOX OUTREACH CONNECTION
    // ========================================================
    // Tokens are encrypted at rest with AES-256-GCM via saveNeonGmailAccount
    await saveNeonGmailAccount(workspaceId, {
      senderName: profileName,
      senderEmail: profileEmail,
      tokenData: tokens,
      dailyLimit: 500, // Standard free Gmail daily quota
    });

    return NextResponse.redirect(
      `${appBase}/app/accounts?status=connected&email=${encodeURIComponent(profileEmail)}`
    );
  } catch (err: any) {
    console.error("[OAuth Callback] Exception:", err);
    return NextResponse.redirect(
      `${appBase}/login?error=${encodeURIComponent(err.message || "An unexpected error occurred.")}`
    );
  }
}
