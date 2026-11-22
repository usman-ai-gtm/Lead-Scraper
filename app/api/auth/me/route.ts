import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, computeAuthoritativeUserStatus } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  let token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();

  // Support cookie fallback if Authorization header not sent
  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/usman_gtm_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1].trim());
    }
  }

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
              const isOwner = [
                "transaction000501@gmail.com",
                "admin@usmanai.com",
                "mu0602503@gmail.com",
                "admin@usmangtm.com",
                "selftest_founder_2026@usmanai.com",
              ].includes(String(u.email || "").trim().toLowerCase());

              const effectiveRole = isOwner ? "ADMIN" : (u.role || "CLIENT");

              const response = NextResponse.json({
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                company: `${u.full_name}'s Enterprise`,
                role: effectiveRole,
                workspace_id: u.workspace_id,
                status: isOwner ? "ACTIVE" : authoritative.status,
                plan: isOwner ? "LIFETIME" : authoritative.plan,
                is_active: isOwner ? true : authoritative.status === "ACTIVE",
                is_locked: isOwner ? false : authoritative.isLocked,
                isLocked: isOwner ? false : authoritative.isLocked,
                subscription_start: u.subscription_start,
                subscription_expires_at: u.subscription_expires_at,
                remaining_days: isOwner ? "Permanent (Owner)" : authoritative.daysRemaining,
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
