import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { SUPPORTED_CURRENCIES, getAllFxRates, convertUsdAmount } from "@/lib/fx-rates";
import { calculateAuthoritativeOrderSpec, CUSTOM_UNIT_PRICING, FIXED_PLAN_SPECS } from "@/lib/custom-plans";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  noStore();
  try {
    const url = new URL(req.url);
    const currency = (url.searchParams.get("currency") || "USD").toUpperCase();
    const plan = url.searchParams.get("plan") || "CUSTOM";
    const unit = url.searchParams.get("unit") || "hours";
    const qty = url.searchParams.get("qty") || "1";
    const includeMaps = url.searchParams.get("maps") !== "false";

    const rates = await getAllFxRates(false);

    let quote = null;
    if (url.searchParams.has("plan") || url.searchParams.has("currency")) {
      const order = calculateAuthoritativeOrderSpec({
        requestedPlan: plan,
        durationUnit: unit,
        durationValue: Number(qty),
        includeGoogleMaps: includeMaps,
      });
      if (!order.ok) {
        return NextResponse.json({ detail: order.error }, { status: 400 });
      }
      const conversion = await convertUsdAmount(order.priceUsd, currency);
      quote = { order, conversion };
    }

    return NextResponse.json({
      base_currency: "USD",
      currencies: SUPPORTED_CURRENCIES,
      rates: Object.values(rates),
      fixed_plans: FIXED_PLAN_SPECS,
      custom_unit_rates: CUSTOM_UNIT_PRICING,
      quote,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to load exchange rates." },
      { status: 500 }
    );
  }
}
