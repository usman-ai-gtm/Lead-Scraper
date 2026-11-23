import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { getNeonCampaigns, createNeonCampaign } from "@/lib/neon-db";
import { runCampaignInBackground } from "@/lib/campaign-runner";
import { generateSmartSearchVariations } from "@/lib/smart-search-expansion";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const workspaceId = currentUser.workspace_id || 1;
  const campaigns = await getNeonCampaigns(workspaceId);
  return NextResponse.json({ campaigns: campaigns || [] });
}

export async function POST(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const subCheck = await verifyClientActiveSubscription(currentUser);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { detail: subCheck.message, error: subCheck.message },
      { status: subCheck.statusCode || 403 }
    );
  }

  const workspaceId = currentUser.workspace_id || 1;
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  const keyword = String(body.keyword || "").trim();
  const campaignType = body.campaign_type === "GOOGLE_MAPS" ? "GOOGLE_MAPS" : "FIND_LEADS";
  const rawCountries = body.countries;
  const countries = Array.isArray(rawCountries) && rawCountries.length > 0
    ? rawCountries
    : [body.country || "United States"];
  const targetQuantity = Math.max(1, Math.min(1000, parseInt(body.target_quantity || body.quantity || "50", 10)));
  const contactRequirement = ["EMAIL_AND_PHONE", "EMAIL_ONLY", "PHONE_ONLY", "EMAIL_OR_PHONE"].includes(body.contact_requirement)
    ? body.contact_requirement
    : "EMAIL_AND_PHONE";
  const searchMode = body.search_mode || "STANDARD";

  if (!name || !keyword) {
    return NextResponse.json(
      { error: "Campaign name and keyword are mandatory." },
      { status: 400 }
    );
  }

  // Strict Server-Side Plan Gate: Google Maps Campaigns are Lifetime-Only ($100)
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";
  const isLifetime = currentUser.plan === "LIFETIME" || currentUser.plan === "OWNER_LIFETIME";

  if (campaignType === "GOOGLE_MAPS" && !isLifetime && !isSuperAdmin) {
    return NextResponse.json(
      {
        error: "Google Maps Campaigns are exclusive to the $100 Lifetime Plan. Please upgrade to unlock.",
        code: "UPGRADE_REQUIRED",
        upgrade_url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20upgrade%20to%20the%20Lifetime%20Plan%20for%20Google%20Maps%20Leads",
      },
      { status: 403 }
    );
  }

  // Generate initial smart search variations
  const variations = await generateSmartSearchVariations(keyword, 4);

  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const created = await createNeonCampaign({
    id: campaignId,
    workspace_id: workspaceId,
    name,
    campaign_type: campaignType,
    keyword,
    countries,
    target_quantity: targetQuantity,
    contact_requirement: contactRequirement,
    search_mode: searchMode,
    search_variations: variations,
  });

  if (!created) {
    return NextResponse.json({ error: "Failed to create campaign in database." }, { status: 500 });
  }

  // Launch campaign runner asynchronously without blocking HTTP response
  runCampaignInBackground(campaignId, workspaceId).catch((err) => {
    console.error(`Background campaign runner failed for ${campaignId}:`, err);
  });

  return NextResponse.json({ campaign: created }, { status: 201 });
}
