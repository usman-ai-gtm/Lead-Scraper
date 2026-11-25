export type PlanType = "BASIC" | "LIFETIME" | "CUSTOM" | "OWNER_LIFETIME" | "FREE_PREVIEW";

export type DurationUnit = "hours" | "days" | "weeks" | "months" | "years" | "lifetime";

export type FeatureKey =
  | "find_leads"
  | "multi_country_search"
  | "saved_leads"
  | "search_history"
  | "exports"
  | "cold_email"
  | "google_maps"
  | "multi_country_maps"
  | "business_profile"
  | "ai_assistant"
  | "ai_research";

export type FeatureMap = Record<FeatureKey, boolean>;

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  monthlyWeightUsd: number;
  requiresFeature?: FeatureKey;
}

export const FEATURE_CATALOG: FeatureDefinition[] = [
  {
    key: "find_leads",
    label: "Find Leads (Web Search)",
    description: "Multi-source public B2B web discovery",
    monthlyWeightUsd: 7,
  },
  {
    key: "multi_country_search",
    label: "Multi-Country Find Leads",
    description: "Search across multiple selected countries & cities simultaneously",
    monthlyWeightUsd: 3,
    requiresFeature: "find_leads",
  },
  {
    key: "saved_leads",
    label: "Saved Leads Database",
    description: "Workspace repository with dynamic filtering and CRM stage tracking",
    monthlyWeightUsd: 2.5,
  },
  {
    key: "search_history",
    label: "Search History & Records",
    description: "Historical run logs, date archives, and drill-down views",
    monthlyWeightUsd: 1.5,
  },
  {
    key: "exports",
    label: "XLSX / PDF Exports",
    description: "Download formatted Excel spreadsheets and landscape PDF reports",
    monthlyWeightUsd: 3,
  },
  {
    key: "cold_email",
    label: "Cold Email Outreach",
    description: "Direct Gmail OAuth sending with delay pacing and retry history",
    monthlyWeightUsd: 4.5,
  },
  {
    key: "google_maps",
    label: "Google Maps Leads",
    description: "Local Places discovery with live job tracking & website contact extraction",
    monthlyWeightUsd: 28,
  },
  {
    key: "multi_country_maps",
    label: "Multi-Country Google Maps",
    description: "Batch local Google Maps discovery across multiple countries/cities",
    monthlyWeightUsd: 7,
    requiresFeature: "google_maps",
  },
  {
    key: "business_profile",
    label: "Business Profile",
    description: "ICP definition and personalized search context settings",
    monthlyWeightUsd: 1.5,
  },
  {
    key: "ai_assistant",
    label: "AI Assistant",
    description: "Built-in GTM sales and strategy AI advisor",
    monthlyWeightUsd: 2,
  },
  {
    key: "ai_research",
    label: "AI Lead Research",
    description: "On-demand deep company analysis and personalized pitch angles",
    monthlyWeightUsd: 5,
  },
];

export const BASIC_FEATURES: FeatureMap = {
  find_leads: true,
  multi_country_search: true,
  saved_leads: true,
  search_history: true,
  exports: true,
  cold_email: true,
  google_maps: false,
  multi_country_maps: false,
  business_profile: true,
  ai_assistant: true,
  ai_research: false,
};

export const ALL_FEATURES_ENABLED: FeatureMap = {
  find_leads: true,
  multi_country_search: true,
  saved_leads: true,
  search_history: true,
  exports: true,
  cold_email: true,
  google_maps: true,
  multi_country_maps: true,
  business_profile: true,
  ai_assistant: true,
  ai_research: true,
};

export const NO_FEATURES_ENABLED: FeatureMap = {
  find_leads: false,
  multi_country_search: false,
  saved_leads: false,
  search_history: false,
  exports: false,
  cold_email: false,
  google_maps: false,
  multi_country_maps: false,
  business_profile: false,
  ai_assistant: false,
  ai_research: false,
};

export const BASIC_DAILY_EMAIL_LIMIT = 10;
export const LIFETIME_GMAIL_DAILY_SAFE_CAP = 500;
export const MAX_GMAIL_DAILY_SAFE_CAP = 500;

export function normalizeFeatures(
  raw: any,
  googleMapsExplicit?: boolean | null
): FeatureMap {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  }
  const src = parsed && typeof parsed === "object" ? parsed : {};
  const result: FeatureMap = { ...NO_FEATURES_ENABLED };
  for (const def of FEATURE_CATALOG) {
    result[def.key] = Boolean(src[def.key]);
  }

  // Keep Google Maps explicit entitlement consistent with features map
  if (googleMapsExplicit === false) {
    result.google_maps = false;
    result.multi_country_maps = false;
  } else if (googleMapsExplicit === true && src.google_maps === undefined) {
    result.google_maps = true;
  }

  // Enforce dependent feature constraints
  if (!result.google_maps) {
    result.multi_country_maps = false;
  }
  if (!result.find_leads) {
    result.multi_country_search = false;
  }
  return result;
}

export function calculateCustomPlanExpiresAt(
  startDate: Date,
  durationValue: number | null | undefined,
  durationUnit: DurationUnit
): Date | null {
  if (durationUnit === "lifetime") {
    return null;
  }
  const safeVal = Math.max(1, Math.floor(Number(durationValue) || 1));
  const msMap: Record<Exclude<DurationUnit, "lifetime">, number> = {
    hours: 3600 * 1000,
    days: 24 * 3600 * 1000,
    weeks: 7 * 24 * 3600 * 1000,
    months: 30 * 24 * 3600 * 1000,
    years: 365 * 24 * 3600 * 1000,
  };
  const deltaMs = safeVal * (msMap[durationUnit] || msMap.days);
  return new Date(startDate.getTime() + deltaMs);
}

export function formatDurationLabel(
  durationValue: number | null | undefined,
  durationUnit: DurationUnit | string | null | undefined
): string {
  const unit = String(durationUnit || "days").toLowerCase();
  if (unit === "lifetime") return "Lifetime (Permanent)";
  const val = Math.max(1, Math.floor(Number(durationValue) || 1));
  const singular: Record<string, string> = {
    hours: "Hour",
    days: "Day",
    weeks: "Week",
    months: "Month",
    years: "Year",
  };
  const label = singular[unit] || "Day";
  return `${val} ${label}${val === 1 ? "" : "s"}`;
}

export interface CustomPriceResult {
  suggestedPriceUsd: number;
  monthlyFeatureRateUsd: number;
  mapsPremiumMonthlyUsd: number;
  durationMultiplier: number;
  emailQuotaSurchargeUsd: number;
  floorAppliedUsd: number;
  enabledFeatureCount: number;
}

export function calculateSuggestedCustomPrice(input: {
  features: Partial<FeatureMap>;
  durationValue?: number | null;
  durationUnit: DurationUnit;
  dailyEmailLimit?: number | null;
}): CustomPriceResult {
  const normalized = normalizeFeatures(input.features);
  const enabledCount = Object.values(normalized).filter(Boolean).length;
  if (enabledCount === 0) {
    return {
      suggestedPriceUsd: 0,
      monthlyFeatureRateUsd: 0,
      mapsPremiumMonthlyUsd: 0,
      durationMultiplier: 0,
      emailQuotaSurchargeUsd: 0,
      floorAppliedUsd: 0,
      enabledFeatureCount: 0,
    };
  }

  let monthlyRate = 0;
  let mapsPremiumMonthlyUsd = 0;
  for (const def of FEATURE_CATALOG) {
    if (normalized[def.key]) {
      monthlyRate += def.monthlyWeightUsd;
      if (def.key === "google_maps" || def.key === "multi_country_maps") {
        mapsPremiumMonthlyUsd += def.monthlyWeightUsd;
      }
    }
  }

  // Daily email sending quota surcharge above Basic 10/day
  const safeLimit = normalized.cold_email
    ? Math.max(1, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Number(input.dailyEmailLimit) || BASIC_DAILY_EMAIL_LIMIT))
    : 0;

  let emailQuotaSurchargeUsd = 0;
  if (normalized.cold_email) {
    if (safeLimit > 200) emailQuotaSurchargeUsd = 15;
    else if (safeLimit > 50) emailQuotaSurchargeUsd = 9;
    else if (safeLimit > 10) emailQuotaSurchargeUsd = 4;
  }
  monthlyRate += emailQuotaSurchargeUsd;

  const val = Math.max(1, Math.floor(Number(input.durationValue) || 1));
  const unit = input.durationUnit || "days";

  let durationMultiplier = 1;
  let floorUsd = 1;

  if (unit === "lifetime") {
    // Anchored cleanly to Lifetime $100 (all features + Maps) and $25/mo Basic reference
    if (normalized.google_maps) {
      const fullBundleRatio = Math.min(1, monthlyRate / 80);
      durationMultiplier = 1.25;
      floorUsd = monthlyRate >= 65 ? 100 : Math.max(49, Math.round(45 + 55 * fullBundleRatio));
      const suggestedPriceUsd = monthlyRate >= 65 ? 100 : Math.max(floorUsd, Math.round(monthlyRate * durationMultiplier));
      return {
        suggestedPriceUsd,
        monthlyFeatureRateUsd: Number(monthlyRate.toFixed(2)),
        mapsPremiumMonthlyUsd,
        durationMultiplier: Number(durationMultiplier.toFixed(3)),
        emailQuotaSurchargeUsd,
        floorAppliedUsd: floorUsd,
        enabledFeatureCount: enabledCount,
      };
    }
    durationMultiplier = 1.8;
    floorUsd = 35;
  } else {
    const hoursPerUnit: Record<Exclude<DurationUnit, "lifetime">, number> = {
      hours: 1,
      days: 24,
      weeks: 7 * 24,
      months: 30 * 24,
      years: 365 * 24,
    };
    const totalHours = val * (hoursPerUnit[unit] || 24);
    const totalDays = totalHours / 24;

    if (totalHours <= 2) {
      durationMultiplier = 0.14 + 0.03 * (totalHours - 1);
    } else if (totalHours <= 12) {
      durationMultiplier = 0.17 + 0.09 * ((totalHours - 2) / 10);
    } else if (totalHours <= 24) {
      durationMultiplier = 0.26 + 0.06 * ((totalHours - 12) / 12);
    } else if (totalDays <= 3) {
      durationMultiplier = 0.32 + 0.10 * ((totalDays - 1) / 2);
    } else if (totalDays <= 7) {
      durationMultiplier = 0.42 + 0.12 * ((totalDays - 3) / 4);
    } else if (totalDays <= 30) {
      // Anchored so 30d = 1.00 (Basic preset = $25 exact)
      durationMultiplier = 0.54 + 0.46 * ((totalDays - 7) / 23);
    } else {
      // Extended periods (> 30 days) with multi-month volume scaling
      durationMultiplier = 1 + 0.65 * Math.log2(totalDays / 30);
    }

    if (normalized.google_maps) {
      // Prevent inappropriate flat $5 pricing on Google Maps passes while keeping short access fair
      if (totalHours <= 2) floorUsd = 9;
      else if (totalHours <= 12) floorUsd = 12;
      else if (totalDays <= 1) floorUsd = 15;
      else if (totalDays <= 3) floorUsd = 22;
      else if (totalDays <= 7) floorUsd = 29;
      else floorUsd = 35;
    } else {
      if (totalHours <= 6) floorUsd = 3;
      else if (totalHours <= 24) floorUsd = 5;
      else if (totalDays <= 7) floorUsd = 8;
      else floorUsd = 10;
    }
  }

  const rawPrice = monthlyRate * durationMultiplier;
  const suggestedPriceUsd = Math.max(floorUsd, Math.round(rawPrice));

  return {
    suggestedPriceUsd,
    monthlyFeatureRateUsd: Number(monthlyRate.toFixed(2)),
    mapsPremiumMonthlyUsd,
    durationMultiplier: Number(durationMultiplier.toFixed(3)),
    emailQuotaSurchargeUsd,
    floorAppliedUsd: floorUsd,
    enabledFeatureCount: enabledCount,
  };
}

export interface ResolvedEntitlements {
  planType: PlanType;
  planLabel: string;
  isOwner: boolean;
  isLifetime: boolean;
  isBasic: boolean;
  isCustom: boolean;
  isLocked: boolean;
  isExpired: boolean;
  isRevoked: boolean;
  effectiveStatus: string;
  googleMapsEnabled: boolean;
  dailyEmailLimit: number;
  features: FeatureMap;
  customDurationValue: number | null;
  customDurationUnit: DurationUnit | string | null;
  customPriceUsd: number | null;
  suggestedPriceUsd: number | null;
  subscriptionStart: string | null;
  subscriptionExpiresAt: string | null;
}

export function resolveUserEntitlements(user: any): ResolvedEntitlements {
  const roleUpper = String(user?.role || "USER").toUpperCase();
  const typeUpper = String(user?.account_type || "").toUpperCase();
  const planRawUpper = String(user?.plan || "").toUpperCase();
  const planTypeUpper = String(user?.plan_type || "").toUpperCase();
  const statusUpper = String(user?.status || "LOCKED").toUpperCase();

  const isOwner =
    roleUpper === "ADMIN" ||
    roleUpper === "SUPER_ADMIN" ||
    typeUpper === "MASTER_OWNER" ||
    planRawUpper === "OWNER_LIFETIME" ||
    planTypeUpper === "OWNER_LIFETIME";

  if (isOwner) {
    return {
      planType: "OWNER_LIFETIME",
      planLabel: "Master Owner Permanent",
      isOwner: true,
      isLifetime: true,
      isBasic: false,
      isCustom: false,
      isLocked: false,
      isExpired: false,
      isRevoked: false,
      effectiveStatus: "ACTIVE",
      googleMapsEnabled: true,
      dailyEmailLimit: LIFETIME_GMAIL_DAILY_SAFE_CAP,
      features: { ...ALL_FEATURES_ENABLED },
      customDurationValue: null,
      customDurationUnit: "lifetime",
      customPriceUsd: null,
      suggestedPriceUsd: null,
      subscriptionStart: user?.subscription_start || null,
      subscriptionExpiresAt: null,
    };
  }

  let planType: PlanType = "BASIC";
  if (planTypeUpper === "CUSTOM" || planRawUpper === "CUSTOM") {
    planType = "CUSTOM";
  } else if (planTypeUpper === "LIFETIME" || planRawUpper === "LIFETIME") {
    planType = "LIFETIME";
  } else if (
    planTypeUpper === "FREE_PREVIEW" ||
    planRawUpper === "FREE" ||
    planRawUpper === "FREE_PREVIEW" ||
    typeUpper === "FREE_PREVIEW"
  ) {
    planType = "FREE_PREVIEW";
  } else {
    planType = "BASIC";
  }

  const nowMs = Date.now();
  const rawUnit = String(user?.custom_duration_unit || "").toLowerCase();
  const isPermanentCustom = planType === "CUSTOM" && rawUnit === "lifetime";
  const isLifetime = planType === "LIFETIME" || isPermanentCustom;

  const expiresAtIso = user?.subscription_expires_at
    ? new Date(user.subscription_expires_at).toISOString()
    : null;
  const expiresMs = expiresAtIso ? new Date(expiresAtIso).getTime() : NaN;

  const isRevoked = statusUpper === "REVOKED" || statusUpper === "SUSPENDED";
  const isLockedStatus = statusUpper === "LOCKED" || statusUpper === "PENDING" || statusUpper === "PENDING_APPROVAL";
  const isExpiredByTime =
    !isLifetime &&
    planType !== "FREE_PREVIEW" &&
    !isLockedStatus &&
    !isRevoked &&
    Boolean(expiresAtIso) &&
    !Number.isNaN(expiresMs) &&
    expiresMs <= nowMs;

  const isExpired = statusUpper === "EXPIRED" || isExpiredByTime;
  const effectiveStatus = isRevoked
    ? statusUpper
    : isExpired
    ? "EXPIRED"
    : isLockedStatus || statusUpper !== "ACTIVE"
    ? statusUpper === "ACTIVE"
      ? "LOCKED"
      : statusUpper
    : "ACTIVE";

  const isLocked = effectiveStatus !== "ACTIVE";

  let features: FeatureMap = { ...NO_FEATURES_ENABLED };
  let googleMapsEnabled = false;
  let dailyEmailLimit = 0;
  let planLabel = user?.plan_label || "";

  if (planType === "LIFETIME") {
    features = { ...ALL_FEATURES_ENABLED };
    googleMapsEnabled = true;
    dailyEmailLimit = Math.max(1, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Number(user?.daily_email_limit) || LIFETIME_GMAIL_DAILY_SAFE_CAP));
    planLabel = planLabel || "Lifetime Plan ($100 One-Time)";
  } else if (planType === "BASIC") {
    features = { ...BASIC_FEATURES };
    googleMapsEnabled = false;
    dailyEmailLimit = Math.max(1, Math.min(BASIC_DAILY_EMAIL_LIMIT, Number(user?.daily_email_limit) || BASIC_DAILY_EMAIL_LIMIT));
    planLabel = planLabel || "Basic Plan ($25 / 30 Days)";
  } else if (planType === "CUSTOM") {
    const explicitMaps =
      typeof user?.google_maps_enabled === "boolean" ? user.google_maps_enabled : undefined;
    features = normalizeFeatures(user?.features_json, explicitMaps);
    googleMapsEnabled = Boolean(features.google_maps && user?.google_maps_enabled !== false);
    if (!googleMapsEnabled) {
      features.google_maps = false;
      features.multi_country_maps = false;
    }
    dailyEmailLimit = features.cold_email
      ? Math.max(0, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Number(user?.daily_email_limit ?? BASIC_DAILY_EMAIL_LIMIT)))
      : 0;
    const durText = formatDurationLabel(user?.custom_duration_value, rawUnit || "days");
    planLabel = planLabel || `Custom Plan (${durText})`;
  } else {
    features = { ...NO_FEATURES_ENABLED };
    googleMapsEnabled = false;
    dailyEmailLimit = 0;
    planLabel = "Free Preview (Locked)";
  }

  return {
    planType,
    planLabel,
    isOwner: false,
    isLifetime,
    isBasic: planType === "BASIC",
    isCustom: planType === "CUSTOM",
    isLocked,
    isExpired,
    isRevoked,
    effectiveStatus,
    googleMapsEnabled,
    dailyEmailLimit,
    features,
    customDurationValue:
      user?.custom_duration_value != null ? Number(user.custom_duration_value) : null,
    customDurationUnit: user?.custom_duration_unit || null,
    customPriceUsd: user?.custom_price_usd != null ? Number(user.custom_price_usd) : null,
    suggestedPriceUsd:
      user?.suggested_price_usd != null ? Number(user.suggested_price_usd) : null,
    subscriptionStart: user?.subscription_start
      ? new Date(user.subscription_start).toISOString()
      : null,
    subscriptionExpiresAt: isLifetime ? null : expiresAtIso,
  };
}
