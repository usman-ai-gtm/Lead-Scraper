import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured, computeAuthoritativeUserStatus } from "@/lib/neon-db";
import { convertPreviewUserToPaid } from "@/lib/preview-conversion";
import { createSystemNotification } from "@/lib/notifications-db";
import { DurationUnit } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * Owner-Only Endpoint: Convert an eligible Google / Free Preview user into a Paid Customer IN PLACE.
 * - Preserves exact user ID, email/username, google_sub, auth_provider, workspace_id, saved leads, searches, and Gmail links.
 * - Prevents duplicate conversion (HTTP 409) and unauthorized customer calls (HTTP 403).
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { detail: "Forbidden: Only the authorized Master Owner may convert Free Preview accounts to Paid." },
        { status: 403 }
      );
    }

    const clientId = parseInt(params.id, 10);
    if (isNaN(clientId) || clientId <= 0) {
      return NextResponse.json({ detail: "Invalid client account ID." }, { status: 400 });
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ detail: "Database service unavailable." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const rawPlan = String(body.plan || "BASIC").toUpperCase();
    const plan: "BASIC" | "LIFETIME" | "CUSTOM" =
      rawPlan === "LIFETIME" ? "LIFETIME" : rawPlan === "CUSTOM" ? "CUSTOM" : "BASIC";

    const customPriceUsd =
      body.custom_price_usd !== undefined && body.custom_price_usd !== null && String(body.custom_price_usd).trim() !== ""
        ? Number(body.custom_price_usd)
        : body.agreed_amount !== undefined && body.agreed_amount !== null && String(body.agreed_amount).trim() !== ""
        ? Number(body.agreed_amount)
        : null;

    const result = await convertPreviewUserToPaid({
      clientId,
      adminId: Number(user.id || 2),
      adminEmail: String(user.email || user.username || "master_owner_usman"),
      plan,
      customPriceUsd: customPriceUsd !== null && !Number.isNaN(customPriceUsd) ? customPriceUsd : null,
      agreedCurrency: body.agreed_currency ? String(body.agreed_currency).toUpperCase() : "USD",
      durationValue: body.duration_value !== undefined && body.duration_value !== null ? Number(body.duration_value) : null,
      durationUnit: body.duration_unit ? (String(body.duration_unit).toLowerCase() as DurationUnit) : undefined,
      expiresAtIso: body.expires_at ? String(body.expires_at) : null,
      dailyEmailLimit: body.daily_email_limit !== undefined ? Number(body.daily_email_limit) : undefined,
      googleMapsEnabled: body.google_maps_enabled !== undefined ? Boolean(body.google_maps_enabled) : undefined,
      features: body.features && typeof body.features === "object" ? body.features : undefined,
      maxLeadsQuota: body.max_leads_quota !== undefined && body.max_leads_quota !== null ? Number(body.max_leads_quota) : null,
      planLabel: body.plan_label ? String(body.plan_label) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });

    if (result.ok === false) {
      return NextResponse.json(
        {
          detail: result.error,
          ...(result.existingClient ? { existing_client: result.existingClient } : {}),
        },
        { status: result.statusCode || 400 }
      );
    }

    const c = result.client;
    const computed = computeAuthoritativeUserStatus(c);

    // Notify converted customer inside their existing preserved workspace
    await createSystemNotification({
      workspaceId: Number(c.workspace_id) || 1,
      userId: Number(c.id),
      isAdminTarget: false,
      title: `Account Upgraded & Activated (${c.plan_label || c.plan})`,
      message: `Your account has been upgraded from Free Preview to ${c.plan_label || c.plan} on your existing workspace #${c.workspace_id}. Sign in anytime with your original Google account.`,
      type: "success",
      category: "account_converted_to_paid",
      link: "/app/subscription",
      refType: "user",
      refId: String(c.id),
    }).catch(() => {});

    return NextResponse.json({
      status: "success",
      message: `Converted account #${c.id} (${c.email || c.username}) to ${c.plan_label || c.plan} in-place without duplicating user or workspace #${c.workspace_id}.`,
      client: {
        ...c,
        raw_plan: computed.plan,
        status: computed.status,
        remaining_days: computed.daysRemaining,
        remaining_detailed: computed.remainingDetailed,
      },
    });
  } catch (err: any) {
    console.error("[Owner Convert-to-Paid API] Error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to convert preview account to paid." },
      { status: 500 }
    );
  }
}
