import { NextResponse } from "next/server";
import { registerServerlessUser } from "@/lib/serverless-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, company, workspace_name } = body;

    // Validate inputs
    if (!email || !email.includes("@")) {
      return NextResponse.json({ detail: "Please provide a valid work email address" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ detail: "Password must be at least 8 characters long" }, { status: 400 });
    }
    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ detail: "Full name is required" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    // 1. Attempt connection to FastAPI backend (with 2s timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const backendRes = await fetch(`${backendUrl}/api/auth/signup`, {
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

    // 2. Resilient Serverless Auth Engine (Runs natively on Vercel with PBKDF2 hashing & JWT)
    const result = registerServerlessUser({
      email,
      fullName: full_name,
      password,
      workspaceName: workspace_name,
      company,
    });

    return NextResponse.json({
      access_token: result.token,
      token_type: "bearer",
      user: result.user,
      workspace: result.workspace,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Registration failed. Please check your information." },
      { status: 400 }
    );
  }
}
