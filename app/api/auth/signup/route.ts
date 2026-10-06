import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, company, workspace_name } = body;

    const user = {
      id: Math.floor(Math.random() * 10000) + 1,
      email: email || "user@enterprise.com",
      full_name: full_name || "Muhammad Usman",
      company: company || "Usman CPN",
      role: "OWNER",
      workspace_id: 1,
      is_active: true,
    };

    const workspace = {
      id: 1,
      name: workspace_name || `${company || "Enterprise"} Workspace`,
      owner_id: user.id,
      plan: "ENTERPRISE",
      created_at: new Date().toISOString(),
    };

    const token = `jwt_session_${user.id}_${Date.now()}`;

    return NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user,
      workspace,
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Failed to create account" },
      { status: 400 }
    );
  }
}
