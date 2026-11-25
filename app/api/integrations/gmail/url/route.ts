import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription, signOAuthState } from "@/lib/serverless-auth";

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

export async function GET(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const subCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json(
      { error: subCheck.message || "Active subscription required to connect Gmail.", status: "error" },
      { status: subCheck.statusCode || 403 }
    );
  }
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const userId = Number(subCheck.userRecord?.id || currentUser.id) || 1;

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const isConfigured = Boolean(clientId.length > 0 && clientSecret.length > 0);

  const redirectUri = getExactRedirectUri(request);

  // HMAC-SHA256 signed state parameter preventing workspace_id / CSRF tampering
  const statePayload = signOAuthState({
    action: "gmail_connect",
    workspace_id: workspaceId,
    user_id: userId,
  });

  // Least-privileged scopes strictly required for user-initiated Gmail sending + sender email identity
  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const authUrl = isConfigured
    ? `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `include_granted_scopes=true&` +
      `state=${encodeURIComponent(statePayload)}`
    : "";

  return NextResponse.json({
    configured: isConfigured,
    redirect_uri: redirectUri,
    auth_url: authUrl,
    scopes: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email"],
    note: "Official Google OAuth 2.0 authorization for direct personal Gmail outreach."
  });
}
