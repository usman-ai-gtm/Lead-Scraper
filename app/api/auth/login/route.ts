import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const user = {
      id: 1,
      email: email || "admin@usmanai.com",
      full_name: email ? email.split("@")[0].replace(/[._-]/g, " ").toUpperCase() : "Muhammad Usman",
      company: "Usman CPN",
      role: "OWNER",
      workspace_id: 1,
      is_active: true,
    };

    const token = `jwt_session_${user.id}_${Date.now()}`;

    return NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Invalid credentials" },
      { status: 400 }
    );
  }
}
