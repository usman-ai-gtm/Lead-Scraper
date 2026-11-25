import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured, logAccountAudit, computeAuthoritativeUserStatus } from "@/lib/neon-db";
import {
  BASIC_FEATURES,
  ALL_FEATURES_ENABLED,
  BASIC_DAILY_EMAIL_LIMIT,
  LIFETIME_GMAIL_DAILY_SAFE_CAP,
  MAX_GMAIL_DAILY_SAFE_CAP,
  DurationUnit,
  normalizeFeatures,
  calculateCustomPlanExpiresAt,
  calculateSuggestedCustomPrice,
  formatDurationLabel,
} from "@/lib/entitlements";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required to manage client subscriptions." },
        { status: 403 }
      );
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId)) {
      return NextResponse.json({ detail: "Invalid client ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toUpperCase();
    const notes = body.notes ? String(body.notes) : null;

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
    }
    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "DB connection failed" }, { status: 503 });

    // Fetch current client (strict RBAC: cannot modify admin or Master Owner accounts)
    const existing = await sql`
      SELECT id, username, email, full_name, role, account_type, workspace_id, status, plan, plan_type, plan_label,
             custom_duration_value, custom_duration_unit, daily_email_limit, google_maps_enabled,
             features_json, active, is_active, subscription_start, subscription_expires_at, subscription_status
      FROM users
      WHERE id = ${clientId} AND role NOT IN ('ADMIN', 'SUPER_ADMIN') AND (account_type IS NULL OR account_type != 'MASTER_OWNER') AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ detail: "Client not found or cannot modify admin account." }, { status: 404 });
    }

    const client = existing[0];
    let updated: any = null;

    switch (action) {
      case "ACTIVATE_BASIC": {
        // Basic: $25 / 30 Days (auto-locks after 30 days, Maps OFF, 10 emails/day)
        const basicFeaturesStr = JSON.stringify(BASIC_FEATURES);
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = 'BASIC',
              plan_type = 'BASIC',
              plan_label = 'Basic Plan ($25 / 30 Days)',
              custom_duration_value = 30,
              custom_duration_unit = 'days',
              custom_price_usd = 25,
              suggested_price_usd = 25,
              daily_email_limit = ${BASIC_DAILY_EMAIL_LIMIT},
              google_maps_enabled = FALSE,
              features_json = ${basicFeaturesStr}::jsonb,
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = NOW() + INTERVAL '30 days',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, plan_type, plan_label, google_maps_enabled,
                    daily_email_limit, features_json, custom_duration_value, custom_duration_unit,
                    custom_price_usd, suggested_price_usd, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "ACTIVATE_LIFETIME": {
        // Lifetime: $100 One-Time (permanent access, no expiry, Maps ON, 500 emails/day cap)
        const allFeaturesStr = JSON.stringify(ALL_FEATURES_ENABLED);
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = 'LIFETIME',
              plan_type = 'LIFETIME',
              plan_label = 'Lifetime Plan ($100 One-Time)',
              custom_duration_value = NULL,
              custom_duration_unit = 'lifetime',
              custom_price_usd = 100,
              suggested_price_usd = 100,
              daily_email_limit = ${LIFETIME_GMAIL_DAILY_SAFE_CAP},
              google_maps_enabled = TRUE,
              features_json = ${allFeaturesStr}::jsonb,
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = NULL,
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, plan_type, plan_label, google_maps_enabled,
                    daily_email_limit, features_json, custom_duration_value, custom_duration_unit,
                    custom_price_usd, suggested_price_usd, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "ACTIVATE_CUSTOM":
      case "EXTEND_CUSTOM": {
        const validUnits: DurationUnit[] = ["hours", "days", "weeks", "months", "years", "lifetime"];
        const durationUnit = String(body.duration_unit || client.custom_duration_unit || "days").toLowerCase() as DurationUnit;
        if (!validUnits.includes(durationUnit)) {
          return NextResponse.json({ detail: "Invalid custom duration_unit." }, { status: 400 });
        }
        const durationValue =
          durationUnit === "lifetime"
            ? null
            : Math.max(1, Math.floor(Number(body.duration_value ?? client.custom_duration_value) || 1));

        const normalizedFeatures = normalizeFeatures(
          body.features ?? client.features_json ?? BASIC_FEATURES,
          body.google_maps_enabled !== undefined ? Boolean(body.google_maps_enabled) : undefined
        );
        if (Object.values(normalizedFeatures).filter(Boolean).length === 0) {
          return NextResponse.json({ detail: "Enable at least 1 feature for a Custom Plan." }, { status: 400 });
        }

        const googleMapsEnabled = Boolean(normalizedFeatures.google_maps && body.google_maps_enabled !== false);
        if (!googleMapsEnabled) {
          normalizedFeatures.google_maps = false;
          normalizedFeatures.multi_country_maps = false;
        }
        const dailyEmailLimit = normalizedFeatures.cold_email
          ? Math.max(1, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Math.floor(Number(body.daily_email_limit ?? client.daily_email_limit ?? 10))))
          : 0;

        const priceCalc = calculateSuggestedCustomPrice({
          features: normalizedFeatures,
          durationValue,
          durationUnit,
          dailyEmailLimit,
        });
        const suggestedPriceUsd = priceCalc.suggestedPriceUsd;
        const customPriceUsd =
          body.custom_price_usd !== undefined && body.custom_price_usd !== null && body.custom_price_usd !== ""
            ? Number(Number(body.custom_price_usd).toFixed(2))
            : suggestedPriceUsd;

        const baseDate =
          action === "EXTEND_CUSTOM" &&
          client.subscription_expires_at &&
          new Date(client.subscription_expires_at).getTime() > Date.now()
            ? new Date(client.subscription_expires_at)
            : new Date();
        const expiryDate = calculateCustomPlanExpiresAt(baseDate, durationValue, durationUnit);
        const expiryIso = expiryDate ? expiryDate.toISOString() : null;
        const durLabel = formatDurationLabel(durationValue, durationUnit);
        const planLabel =
          body.plan_label && String(body.plan_label).trim()
            ? String(body.plan_label).trim()
            : `Custom (${durLabel} • $${customPriceUsd})`;
        const featJsonStr = JSON.stringify(normalizedFeatures);

        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = 'CUSTOM',
              plan_type = 'CUSTOM',
              plan_label = ${planLabel},
              custom_duration_value = ${durationValue},
              custom_duration_unit = ${durationUnit},
              custom_price_usd = ${customPriceUsd},
              suggested_price_usd = ${suggestedPriceUsd},
              daily_email_limit = ${dailyEmailLimit},
              google_maps_enabled = ${googleMapsEnabled},
              features_json = ${featJsonStr}::jsonb,
              subscription_status = 'ACTIVE',
              subscription_start = CASE WHEN ${action === "ACTIVATE_CUSTOM"} THEN NOW() ELSE COALESCE(subscription_start, NOW()) END,
              subscription_expires_at = ${expiryIso}::timestamptz,
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, plan_type, plan_label, google_maps_enabled,
                    daily_email_limit, features_json, custom_duration_value, custom_duration_unit,
                    custom_price_usd, suggested_price_usd, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "EXTEND_30":
      case "RENEW": {
        // If current expiry is in the future, add 30 days to it. Otherwise add 30 days from now.
        const currentExp = client.subscription_expires_at ? new Date(client.subscription_expires_at) : new Date();
        const baseTime = currentExp.getTime() > Date.now() ? currentExp : new Date();
        const newExpiry = new Date(baseTime.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = COALESCE(plan, 'BASIC'),
              subscription_status = 'ACTIVE',
              subscription_expires_at = ${newExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "SET_EXPIRY": {
        const customExpiry = body.expires_at ? new Date(body.expires_at).toISOString() : null;
        if (!customExpiry) {
          return NextResponse.json({ detail: "Valid expires_at ISO date string is required." }, { status: 400 });
        }
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              subscription_status = 'ACTIVE',
              subscription_expires_at = ${customExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "CHANGE_SUBSCRIPTION": {
        const targetPlan = String(body.plan || "BASIC").toUpperCase();
        const isLifetimeTarget = targetPlan === "LIFETIME";
        const newExpiry = isLifetimeTarget ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        updated = await sql`
          UPDATE users
          SET status = 'ACTIVE',
              active = 1,
              is_active = 1,
              plan = ${targetPlan},
              subscription_status = 'ACTIVE',
              subscription_start = NOW(),
              subscription_expires_at = ${newExpiry},
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "LOCK": {
        // Lock: instant server-side revocation of active access
        updated = await sql`
          UPDATE users
          SET status = 'LOCKED',
              active = 0,
              is_active = 0,
              subscription_status = 'LOCKED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "UNLOCK":
      case "ACTIVATE":
      case "RESTORE": {
        // Unlock / Activate: removes suspension ONLY. Never grants free days to an expired subscription.
        const planRawUpper = String(client.plan_type || client.plan || "BASIC").toUpperCase();
        const durUnitLower = String(client.custom_duration_unit || "").toLowerCase();
        const isLifetimeSub =
          planRawUpper === "LIFETIME" || (planRawUpper === "CUSTOM" && durUnitLower === "lifetime");
        const expMs = client.subscription_expires_at ? new Date(client.subscription_expires_at).getTime() : NaN;
        const isExpiredAlready = !isLifetimeSub && (!client.subscription_expires_at || Number.isNaN(expMs) || expMs <= Date.now());

        if (isExpiredAlready) {
          updated = await sql`
            UPDATE users
            SET status = 'EXPIRED',
                active = 0,
                is_active = 0,
                subscription_status = 'EXPIRED',
                subscription_notes = COALESCE(${notes}, subscription_notes),
                updated_at = NOW()
            WHERE id = ${clientId}
            RETURNING id, username, email, full_name, role, workspace_id, status, plan, plan_type, plan_label,
                      custom_duration_value, custom_duration_unit, daily_email_limit, google_maps_enabled,
                      features_json, active, is_active, subscription_start, subscription_expires_at, subscription_status
          `;
        } else {
          updated = await sql`
            UPDATE users
            SET status = 'ACTIVE',
                active = 1,
                is_active = 1,
                subscription_status = 'ACTIVE',
                subscription_notes = COALESCE(${notes}, subscription_notes),
                updated_at = NOW()
            WHERE id = ${clientId}
            RETURNING id, username, email, full_name, role, workspace_id, status, plan, plan_type, plan_label,
                      custom_duration_value, custom_duration_unit, daily_email_limit, google_maps_enabled,
                      features_json, active, is_active, subscription_start, subscription_expires_at, subscription_status
          `;
        }
        break;
      }

      case "SUSPEND": {
        updated = await sql`
          UPDATE users
          SET status = 'SUSPENDED',
              active = 0,
              is_active = 0,
              subscription_status = 'SUSPENDED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      case "REVOKE":
      case "DEACTIVATE": {
        updated = await sql`
          UPDATE users
          SET status = 'REVOKED',
              active = 0,
              is_active = 0,
              subscription_status = 'REVOKED',
              subscription_notes = COALESCE(${notes}, subscription_notes),
              updated_at = NOW()
          WHERE id = ${clientId}
          RETURNING id, email, full_name, role, status, plan, active, is_active,
                    subscription_start, subscription_expires_at, subscription_status
        `;
        break;
      }

      default:
        return NextResponse.json(
          { detail: "Invalid action. Supported: ACTIVATE_BASIC, ACTIVATE_LIFETIME, ACTIVATE_CUSTOM, EXTEND_CUSTOM, EXTEND_30, SET_EXPIRY, LOCK, UNLOCK, ACTIVATE, SUSPEND, REVOKE, DEACTIVATE" },
          { status: 400 }
        );
    }

    const updatedUser = updated?.[0];
    const authoritative = updatedUser ? computeAuthoritativeUserStatus(updatedUser) : null;
    const restoredAccess =
      (action === "UNLOCK" || action === "ACTIVATE" || action === "RESTORE")
        ? !authoritative?.isLocked
        : undefined;

    // Log action to account_audit_logs with proper workspace association
    await logAccountAudit({
      adminId: user.id,
      adminEmail: user.email || user.username || "master_owner",
      clientId: client.id,
      clientEmail: client.email || client.username,
      workspaceId: client.workspace_id || 1,
      action: `SUBSCRIPTION_${action}`,
      details: {
        previous_status: client.status,
        previous_plan: client.plan,
        authoritative_status: authoritative?.status,
        restored_access: restoredAccess,
        notes,
      },
    });

    const msg =
      (action === "UNLOCK" || action === "ACTIVATE" || action === "RESTORE") && authoritative?.status === "EXPIRED"
        ? `Suspension cleared for #${clientId}, but subscription expired — paid access stays LOCKED until renewed.`
        : `Client #${clientId} subscription updated via ${action}.`;

    return NextResponse.json({
      status: "success",
      restored_access: restoredAccess,
      client: updatedUser ? { ...updatedUser, ...authoritative } : null,
      message: msg,
    });
  } catch (err: any) {
    console.error("[Admin Subscription Update] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to update client subscription." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  return POST(req, { params });
}
export async function PUT(req: Request, { params }: RouteParams) {
  return POST(req, { params });
}
