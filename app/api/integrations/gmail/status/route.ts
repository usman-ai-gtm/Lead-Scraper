import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonGmailAccount } from "@/lib/neon-db";

export async function GET(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const wsHeader = request.headers.get("x-workspace-id") || request.headers.get("X-Workspace-Id");
  const workspaceId = currentUser ? currentUser.workspace_id : (wsHeader ? Number(wsHeader) : 1);

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const isGoogleConfigured = Boolean(clientId.length > 0 && clientSecret.length > 0);

  const account = await getNeonGmailAccount(workspaceId);

  let statusCode: "CONNECTED" | "NOT_CONNECTED" | "CONFIGURATION_ERROR" | "RECONNECT_REQUIRED" = "NOT_CONNECTED";
  if (!isGoogleConfigured) {
    statusCode = "CONFIGURATION_ERROR";
  } else if (account && account.is_active === 1 && account.health_status === "CONNECTED") {
    statusCode = "CONNECTED";
  } else if (account && account.health_status === "RECONNECT_REQUIRED") {
    statusCode = "RECONNECT_REQUIRED";
  } else {
    statusCode = "NOT_CONNECTED";
  }

  return NextResponse.json({
    configured: isGoogleConfigured,
    connected: statusCode === "CONNECTED",
    status_code: statusCode,
    account: account
      ? {
          sender_email: account.sender_email,
          sender_name: account.sender_name,
          account_name: account.account_name,
          health_status: account.health_status,
          daily_limit: account.daily_limit || 500,
          sent_today: account.sent_today || 0,
          last_sent_at: account.last_sent_at,
          created_at: account.created_at,
        }
      : null,
    provider: "Google Gmail API",
    daily_quota: 500,
    cost: "$0 / month (Standard Gmail)",
    redirect_uri: "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback",
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  });
}
