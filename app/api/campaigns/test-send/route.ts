import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { sendLiveEmail } from "@/lib/email-service";

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(user, "cold_email");
    if (!subCheck.allowed) {
      return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
    }
    const body = await req.json();
    const { from_email, from_name, to_email, subject, body: emailBody, app_password } = body;

    if (!to_email) {
      return NextResponse.json({ detail: "Recipient email (to_email) is required" }, { status: 400 });
    }

    const result = await sendLiveEmail({
      fromEmail: from_email || "outreach@usman-ai-gtm.com",
      fromName: from_name || "USMAN AI GTM",
      toEmail: to_email,
      subject: subject || "Test email from USMAN AI GTM",
      bodyText: emailBody || "This is a verified test email sent from your USMAN AI GTM platform.",
      appPassword: app_password,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          status: "error",
          error: result.error,
          detail: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Email successfully delivered to ${to_email}`,
      message_id: result.messageId,
      delivered_to: to_email,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Email dispatch failed",
        detail: err?.message || "Email dispatch failed",
      },
      { status: 500 }
    );
  }
}
