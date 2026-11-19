import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();

  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) {
      const userId = Number(payload.sub) || 1;
      const wsId = Number(payload.workspace_id) || 1;

      if (isNeonConfigured()) {
        try {
          const sql = getNeonSql();
          if (sql) {
            const users = await sql`
              SELECT id, email, full_name, role, workspace_id, status
              FROM users
              WHERE id = ${userId}
              LIMIT 1
            `;
            if (users && users.length > 0) {
              const u = users[0];
              return NextResponse.json({
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                company: `${u.full_name}'s Enterprise`,
                role: u.role || "ADMIN",
                workspace_id: u.workspace_id,
                is_active: u.status === "ACTIVE",
              });
            }
          }
        } catch {}
      }

      return NextResponse.json({
        id: userId,
        email: payload.email,
        full_name: payload.full_name || payload.email?.split("@")[0],
        company: `${payload.full_name || "Enterprise"} Workspace`,
        role: payload.role || "ADMIN",
        workspace_id: wsId,
        is_active: true,
      });
    }
  }

  // Fallback default
  return NextResponse.json({
    id: 1,
    email: "admin@usmanai.com",
    full_name: "Administrator",
    company: "USMAN AI GTM",
    role: "ADMIN",
    workspace_id: 1,
    is_active: true,
  });
}
