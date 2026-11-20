import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonGmailAccount } from "@/lib/neon-db";

export async function GET(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const isGoogleConfigured = Boolean(clientId && clientId.trim().length > 0 && clientSecret && clientSecret.trim().length > 0);

  const account = await getNeonGmailAccount(workspaceId);

  const isConnected = Boolean(account && account.health_status === "CONNECTED" && account.is_active === 1);

  return NextResponse.json({
    configured: isGoogleConfigured,
    connected: isConnected,
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
  });
}
