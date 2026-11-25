import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { disconnectNeonGmailAccount, getNeonSql, isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { decryptToken } from "@/lib/token-crypto";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(currentUser);
  const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const userId = Number(subCheck.userRecord?.id || currentUser.id) || 0;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const accountId = body.account_id ? Number(body.account_id) : undefined;

  // Best-effort Google token revocation + inspect target email for audit log (never exposing tokens)
  let disconnectedEmails: string[] = [];
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        const rows = accountId
          ? await sql.query(
              "SELECT id, sender_email, oauth_token_json FROM email_accounts WHERE workspace_id = $1 AND id = $2",
              [workspaceId, accountId]
            )
          : await sql.query(
              "SELECT id, sender_email, oauth_token_json FROM email_accounts WHERE workspace_id = $1 AND is_active = 1",
              [workspaceId]
            );
        for (const r of rows || []) {
          if (r.sender_email) disconnectedEmails.push(r.sender_email);
          const tok = r.oauth_token_json ? decryptToken(r.oauth_token_json) : null;
          const revokeToken = tok?.refresh_token || tok?.access_token;
          if (revokeToken) {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(revokeToken)}`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }).catch(() => {});
          }
        }
      } catch {}
    }
  }

  const success = await disconnectNeonGmailAccount(workspaceId, accountId);

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Could not disconnect Gmail account or database error." },
      { status: 500 }
    );
  }

  if (userId > 0) {
    await logAccountAudit({
      adminId: userId,
      adminEmail: currentUser.email || currentUser.username || "client",
      clientId: userId,
      clientEmail: currentUser.email || currentUser.username || "",
      workspaceId,
      action: "GMAIL_DISCONNECT",
      details: { account_id: accountId || null, emails: disconnectedEmails },
    });
  }

  return NextResponse.json({
    success: true,
    message: accountId
      ? `Gmail account #${accountId} successfully disconnected.`
      : "Gmail account(s) successfully disconnected from USMAN AI GTM.",
  });
}
