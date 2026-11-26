import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { isNeonConfigured, logAccountAudit } from "@/lib/neon-db";
import { getAllFxRates, setAdminFxRateOverride, SUPPORTED_CURRENCIES } from "@/lib/fx-rates";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const rates = await getAllFxRates(refresh);
  return NextResponse.json({
    currencies: SUPPORTED_CURRENCIES,
    rates: Object.values(rates),
  });
}

export async function POST(req: Request) {
  const user = getCurrentUserFromRequest(req);
  if (!user || !isAuthorizedOwner(user)) {
    return NextResponse.json({ detail: "Forbidden: Master Owner required." }, { status: 403 });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ detail: "Database unavailable." }, { status: 503 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (body.refresh_live_rates) {
      const rates = await getAllFxRates(true);
      return NextResponse.json({ status: "success", rates: Object.values(rates) });
    }
    const currency = String(body.currency || "").toUpperCase();
    const clearOverride = Boolean(body.clear_override);
    const rateFromUsd = clearOverride ? null : Number(body.rate_from_usd);

    const rates = await setAdminFxRateOverride({
      currency,
      rateFromUsd,
      clearOverride,
    });

    await logAccountAudit({
      adminId: Number(user.id || user.sub) || 2,
      adminEmail: user.email || user.username || "master_owner",
      clientId: 0,
      workspaceId: user.workspace_id || 1,
      action: clearOverride ? "FX_OVERRIDE_CLEARED" : "FX_OVERRIDE_SET",
      details: { currency, rate_from_usd: rateFromUsd },
    });

    return NextResponse.json({
      status: "success",
      rates: Object.values(rates),
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to update exchange rate." },
      { status: 400 }
    );
  }
}
