import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured, computeAuthoritativeUserStatus, logAccountAudit } from "@/lib/neon-db";
import { resolveUserEntitlements } from "@/lib/entitlements";
import {
  verifyPassword,
  createJwtToken,
  authenticateServerlessUser,
  isAuthorizedOwner,
} from "@/lib/serverless-auth";
import { consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const email = String(body.email || body.username || body.workEmail || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 }
      );
    }

    const rl = await consumeRateLimit({
      bucket: "client_login",
      identifier: `${ip}:${email}`,
      limit: 12,
      windowSeconds: 300,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(
        rl.retryAfterSeconds,
        `Too many login attempts. Please wait ${rl.retryAfterSeconds} seconds before trying again.`
      );
    }

    // 1. Authoritative Neon PostgreSQL Authentication
    if (isNeonConfigured()) {
      try {
        const sql = getNeonSql();
        if (sql) {
          const users = await sql`
            SELECT id, username, email, full_name, role, account_type, workspace_id, status, plan,
                   plan_type, plan_label, custom_duration_value, custom_duration_unit,
                   custom_price_usd, suggested_price_usd, daily_email_limit, google_maps_enabled,
                   features_json, subscription_start, subscription_expires_at, password_hash, tenant_id,
                   must_change_password, COALESCE(session_version, 1) AS session_version
            FROM users
            WHERE LOWER(username) = LOWER(${email}) OR LOWER(email) = LOWER(${email})
            LIMIT 1
          `;

          if (users && users.length > 0) {
            const user = users[0];

            const statusUpper = (user.status || "ACTIVE").toUpperCase();
            if (statusUpper === "SUSPENDED" || statusUpper === "REVOKED") {
              return NextResponse.json(
                { detail: "Account has been suspended or revoked. Please contact administrator on WhatsApp (+923174383702)." },
                { status: 403 }
              );
            }

            const isValid = verifyPassword(password, user.password_hash);
            if (!isValid) {
              return NextResponse.json(
                { detail: "Incorrect username or password" },
                { status: 401 }
              );
            }

            // Check authoritative account status & subscription timer
            if (!isAuthorizedOwner(user)) {
              const authoritative = computeAuthoritativeUserStatus(user);
              if (authoritative.isLocked) {
                if (authoritative.status === "EXPIRED") {
                  return NextResponse.json(
                    { detail: "Your subscription has expired. Please renew to continue." },
                    { status: 403 }
                  );
                }
                if (authoritative.status === "SUSPENDED" || authoritative.status === "REVOKED") {
                  return NextResponse.json(
                    { detail: "Account has been suspended or revoked. Please contact administrator on WhatsApp (+923174383702)." },
                    { status: 403 }
                  );
                }
                return NextResponse.json(
                  { detail: "Your account is currently locked. Please contact the Owner for activation (+923174383702)." },
                  { status: 403 }
                );
              }
            }

            // Password verified and account active!
            await sql`
              UPDATE users
              SET last_login = NOW(),
                  last_activity_at = NOW(),
                  must_change_password = COALESCE(must_change_password, FALSE)
              WHERE id = ${user.id}
            `.catch(() => {});
            await logAccountAudit({
              adminId: user.id,
              adminEmail: user.username || user.email,
              clientId: user.id,
              clientEmail: user.email || user.username,
              workspaceId: user.workspace_id || 1,
              action: "USER_LOGIN",
              details: { username: user.username, plan: user.plan_type || user.plan },
            });

            const token = createJwtToken({
              sub: String(user.id),
              email: user.email,
              username: user.username,
              full_name: user.full_name,
              role: user.role || "CLIENT",
              account_type: user.account_type || "PAID_CLIENT",
              workspace_id: user.workspace_id || 1,
              tenant_id: user.tenant_id || 1,
              status: user.status || "ACTIVE",
              sv: Number(user.session_version) || 1,
            });

            // Fetch workspace metadata
            let wsName = `${user.full_name}'s Workspace`;
            let wsCreated = new Date().toISOString();
            try {
              const wsRows = await sql`
                SELECT id, name, created_at
                FROM workspaces
                WHERE id = ${user.workspace_id || 1}
                LIMIT 1
              `;
              if (wsRows && wsRows.length > 0) {
                wsName = wsRows[0].name || wsName;
                wsCreated = wsRows[0].created_at || wsCreated;
              }
            } catch {}

            const ent = resolveUserEntitlements(user);
            const authoritative = computeAuthoritativeUserStatus(user);

            const response = NextResponse.json({
              token: token,
              access_token: token,
              token_type: "bearer",
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: ent.isOwner ? "SUPER_ADMIN" : (user.role || "CLIENT"),
                account_type: ent.isOwner ? "MASTER_OWNER" : (user.account_type || "PAID_CLIENT"),
                workspace_id: user.workspace_id || 1,
                status: ent.isOwner ? "ACTIVE" : authoritative.status,
                plan: ent.isOwner ? "OWNER_LIFETIME" : authoritative.plan,
                plan_type: ent.planType,
                plan_label: ent.planLabel,
                google_maps_enabled: ent.googleMapsEnabled,
                daily_email_limit: ent.dailyEmailLimit,
                features: ent.features,
                custom_duration_value: ent.customDurationValue,
                custom_duration_unit: ent.customDurationUnit,
                custom_price_usd: ent.customPriceUsd,
                suggested_price_usd: ent.suggestedPriceUsd,
                subscription_start: user.subscription_start,
                subscription_expires_at: ent.subscriptionExpiresAt,
                remaining_days: ent.isOwner ? "Permanent (Master Owner)" : authoritative.daysRemaining,
                remaining_detailed: ent.isOwner ? "Permanent Access — No Expiry" : authoritative.remainingDetailed,
                isLocked: ent.isOwner ? false : authoritative.isLocked,
                must_change_password: Boolean(user.must_change_password),
                session_version: Number(user.session_version) || 1,
              },
              workspace: {
                id: user.workspace_id || 1,
                name: wsName,
                plan: ent.planType,
                ai_credits: 50000,
                search_credits: 25000,
                created_at: wsCreated,
              },
            });

            response.cookies.set("usman_gtm_token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 7 * 24 * 60 * 60,
            });

            return response;
          }
        }
      } catch (dbErr: any) {
        console.error("Neon authentication lookup error:", dbErr?.message);
      }
    }

    // 2. Resilient Serverless Auth Engine Fallback (in-memory store)
    const result = authenticateServerlessUser(email, password);
    if (!result) {
      return NextResponse.json({ detail: "Incorrect email or password" }, { status: 401 });
    }

    return NextResponse.json({
      token: result.token,
      access_token: result.token,
      token_type: "bearer",
      user: result.user,
      workspace: result.workspace,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Authentication failed" },
      { status: 400 }
    );
  }
}
