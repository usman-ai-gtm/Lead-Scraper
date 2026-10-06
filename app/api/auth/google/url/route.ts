import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  
  const isConfigured = Boolean(clientId && clientId.trim().length > 0);

  const scope = encodeURIComponent("openid email profile");
  const authUrl = isConfigured
    ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`
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
      console_url: "https://console.cloud.google.com/apis/credentials",
    },
  });
}
