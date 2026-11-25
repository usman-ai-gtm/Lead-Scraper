import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import {
  isNeonConfigured,
  saveNeonSearchRecordAndLeads,
  getNeonWorkspaceLeadSignatures,
  acquireActiveSearchJob,
  completeActiveSearchJob,
} from "@/lib/neon-db";
import {
  resolveSerperKey,
  parseContactRequirement,
  parseMapsCountriesAndCities,
  buildInitialMapsQueue,
  processMapsBatchStep,
  buildShortfallMessage,
  MapsCountryStat,
  MapsLeadItem,
} from "@/lib/maps-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let currentJobId: string | undefined;
  try {
    const user = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(user, "google_maps");

    if (!subCheck.allowed) {
      return NextResponse.json(
        {
          status: "error",
          code: "UPGRADE_REQUIRED",
          message: subCheck.message || "Google Maps Lead Generator access is restricted for this plan.",
          upgrade_url:
            "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20upgrade%20to%20the%20%24100%20Lifetime%20Plan%20for%20Google%20Maps%20Lead%20Generator",
        },
        { status: subCheck.statusCode || 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const keyword = String(body.keyword || "").trim();
    if (!keyword) {
      return NextResponse.json(
        { status: "error", message: "Keyword is required for Google Maps lead generation." },
        { status: 400 }
      );
    }

    const geo = parseMapsCountriesAndCities(body);
    if (geo.error) {
      return NextResponse.json({ status: "error", message: geo.error }, { status: 400 });
    }

    if (geo.countries.length > 1 && subCheck.entitlements && !subCheck.entitlements.features.multi_country_maps) {
      return NextResponse.json(
        {
          status: "error",
          code: "ENTITLEMENT_RESTRICTED",
          message: `Multi-country Google Maps search is not enabled on your ${subCheck.entitlements.planLabel}.`,
        },
        { status: 403 }
      );
    }

    const requestedQuantity = Math.min(Math.max(Number(body.requested_quantity) || 50, 1), 2000);
    const contactRequirement = parseContactRequirement(body.contact_requirement || body.contact_filter);
    const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
    const userId = Number(subCheck.userRecord?.id || user.id) || 1;

    const serperKey = resolveSerperKey();
    if (!serperKey) {
      return NextResponse.json(
        {
          status: "error",
          code: "PROVIDER_NOT_CONFIGURED",
          message: "Search provider key (SERPER_API_KEY) is not configured on the server.",
        },
        { status: 503 }
      );
    }

    const countrySummary = geo.countries.length > 5 ? `${geo.countries.length} Countries` : geo.countries.join(", ");
    const citySummary = geo.specificCitiesEnabled
      ? geo.cities.map((c) => c.city).slice(0, 5).join(", ")
      : "";

    const jobLock = await acquireActiveSearchJob(
      workspaceId,
      userId,
      "MAPS_SEARCH",
      keyword,
      countrySummary,
      citySummary,
      requestedQuantity
    );

    if (!jobLock.allowed) {
      return NextResponse.json(
        {
          status: "error",
          code: "SEARCH_ALREADY_RUNNING",
          message: jobLock.message || "A lead generation search is already in progress for your workspace.",
          active_job_id: jobLock.jobId,
        },
        { status: 409 }
      );
    }
    currentJobId = jobLock.jobId;

    const wsSignatures = isNeonConfigured()
      ? await getNeonWorkspaceLeadSignatures(workspaceId)
      : { domains: new Set<string>(), emails: new Set<string>(), phones: new Set<string>(), placeIds: new Set<string>() };

    const seenPlaceIds = new Set<string>(wsSignatures.placeIds);
    const seenDomains = new Set<string>(wsSignatures.domains);
    const seenEmails = new Set<string>(wsSignatures.emails);
    const seenPhones = new Set<string>(wsSignatures.phones);

    let queue = buildInitialMapsQueue(geo.countries, geo.specificCitiesEnabled, geo.cities);
    let cursor = 0;
    const countryStats: Record<string, MapsCountryStat> = {};
    const qualifiedLeads: MapsLeadItem[] = [];
    let totalRawDiscovered = 0;
    let duplicatesSkipped = 0;
    let missingContactSkipped = 0;
    let errorsCount = 0;
    const providerErrors: string[] = [];

    const overallStart = Date.now();
    // Bounded synchronous budget (max 42s inside 60s function timeout)
    while (cursor < queue.length && qualifiedLeads.length < requestedQuantity && Date.now() - overallStart < 42000) {
      const step = await processMapsBatchStep({
        serperKey,
        keyword,
        contactRequirement,
        requestedQuantity,
        queue,
        cursor,
        countryStats,
        seenPlaceIds,
        seenDomains,
        seenEmails,
        seenPhones,
        existingEligibleCount: qualifiedLeads.length,
        maxTasksPerStep: 3,
        timeBudgetMs: 8000,
      });

      queue = step.queue;
      cursor = step.nextCursor;
      qualifiedLeads.push(...step.newLeads);
      totalRawDiscovered += step.candidatesDelta;
      duplicatesSkipped += step.duplicatesDelta;
      missingContactSkipped += step.missingContactDelta;
      errorsCount += step.errorsDelta;
      providerErrors.push(...step.providerErrors);
    }

    const searchRecordId = `SR-MAPS-${Date.now()}`;
    if (isNeonConfigured() && qualifiedLeads.length > 0) {
      try {
        await saveNeonSearchRecordAndLeads(
          workspaceId,
          {
            keyword,
            country: countrySummary,
            city: citySummary,
            sources: ["Google Maps (Serper Places)"],
            requested_quantity: requestedQuantity,
            search_record_id: searchRecordId,
          },
          qualifiedLeads
        );
      } catch (dbErr) {
        console.error("[Google Maps Lead DB Persistence] Error:", dbErr);
      }
    }

    const shortfall = buildShortfallMessage({
      keyword,
      requestedQuantity,
      eligibleCount: qualifiedLeads.length,
      candidatesProcessed: totalRawDiscovered,
      duplicatesSkipped,
      missingContactSkipped,
      errorsCount,
      contactRequirement,
    });

    if (currentJobId) {
      await completeActiveSearchJob(
        currentJobId,
        "COMPLETED",
        qualifiedLeads.length,
        searchRecordId,
        providerErrors[0]
      );
    }

    return NextResponse.json({
      status: "success",
      leads: qualifiedLeads,
      total_scraped: totalRawDiscovered,
      total_qualified: qualifiedLeads.length,
      requested_quantity: requestedQuantity,
      contact_requirement: contactRequirement,
      countries: geo.countries,
      specific_cities_enabled: geo.specificCitiesEnabled,
      cities: geo.cities,
      country_stats: countryStats,
      duplicates_skipped: duplicatesSkipped,
      missing_contact_skipped: missingContactSkipped,
      errors_count: errorsCount,
      provider_errors: Array.from(new Set(providerErrors)).slice(0, 10),
      shortfall_reason: shortfall,
      source: "Google Maps (Serper Places Engine) & Public Business Websites",
      message:
        shortfall ||
        `Discovered and saved ${qualifiedLeads.length} unique qualified leads for "${keyword}".`,
    });
  } catch (err: any) {
    console.error("[Google Maps Lead Generator] Top-level error:", err);
    if (currentJobId) {
      await completeActiveSearchJob(currentJobId, "FAILED", 0, undefined, err?.message).catch(() => {});
    }
    return NextResponse.json(
      { status: "error", message: err?.message || "Failed to generate Google Maps leads." },
      { status: 500 }
    );
  }
}
