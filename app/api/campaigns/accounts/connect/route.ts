import { NextResponse } from "next/server";
import { verifySmtpConnection } from "@/lib/email-service";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }
  const subCheck = await verifyClientActiveSubscription(user, "cold_email");
  if (!subCheck.allowed) {
    return NextResponse.json({ detail: subCheck.message }, { status: subCheck.statusCode || 403 });
  }

  const rl = await consumeRateLimit({
    bucket: "smtp_connect",
    identifier: String(user.id || user.workspace_id || 1),
    limit: 10,
    windowSeconds: 300,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl.retryAfterSeconds);
  }

  try {
    const body = await req.json();
    const { email, app_password, name } = body;

    if (!email || !app_password) {
      return NextResponse.json(
        { detail: "Both Gmail address and 16-character Google App Password are required" },
        { status: 400 }
      );
    }

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
        identifier: String(email).trim().toLowerCase(),
        name: name || String(email).split("@")[0],
        status: "CONNECTED",
        daily_limit: subCheck.entitlements?.dailyEmailLimit ?? 10,
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
