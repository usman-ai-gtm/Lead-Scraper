import { NextResponse } from "next/server";
import { signOAuthState } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const origin = url.origin;

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  
  // Uses the exact authorized redirect URI registered in Google Cloud Console
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI ||
    (isVercel
      ? "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback"
      : `${origin}/api/integrations/gmail/callback`);

  const isConfigured = Boolean(clientId && clientId.length > 0);

  // HMAC-signed state token identifying this as an authentication login flow (not mailbox connection)
  const statePayload = signOAuthState({
    action: "google_login",
  });

  const scope = encodeURIComponent("openid email profile");
  const authUrl = isConfigured
    ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account&state=${statePayload}`
    : "";

  return NextResponse.json({
    configured: isConfigured,
    client_id_configured: isConfigured,
    redirect_uri: redirectUri,
    auth_url: authUrl,
    environment_instructions: {
      required_env_vars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      authorized_redirect_uri: redirectUri,
      scopes: ["openid", "email", "profile"],
    },
  });
}
