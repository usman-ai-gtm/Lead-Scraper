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
  resolveUserEntitlements,
  formatDurationLabel,
  calculateSuggestedCustomPrice,
} from "@/lib/entitlements";
import { FIXED_PLAN_SPECS, CUSTOM_UNIT_PRICING, normalizeBuilderUnit } from "@/lib/custom-plans";
import { createSystemNotification } from "@/lib/notifications-db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

const AUTHORITATIVE_CLIENT_COLS = `
  id, username, email, full_name, role, account_type, workspace_id, status,
  plan, plan_type, plan_label, google_maps_enabled, daily_email_limit, features_json,
  custom_duration_value, custom_duration_unit, custom_price_usd, suggested_price_usd,
  active, is_active, subscription_start, subscription_expires_at, subscription_status,
  COALESCE(must_change_password, FALSE) AS must_change_password,
  COALESCE(session_version, 1) AS session_version
`;

function getDurationSeconds(durationValue: number | null, durationUnit: DurationUnit): number {
  if (durationUnit === "lifetime") return 0;
  const val = Math.max(1, Math.floor(Number(durationValue) || 1));
  const secPerUnit: Record<Exclude<DurationUnit, "lifetime">, number> = {
    hours: 3600,
    days: 24 * 3600,
    weeks: 7 * 24 * 3600,
    months: 30 * 24 * 3600,
    years: 365 * 24 * 3600,
  };
  return val * (secPerUnit[durationUnit] || secPerUnit.days);
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
    let action = String(body.action || "").toUpperCase();
    const notes = body.notes ? String(body.notes) : null;

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database unavailable" }, { status: 503 });
    }
    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ detail: "DB connection failed" }, { status: 503 });

    // Fetch existing authoritative client record (strict RBAC: never modify admin or Master Owner)
    const existing = await sql.query(
      `SELECT ${AUTHORITATIVE_CLIENT_COLS}, NOW() AS db_now
       FROM users
       WHERE id = $1
         AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
         AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
         AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
       LIMIT 1`,
      [clientId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ detail: "Client not found or cannot modify admin account." }, { status: 404 });
    }

    const client = existing[0];
    const currentEnt = resolveUserEntitlements(client);

    // Normalize CHANGE_SUBSCRIPTION onto authoritative tier actions
    if (action === "CHANGE_SUBSCRIPTION") {
      const targetPlan = String(body.plan || "BASIC").toUpperCase();
      if (targetPlan === "LIFETIME") action = "ACTIVATE_LIFETIME";
      else if (targetPlan === "CUSTOM") action = "ACTIVATE_CUSTOM";
      else action = "ACTIVATE_BASIC";
    }

    switch (action) {
      case "ACTIVATE_BASIC": {
        const basicFeaturesStr = JSON.stringify(BASIC_FEATURES);
        await sql.query(
          `UPDATE users
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
               max_leads_quota = $5,
               daily_email_limit = $1,
               google_maps_enabled = FALSE,
               features_json = $2::jsonb,
               subscription_status = 'ACTIVE',
               subscription_start = NOW(),
               subscription_expires_at = NOW() + INTERVAL '30 days',
               subscription_notes = COALESCE($3, subscription_notes),
               updated_at = NOW()::text
           WHERE id = $4`,
          [BASIC_DAILY_EMAIL_LIMIT, basicFeaturesStr, notes, clientId, FIXED_PLAN_SPECS.BASIC.leadAllowance]
        );
        break;
      }

      case "ACTIVATE_LIFETIME": {
        const allFeaturesStr = JSON.stringify(ALL_FEATURES_ENABLED);
        await sql.query(
          `UPDATE users
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
               max_leads_quota = $5,
               daily_email_limit = $1,
               google_maps_enabled = TRUE,
               features_json = $2::jsonb,
               subscription_status = 'ACTIVE',
               subscription_start = NOW(),
               subscription_expires_at = NULL,
               subscription_notes = COALESCE($3, subscription_notes),
               updated_at = NOW()::text
           WHERE id = $4`,
          [LIFETIME_GMAIL_DAILY_SAFE_CAP, allFeaturesStr, notes, clientId, FIXED_PLAN_SPECS.LIFETIME.leadAllowance]
        );
        break;
      }

      case "ACTIVATE_CUSTOM":
      case "EXTEND_CUSTOM": {
        const validUnits: DurationUnit[] = ["hours", "days", "weeks", "months", "years", "lifetime"];
        const defaultUnit =
          String(client.custom_duration_unit || "days").toLowerCase() === "lifetime"
            ? "hours"
            : String(client.custom_duration_unit || "days").toLowerCase();
        const durationUnit = String(body.duration_unit || defaultUnit).toLowerCase() as DurationUnit;
        if (!validUnits.includes(durationUnit)) {
          return NextResponse.json({ detail: "Invalid custom duration_unit." }, { status: 400 });
        }

        const durationValue =
          durationUnit === "lifetime"
            ? null
            : Math.max(1, Math.floor(Number(body.duration_value ?? client.custom_duration_value) || 1));

        const preserveExistingFeatures =
          action === "EXTEND_CUSTOM" && Boolean(body.preserve_features) && body.features === undefined;
        const normalizedFeatures = preserveExistingFeatures
          ? currentEnt.features
          : normalizeFeatures(
              body.features ?? client.features_json ?? currentEnt.features ?? BASIC_FEATURES,
              body.google_maps_enabled !== undefined ? Boolean(body.google_maps_enabled) : undefined
            );

        if (Object.values(normalizedFeatures).filter(Boolean).length === 0) {
          return NextResponse.json({ detail: "Enable at least 1 feature for a Custom Plan." }, { status: 400 });
        }

        const googleMapsEnabled = preserveExistingFeatures
          ? Boolean(currentEnt.googleMapsEnabled && normalizedFeatures.google_maps)
          : Boolean(normalizedFeatures.google_maps && body.google_maps_enabled !== false);
        if (!googleMapsEnabled) {
          normalizedFeatures.google_maps = false;
          normalizedFeatures.multi_country_maps = false;
        }

        const dailyEmailLimit = normalizedFeatures.cold_email
          ? Math.max(
              1,
              Math.min(
                MAX_GMAIL_DAILY_SAFE_CAP,
                Math.floor(
                  Number(
                    body.daily_email_limit !== undefined
                      ? body.daily_email_limit
                      : currentEnt.dailyEmailLimit || BASIC_DAILY_EMAIL_LIMIT
                  )
                )
              )
            )
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

        const builderUnit = normalizeBuilderUnit(durationUnit);
        const computedMaxLeadsQuota =
          body.max_leads_quota !== undefined && body.max_leads_quota !== null && Number(body.max_leads_quota) > 0
            ? Math.floor(Number(body.max_leads_quota))
            : builderUnit && durationValue
            ? durationValue * CUSTOM_UNIT_PRICING[builderUnit].leadsPerUnit
            : FIXED_PLAN_SPECS.LIFETIME.leadAllowance;

        const deltaSec = getDurationSeconds(durationValue, durationUnit);
        const durLabel = formatDurationLabel(durationValue, durationUnit);
        const planLabel =
          body.plan_label && String(body.plan_label).trim()
            ? String(body.plan_label).trim()
            : action === "EXTEND_CUSTOM"
            ? `Custom (+${durLabel} Extended • $${customPriceUsd})`
            : `Custom (${durLabel} • $${customPriceUsd})`;
        const featJsonStr = JSON.stringify(normalizedFeatures);

        if (durationUnit === "lifetime") {
          await sql.query(
            `UPDATE users
             SET status = 'ACTIVE',
                 active = 1,
                 is_active = 1,
                 plan = 'CUSTOM',
                 plan_type = 'CUSTOM',
                 plan_label = $1,
                 custom_duration_value = NULL,
                 custom_duration_unit = 'lifetime',
                 custom_price_usd = $2,
                 suggested_price_usd = $3,
                 daily_email_limit = $4,
                 google_maps_enabled = $5,
                 features_json = $6::jsonb,
                 subscription_status = 'ACTIVE',
                 subscription_start = CASE WHEN $7 THEN NOW() ELSE COALESCE(subscription_start, NOW()) END,
                 subscription_expires_at = NULL,
                 subscription_notes = COALESCE($8, subscription_notes),
                 updated_at = NOW()::text
             WHERE id = $9`,
            [
              planLabel,
              customPriceUsd,
              suggestedPriceUsd,
              dailyEmailLimit,
              googleMapsEnabled,
              featJsonStr,
              action === "ACTIVATE_CUSTOM",
              notes,
              clientId,
            ]
          );
        } else {
          // Authoritative PostgreSQL NOW() arithmetic — zero JS clock skew
          await sql.query(
            `UPDATE users
             SET status = 'ACTIVE',
                 active = 1,
                 is_active = 1,
                 plan = 'CUSTOM',
                 plan_type = 'CUSTOM',
                 plan_label = $1,
                 custom_duration_value = $2,
                 custom_duration_unit = $3,
                 custom_price_usd = $4,
                 suggested_price_usd = $5,
                 daily_email_limit = $6,
                 google_maps_enabled = $7,
                 features_json = $8::jsonb,
                 max_leads_quota = $14,
                 subscription_status = 'ACTIVE',
                 subscription_start = CASE WHEN $9 THEN NOW() ELSE COALESCE(subscription_start, NOW()) END,
                 subscription_expires_at = CASE
                   WHEN $10 AND subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW()
                     THEN subscription_expires_at + ($11::bigint * INTERVAL '1 second')
                   ELSE NOW() + ($11::bigint * INTERVAL '1 second')
                 END,
                 subscription_notes = COALESCE($12, subscription_notes),
                 updated_at = NOW()::text
             WHERE id = $13`,
            [
              planLabel,
              durationValue,
              durationUnit,
              customPriceUsd,
              suggestedPriceUsd,
              dailyEmailLimit,
              googleMapsEnabled,
              featJsonStr,
              action === "ACTIVATE_CUSTOM",
              action === "EXTEND_CUSTOM",
              deltaSec,
              notes,
              clientId,
              computedMaxLeadsQuota,
            ]
          );
        }
        break;
      }

      case "EXTEND_30":
      case "RENEW": {
        const targetFeaturesStr = JSON.stringify(currentEnt.features);
        const keepPlanType = currentEnt.planType === "CUSTOM" ? "CUSTOM" : currentEnt.planType === "LIFETIME" ? "LIFETIME" : "BASIC";
        const mapsKeep = keepPlanType === "BASIC" ? false : currentEnt.googleMapsEnabled;
        await sql.query(
          `UPDATE users
           SET status = 'ACTIVE',
               active = 1,
               is_active = 1,
               plan = $1,
               plan_type = $1,
               google_maps_enabled = $2,
               features_json = $3::jsonb,
               daily_email_limit = $4,
               subscription_status = 'ACTIVE',
               subscription_start = COALESCE(subscription_start, NOW()),
               subscription_expires_at = CASE
                 WHEN $1 = 'LIFETIME' THEN NULL
                 WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW()
                   THEN subscription_expires_at + INTERVAL '30 days'
                 ELSE NOW() + INTERVAL '30 days'
               END,
               subscription_notes = COALESCE($5, subscription_notes),
               updated_at = NOW()::text
           WHERE id = $6`,
          [keepPlanType, mapsKeep, targetFeaturesStr, currentEnt.dailyEmailLimit || BASIC_DAILY_EMAIL_LIMIT, notes, clientId]
        );
        break;
      }

      case "SET_EXPIRY": {
        const customExpiry = body.expires_at ? new Date(body.expires_at).toISOString() : null;
        if (!customExpiry || Number.isNaN(new Date(customExpiry).getTime())) {
          return NextResponse.json({ detail: "Valid expires_at ISO date string is required." }, { status: 400 });
        }
        await sql.query(
          `UPDATE users
           SET status = CASE WHEN $1::timestamptz > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END,
               active = CASE WHEN $1::timestamptz > NOW() THEN 1 ELSE 0 END,
               is_active = CASE WHEN $1::timestamptz > NOW() THEN 1 ELSE 0 END,
               subscription_status = CASE WHEN $1::timestamptz > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END,
               subscription_expires_at = $1::timestamptz,
               subscription_notes = COALESCE($2, subscription_notes),
               updated_at = NOW()::text
           WHERE id = $3`,
          [customExpiry, notes, clientId]
        );
        break;
      }

      case "LOCK":
      case "SUSPEND":
      case "REVOKE":
      case "DEACTIVATE": {
        const targetStatus =
          action === "LOCK"
            ? "LOCKED"
            : action === "SUSPEND" || action === "DEACTIVATE"
            ? "SUSPENDED"
            : "REVOKED";
        // Only explicit REVOKE increments session_version; LOCK / SUSPEND / DEACTIVATE preserve session_version so Unlock/Activate resumes cleanly without false session_expired=true
        const bumpSvSql =
          targetStatus === "REVOKED"
            ? "session_version = COALESCE(session_version, 1) + 1,"
            : "";
        await sql.query(
          `UPDATE users
           SET status = $1::text,
               active = 0,
               is_active = 0,
               subscription_status = $2::varchar,
               ${bumpSvSql}
               subscription_notes = COALESCE($3, subscription_notes),
               updated_at = NOW()::text
           WHERE id = $4::int4`,
          [targetStatus, targetStatus, notes, clientId]
        );
        break;
      }

      case "UNLOCK":
      case "ACTIVATE":
      case "RESTORE": {
        const isLifetimeSub =
          currentEnt.planType === "LIFETIME" ||
          (currentEnt.planType === "CUSTOM" &&
            String(client.custom_duration_unit || "").toLowerCase() === "lifetime");

        if (isLifetimeSub) {
          await sql.query(
            `UPDATE users
             SET status = 'ACTIVE',
                 active = 1,
                 is_active = 1,
                 subscription_status = 'ACTIVE',
                 subscription_notes = COALESCE($1, subscription_notes),
                 updated_at = NOW()::text
             WHERE id = $2`,
            [notes, clientId]
          );
        } else {
          // Authoritative PostgreSQL NOW() check — refuses restoring access if expired
          await sql.query(
            `UPDATE users
             SET status = CASE
                   WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW() THEN 'ACTIVE'
                   ELSE 'EXPIRED'
                 END,
                 active = CASE
                   WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW() THEN 1
                   ELSE 0
                 END,
                 is_active = CASE
                   WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW() THEN 1
                   ELSE 0
                 END,
                 subscription_status = CASE
                   WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW() THEN 'ACTIVE'
                   ELSE 'EXPIRED'
                 END,
                 subscription_notes = COALESCE($1, subscription_notes),
                 updated_at = NOW()::text
             WHERE id = $2`,
            [notes, clientId]
          );
        }
        break;
      }

      default:
        return NextResponse.json(
          {
            detail:
              "Invalid action. Supported: ACTIVATE_BASIC, ACTIVATE_LIFETIME, ACTIVATE_CUSTOM, EXTEND_CUSTOM, EXTEND_30, RENEW, SET_EXPIRY, CHANGE_SUBSCRIPTION, LOCK, UNLOCK, ACTIVATE, SUSPEND, REVOKE, DEACTIVATE",
          },
          { status: 400 }
        );
    }

    // Mandatory post-commit DB re-fetch verification (Part B3 & Part C #10)
    const verifiedRows = await sql.query(
      `SELECT ${AUTHORITATIVE_CLIENT_COLS}, NOW() AS db_now FROM users WHERE id = $1 LIMIT 1`,
      [clientId]
    );
    const verifiedUser = verifiedRows?.[0];
    if (!verifiedUser) {
      return NextResponse.json(
        { detail: "Verification failed: target client record missing after update." },
        { status: 500 }
      );
    }

    const authoritative = computeAuthoritativeUserStatus(verifiedUser);
    const verifiedEnt = resolveUserEntitlements(verifiedUser);
    const restoredAccess =
      action === "UNLOCK" || action === "ACTIVATE" || action === "RESTORE"
        ? !authoritative.isLocked
        : undefined;

    await logAccountAudit({
      adminId: user.id,
      adminEmail: user.email || user.username || "master_owner",
      clientId: client.id,
      clientEmail: client.email || client.username,
      workspaceId: client.workspace_id || 1,
      action: `SUBSCRIPTION_${action}`,
      details: {
        previous_status: client.status,
        previous_plan: client.plan_type || client.plan,
        previous_expires_at: client.subscription_expires_at || null,
        authoritative_status: authoritative.status,
        verified_plan: verifiedEnt.planType,
        verified_plan_label: verifiedEnt.planLabel,
        verified_google_maps_enabled: verifiedEnt.googleMapsEnabled,
        verified_expires_at: verifiedEnt.subscriptionExpiresAt,
        session_version: verifiedUser.session_version,
        restored_access: restoredAccess,
        notes,
      },
    });

    const isActivationAction =
      action.startsWith("ACTIVATE_") || action === "EXTEND_30" || action === "RENEW" || action === "EXTEND_CUSTOM" || action === "UNLOCK" || action === "RESTORE";
    await createSystemNotification({
      workspaceId: Number(client.workspace_id) || 1,
      userId: Number(client.id),
      isAdminTarget: false,
      title: isActivationAction ? "Subscription Updated & Activated" : `Account Status Updated (${authoritative.status})`,
      message: isActivationAction
        ? `Your ${verifiedEnt.planLabel} is now ${authoritative.status}. (${authoritative.remainingDetailed}).`
        : `Account status changed to ${authoritative.status} by Administrator.`,
      type: authoritative.isLocked ? "warning" : "success",
      category: isActivationAction ? "subscription_activated" : "account_status",
      link: "/app/subscription",
      refType: "user",
      refId: String(client.id),
    }).catch(() => {});

    const msg =
      (action === "UNLOCK" || action === "ACTIVATE" || action === "RESTORE") && authoritative.status === "EXPIRED"
        ? `Suspension cleared for #${clientId}, but subscription expired — paid access stays LOCKED until renewed.`
        : `Client #${clientId} verified in DB after ${action} (${verifiedEnt.planLabel}, status: ${authoritative.status}).`;

    return NextResponse.json({
      status: "success",
      verified: true,
      restored_access: restoredAccess,
      client: {
        ...verifiedUser,
        ...authoritative,
        raw_plan: authoritative.plan,
      },
      verification: {
        db_checked_at: verifiedUser.db_now,
        status: authoritative.status,
        plan: verifiedEnt.planType,
        plan_label: verifiedEnt.planLabel,
        google_maps_enabled: verifiedEnt.googleMapsEnabled,
        daily_email_limit: verifiedEnt.dailyEmailLimit,
        subscription_expires_at: verifiedEnt.subscriptionExpiresAt,
        session_version: verifiedUser.session_version,
        features: verifiedEnt.features,
      },
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
