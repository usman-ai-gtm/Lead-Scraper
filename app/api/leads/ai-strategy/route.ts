import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { interpretSearchIntent } from "@/lib/ai-search-parser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt || body.keyword || body.query || "").trim();
    const explicitCountry = body.country || "";
    const explicitCity = body.city || "";
    const useBusinessProfile = Boolean(body.use_business_profile || body.use_profile);

    let businessProfile: any = null;
    if (user && useBusinessProfile && isNeonConfigured()) {
      try {
        const sql = getNeonSql();
        if (sql) {
          const profileRows = await sql.query(
            "SELECT * FROM workspace_profiles WHERE workspace_id = $1 LIMIT 1",
            [user.workspace_id || 1]
          );
          if (profileRows && profileRows.length > 0) {
            businessProfile = profileRows[0];
          }
        }
      } catch {}
    }

    const strategy = await interpretSearchIntent(prompt, explicitCountry, explicitCity, businessProfile);

    return NextResponse.json({
      status: "success",
      suggested_keyword: strategy.interpreted_keyword,
      target_business_type: strategy.target_business_type,
      industry: strategy.industry,
      target_audience: strategy.target_audience,
      country: strategy.detected_country || explicitCountry || "All Countries",
      city: strategy.detected_city || explicitCity || "",
      search_variations: strategy.search_variations,
      platform: strategy.recommended_sources[0] || "All Platforms",
      recommended_platforms: strategy.recommended_sources,
      target_services: [strategy.target_business_type, strategy.industry],
      reasoning: strategy.reasoning,
      used_business_profile: strategy.used_business_profile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Failed to generate AI search strategy" },
      { status: 500 }
    );
  }
}
