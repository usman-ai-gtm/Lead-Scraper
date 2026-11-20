import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const currentUser = getCurrentUserFromRequest(request);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;
  const userId = currentUser ? currentUser.id : 1;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI || `${origin}/api/integrations/gmail/callback`;

  const isConfigured = Boolean(clientId && clientId.trim().length > 0);

  // Security state parameter containing workspace_id, user_id, and timestamp
  const statePayload = Buffer.from(
    JSON.stringify({
      workspace_id: workspaceId,
      user_id: userId,
      ts: Date.now(),
    })
  ).toString("base64url");

  // Scopes strictly required: Gmail send and User profile email
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
    scopes: ["gmail.send", "userinfo.email"],
    note: "Official Google OAuth 2.0 authorization for direct personal Gmail outreach."
  });
}
