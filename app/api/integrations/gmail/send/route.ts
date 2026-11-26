import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import {
  getNeonGmailTokens,
  getNeonAllActiveGmailTokens,
  saveNeonGmailAccount,
  markNeonGmailAccountHealth,
  saveNeonOutreachRecord,
  updateNeonLeadOutreachStatus,
  getNeonEmailsSentTodayUtc,
  isRecipientSuppressed,
  isDuplicateOutreach,
  logAccountAudit,
} from "@/lib/neon-db";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const currentUser = getCurrentUserFromRequest(request);
  const authCheck = await verifyClientActiveSubscription(currentUser, "cold_email");
  if (!authCheck.allowed) {
    return NextResponse.json(
      { error: authCheck.message },
      { status: authCheck.statusCode || 403 }
    );
  }

  const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
  const userId = Number(authCheck.userRecord?.id || currentUser.id) || 1;

  const rl = await consumeRateLimit({
    bucket: "gmail_send",
    identifier: String(workspaceId),
    limit: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(
      rl.retryAfterSeconds,
      `Sending bursts are throttled for deliverability protection. Retry in ${rl.retryAfterSeconds}s.`
    );
  }
  const planDailyLimit = authCheck.entitlements?.dailyEmailLimit ?? 10;
  const planLabel = authCheck.entitlements?.planLabel || "Active Plan";

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

  // Authoritative plan-based daily email limit (UTC day)
  if (planDailyLimit <= 0) {
    return NextResponse.json(
      { error: `Cold email sending is disabled on your current ${planLabel}.` },
      { status: 403 }
    );
  }

  const workspaceSentTodayUtc = await getNeonEmailsSentTodayUtc(workspaceId);
  if (workspaceSentTodayUtc >= planDailyLimit) {
    return NextResponse.json(
      {
        error: `Daily plan sending limit reached (${workspaceSentTodayUtc}/${planDailyLimit} successful emails used today on ${planLabel}). Limit resets at 00:00 UTC.`,
        sent_today: workspaceSentTodayUtc,
        daily_limit: planDailyLimit,
      },
      { status: 429 }
    );
  }

  // Round-robin fairness by actual UTC sent count today
  const sentByEmail = new Map<string, number>();
  for (const acc of allAccounts) {
    sentByEmail.set(
      acc.senderEmail.toLowerCase(),
      await getNeonEmailsSentTodayUtc(workspaceId, acc.senderEmail)
    );
  }

  // Resolve explicit selected sender mailbox or primary connected mailbox (never rotate to evade workspace plan limits)
  if (account_id) {
    activeAccount = allAccounts.find((a: any) => a.accountId === Number(account_id));
    if (!activeAccount) {
      return NextResponse.json(
        { error: `Requested sending account #${account_id} not found or inactive in this workspace.` },
        { status: 404 }
      );
    }
  } else {
    activeAccount = allAccounts[0];
  }

  // Per-mailbox Google safety cap (500/day max for standard Gmail OAuth)
  const mailboxSentToday = sentByEmail.get(activeAccount.senderEmail.toLowerCase()) || 0;
  const mailboxCap = Math.min(500, activeAccount.dailyLimit || 500);
  if (mailboxSentToday >= mailboxCap) {
    return NextResponse.json(
      { error: `Mailbox daily safety cap reached for ${activeAccount.senderEmail} (${mailboxSentToday}/${mailboxCap}). Select another mailbox or wait until 00:00 UTC.` },
      { status: 429 }
    );
  }

  const tokens = activeAccount.tokens;
  if (!tokens || !tokens.access_token) {
    await saveNeonOutreachRecord({
      workspaceId,
      userId,
      leadId: lead_id ? Number(lead_id) : undefined,
      recipientEmail: cleanRecipientEmail,
      recipientName: cleanRecipientName || cleanRecipientEmail,
      senderEmail: activeAccount.senderEmail,
      senderName: activeAccount.senderName || "Sales Outreach",
      subject,
      body: emailBody,
      outreachStatus: "FAILED",
      followupNotes: "Gmail OAuth access token missing or expired",
    }).catch(() => {});
    return NextResponse.json(
      { error: `Stored Gmail credentials for ${activeAccount.senderEmail} are expired. Please reconnect.` },
      { status: 401 }
    );
  }

  let accessToken = tokens.access_token;
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

  // Helper to refresh token & detect revoked/invalid credentials
  async function refreshAccessToken(): Promise<{ token: string | null; revoked?: boolean; errorDetail?: string }> {
    if (!tokens.refresh_token || !clientId || !clientSecret) {
      return { token: null, errorDetail: "Missing refresh_token or OAuth server configuration" };
    }
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
          obtained_at: Date.now(),
        };
        await saveNeonGmailAccount(workspaceId, {
          senderName: activeAccount.senderName,
          senderEmail: activeAccount.senderEmail,
          tokenData: updatedTokens,
          dailyLimit: activeAccount.dailyLimit || 500,
        });
        return { token: newAccessToken };
      } else {
        const errBody = await res.json().catch(() => ({}));
        const errCode = String(errBody.error || "");
        const errDesc = String(errBody.error_description || errCode || `HTTP ${res.status}`);
        const isRevoked =
          errCode === "invalid_grant" ||
          errCode === "unauthorized_client" ||
          res.status === 400 ||
          res.status === 401;
        if (isRevoked) {
          await markNeonGmailAccountHealth(
            workspaceId,
            activeAccount.accountId,
            "RECONNECT_REQUIRED",
            `Google OAuth permission revoked or expired (${errDesc}). Please reconnect Gmail.`
          );
          await logAccountAudit({
            adminId: userId,
            adminEmail: activeAccount.senderEmail,
            clientId: userId,
            clientEmail: activeAccount.senderEmail,
            workspaceId,
            action: "GMAIL_TOKEN_REVOKED",
            result: "FAILED",
            details: { sender_email: activeAccount.senderEmail, error: errDesc },
          }).catch(() => {});
        }
        return { token: null, revoked: isRevoked, errorDetail: errDesc };
      }
    } catch (e: any) {
      console.error("[Gmail Send] Refresh token error:", e);
      return { token: null, errorDetail: e?.message || "Refresh request failed" };
    }
  }

  // Proactive refresh when stored token age nears/exceeds expires_in
  const obtainedAt = Number(tokens.obtained_at || 0);
  const expiresInSec = Number(tokens.expires_in || 3500);
  if (obtainedAt > 0 && Date.now() - obtainedAt > (expiresInSec - 120) * 1000 && tokens.refresh_token) {
    const pro = await refreshAccessToken();
    if (pro.token) {
      accessToken = pro.token;
    } else if (pro.revoked) {
      return NextResponse.json(
        {
          error: `Gmail authorization for ${activeAccount.senderEmail} was revoked or expired. Please reconnect your Gmail account in Settings.`,
          reconnect_required: true,
        },
        { status: 401 }
      );
    }
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
    if (refreshed.token) {
      accessToken = refreshed.token;
      sendRes = await attemptSend(accessToken);
    } else if (refreshed.revoked) {
      await saveNeonOutreachRecord({
        workspaceId,
        userId,
        leadId: lead_id ? Number(lead_id) : undefined,
        recipientEmail: cleanRecipientEmail,
        recipientName: cleanRecipientName || cleanRecipientEmail,
        senderEmail: senderEmail,
        senderName: senderName,
        subject: subject,
        body: emailBody,
        outreachStatus: "FAILED",
        followupNotes: `Gmail access revoked (${refreshed.errorDetail})`,
      }).catch(() => {});
      return NextResponse.json(
        {
          error: `Gmail permissions for ${senderEmail} were revoked or expired. Please reconnect your Gmail account.`,
          reconnect_required: true,
        },
        { status: 422 }
      );
    }
  }

  if (!sendRes.ok) {
    const errData = await sendRes.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `Gmail API returned HTTP ${sendRes.status}`;
    console.error("[Gmail Send Error]", sendRes.status, errData);

    if (sendRes.status === 401) {
      await markNeonGmailAccountHealth(workspaceId, activeAccount.accountId, "RECONNECT_REQUIRED", errMsg);
    }

    await saveNeonOutreachRecord({
      workspaceId,
      userId,
      leadId: lead_id ? Number(lead_id) : undefined,
      recipientEmail: cleanRecipientEmail,
      recipientName: cleanRecipientName || cleanRecipientEmail,
      senderEmail: senderEmail,
      senderName: senderName,
      subject: subject,
      body: emailBody,
      outreachStatus: "FAILED",
      followupNotes: errMsg,
    }).catch(() => {});

    await logAccountAudit({
      adminId: userId,
      adminEmail: senderEmail,
      clientId: userId,
      clientEmail: senderEmail,
      workspaceId,
      action: "EMAIL_FAILED",
      result: "FAILED",
      details: { sender_email: senderEmail, recipient_email: cleanRecipientEmail, error: errMsg },
    }).catch(() => {});

    return NextResponse.json(
      {
        error: `Failed to send email via Gmail (${senderEmail}): ${errMsg}`,
        reconnect_required: sendRes.status === 401,
        details: errData?.error || null,
      },
      { status: sendRes.status === 403 ? 403 : sendRes.status === 401 ? 422 : 500 }
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

  await logAccountAudit({
    adminId: userId,
    adminEmail: senderEmail,
    clientId: userId,
    clientEmail: senderEmail,
    workspaceId,
    action: "EMAIL_SENT",
    details: { sender_email: senderEmail, recipient_email: cleanRecipientEmail, message_id: sendResult.id },
  }).catch(() => {});

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
