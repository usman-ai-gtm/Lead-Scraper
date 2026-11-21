import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import {
  getNeonGmailTokens,
  getNeonGmailAccount,
  saveNeonGmailAccount,
  saveNeonOutreachRecord,
  updateNeonLeadOutreachStatus,
} from "@/lib/neon-db";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required to send outreach emails." },
      { status: 401 }
    );
  }
  if (currentUser.status === "LOCKED" || currentUser.status === "PENDING") {
    return NextResponse.json(
      {
        error: "Account Locked — Subscription Activation Required ($10/month). Contact Owner via WhatsApp (+923174383702) for Instant Activation."
      },
      { status: 403 }
    );
  }
  if (currentUser.status === "SUSPENDED" || currentUser.status === "REVOKED") {
    return NextResponse.json(
      {
        error: "Account Suspended or Revoked. Contact Administrator via WhatsApp (+923174383702)."
      },
      { status: 403 }
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
  } = body;

  if (!recipient_email || !subject || !emailBody) {
    return NextResponse.json(
      { error: "recipient_email, subject, and body are strictly required." },
      { status: 400 }
    );
  }

  // 1. DO NOT CONTACT Policy Enforcement
  if (outreach_status === "DO NOT CONTACT") {
    return NextResponse.json(
      { error: "Recipient is marked as DO NOT CONTACT. Outreach blocked by compliance policy." },
      { status: 400 }
    );
  }

  // 2. Fetch connected Gmail account & tokens
  const account = await getNeonGmailAccount(workspaceId);
  if (!account || account.health_status !== "CONNECTED" || account.is_active !== 1) {
    return NextResponse.json(
      {
        error: "No active Gmail account connected for this workspace. Please connect Gmail in Settings > Gmail & Domain Health.",
      },
      { status: 400 }
    );
  }

  const tokenRecord = await getNeonGmailTokens(workspaceId);
  const tokens = tokenRecord?.tokens;
  if (!tokens || !tokens.access_token) {
    return NextResponse.json(
      { error: "Stored Gmail OAuth credentials are missing or expired. Please reconnect your account." },
      { status: 401 }
    );
  }

  let accessToken = tokens.access_token;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  // 3. Helper to refresh token if needed
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
          senderName: account.sender_name,
          senderEmail: account.sender_email,
          tokenData: updatedTokens,
          dailyLimit: account.daily_limit || 500,
        });
        return newAccessToken;
      }
    } catch (e) {
      console.error("[Gmail Send] Refresh token error:", e);
    }
    return null;
  }

  // 4. Construct RFC 2822 standard email message
  const senderName = account.sender_name || "Sales Outreach";
  const senderEmail = account.sender_email;
  const cleanRecipientName = (recipient_name || "").replace(/[\r\n"<>]/g, "").trim();
  const cleanRecipientEmail = recipient_email.trim();

  const toHeader = cleanRecipientName
    ? `"${cleanRecipientName}" <${cleanRecipientEmail}>`
    : cleanRecipientEmail;
  const fromHeader = `"${senderName.replace(/[\r\n"<>]/g, "").trim()}" <${senderEmail}>`;

  // Encode subject with UTF-8 base64 header if it contains non-ASCII characters
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

  // 5. Send message via Google Gmail API
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

  // If unauthorized (401), attempt token refresh once
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
        error: `Failed to send email via Gmail: ${errMsg}`,
        details: errData?.error || null,
      },
      { status: sendRes.status === 403 ? 403 : 500 }
    );
  }

  const sendResult = await sendRes.json();

  // 6. Record sent email in Neon PostgreSQL outreach_records
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

  // 7. Update lead CRM stage to 'EMAIL SENT' and next_followup
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
    message: "Outreach email sent successfully via Gmail API.",
    gmail_message_id: sendResult.id,
    gmail_thread_id: sendResult.threadId,
    lead_id: lead_id || null,
    outreach_status: "EMAIL SENT",
    followup_date: followup_date || null,
    outreach_record_id: savedRecord ? savedRecord.id : null,
  });
}
