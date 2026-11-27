import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  GOOGLE_CLOUD_CONSOLE_LINKS,
  classifyGoogleOAuthError,
} from "@/lib/google-oauth-diagnostics";
import {
  getOwnerPlatformSettings,
  getProductionRedirectUri,
  resolveWorkspaceGmailOAuthCredentials,
} from "@/lib/platform-settings-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const workspaceId = Number(user.workspace_id) || 1;
  const isOwner = isAuthorizedOwner(user);
  const [platformSettings, resolvedCreds] = await Promise.all([
    getOwnerPlatformSettings(),
    resolveWorkspaceGmailOAuthCredentials(workspaceId),
  ]);
  const clientIdConfigured = Boolean(resolvedCreds.clientId);
  const clientSecretConfigured = Boolean(resolvedCreds.clientSecret);
  const expectedCallbackUri = getProductionRedirectUri();
  const oauthConfigured = clientIdConfigured && clientSecretConfigured;

  let workspaceMailboxes: any[] = [];
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        workspaceMailboxes = await sql.query(
          `SELECT id, sender_email, health_status, last_error, is_active, last_refreshed_at, revoked_at
           FROM email_accounts
           WHERE workspace_id = $1 AND is_active = 1
           ORDER BY id DESC`,
          [workspaceId]
        );
      } catch {
        workspaceMailboxes = [];
      }
    }
  }

  let diagnostic = null;
  if (!oauthConfigured) {
    diagnostic = classifyGoogleOAuthError("credentials_missing", undefined, "config");
  } else {
    const revokedOrErr = workspaceMailboxes.find(
      (m) => m.revoked_at || String(m.health_status || "").toUpperCase() !== "CONNECTED" || m.last_error
    );
    if (revokedOrErr) {
      diagnostic = classifyGoogleOAuthError(
        revokedOrErr.health_status,
        revokedOrErr.last_error,
        "send"
      );
    }
  }

  return NextResponse.json({
    oauthConfigured,
    clientIdConfigured,
    clientSecretConfigured,
    databaseConfigured: isNeonConfigured(),
    callbackUri: expectedCallbackUri,
    gmailScope: "https://www.googleapis.com/auth/gmail.send",
    isOwner,
    oauthSource: resolvedCreds.source,
    oauthProjectId: resolvedCreds.projectId || platformSettings.oauthProjectId,
    oauthAudienceStatus: platformSettings.oauthAudienceStatus,
    oauthMode: platformSettings.oauthMode,
    consoleLinks: GOOGLE_CLOUD_CONSOLE_LINKS,
    activeMailboxCount: workspaceMailboxes.length,
    diagnostic,
  });
}
