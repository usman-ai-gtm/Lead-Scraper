import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    const authHeader = req.headers.get("authorization") || "";
    const backendRes = await fetch(`${backendUrl}/api/leads/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        count: 0,
        leads: [],
        message: "Search service is unreachable. Please ensure the backend server is running."
      },
      { status: 503 }
    );
  }
}
