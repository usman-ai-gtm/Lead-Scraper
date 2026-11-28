import { getNeonSql, logAccountAudit } from "@/lib/neon-db";
import {
  BASIC_FEATURES,
  ALL_FEATURES_ENABLED,
  BASIC_DAILY_EMAIL_LIMIT,
  LIFETIME_GMAIL_DAILY_SAFE_CAP,
  MAX_GMAIL_DAILY_SAFE_CAP,
  DurationUnit,
  normalizeFeatures,
  formatDurationLabel,
  calculateSuggestedCustomPrice,
} from "@/lib/entitlements";
import { FIXED_PLAN_SPECS, CUSTOM_UNIT_PRICING, normalizeBuilderUnit } from "@/lib/custom-plans";

let googleColsEnsured = false;

export async function ensureGoogleTrackingColumns(): Promise<void> {
  if (googleColsEnsured) return;
  const sql = getNeonSql();
  if (!sql) return;
  const ddls = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_google_signin_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_google_signin_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS converted_from_preview_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS converted_by_admin_id INTEGER",
  ];
  for (const ddl of ddls) {
    await sql.query(ddl).catch(() => {});
  }
  googleColsEnsured = true;
}

/**
 * Atomically convert an eligible Google / Free Preview user to a Paid Customer IN PLACE.
 * Strictly preserves: same user id, same email/username, same google_sub, same auth_provider,
 * same workspace_id, and all saved leads, searches, profiles, and Gmail connections.
 * Prevents race conditions and duplicate conversions via conditional SQL WHERE clause.
 */
export async function convertPreviewUserToPaid(params: {
  clientId: number;
  adminId: number;
  adminEmail?: string;
  plan: "BASIC" | "LIFETIME" | "CUSTOM";
  customPriceUsd?: number | null;
  agreedCurrency?: string;
  durationValue?: number | null;
  durationUnit?: DurationUnit;
  expiresAtIso?: string | null;
  dailyEmailLimit?: number;
  googleMapsEnabled?: boolean;
  features?: Partial<typeof BASIC_FEATURES>;
  maxLeadsQuota?: number | null;
  planLabel?: string;
  notes?: string;
}): Promise<
  | { ok: true; client: any }
  | { ok: false; statusCode: number; error: string; existingClient?: any }
> {
  const sql = getNeonSql();
  if (!sql) return { ok: false, statusCode: 503, error: "Database connection unavailable." };

  await ensureGoogleTrackingColumns();

  const existingRows = await sql.query(
    `SELECT id, username, email, full_name, role, account_type, workspace_id, status,
            plan, plan_type, plan_label, google_sub, auth_provider, subscription_expires_at
     FROM users
     WHERE id = $1
       AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
       AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
       AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
     LIMIT 1`,
    [params.clientId]
  );

  if (!existingRows || existingRows.length === 0) {
    return { ok: false, statusCode: 404, error: "Preview user account not found." };
  }

  const existing = existingRows[0];
  const existingAcctType = String(existing.account_type || "").toUpperCase();
  const existingPlanUpper = String(existing.plan || "").toUpperCase();
  const existingStatusUpper = String(existing.status || "").toUpperCase();

  if (
    existingAcctType === "PAID_CLIENT" ||
    (existingAcctType !== "FREE_PREVIEW" &&
      existingStatusUpper === "ACTIVE" &&
      existingPlanUpper !== "FREE_PREVIEW")
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: `Account #${existing.id} (${existing.email || existing.username}) is already linked to a paid plan (${existing.plan_label || existing.plan}). Duplicate conversion blocked.`,
      existingClient: existing,
    };
  }

  const planType = params.plan;
  let durationVal: number | null = null;
  let durationUnit: DurationUnit = "days";
  let googleMapsEnabled = false;
  let dailyEmailLimit = BASIC_DAILY_EMAIL_LIMIT;
  let featuresObj = { ...BASIC_FEATURES };
  let maxLeadsQuota: number | null = FIXED_PLAN_SPECS.BASIC.leadAllowance;
  let suggestedPriceUsd = 25;
  let customPriceUsd: number =
    params.customPriceUsd !== undefined && params.customPriceUsd !== null && !Number.isNaN(Number(params.customPriceUsd))
      ? Number(Number(params.customPriceUsd).toFixed(2))
      : 25;
  let planLabel = (params.planLabel || "").trim();
  let explicitExpiresIso: string | null = null;
  let deltaSeconds: number | null = null;

  if (params.expiresAtIso) {
    const parsedExp = new Date(params.expiresAtIso);
    if (Number.isNaN(parsedExp.getTime())) {
      return { ok: false, statusCode: 400, error: "Invalid custom expiry date/time supplied." };
    }
    explicitExpiresIso = parsedExp.toISOString();
  }

  if (planType === "LIFETIME") {
    durationVal = null;
    durationUnit = "lifetime";
    googleMapsEnabled = params.googleMapsEnabled !== false;
    dailyEmailLimit =
      params.dailyEmailLimit !== undefined
        ? Math.max(0, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Math.floor(Number(params.dailyEmailLimit))))
        : LIFETIME_GMAIL_DAILY_SAFE_CAP;
    featuresObj = params.features
      ? normalizeFeatures(params.features, googleMapsEnabled)
      : { ...ALL_FEATURES_ENABLED, google_maps: googleMapsEnabled, multi_country_maps: googleMapsEnabled };
    maxLeadsQuota = params.maxLeadsQuota ?? FIXED_PLAN_SPECS.LIFETIME.leadAllowance;
    suggestedPriceUsd = 100;
    if (params.customPriceUsd === undefined || params.customPriceUsd === null) customPriceUsd = 100;
    planLabel = planLabel || `Lifetime Plan ($${customPriceUsd} One-Time)`;
    explicitExpiresIso = null;
  } else if (planType === "BASIC") {
    durationVal = params.durationValue && params.durationValue > 0 ? Math.floor(params.durationValue) : 30;
    durationUnit = "days";
    deltaSeconds = durationVal * 86400;
    googleMapsEnabled = Boolean(params.googleMapsEnabled);
    dailyEmailLimit =
      params.dailyEmailLimit !== undefined
        ? Math.max(0, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Math.floor(Number(params.dailyEmailLimit))))
        : BASIC_DAILY_EMAIL_LIMIT;
    featuresObj = params.features
      ? normalizeFeatures(params.features, googleMapsEnabled)
      : { ...BASIC_FEATURES, google_maps: googleMapsEnabled };
    maxLeadsQuota = params.maxLeadsQuota ?? FIXED_PLAN_SPECS.BASIC.leadAllowance;
    suggestedPriceUsd = 25;
    if (params.customPriceUsd === undefined || params.customPriceUsd === null) customPriceUsd = 25;
    planLabel = planLabel || `Basic Plan ($${customPriceUsd} / ${durationVal} Days)`;
  } else {
    const validUnits: DurationUnit[] = ["hours", "days", "weeks", "months", "years", "lifetime"];
    durationUnit = validUnits.includes((params.durationUnit || "days") as DurationUnit)
      ? (params.durationUnit as DurationUnit)
      : "days";
    durationVal =
      durationUnit === "lifetime"
        ? null
        : Math.max(1, Math.floor(Number(params.durationValue) || 1));

    featuresObj = normalizeFeatures(params.features || { ...BASIC_FEATURES }, params.googleMapsEnabled);
    if (Object.values(featuresObj).filter(Boolean).length === 0) {
      return { ok: false, statusCode: 400, error: "Enable at least one feature for a Custom Plan." };
    }
    googleMapsEnabled = Boolean(featuresObj.google_maps && params.googleMapsEnabled !== false);
    if (!googleMapsEnabled) {
      featuresObj.google_maps = false;
      featuresObj.multi_country_maps = false;
    }
    dailyEmailLimit = featuresObj.cold_email
      ? Math.max(1, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Math.floor(Number(params.dailyEmailLimit ?? BASIC_DAILY_EMAIL_LIMIT))))
      : 0;

    const priceCalc = calculateSuggestedCustomPrice({
      features: featuresObj,
      durationValue: durationVal,
      durationUnit,
      dailyEmailLimit,
    });
    suggestedPriceUsd = priceCalc.suggestedPriceUsd;
    if (params.customPriceUsd === undefined || params.customPriceUsd === null) {
      customPriceUsd = suggestedPriceUsd;
    }

    const secPerUnit: Record<Exclude<DurationUnit, "lifetime">, number> = {
      hours: 3600,
      days: 86400,
      weeks: 7 * 86400,
      months: 30 * 86400,
      years: 365 * 86400,
    };
    deltaSeconds = durationUnit === "lifetime" ? null : (durationVal || 1) * secPerUnit[durationUnit];

    const builderUnit = normalizeBuilderUnit(durationUnit);
    maxLeadsQuota =
      params.maxLeadsQuota ??
      (builderUnit && durationVal
        ? durationVal * CUSTOM_UNIT_PRICING[builderUnit].leadsPerUnit
        : FIXED_PLAN_SPECS.LIFETIME.leadAllowance);

    const durLabel = formatDurationLabel(durationVal, durationUnit);
    planLabel = planLabel || `Custom Plan (${durLabel} • $${customPriceUsd})`;
  }

  const currencySuffix =
    params.agreedCurrency && params.agreedCurrency.toUpperCase() !== "USD"
      ? ` | Currency: ${params.agreedCurrency.toUpperCase()}`
      : "";
  const combinedNotes =
    params.notes?.trim() ||
    `Converted in-place from Free Preview (${existing.email || existing.username}) to ${planLabel}${currencySuffix}`;

  let updatedRows: any[] = [];
  if (durationUnit === "lifetime" && !explicitExpiresIso) {
    updatedRows = await sql.query(
      `UPDATE users
       SET account_type = 'PAID_CLIENT',
           status = 'ACTIVE',
           active = 1,
           is_active = 1,
           plan = $1::varchar,
           plan_type = $2::text,
           plan_label = $3::text,
           custom_duration_value = NULL,
           custom_duration_unit = 'lifetime',
           custom_price_usd = $4::numeric,
           suggested_price_usd = $5::numeric,
           daily_email_limit = $6::int4,
           google_maps_enabled = $7::boolean,
           features_json = $8::jsonb,
           max_leads_quota = $9::int4,
           subscription_status = 'ACTIVE',
           subscription_start = NOW(),
           subscription_expires_at = NULL,
           subscription_notes = $10::text,
           converted_from_preview_at = NOW(),
           converted_by_admin_id = $11::int4,
           updated_at = NOW()::text
       WHERE id = $12::int4
         AND COALESCE(account_type, 'FREE_PREVIEW') != 'PAID_CLIENT'
       RETURNING *`,
      [
        planType,
        planType,
        planLabel,
        customPriceUsd,
        suggestedPriceUsd,
        dailyEmailLimit,
        googleMapsEnabled,
        JSON.stringify(featuresObj),
        maxLeadsQuota,
        combinedNotes,
        params.adminId,
        params.clientId,
      ]
    );
  } else {
    updatedRows = await sql.query(
      `UPDATE users
       SET account_type = 'PAID_CLIENT',
           status = 'ACTIVE',
           active = 1,
           is_active = 1,
           plan = $1::varchar,
           plan_type = $2::text,
           plan_label = $3::text,
           custom_duration_value = $4::int4,
           custom_duration_unit = $5::text,
           custom_price_usd = $6::numeric,
           suggested_price_usd = $7::numeric,
           daily_email_limit = $8::int4,
           google_maps_enabled = $9::boolean,
           features_json = $10::jsonb,
           max_leads_quota = $11::int4,
           subscription_status = 'ACTIVE',
           subscription_start = NOW(),
           subscription_expires_at = CASE
             WHEN $12::timestamptz IS NOT NULL THEN $12::timestamptz
             WHEN $13::bigint IS NOT NULL THEN NOW() + ($13::bigint * INTERVAL '1 second')
             ELSE NOW() + INTERVAL '30 days'
           END,
           subscription_notes = $14::text,
           converted_from_preview_at = NOW(),
           converted_by_admin_id = $15::int4,
           updated_at = NOW()::text
       WHERE id = $16::int4
         AND COALESCE(account_type, 'FREE_PREVIEW') != 'PAID_CLIENT'
       RETURNING *`,
      [
        planType,
        planType,
        planLabel,
        durationVal,
        durationUnit,
        customPriceUsd,
        suggestedPriceUsd,
        dailyEmailLimit,
        googleMapsEnabled,
        JSON.stringify(featuresObj),
        maxLeadsQuota,
        explicitExpiresIso,
        deltaSeconds,
        combinedNotes,
        params.adminId,
        params.clientId,
      ]
    );
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      ok: false,
      statusCode: 409,
      error: "Account was already converted by another request.",
    };
  }

  const converted = updatedRows[0];
  await logAccountAudit({
    adminId: params.adminId,
    adminEmail: params.adminEmail || "master_owner_usman",
    clientId: Number(converted.id),
    clientEmail: converted.email || converted.username,
    workspaceId: Number(converted.workspace_id),
    action: "CONVERT_PREVIEW_TO_PAID",
    details: {
      preserved_workspace_id: converted.workspace_id,
      preserved_email: converted.email,
      preserved_google_sub: converted.google_sub || null,
      plan: planType,
      plan_label: planLabel,
      custom_price_usd: customPriceUsd,
      duration_value: durationVal,
      duration_unit: durationUnit,
      expires_at: converted.subscription_expires_at,
      agreed_currency: params.agreedCurrency || "USD",
    },
  });

  return { ok: true, client: converted };
}
