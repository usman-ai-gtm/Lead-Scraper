import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonGmailAccount, getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export async function GET(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const isGoogleConfigured = Boolean(clientId.length > 0 && clientSecret.length > 0);

  const account = await getNeonGmailAccount(workspaceId);

  let allAccounts: any[] = [];
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        allAccounts = await sql.query(
          `SELECT id, sender_email, sender_name, account_name, health_status, daily_limit, sent_today, created_at
           FROM email_accounts
           WHERE workspace_id = $1 AND is_active = 1
           ORDER BY id ASC`,
          [workspaceId]
        );
      } catch (e) {
        console.error("Fetch email_accounts status error:", e);
      }
    }
  }

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
    connected_count: allAccounts.length,
    accounts: allAccounts,
    account: account
      ? {
          id: account.id,
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
