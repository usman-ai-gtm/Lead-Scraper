import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonGmailAccount, getNeonEmailsSentTodayUtc, getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  getOwnerPlatformSettings,
  getProductionRedirectUri,
  resolveWorkspaceGmailOAuthCredentials,
} from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json(
      { error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const ent = subCheck.entitlements;
  const planDailyLimit = ent ? ent.dailyEmailLimit : 10;

  const [platformSettings, resolvedCreds] = await Promise.all([
    getOwnerPlatformSettings(),
    resolveWorkspaceGmailOAuthCredentials(workspaceId),
  ]);
  const isGoogleConfigured = Boolean(resolvedCreds.clientId.length > 0 && resolvedCreds.clientSecret.length > 0);

  const account = await getNeonGmailAccount(workspaceId);
  const emailsSentTodayTotal = await getNeonEmailsSentTodayUtc(workspaceId);

  let allAccounts: any[] = [];
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        allAccounts = await sql.query(
          `SELECT id, sender_email, sender_name, account_name, health_status, last_error,
                  last_refreshed_at, last_sent_at, daily_limit, sent_today, is_active, created_at, updated_at
           FROM email_accounts
           WHERE workspace_id = $1 AND COALESCE(health_status, 'NOT_CONNECTED') != 'DISCONNECTED' AND is_active = 1
           ORDER BY id ASC`,
          [workspaceId]
        );
        // Compute authoritative UTC today count per mailbox
        for (const acc of allAccounts) {
          acc.sent_today_utc = await getNeonEmailsSentTodayUtc(workspaceId, acc.sender_email);
          acc.plan_daily_limit = planDailyLimit;
        }
      } catch (e) {
        console.error("Fetch email_accounts status error:", e);
      }
    }
  }

  let statusCode: "CONNECTED" | "NOT_CONNECTED" | "CONFIGURATION_ERROR" | "RECONNECT_REQUIRED" = "NOT_CONNECTED";
  const hasConnected = allAccounts.some((a: any) => a.health_status === "CONNECTED");
  const hasReconnect = allAccounts.some((a: any) => a.health_status === "RECONNECT_REQUIRED" || a.health_status === "REVOKED");
  if (!isGoogleConfigured) {
    statusCode = "CONFIGURATION_ERROR";
  } else if (hasConnected || (account && account.is_active === 1 && account.health_status === "CONNECTED")) {
    statusCode = "CONNECTED";
  } else if (hasReconnect || (account && (account.health_status === "RECONNECT_REQUIRED" || account.health_status === "REVOKED"))) {
    statusCode = "RECONNECT_REQUIRED";
  } else {
    statusCode = "NOT_CONNECTED";
  }

  return NextResponse.json({
    configured: isGoogleConfigured,
    connected: statusCode === "CONNECTED",
    status_code: statusCode,
    connected_count: allAccounts.filter((a: any) => a.health_status === "CONNECTED").length,
    accounts: allAccounts,
    account: account
      ? {
          id: account.id,
          sender_email: account.sender_email,
          sender_name: account.sender_name,
          account_name: account.account_name,
          health_status: account.health_status,
          last_error: account.last_error || null,
          daily_limit: planDailyLimit,
          sent_today: emailsSentTodayTotal,
          last_sent_at: account.last_sent_at,
          created_at: account.created_at,
        }
      : null,
    provider: "Google Gmail API (OAuth 2.0)",
    daily_quota: planDailyLimit,
    emails_sent_today: emailsSentTodayTotal,
    remaining_today: Math.max(0, planDailyLimit - emailsSentTodayTotal),
    quota_reset_timezone: "UTC (00:00 UTC daily)",
    plan_label: ent?.planLabel || "Basic Plan",
    cost: "$0 / month via connected Gmail OAuth",
    redirect_uri: getProductionRedirectUri(),
    oauth_source: resolvedCreds.source,
    oauth_audience_status: platformSettings.oauthAudienceStatus,
    oauth_mode: platformSettings.oauthMode,
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  });
}
