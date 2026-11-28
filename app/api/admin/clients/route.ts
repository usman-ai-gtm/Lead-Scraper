import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, hashPassword, isAuthorizedOwner } from "@/lib/serverless-auth";
import {
  getNeonClients,
  createPaidClientAccount,
  isNeonConfigured,
  logAccountAudit,
} from "@/lib/neon-db";
import { ensureGoogleTrackingColumns } from "@/lib/preview-conversion";
import {
  calculateSuggestedCustomPrice,
  calculateCustomPlanExpiresAt,
  formatDurationLabel,
  normalizeFeatures,
  DurationUnit,
  BASIC_DAILY_EMAIL_LIMIT,
  MAX_GMAIL_DAILY_SAFE_CAP,
} from "@/lib/entitlements";
import { getOwnerPlatformSettings } from "@/lib/platform-settings-db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "Paid@";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return pwd + "!";
}

function generateDefaultUsername(): string {
  return `client_${Date.now().toString().slice(-6)}`;
}

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    // Strict RBAC: Only administrators may view the paid client roster
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Administrator role required to view client roster." },
        { status: 403 }
      );
    }

    if (isNeonConfigured()) {
      await ensureGoogleTrackingColumns();
      const allAccounts = await getNeonClients();
      const paidClients = allAccounts.filter((c: any) => c.account_type === "PAID_CLIENT" || c.account_type !== "FREE_PREVIEW");
      const previewClients = allAccounts.filter((c: any) => c.account_type === "FREE_PREVIEW");

      const stats = {
        total_paid: paidClients.length,
        active_basic: paidClients.filter((c: any) => String(c.raw_plan || c.plan || "").toUpperCase().includes("BASIC") && c.status === "ACTIVE").length,
        active_lifetime: paidClients.filter((c: any) => String(c.raw_plan || c.plan || "").toUpperCase().includes("LIFETIME") && c.status === "ACTIVE").length,
        active_custom: paidClients.filter((c: any) => String(c.raw_plan || c.plan_type || "").toUpperCase() === "CUSTOM" && c.status === "ACTIVE").length,
        expired: paidClients.filter((c: any) => c.status === "EXPIRED").length,
        locked: paidClients.filter((c: any) => c.status === "LOCKED" || c.status === "SUSPENDED" || c.status === "REVOKED").length,
        total_preview: previewClients.length,
        capacity: "Unlimited",
      };

      return NextResponse.json({
        clients: paidClients,
        preview_clients: previewClients,
        stats,
        total_clients: paidClients.length,
        capacity: "Unlimited",
      });
    }

    return NextResponse.json({
      clients: [],
      preview_clients: [],
      stats: {
        total_paid: 0,
        active_basic: 0,
        active_lifetime: 0,
        expired: 0,
        locked: 0,
        total_preview: 0,
        capacity: "Unlimited",
      },
      total_clients: 0,
      capacity: "Unlimited",
    });
  } catch (err: any) {
    console.error("[Admin Clients GET] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to retrieve clients." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    // Strict RBAC: Only Master Owner may create paid client accounts
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Master Owner administrator role required to create paid accounts." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const customerName = String(body.customer_name || body.full_name || body.name || "").trim();
    let username = String(body.username || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!username) {
      username = generateDefaultUsername();
    }
    if (username.length < 3) {
      return NextResponse.json(
        { detail: "Username must be at least 3 characters long." },
        { status: 400 }
      );
    }

    let plainPassword = String(body.password || "").trim();
    if (!plainPassword) {
      plainPassword = generateSecurePassword();
    }

    const rawPlan = String(body.plan || "BASIC").toUpperCase();
    const plan: "BASIC" | "LIFETIME" | "CUSTOM" =
      rawPlan === "LIFETIME" ? "LIFETIME" : rawPlan === "CUSTOM" ? "CUSTOM" : "BASIC";
    const clientNotes = body.client_notes ? String(body.client_notes).trim() : undefined;

    const validUnits: DurationUnit[] = ["hours", "days", "weeks", "months", "years", "lifetime"];
    let durationUnit: DurationUnit = "days";
    let durationValue: number | null = 30;
    let normalizedFeatures: any = undefined;
    let googleMapsEnabled = plan === "LIFETIME";
    let dailyEmailLimit = plan === "LIFETIME" ? 500 : 10;
    let suggestedPriceUsd = plan === "LIFETIME" ? 100 : 25;
    let customPriceUsd = plan === "LIFETIME" ? 100 : 25;
    let planLabel = plan === "LIFETIME" ? "Lifetime Plan ($100 One-Time)" : "Basic Plan ($25 / 30 Days)";

    if (plan === "CUSTOM") {
      const reqUnit = String(body.duration_unit || "days").toLowerCase() as DurationUnit;
      if (!validUnits.includes(reqUnit)) {
        return NextResponse.json(
          { detail: "Invalid custom duration_unit. Use hours, days, weeks, months, years, or lifetime." },
          { status: 400 }
        );
      }
      durationUnit = reqUnit;
      durationValue = durationUnit === "lifetime" ? null : Math.max(1, Math.floor(Number(body.duration_value) || 1));

      normalizedFeatures = normalizeFeatures(body.features || {}, body.google_maps_enabled);
      const enabledCount = Object.values(normalizedFeatures).filter(Boolean).length;
      if (enabledCount === 0) {
        return NextResponse.json(
          { detail: "Please enable at least 1 module/feature for a Custom Plan." },
          { status: 400 }
        );
      }

      googleMapsEnabled = Boolean(normalizedFeatures.google_maps && body.google_maps_enabled !== false);
      if (!googleMapsEnabled) {
        normalizedFeatures.google_maps = false;
        normalizedFeatures.multi_country_maps = false;
      }

      dailyEmailLimit = normalizedFeatures.cold_email
        ? Math.max(1, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Math.floor(Number(body.daily_email_limit) || BASIC_DAILY_EMAIL_LIMIT)))
        : 0;

      const calc = calculateSuggestedCustomPrice({
        features: normalizedFeatures,
        durationValue,
        durationUnit,
        dailyEmailLimit,
      });
      suggestedPriceUsd = calc.suggestedPriceUsd;

      if (body.custom_price_usd !== undefined && body.custom_price_usd !== null && body.custom_price_usd !== "") {
        const parsedOverride = Number(body.custom_price_usd);
        if (Number.isNaN(parsedOverride) || parsedOverride < 0) {
          return NextResponse.json({ detail: "Invalid custom_price_usd value." }, { status: 400 });
        }
        customPriceUsd = Number(parsedOverride.toFixed(2));
      } else {
        customPriceUsd = suggestedPriceUsd;
      }

      const durStr = formatDurationLabel(durationValue, durationUnit);
      planLabel =
        body.plan_label && String(body.plan_label).trim()
          ? String(body.plan_label).trim()
          : `Custom (${durStr} • $${customPriceUsd})`;
    }

    const passwordHash = hashPassword(plainPassword);

    if (!isNeonConfigured()) {
      return NextResponse.json(
        { detail: "Database connection unavailable. Cannot create client account." },
        { status: 503 }
      );
    }

    const res = await createPaidClientAccount({
      customerName: customerName || username,
      username,
      passwordHash,
      plan,
      clientNotes,
      durationValue,
      durationUnit,
      features: normalizedFeatures,
      googleMapsEnabled,
      dailyEmailLimit,
      customPriceUsd,
      suggestedPriceUsd,
      planLabel,
    });

    await logAccountAudit({
      clientId: res.client.id,
      clientEmail: res.client.email,
      action: `CREATE_PAID_CLIENT_${plan}`,
      adminId: user.id,
      adminEmail: user.email,
      workspaceId: res.client.workspace_id,
      details: {
        username,
        customer_name: res.client.full_name,
        plan,
        plan_label: planLabel,
        duration_value: durationValue,
        duration_unit: durationUnit,
        google_maps_enabled: googleMapsEnabled,
        daily_email_limit: dailyEmailLimit,
        suggested_price_usd: suggestedPriceUsd,
        custom_price_usd: customPriceUsd,
        features: normalizedFeatures,
        subscription_expires_at: res.client.subscription_expires_at,
        workspace_id: res.client.workspace_id,
        reused_deleted_identity_from_id: res.formerTombstoneUserId || null,
      },
    });

    const agreedCurrency = String(body.agreed_currency || "USD").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "USD";
    const parsedAgreedAmount =
      body.agreed_amount !== undefined && body.agreed_amount !== null && String(body.agreed_amount).trim() !== ""
        ? Number(body.agreed_amount)
        : NaN;
    const agreedAmount =
      !Number.isNaN(parsedAgreedAmount) && parsedAgreedAmount >= 0
        ? Number(parsedAgreedAmount.toFixed(2))
        : agreedCurrency === "USD"
        ? customPriceUsd
        : null;

    const ownerSettings = await getOwnerPlatformSettings().catch(() => null);
    const isLifetime = plan === "LIFETIME" || (plan === "CUSTOM" && durationUnit === "lifetime");
    const durationHuman =
      plan === "CUSTOM"
        ? formatDurationLabel(durationValue, durationUnit)
        : isLifetime
        ? "Permanent Access — No Expiry"
        : "30 Days from Creation";

    return NextResponse.json({
      status: "success",
      message: `Paid ${plan} account created successfully for '${username}'.`,
      client: {
        id: res.client.id,
        username: res.client.username,
        customer_name: res.client.full_name,
        full_name: res.client.full_name,
        email: res.client.email,
        role: "CLIENT",
        account_type: "PAID_CLIENT",
        status: "ACTIVE",
        plan: plan === "CUSTOM" ? planLabel : isLifetime ? "LIFETIME ($100)" : "BASIC ($25/30 Days)",
        raw_plan: plan,
        plan_type: plan,
        plan_label: planLabel,
        google_maps_enabled: googleMapsEnabled,
        daily_email_limit: dailyEmailLimit,
        features: res.client.features_json,
        custom_duration_value: durationValue,
        custom_duration_unit: durationUnit,
        custom_price_usd: customPriceUsd,
        suggested_price_usd: suggestedPriceUsd,
        subscription_start: res.client.subscription_start,
        subscription_expires_at: res.client.subscription_expires_at,
        remaining_days: isLifetime ? "Permanent Access" : durationHuman,
        workspace_id: res.client.workspace_id,
        workspace_name: res.workspace.name,
      },
      credentials: {
        customer_id: res.client.id,
        username,
        password: plainPassword,
        customer_name: customerName || "",
        plan: plan === "CUSTOM" ? planLabel : isLifetime ? "Lifetime Access ($100 One-Time)" : "Basic Plan ($25 / 30 Days)",
        duration: durationHuman,
        start_date: res.client.subscription_start,
        expires_at: isLifetime ? "Never (Lifetime)" : res.client.subscription_expires_at || "30 Days",
        is_lifetime: isLifetime,
        google_maps_enabled: googleMapsEnabled,
        daily_email_limit: dailyEmailLimit,
        custom_price_usd: customPriceUsd,
        suggested_price_usd: suggestedPriceUsd,
        agreed_amount: agreedAmount ?? customPriceUsd,
        agreed_currency: agreedCurrency,
        support_whatsapp: ownerSettings?.whatsappNumber || null,
        support_email: ownerSettings?.supportEmail || null,
        login_url: "https://lead-scraper-mxs5.vercel.app/login",
      },
      temporary_password: plainPassword,
    });
  } catch (err: any) {
    console.error("[Admin Clients POST] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to create paid client account." },
      { status: 400 }
    );
  }
}
