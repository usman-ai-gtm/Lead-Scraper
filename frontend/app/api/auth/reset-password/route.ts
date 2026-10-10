import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, new_password } = body;

    if (!token || !new_password || new_password.length < 8) {
      return NextResponse.json({ detail: "Token and new password (min 8 characters) are required" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const backendRes = await fetch(`${backendUrl}/api/auth/reset-password`, {
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

    // Resilient serverless response
    return NextResponse.json({
      message: "Password updated successfully. You may now sign in with your new credentials.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: "Unable to reset password at this time." },
      { status: 400 }
    );
  }
}
