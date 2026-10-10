import { NextResponse } from "next/server";
import { verifySmtpConnection } from "@/lib/email-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, app_password, name } = body;

    if (!email || !app_password) {
      return NextResponse.json(
        { detail: "Both Gmail address and 16-character Google App Password are required" },
        { status: 400 }
      );
    }

    // Verify SMTP handshake with Google
    const verification = await verifySmtpConnection(email, app_password);

    if (!verification.success) {
      return NextResponse.json(
        {
          status: "error",
          error: verification.message,
          detail: verification.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "success",
      connected: true,
      account: {
        id: Date.now(),
        account_type: "email",
        identifier: email.trim().toLowerCase(),
        name: name || email.split("@")[0],
        status: "CONNECTED",
        daily_limit: 50,
        sent_today: 0,
        provider: "GMAIL_SMTP",
        verified_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Connection verification failed",
        detail: err?.message || "Connection verification failed",
      },
      { status: 500 }
    );
  }
}
