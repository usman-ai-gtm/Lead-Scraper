import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import {
  getNeonGmailTokens,
  getNeonAllActiveGmailTokens,
  saveNeonGmailAccount,
  saveNeonOutreachRecord,
  updateNeonLeadOutreachStatus,
  isRecipientSuppressed,
  isDuplicateOutreach,
} from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const authCheck = await verifyClientActiveSubscription(currentUser);
  if (!authCheck.allowed) {
    return NextResponse.json(
      { error: authCheck.message },
      { status: authCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;
  const userId = currentUser.id || 1;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const {
    lead_id,
    recipient_email,
    recipient_name,
    subject,
    body: emailBody,
    followup_date,
    followup_notes,
    outreach_status,
    account_id,
    allow_duplicate,
  } = body;

  if (!recipient_email || !subject || !emailBody) {
    return NextResponse.json(
      { error: "recipient_email, subject, and body are strictly required." },
      { status: 400 }
    );
  }

  const cleanRecipientEmail = recipient_email.trim().toLowerCase();
  const cleanRecipientName = (recipient_name || "").replace(/[\r\n"<>]/g, "").trim();

  // 1. DO NOT CONTACT & Suppression List Policy Enforcement
  if (outreach_status === "DO NOT CONTACT") {
    return NextResponse.json(
      { error: "Recipient is marked as DO NOT CONTACT. Outreach blocked by compliance policy." },
      { status: 400 }
    );
  }

  const suppressed = await isRecipientSuppressed(workspaceId, cleanRecipientEmail);
  if (suppressed) {
    return NextResponse.json(
      { error: "Recipient email is on your workspace suppression list. Message dispatch blocked." },
      { status: 400 }
    );
  }

  // Duplicate outreach protection (30 days) unless explicitly bypassed
  if (!allow_duplicate) {
    const isDup = await isDuplicateOutreach(workspaceId, cleanRecipientEmail, 30);
    if (isDup) {
      return NextResponse.json(
        { error: `Duplicate outreach prevented: ${cleanRecipientEmail} was already contacted within the last 30 days.` },
        { status: 400 }
      );
    }
  }

  // 2. Resolve target Gmail account (Supports Multiple Accounts & Round-Robin Rotation)
  let activeAccount: any = null;
  const allAccounts = await getNeonAllActiveGmailTokens(workspaceId);

  if (!allAccounts || allAccounts.length === 0) {
    return NextResponse.json(
      {
        error: "No active Gmail account connected for this workspace. Please connect Gmail in Settings > Gmail & Domain Health.",
      },
      { status: 400 }
    );
  }

  if (account_id) {
    activeAccount = allAccounts.find((a: any) => a.accountId === Number(account_id));
    if (!activeAccount) {
      return NextResponse.json(
        { error: `Requested sending account #${account_id} not found or inactive in this workspace.` },
        { status: 404 }
      );
    }
  } else {
    // Fair Round-Robin: select active account with lowest sent_today
    activeAccount = allAccounts.slice().sort((a: any, b: any) => (a.sentToday || 0) - (b.sentToday || 0))[0];
  }

  // Daily quota check
  if ((activeAccount.sentToday || 0) >= (activeAccount.dailyLimit || 500)) {
    return NextResponse.json(
      { error: `Daily limit reached for account ${activeAccount.senderEmail} (${activeAccount.sentToday}/${activeAccount.dailyLimit}). Select another account or wait for tomorrow.` },
      { status: 429 }
    );
  }

  const tokens = activeAccount.tokens;
  if (!tokens || !tokens.access_token) {
    return NextResponse.json(
      { error: `Stored Gmail credentials for ${activeAccount.senderEmail} are expired. Please reconnect.` },
      { status: 401 }
    );
  }

  let accessToken = tokens.access_token;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  // Helper to refresh token
  async function refreshAccessToken(): Promise<string | null> {
    if (!tokens.refresh_token || !clientId || !clientSecret) return null;
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newAccessToken = data.access_token;
        const updatedTokens = {
          ...tokens,
          access_token: newAccessToken,
          expires_in: data.expires_in || tokens.expires_in,
        };
        await saveNeonGmailAccount(workspaceId, {
          senderName: activeAccount.senderName,
          senderEmail: activeAccount.senderEmail,
          tokenData: updatedTokens,
          dailyLimit: activeAccount.dailyLimit || 500,
        });
        return newAccessToken;
      }
    } catch (e) {
      console.error("[Gmail Send] Refresh token error:", e);
    }
    return null;
  }

  // Construct RFC 2822 standard email message
  const senderName = activeAccount.senderName || "Sales Outreach";
  const senderEmail = activeAccount.senderEmail;

  const toHeader = cleanRecipientName
    ? `"${cleanRecipientName}" <${cleanRecipientEmail}>`
    : cleanRecipientEmail;
  const fromHeader = `"${senderName.replace(/[\r\n"<>]/g, "").trim()}" <${senderEmail}>`;

  const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;

  const rfc2822Lines = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    emailBody,
  ];

  const rawMessage = rfc2822Lines.join("\r\n");
  const rawBase64Url = Buffer.from(rawMessage, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Send message via Google Gmail API
  async function attemptSend(token: string) {
    return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawBase64Url }),
    });
  }

  let sendRes = await attemptSend(accessToken);

  if (sendRes.status === 401 && tokens.refresh_token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = refreshed;
      sendRes = await attemptSend(accessToken);
    }
  }

  if (!sendRes.ok) {
    const errData = await sendRes.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `Gmail API returned HTTP ${sendRes.status}`;
    console.error("[Gmail Send Error]", sendRes.status, errData);

    return NextResponse.json(
      {
        error: `Failed to send email via Gmail (${senderEmail}): ${errMsg}`,
        details: errData?.error || null,
      },
      { status: sendRes.status === 403 ? 403 : 500 }
    );
  }

  const sendResult = await sendRes.json();

  // Record sent email in Neon PostgreSQL outreach_records
  const savedRecord = await saveNeonOutreachRecord({
    workspaceId,
    userId,
    leadId: lead_id ? Number(lead_id) : undefined,
    recipientEmail: cleanRecipientEmail,
    recipientName: cleanRecipientName || cleanRecipientEmail,
    senderEmail: senderEmail,
    senderName: senderName,
    subject: subject,
    body: emailBody,
    gmailMessageId: sendResult.id,
    gmailThreadId: sendResult.threadId,
    outreachStatus: "EMAIL SENT",
    followupDate: followup_date || undefined,
    followupNotes: followup_notes || undefined,
  });

  // Update lead CRM stage to 'EMAIL SENT'
  if (lead_id) {
    await updateNeonLeadOutreachStatus(
      workspaceId,
      Number(lead_id),
      "EMAIL SENT",
      followup_date || undefined
    );
  }

  return NextResponse.json({
    success: true,
    message: `Outreach email sent successfully via Gmail API (${senderEmail}).`,
    sender_email: senderEmail,
    sender_name: senderName,
    account_id: activeAccount.accountId,
    gmail_message_id: sendResult.id,
    gmail_thread_id: sendResult.threadId,
    lead_id: lead_id || null,
    outreach_status: "EMAIL SENT",
    followup_date: followup_date || null,
    outreach_record_id: savedRecord ? savedRecord.id : null,
  });
}
