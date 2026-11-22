import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, computeAuthoritativeUserStatus } from "@/lib/neon-db";

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
              SELECT id, email, full_name, role, workspace_id, status, plan, subscription_start, subscription_expires_at, subscription_status
              FROM users
              WHERE id = ${userId}
              LIMIT 1
            `;
            if (users && users.length > 0) {
              const u = users[0];
              const authoritative = computeAuthoritativeUserStatus(u);

              const response = NextResponse.json({
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                company: `${u.full_name}'s Enterprise`,
                role: u.role || "CLIENT",
                workspace_id: u.workspace_id,
                status: authoritative.status,
                plan: authoritative.plan,
                is_active: authoritative.status === "ACTIVE",
                is_locked: authoritative.isLocked,
                isLocked: authoritative.isLocked,
                subscription_start: u.subscription_start,
                subscription_expires_at: u.subscription_expires_at,
                remaining_days: authoritative.daysRemaining,
              });

              response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
              return response;
            }
          }
        } catch {}
      }

      const response = NextResponse.json({
        id: userId,
        email: payload.email,
        full_name: payload.full_name || payload.email?.split("@")[0],
        company: `${payload.full_name || "Enterprise"} Workspace`,
        role: payload.role || "ADMIN",
        workspace_id: wsId,
        status: payload.status || "ACTIVE",
        is_active: true,
        isLocked: false,
      });
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return response;
    }
  }

  // Fallback default
  const fallback = NextResponse.json({
    id: 1,
    email: "admin@usmanai.com",
    full_name: "Administrator",
    company: "USMAN AI GTM",
    role: "ADMIN",
    workspace_id: 1,
    status: "ACTIVE",
    is_active: true,
    isLocked: false,
  });
  fallback.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return fallback;
}
