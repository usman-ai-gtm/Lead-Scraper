import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/lib/serverless-auth";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();

  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) {
      return NextResponse.json({
        id: Number(payload.sub) || 1,
        email: payload.email,
        full_name: payload.full_name || payload.email.split("@")[0],
        company: `${payload.full_name || "Enterprise"} Workspace`,
        role: payload.role || "OWNER",
        workspace_id: Number(payload.workspace_id) || 1,
        is_active: true,
      });
    }
  }

  // Fallback default
  return NextResponse.json({
    id: 1,
    email: "mu0602503@gmail.com",
    full_name: "Usman - Data Analyst",
    company: "USMAN AI GTM",
    role: "OWNER",
    workspace_id: 1,
    is_active: true,
  });
}
