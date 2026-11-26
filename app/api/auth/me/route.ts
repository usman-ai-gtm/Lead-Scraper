import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, computeAuthoritativeUserStatus } from "@/lib/neon-db";
import { resolveUserEntitlements } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  let token = authHeader?.replace(/^Bearer\s+/i, "")?.trim() || "";
  if (token === "null" || token === "undefined") {
    token = "";
  }

  // Support cookie fallback if Authorization header not sent or invalid placeholder
  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/usman_gtm_token=([^;]+)/);
    if (match) {
      const candidate = decodeURIComponent(match[1].trim());
      if (candidate && candidate !== "null" && candidate !== "undefined") {
        token = candidate;
      }
    }
  }

  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) {
      const userId = Number(payload.sub) || 0;
      const wsId = Number(payload.workspace_id) || 1;

      if (isNeonConfigured() && userId > 0) {
        try {
          const sql = getNeonSql();
          if (sql) {
            const users = await sql`
              SELECT id, username, email, full_name, role, account_type, workspace_id, status, plan,
                     plan_type, plan_label, custom_duration_value, custom_duration_unit,
                     custom_price_usd, suggested_price_usd, daily_email_limit, google_maps_enabled,
                     features_json, subscription_start, subscription_expires_at, subscription_status,
                     must_change_password, COALESCE(session_version, 1) AS session_version
              FROM users
              WHERE id = ${userId}
              LIMIT 1
            `;
            if (!users || users.length === 0) {
              return NextResponse.json(
                { detail: "User account not found. Please sign in again." },
                { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
              );
            }
            {
              const u = users[0];
              const ent = resolveUserEntitlements(u);
              const isOwner = ent.isOwner;
              const tokenSv = payload.sv != null ? Number(payload.sv) : 1;
              const dbSv = Number(u.session_version || 1);
              if (!isOwner && tokenSv !== dbSv) {
                return NextResponse.json(
                  { detail: "Session invalidated. Please sign in again." },
                  { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
                );
              }
              const authoritative = computeAuthoritativeUserStatus(u);

              const effectiveRole = isOwner ? "SUPER_ADMIN" : (u.role || "CLIENT");
              const effectiveAccountType = isOwner ? "MASTER_OWNER" : (u.account_type || "CLIENT");

              const response = NextResponse.json({
                id: u.id,
                username: u.username,
                email: u.email,
                full_name: u.full_name,
                company: isOwner ? "USMAN AI GTM Command Center" : `${u.full_name}'s Enterprise`,
                role: effectiveRole,
                account_type: effectiveAccountType,
                workspace_id: u.workspace_id,
                status: isOwner ? "ACTIVE" : authoritative.status,
                plan: isOwner ? "OWNER_LIFETIME" : authoritative.plan,
                plan_type: ent.planType,
                plan_label: ent.planLabel,
                google_maps_enabled: ent.googleMapsEnabled,
                daily_email_limit: ent.dailyEmailLimit,
                features: ent.features,
                custom_duration_value: ent.customDurationValue,
                custom_duration_unit: ent.customDurationUnit,
                custom_price_usd: ent.customPriceUsd,
                suggested_price_usd: ent.suggestedPriceUsd,
                is_active: isOwner ? true : authoritative.status === "ACTIVE",
                is_locked: isOwner ? false : authoritative.isLocked,
                isLocked: isOwner ? false : authoritative.isLocked,
                is_expired: isOwner ? false : authoritative.isExpired,
                must_change_password: isOwner ? false : Boolean(u.must_change_password),
                session_version: dbSv,
                subscription_start: u.subscription_start,
                subscription_expires_at: ent.subscriptionExpiresAt,
                remaining_days: isOwner ? "Permanent (Master Owner)" : authoritative.daysRemaining,
                remaining_detailed: isOwner ? "Permanent Access — No Expiry" : authoritative.remainingDetailed,
              });

              response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
              return response;
            }
          }
        } catch {}
      }

      const fallbackEnt = resolveUserEntitlements(payload);
      const response = NextResponse.json({
        id: userId,
        email: payload.email,
        full_name: payload.full_name || payload.email?.split("@")[0],
        company: `${payload.full_name || "Enterprise"} Workspace`,
        role: payload.role || "CLIENT",
        account_type: payload.account_type || "CLIENT",
        workspace_id: wsId,
        status: payload.status || "LOCKED",
        plan: fallbackEnt.planType,
        plan_type: fallbackEnt.planType,
        plan_label: fallbackEnt.planLabel,
        google_maps_enabled: fallbackEnt.googleMapsEnabled,
        daily_email_limit: fallbackEnt.dailyEmailLimit,
        features: fallbackEnt.features,
        is_active: !fallbackEnt.isLocked,
        isLocked: fallbackEnt.isLocked,
      });
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return response;
    }
  }

  return NextResponse.json(
    { detail: "Authentication required" },
    { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
  );
}
