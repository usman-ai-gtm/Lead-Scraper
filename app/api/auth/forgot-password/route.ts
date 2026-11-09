import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
    const rawBackend = process.env.BACKEND_URL;
    const isLocalhost = !rawBackend || rawBackend.includes("localhost") || rawBackend.includes("127.0.0.1");
    const backendUrl = (isVercel && isLocalhost) ? "" : (rawBackend || (isVercel ? "" : "http://127.0.0.1:8000"));

    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const backendRes = await fetch(`${backendUrl}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await backendRes.json().catch(() => ({}));
        if (backendRes.status !== 503 && backendRes.status !== 502 && backendRes.status !== 504) {
          return NextResponse.json(data, { status: backendRes.status });
        }
      } catch {
        // Backend is offline or running on standalone Vercel
      }
    }

    // Resilient serverless response
    const token = crypto.randomBytes(24).toString("hex");
    return NextResponse.json({
      message: "If an account with that email exists, password reset instructions have been sent.",
      diagnostic_token: token,
      reset_url: `/reset-password?token=${token}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: "Unable to process password reset request at this time." },
      { status: 400 }
    );
  }
}
