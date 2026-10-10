import { NextResponse } from "next/server";
import { createJwtToken } from "@/lib/serverless-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "mu0602503@gmail.com").trim().toLowerCase();
    const fullName = (body.name || "Usman - Data Analyst").trim();

    const userId = Math.floor(Date.now() / 1000);
    const user = {
      id: userId,
      email,
      full_name: fullName,
      company: "USMAN AI GTM",
      role: "ADMIN",
      workspace_id: 1,
      tenant_id: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const token = createJwtToken({
      sub: String(userId),
      email,
      full_name: fullName,
      role: "ADMIN",
      workspace_id: 1,
      tenant_id: 1,
    });

    const workspace = {
      id: 1,
      name: `${fullName}'s Workspace`,
      plan: "ENTERPRISE",
      ai_credits: 50000,
      search_credits: 25000,
      created_at: new Date().toISOString(),
    };

    const response = NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user,
      workspace,
    });

    // Set auth cookie
    response.cookies.set("usman_gtm_token", token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Google session provisioning failed" },
      { status: 400 }
    );
  }
}
