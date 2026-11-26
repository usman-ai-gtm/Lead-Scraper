import {
  BASIC_DAILY_EMAIL_LIMIT,
  BASIC_FEATURES,
  ALL_FEATURES_ENABLED,
  LIFETIME_GMAIL_DAILY_SAFE_CAP,
  FeatureMap,
} from "@/lib/entitlements";

export type FixedOrCustomPlan = "BASIC" | "LIFETIME" | "CUSTOM";
export type BuilderDurationUnit = "hours" | "days" | "weeks" | "months";

export const FIXED_PLAN_SPECS = {
  BASIC: {
    plan: "BASIC" as const,
    name: "Basic Plan",
    priceUsd: 25,
    durationUnit: "days" as const,
    durationValue: 30,
    durationLabel: "30 Days",
    googleMapsEnabled: false,
    dailyEmailLimit: BASIC_DAILY_EMAIL_LIMIT,
    leadAllowance: 2500,
    features: { ...BASIC_FEATURES },
    summary: "Standard B2B web lead generation, contact checks & 10 emails/day for 30 days. Google Maps NOT included.",
  },
  LIFETIME: {
    plan: "LIFETIME" as const,
    name: "Lifetime Access",
    priceUsd: 100,
    durationUnit: "lifetime" as const,
    durationValue: null as number | null,
    durationLabel: "Lifetime (One-Time, No Expiry)",
    googleMapsEnabled: true,
    dailyEmailLimit: LIFETIME_GMAIL_DAILY_SAFE_CAP,
    leadAllowance: 50000,
    features: { ...ALL_FEATURES_ENABLED },
    summary: "One-time payment with zero expiry, Google Maps Lead Generator included, AI Lead Briefs & up to 500 emails/day.",
  },
};

export const CUSTOM_UNIT_PRICING: Record<
  BuilderDurationUnit,
  {
    unitLabelSingular: string;
    unitLabelPlural: string;
    usdPerUnit: number;
    leadsPerUnit: number;
    minQty: number;
    maxQty: number;
    dailyEmailLimit: number;
  }
> = {
  hours: {
    unitLabelSingular: "Hour",
    unitLabelPlural: "Hours",
    usdPerUnit: 1,
    leadsPerUnit: 50,
    minQty: 1,
    maxQty: 72,
    dailyEmailLimit: 50,
  },
  days: {
    unitLabelSingular: "Day",
    unitLabelPlural: "Days",
    usdPerUnit: 15,
    leadsPerUnit: 250,
    minQty: 1,
    maxQty: 30,
    dailyEmailLimit: 100,
  },
  weeks: {
    unitLabelSingular: "Week",
    unitLabelPlural: "Weeks",
    usdPerUnit: 50,
    leadsPerUnit: 1000,
    minQty: 1,
    maxQty: 12,
    dailyEmailLimit: 250,
  },
  months: {
    unitLabelSingular: "Month",
    unitLabelPlural: "Months",
    usdPerUnit: 75,
    leadsPerUnit: 5000,
    minQty: 1,
    maxQty: 24,
    dailyEmailLimit: 500,
  },
};

export interface CalculatedOrderSpec {
  ok: boolean;
  error?: string;
  requestedPlan: FixedOrCustomPlan;
  planLabel: string;
  durationUnit: BuilderDurationUnit | "lifetime";
  durationValue: number | null;
  durationDisplay: string;
  priceUsd: number;
  leadAllowance: number;
  googleMapsEnabled: boolean;
  dailyEmailLimit: number;
  features: FeatureMap;
  durationSeconds: number | null;
}

export function normalizeBuilderUnit(raw: unknown): BuilderDurationUnit | null {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "hour" || s === "hours") return "hours";
  if (s === "day" || s === "days") return "days";
  if (s === "week" || s === "weeks") return "weeks";
  if (s === "month" || s === "months") return "months";
  return null;
}

export function getBuilderDurationSeconds(unit: BuilderDurationUnit, quantity: number): number {
  const q = Math.floor(quantity);
  switch (unit) {
    case "hours":
      return q * 3600;
    case "days":
      return q * 24 * 3600;
    case "weeks":
      return q * 7 * 24 * 3600;
    case "months":
      return q * 30 * 24 * 3600;
  }
}

export function calculateAuthoritativeOrderSpec(input: {
  requestedPlan: unknown;
  durationUnit?: unknown;
  durationValue?: unknown;
  includeGoogleMaps?: boolean;
}): CalculatedOrderSpec {
  const plan = String(input.requestedPlan || "").trim().toUpperCase();

  if (plan === "BASIC") {
    const spec = FIXED_PLAN_SPECS.BASIC;
    return {
      ok: true,
      requestedPlan: "BASIC",
      planLabel: "Basic Plan ($25 / 30 Days)",
      durationUnit: "days",
      durationValue: 30,
      durationDisplay: "30 Days",
      priceUsd: spec.priceUsd,
      leadAllowance: spec.leadAllowance,
      googleMapsEnabled: false,
      dailyEmailLimit: spec.dailyEmailLimit,
      features: { ...spec.features },
      durationSeconds: 30 * 24 * 3600,
    };
  }

  if (plan === "LIFETIME") {
    const spec = FIXED_PLAN_SPECS.LIFETIME;
    return {
      ok: true,
      requestedPlan: "LIFETIME",
      planLabel: "Lifetime Access ($100 One-Time)",
      durationUnit: "lifetime",
      durationValue: null,
      durationDisplay: "Lifetime (No Expiry)",
      priceUsd: spec.priceUsd,
      leadAllowance: spec.leadAllowance,
      googleMapsEnabled: true,
      dailyEmailLimit: spec.dailyEmailLimit,
      features: { ...spec.features },
      durationSeconds: null,
    };
  }

  if (plan === "CUSTOM") {
    const unit = normalizeBuilderUnit(input.durationUnit);
    if (!unit) {
      return {
        ok: false,
        error: "Invalid custom duration unit. Allowed units: hours, days, weeks, months.",
        requestedPlan: "CUSTOM",
        planLabel: "Custom Plan",
        durationUnit: "hours",
        durationValue: 1,
        durationDisplay: "",
        priceUsd: 0,
        leadAllowance: 0,
        googleMapsEnabled: false,
        dailyEmailLimit: 0,
        features: { ...BASIC_FEATURES },
        durationSeconds: 0,
      };
    }

    const qtyNum = Number(input.durationValue);
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum <= 0) {
      return {
        ok: false,
        error: "Duration quantity must be a positive whole number.",
        requestedPlan: "CUSTOM",
        planLabel: "Custom Plan",
        durationUnit: unit,
        durationValue: 0,
        durationDisplay: "",
        priceUsd: 0,
        leadAllowance: 0,
        googleMapsEnabled: false,
        dailyEmailLimit: 0,
        features: { ...BASIC_FEATURES },
        durationSeconds: 0,
      };
    }

    const rule = CUSTOM_UNIT_PRICING[unit];
    if (qtyNum < rule.minQty || qtyNum > rule.maxQty) {
      return {
        ok: false,
        error: `Quantity for ${unit} must be between ${rule.minQty} and ${rule.maxQty}.`,
        requestedPlan: "CUSTOM",
        planLabel: "Custom Plan",
        durationUnit: unit,
        durationValue: qtyNum,
        durationDisplay: "",
        priceUsd: 0,
        leadAllowance: 0,
        googleMapsEnabled: false,
        dailyEmailLimit: 0,
        features: { ...BASIC_FEATURES },
        durationSeconds: 0,
      };
    }

    const includeMaps = input.includeGoogleMaps !== false;
    const priceUsd = Number((qtyNum * rule.usdPerUnit).toFixed(2));
    const leadAllowance = qtyNum * rule.leadsPerUnit;
    const unitWord = qtyNum === 1 ? rule.unitLabelSingular : rule.unitLabelPlural;
    const durationDisplay = `${qtyNum} ${unitWord}`;
    const features: FeatureMap = includeMaps
      ? { ...ALL_FEATURES_ENABLED }
      : {
          ...BASIC_FEATURES,
          ai_research: true,
        };

    return {
      ok: true,
      requestedPlan: "CUSTOM",
      planLabel: `Custom (${durationDisplay} • $${priceUsd} • ${leadAllowance.toLocaleString()} Leads)`,
      durationUnit: unit,
      durationValue: qtyNum,
      durationDisplay,
      priceUsd,
      leadAllowance,
      googleMapsEnabled: includeMaps,
      dailyEmailLimit: rule.dailyEmailLimit,
      features,
      durationSeconds: getBuilderDurationSeconds(unit, qtyNum),
    };
  }

  return {
    ok: false,
    error: "Invalid plan selection. Choose BASIC, LIFETIME, or CUSTOM.",
    requestedPlan: "BASIC",
    planLabel: "",
    durationUnit: "days",
    durationValue: 30,
    durationDisplay: "",
    priceUsd: 0,
    leadAllowance: 0,
    googleMapsEnabled: false,
    dailyEmailLimit: 0,
    features: { ...BASIC_FEATURES },
    durationSeconds: 0,
  };
}

/**
 * Derive authoritative max lead allowance for an active user record.
 * Custom hourly plans enforce 50 leads per purchased hour strictly.
 */
export function resolvePlanLeadAllowance(user: {
  max_leads_quota?: number | string | null;
  plan?: string | null;
  plan_type?: string | null;
  custom_duration_unit?: string | null;
  custom_duration_value?: number | string | null;
  role?: string | null;
  account_type?: string | null;
}): number | null {
  const roleUpper = String(user.role || "").toUpperCase();
  const acctUpper = String(user.account_type || "").toUpperCase();
  if (roleUpper === "SUPER_ADMIN" || roleUpper === "ADMIN" || acctUpper === "MASTER_OWNER") {
    return null; // Master Owner is unlimited
  }

  const explicitQuota = Number(user.max_leads_quota);
  if (Number.isFinite(explicitQuota) && explicitQuota > 0) {
    return Math.floor(explicitQuota);
  }

  const planUpper = String(user.plan_type || user.plan || "BASIC").toUpperCase();
  if (planUpper === "CUSTOM") {
    const unit = normalizeBuilderUnit(user.custom_duration_unit);
    const val = Math.floor(Number(user.custom_duration_value) || 0);
    if (unit && val > 0) {
      return val * CUSTOM_UNIT_PRICING[unit].leadsPerUnit;
    }
    return 50;
  }

  if (planUpper === "LIFETIME") {
    return FIXED_PLAN_SPECS.LIFETIME.leadAllowance;
  }

  if (planUpper === "FREE_PREVIEW") {
    return 0;
  }

  return FIXED_PLAN_SPECS.BASIC.leadAllowance;
}
