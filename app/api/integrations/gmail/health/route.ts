import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import {
  GOOGLE_CLOUD_CONSOLE_LINKS,
  classifyGoogleOAuthError,
} from "@/lib/google-oauth-diagnostics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const clientIdConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim());
  const clientSecretConfigured = Boolean(
    process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim()
  );
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://lead-scraper-mxs5.vercel.app");

  const expectedCallbackUri = `${appBaseUrl}/api/integrations/gmail/callback`;
  const oauthConfigured = clientIdConfigured && clientSecretConfigured;
  const workspaceId = Number(user.workspace_id) || 1;
  const isOwner = isAuthorizedOwner(user);

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
    consoleLinks: GOOGLE_CLOUD_CONSOLE_LINKS,
    activeMailboxCount: workspaceMailboxes.length,
    diagnostic,
  });
}
