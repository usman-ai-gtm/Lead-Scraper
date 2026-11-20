import { NextResponse } from "next/server";
import { saveNeonGmailAccount } from "@/lib/neon-db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const origin = url.origin;

  if (error || !code) {
    const errorMsg = error || "Google authorization was cancelled or failed.";
    return NextResponse.redirect(`${origin}/app/settings?tab=gmail&status=error&message=${encodeURIComponent(errorMsg)}`);
  }

  // Parse state to identify workspace
  let workspaceId = 1;
  let userId = 1;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (decoded.workspace_id) workspaceId = Number(decoded.workspace_id);
      if (decoded.user_id) userId = Number(decoded.user_id);
    } catch (e) {
      console.warn("[Gmail Callback] Failed to decode state token:", e);
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI || `${origin}/api/integrations/gmail/callback`;

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
      console.error("[Gmail OAuth] Token exchange failed:", errJson);
      return NextResponse.redirect(
        `${origin}/app/settings?tab=gmail&status=error&message=${encodeURIComponent(
          errJson.error_description || "Google token exchange failed"
        )}`
      );
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // 2. Fetch authenticated profile to identify sender address
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(
        `${origin}/app/settings?tab=gmail&status=error&message=${encodeURIComponent("Could not retrieve Gmail profile.")}`
      );
    }

    const profile = await profileRes.json();
    const senderEmail = profile.email;
    const senderName = profile.name || senderEmail.split("@")[0];

    // 3. Persist securely in Neon PostgreSQL
    await saveNeonGmailAccount(workspaceId, {
      senderName,
      senderEmail,
      tokenData: tokens,
      dailyLimit: 500, // Standard free Gmail daily limit
    });

    return NextResponse.redirect(
      `${origin}/app/settings?tab=gmail&status=connected&email=${encodeURIComponent(senderEmail)}`
    );
  } catch (err: any) {
    console.error("[Gmail OAuth] Callback exception:", err);
    return NextResponse.redirect(
      `${origin}/app/settings?tab=gmail&status=error&message=${encodeURIComponent(err.message || "An unexpected error occurred.")}`
    );
  }
}
