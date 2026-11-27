import { NextResponse } from "next/server";
import { saveNeonGmailAccount, getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { createJwtToken, verifyOAuthState, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { classifyGoogleOAuthError } from "@/lib/google-oauth-diagnostics";
import { resolveWorkspaceGmailOAuthCredentials } from "@/lib/platform-settings-db";

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

  // Parse & HMAC-verify state
  let stateAction = "gmail_connect";
  let workspaceId = 1;
  let userId = 1;
  let stateVerified = false;
  let stateOAuthSource: "shared" | "customer" = "shared";
  if (state) {
    const verified = verifyOAuthState(state, 60 * 60 * 1000);
    if (verified) {
      stateVerified = true;
      if (verified.action) stateAction = String(verified.action);
      if (verified.workspace_id) workspaceId = Number(verified.workspace_id);
      if (verified.user_id) userId = Number(verified.user_id);
      if (verified.oauth_source === "customer") stateOAuthSource = "customer";
    } else {
      // Allow legacy unsigned payload ONLY for read-only login flow (never elevate gmail_connect)
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
        if (decoded.action === "google_login") {
          stateAction = "google_login";
        }
      } catch (e) {
        console.warn("[OAuth Callback] Invalid OAuth state token:", e);
      }
    }
  }

  // Handle cancelled or failed auth
  if (error || !code) {
    const rawErr = String(error || "consent_cancelled");
    const rawDesc = String(url.searchParams.get("error_description") || "");
    const diag = classifyGoogleOAuthError(
      rawErr === "access_denied" ? (rawDesc || "access_denied") : rawErr,
      rawDesc,
      "callback"
    );
    const errorCode = diag.code;
    const errorMsg = `${diag.headline} ${diag.nextAction}`;
    if (stateAction === "gmail_connect" && userId > 0) {
      await logAccountAudit({
        adminId: userId,
        adminEmail: "oauth_callback",
        clientId: userId,
        workspaceId,
        action: "GMAIL_CONNECT_FAILED",
        result: "FAILED",
        details: { error_code: errorCode, raw_error: rawErr, reason: errorMsg },
      }).catch(() => {});
    }
    if (stateAction === "google_login") {
      return NextResponse.redirect(`${appBase}/login?error=${encodeURIComponent(errorMsg)}`);
    }
    return NextResponse.redirect(
      `${appBase}/app/accounts?status=error&error_code=${encodeURIComponent(errorCode)}&message=${encodeURIComponent(errorMsg)}`
    );
  }

  if (stateAction !== "google_login" && (!stateVerified || workspaceId <= 0 || userId <= 0)) {
    return NextResponse.redirect(
      `${appBase}/app/accounts?status=error&error_code=invalid_state&message=${encodeURIComponent(
        "Invalid or expired Gmail OAuth security state. Please retry connecting Gmail from your dashboard."
      )}`
    );
  }

  const resolvedCreds =
    stateAction === "google_login"
      ? await resolveWorkspaceGmailOAuthCredentials(0, "shared")
      : await resolveWorkspaceGmailOAuthCredentials(workspaceId, stateOAuthSource);
  const clientId = resolvedCreds.clientId;
  const clientSecret = resolvedCreds.clientSecret;
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
      console.error("[OAuth Callback] Token exchange failed:", errJson?.error || tokenRes.status);
      const diag = classifyGoogleOAuthError(errJson?.error, errJson?.error_description, "token_exchange");
      const errText = `${diag.headline} ${diag.nextAction}`;
      if (stateAction === "google_login") {
        return NextResponse.redirect(`${appBase}/login?error=${encodeURIComponent(errText)}`);
      }
      return NextResponse.redirect(
        `${appBase}/app/accounts?status=error&error_code=${encodeURIComponent(diag.code)}&message=${encodeURIComponent(errText)}`
      );
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
        SELECT id, email, username, full_name, role, account_type, workspace_id, status, plan,
               COALESCE(session_version, 1) AS session_version
        FROM users
        WHERE LOWER(email) = LOWER(${profileEmail}) OR LOWER(username) = LOWER(${profileEmail})
        LIMIT 1
      `;

      const isOwner = [
        "transaction000501@gmail.com",
        "admin@usmanai.com",
        "mu0602503@gmail.com",
        "admin@usmangtm.com",
        "selftest_founder_2026@usmanai.com"
      ].includes(profileEmail);

      let activeUser: any = null;

      if (users && users.length > 0) {
        const u = users[0];
        const statusUpper = (u.status || "ACTIVE").toUpperCase();
        if (!isOwner && (statusUpper === "SUSPENDED" || statusUpper === "REVOKED")) {
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

        const assignedRole = isOwner ? "SUPER_ADMIN" : "CLIENT";
        const assignedAccountType = isOwner ? "MASTER_OWNER" : "FREE_PREVIEW";
        const initialStatus = isOwner ? "ACTIVE" : "PREVIEW_ONLY";
        const initialSubStatus = isOwner ? "PERMANENT" : "FREE_PREVIEW";
        const initialPlan = isOwner ? "OWNER_LIFETIME" : "FREE_PREVIEW";

        try {
          const newUserRes = await sql`
            INSERT INTO users (username, email, full_name, role, account_type, workspace_id, status, subscription_status, created_at, tenant_id, password_hash, active, is_active, plan)
            VALUES (${profileEmail}, ${profileEmail}, ${profileName}, ${assignedRole}, ${assignedAccountType}, ${newWsId}, ${initialStatus}, ${initialSubStatus}, ${nowIso}, 1, 'GOOGLE_OAUTH_USER', ${isOwner ? 1 : 0}, ${isOwner ? 1 : 0}, ${initialPlan})
            ON CONFLICT (username) DO UPDATE
              SET email = EXCLUDED.email,
                  full_name = COALESCE(users.full_name, EXCLUDED.full_name)
            RETURNING id, email, username, full_name, role, account_type, workspace_id, status, plan, active, is_active, COALESCE(session_version, 1) AS session_version
          `;
          activeUser = newUserRes[0];
        } catch (insertErr) {
          console.warn("[Google Sign-in] Insert conflict handled, fetching existing user:", insertErr);
          const fallbackUsers = await sql`
            SELECT id, email, username, full_name, role, account_type, workspace_id, status, plan, active, is_active
            FROM users
            WHERE TRIM(LOWER(email)) = TRIM(LOWER(${profileEmail})) OR TRIM(LOWER(username)) = TRIM(LOWER(${profileEmail}))
            LIMIT 1
          `;
          if (fallbackUsers && fallbackUsers.length > 0) {
            activeUser = fallbackUsers[0];
          } else {
            // Safe fallback collision-free username
            const safeUsername = `${profileEmail.split('@')[0]}_${Date.now()}@google.user`;
            const safeInsert = await sql`
              INSERT INTO users (username, email, full_name, role, account_type, workspace_id, status, subscription_status, created_at, tenant_id, password_hash, active, is_active, plan)
              VALUES (${safeUsername}, ${profileEmail}, ${profileName}, ${assignedRole}, ${assignedAccountType}, ${newWsId}, ${initialStatus}, ${initialSubStatus}, ${nowIso}, 1, 'GOOGLE_OAUTH_USER', ${isOwner ? 1 : 0}, ${isOwner ? 1 : 0}, ${initialPlan})
              RETURNING id, email, full_name, role, account_type, workspace_id, status, plan, active, is_active
            `;
            activeUser = safeInsert[0];
          }
        }
      }

      // Permanent Master Owner Sync Guarantee
      if (isOwner && activeUser) {
        activeUser.role = "SUPER_ADMIN";
        activeUser.account_type = "MASTER_OWNER";
        activeUser.status = "ACTIVE";
        activeUser.plan = "OWNER_LIFETIME";
        try {
          await sql`
            UPDATE users
            SET role = 'SUPER_ADMIN', account_type = 'MASTER_OWNER', status = 'ACTIVE', plan = 'OWNER_LIFETIME', subscription_status = 'PERMANENT', subscription_expires_at = NULL, active = 1, is_active = 1
            WHERE id = ${activeUser.id}
          `;
        } catch (e) {
          console.warn("Owner DB sync warning:", e);
        }
      }

      await sql`
        UPDATE users SET last_login = NOW(), last_activity_at = NOW() WHERE id = ${activeUser.id}
      `.catch(() => {});
      await logAccountAudit({
        adminId: activeUser.id,
        adminEmail: activeUser.email,
        clientId: activeUser.id,
        clientEmail: activeUser.email,
        workspaceId: activeUser.workspace_id,
        action: "USER_LOGIN_GOOGLE",
        details: { email: profileEmail, account_type: activeUser.account_type || "FREE_PREVIEW" },
      });

      const sessionToken = createJwtToken({
        sub: String(activeUser.id),
        email: activeUser.email,
        username: activeUser.username || profileEmail,
        account_type: activeUser.account_type || "FREE_PREVIEW",
        full_name: activeUser.full_name,
        role: activeUser.role,
        workspace_id: activeUser.workspace_id,
        status: activeUser.status || "ACTIVE",
        plan: activeUser.plan || "FREE_PREVIEW",
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
    // Verify workspace matches userId from authoritative DB before persisting tokens
    const sqlCheck = getNeonSql();
    let authoritativeWsId = workspaceId;
    if (sqlCheck) {
      const ownerRows = await sqlCheck.query(
        "SELECT id, username, email, role, account_type, workspace_id, status FROM users WHERE id = $1 LIMIT 1",
        [userId]
      );
      if (!ownerRows || ownerRows.length === 0) {
        return NextResponse.redirect(
          `${appBase}/app/accounts?status=error&error_code=invalid_user&message=${encodeURIComponent("User account not found.")}`
        );
      }
      authoritativeWsId = Number(ownerRows[0].workspace_id) || workspaceId;
      const subGate = await verifyClientActiveSubscription(
        { ...ownerRows[0], _skipSessionVersionCheck: true },
        "cold_email"
      );
      if (!subGate.allowed) {
        return NextResponse.redirect(
          `${appBase}/app/accounts?status=error&error_code=subscription_inactive&message=${encodeURIComponent(subGate.message || "Active subscription required to connect Gmail.")}`
        );
      }
    }

    // Tokens are encrypted at rest with AES-256-GCM via saveNeonGmailAccount (refresh_token preserved across re-consents)
    const savedAccount = await saveNeonGmailAccount(authoritativeWsId, {
      senderName: profileName,
      senderEmail: profileEmail,
      tokenData: { ...tokens, oauth_client_source: stateOAuthSource },
      dailyLimit: 500, // Standard free Gmail daily quota
    });

    await logAccountAudit({
      adminId: userId,
      adminEmail: profileEmail,
      clientId: userId,
      clientEmail: profileEmail,
      workspaceId: authoritativeWsId,
      action: "GMAIL_CONNECT",
      details: {
        sender_email: profileEmail,
        account_id: savedAccount?.id || null,
        has_refresh_token: Boolean(tokens.refresh_token),
        scopes_granted: tokens.scope || "gmail.send userinfo.email",
      },
    });

    return NextResponse.redirect(
      `${appBase}/app/accounts?status=connected&email=${encodeURIComponent(profileEmail)}`
    );
  } catch (err: any) {
    console.error("[OAuth Callback] Exception:", err);
    if (stateAction === "google_login") {
      return NextResponse.redirect(
        `${appBase}/login?error=${encodeURIComponent("Google authentication could not be completed. Please try again or contact WhatsApp (+923174383702).")}`
      );
    }
    return NextResponse.redirect(
      `${appBase}/app/accounts?status=error&error_code=oauth_exception&message=${encodeURIComponent(err?.message || "Failed to connect Gmail account.")}`
    );
  }
}
