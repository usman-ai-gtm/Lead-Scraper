import { NextResponse } from "next/server";
import { authenticateServerlessUser } from "@/lib/serverless-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    // 1. Attempt connection to FastAPI backend (with 2s timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const backendRes = await fetch(`${backendUrl}/api/auth/login`, {
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
      // Backend is unreachable or running in standalone Vercel serverless mode
    }

    // 2. Resilient Serverless Auth Engine
    const result = authenticateServerlessUser(email, password);
    if (!result) {
      return NextResponse.json({ detail: "Incorrect email or password" }, { status: 401 });
    }

    return NextResponse.json({
      access_token: result.token,
      token_type: "bearer",
      user: result.user,
      workspace: result.workspace,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Authentication failed" },
      { status: 400 }
    );
  }
}
