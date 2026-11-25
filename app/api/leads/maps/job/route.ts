import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import {
  isNeonConfigured,
  saveNeonSearchRecordAndLeads,
  getNeonWorkspaceLeadSignatures,
  acquireActiveSearchJob,
  updateActiveSearchJobProgress,
  getActiveSearchJobById,
  cancelActiveSearchJob,
  completeActiveSearchJob,
  getNeonActiveSearchJob,
  logAccountAudit,
} from "@/lib/neon-db";
import {
  MapsJobPayload,
  resolveSerperKey,
  parseContactRequirement,
  parseMapsCountriesAndCities,
  buildInitialMapsQueue,
  processMapsBatchStep,
  buildShortfallMessage,
} from "@/lib/maps-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function serializeJob(row: any) {
  if (!row) return null;
  let payload: any = row.job_payload || {};
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    status: row.status,
    keyword: row.keyword,
    country: row.country,
    city: row.city,
    target_count: row.target_count,
    progress_count: payload.eligible_count ?? row.progress_count ?? 0,
    progress_message: row.progress_message,
    error_message: row.error_message,
    search_record_id: payload.search_record_id || row.search_record_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    countries: payload.countries || [],
    specific_cities_enabled: Boolean(payload.specific_cities_enabled),
    cities: payload.cities || [],
    contact_requirement: payload.contact_requirement || "EMAIL_OR_PHONE",
    candidates_processed: payload.candidates_processed || 0,
    eligible_count: payload.eligible_count ?? row.progress_count ?? 0,
    duplicates_skipped: payload.duplicates_skipped || 0,
    missing_contact_skipped: payload.missing_contact_skipped || 0,
    errors_count: payload.errors_count || 0,
    provider_errors: payload.provider_errors || [],
    country_stats: payload.country_stats || {},
    live_leads: payload.live_leads || [],
    current_target: payload.current_target || "",
    shortfall_reason: payload.shortfall_reason || null,
    queue_total: Array.isArray(payload.queue) ? payload.queue.length : 0,
    queue_cursor: payload.cursor || 0,
  };
}

export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(user, "google_maps");
    if (!subCheck.allowed) {
      return NextResponse.json(
        { status: "error", message: subCheck.message || "Google Maps access restricted." },
        { status: subCheck.statusCode || 403 }
      );
    }

    const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");

    const jobRow = jobId
      ? await getActiveSearchJobById(jobId, workspaceId)
      : await getNeonActiveSearchJob(workspaceId, 180);

    return NextResponse.json({
      status: "success",
      job: serializeJob(jobRow),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Failed to retrieve Maps search job." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "start").toLowerCase();

    const subCheck = await verifyClientActiveSubscription(user, "google_maps");
    if (!subCheck.allowed) {
      return NextResponse.json(
        {
          status: "error",
          code: "UPGRADE_REQUIRED",
          message: subCheck.message || "Google Maps Lead Generator requires an active plan with Google Maps enabled.",
        },
        { status: subCheck.statusCode || 403 }
      );
    }

    const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
    const userId = Number(subCheck.userRecord?.id || user.id) || 1;

    if (action === "cancel") {
      const jobId = String(body.job_id || "").trim();
      const targetJob = jobId
        ? await getActiveSearchJobById(jobId, workspaceId)
        : await getNeonActiveSearchJob(workspaceId);

      if (!targetJob) {
        return NextResponse.json({ status: "success", job: null, message: "No active job to cancel." });
      }
      const cancelled = await cancelActiveSearchJob(targetJob.id, workspaceId);
      return NextResponse.json({
        status: "success",
        message: "Google Maps research stopped. Any already-discovered leads have been preserved in Saved Leads.",
        job: serializeJob(cancelled || targetJob),
      });
    }

    if (action === "start") {
      const keyword = String(body.keyword || "").trim();
      if (!keyword) {
        return NextResponse.json(
          { status: "error", message: "Please enter a target business niche or keyword." },
          { status: 400 }
        );
      }

      const geo = parseMapsCountriesAndCities(body);
      if (geo.error) {
        return NextResponse.json({ status: "error", message: geo.error }, { status: 400 });
      }

      // Enforce multi-country Maps entitlement if custom plan disabled multi-country maps
      if (geo.countries.length > 1 && subCheck.entitlements && !subCheck.entitlements.features.multi_country_maps) {
        return NextResponse.json(
          {
            status: "error",
            code: "ENTITLEMENT_RESTRICTED",
            message: `Multi-country Google Maps search is not enabled on your ${subCheck.entitlements.planLabel}. Please select 1 country or upgrade your plan.`,
          },
          { status: 403 }
        );
      }

      const serperKey = resolveSerperKey();
      if (!serperKey) {
        return NextResponse.json(
          { status: "error", message: "Search provider key (SERPER_API_KEY) is not configured." },
          { status: 503 }
        );
      }

      const requestedQuantity = Math.min(Math.max(Number(body.requested_quantity) || 50, 1), 2000);
      const contactRequirement = parseContactRequirement(body.contact_requirement || body.contact_filter);
      const queue = buildInitialMapsQueue(geo.countries, geo.specificCitiesEnabled, geo.cities);
      const searchRecordId = `SR-MAPS-${Date.now()}`;

      const initialPayload: MapsJobPayload = {
        countries: geo.countries,
        specific_cities_enabled: geo.specificCitiesEnabled,
        cities: geo.cities,
        contact_requirement: contactRequirement,
        requested_quantity: requestedQuantity,
        queue,
        cursor: 0,
        candidates_processed: 0,
        eligible_count: 0,
        duplicates_skipped: 0,
        missing_contact_skipped: 0,
        errors_count: 0,
        provider_errors: [],
        country_stats: {},
        live_leads: [],
        current_target: queue[0]?.city ? `${queue[0].city}, ${queue[0].country}` : (queue[0]?.country || ""),
        shortfall_reason: null,
        search_record_id: searchRecordId,
        seen_domains: [],
        seen_place_ids: [],
        seen_emails: [],
        seen_phones: [],
      };

      const citySummary = geo.specificCitiesEnabled
        ? geo.cities.map((c) => c.city).slice(0, 5).join(", ") + (geo.cities.length > 5 ? ` (+${geo.cities.length - 5} more)` : "")
        : "";
      const countrySummary = geo.countries.length > 5
        ? `${geo.countries.length} Countries`
        : geo.countries.join(", ");

      const lock = await acquireActiveSearchJob(
        workspaceId,
        userId,
        "MAPS_SEARCH",
        keyword,
        countrySummary,
        citySummary,
        requestedQuantity,
        initialPayload
      );

      if (!lock.allowed || !lock.jobId) {
        return NextResponse.json(
          {
            status: "error",
            code: "SEARCH_ALREADY_RUNNING",
            message: lock.message || "A Maps research job is already running in your workspace.",
            active_job_id: lock.jobId,
          },
          { status: 409 }
        );
      }

      const jobRow = await getActiveSearchJobById(lock.jobId, workspaceId);
      return NextResponse.json({
        status: "success",
        job: serializeJob(jobRow),
      });
    }

    if (action === "step") {
      const jobId = String(body.job_id || "").trim();
      if (!jobId) {
        return NextResponse.json({ status: "error", message: "Missing job_id for step." }, { status: 400 });
      }

      const jobRow = await getActiveSearchJobById(jobId, workspaceId);
      if (!jobRow) {
        return NextResponse.json({ status: "error", message: "Google Maps job not found." }, { status: 404 });
      }

      if (jobRow.status !== "RUNNING") {
        return NextResponse.json({ status: "success", job: serializeJob(jobRow) });
      }

      let payload: MapsJobPayload =
        typeof jobRow.job_payload === "string" ? JSON.parse(jobRow.job_payload) : (jobRow.job_payload || {});

      const serperKey = resolveSerperKey();
      if (!serperKey) {
        await completeActiveSearchJob(jobId, "FAILED", payload.eligible_count || 0, payload.search_record_id, "Search provider not configured");
        const updated = await getActiveSearchJobById(jobId, workspaceId);
        return NextResponse.json({ status: "success", job: serializeJob(updated) });
      }

      // Preload existing workspace signatures for permanent account-level dedup
      const wsSignatures = isNeonConfigured()
        ? await getNeonWorkspaceLeadSignatures(workspaceId)
        : { domains: new Set<string>(), emails: new Set<string>(), phones: new Set<string>(), placeIds: new Set<string>() };

      const seenPlaceIds = new Set<string>([...Array.from(wsSignatures.placeIds), ...(payload.seen_place_ids || [])]);
      const seenDomains = new Set<string>([...Array.from(wsSignatures.domains), ...(payload.seen_domains || [])]);
      const seenEmails = new Set<string>([...Array.from(wsSignatures.emails), ...(payload.seen_emails || [])]);
      const seenPhones = new Set<string>([...Array.from(wsSignatures.phones), ...(payload.seen_phones || [])]);

      const stepRes = await processMapsBatchStep({
        serperKey,
        keyword: jobRow.keyword,
        contactRequirement: payload.contact_requirement || "EMAIL_OR_PHONE",
        requestedQuantity: payload.requested_quantity || jobRow.target_count || 50,
        queue: payload.queue || [],
        cursor: payload.cursor || 0,
        countryStats: payload.country_stats || {},
        seenPlaceIds,
        seenDomains,
        seenEmails,
        seenPhones,
        existingEligibleCount: payload.eligible_count || 0,
        maxTasksPerStep: 2,
        timeBudgetMs: 6500,
      });

      // Re-check DB in case user clicked Cancel mid-flight
      const latestCheck = await getActiveSearchJobById(jobId, workspaceId);
      const wasCancelled = latestCheck?.status === "CANCELLED";

      // Persist newly found leads from this batch immediately
      if (stepRes.newLeads.length > 0 && isNeonConfigured()) {
        try {
          await saveNeonSearchRecordAndLeads(
            workspaceId,
            {
              keyword: jobRow.keyword,
              country:
                payload.countries.length > 5
                  ? `${payload.countries.length} Countries`
                  : payload.countries.join(", "),
              city: payload.specific_cities_enabled
                ? payload.cities.map((c) => c.city).slice(0, 5).join(", ")
                : "",
              sources: ["Google Maps (Serper Places)"],
              requested_quantity: payload.requested_quantity,
              search_record_id: payload.search_record_id,
            },
            stepRes.newLeads
          );
        } catch (dbErr) {
          console.error("[Maps Job Step] Persist error:", dbErr);
        }
      }

      const newEligibleCount = (payload.eligible_count || 0) + stepRes.newLeads.length;
      const newCandidates = (payload.candidates_processed || 0) + stepRes.candidatesDelta;
      const newDups = (payload.duplicates_skipped || 0) + stepRes.duplicatesDelta;
      const newMissing = (payload.missing_contact_skipped || 0) + stepRes.missingContactDelta;
      const newErrors = (payload.errors_count || 0) + stepRes.errorsDelta;
      const mergedErrors = Array.from(new Set([...(payload.provider_errors || []), ...stepRes.providerErrors])).slice(0, 12);

      // Keep UI live_leads up to 500 items cleanly inside job_payload
      const mergedLeads = [...(payload.live_leads || []), ...stepRes.newLeads].slice(0, 500);

      const shortfallReason = stepRes.done || wasCancelled
        ? buildShortfallMessage({
            keyword: jobRow.keyword,
            requestedQuantity: payload.requested_quantity,
            eligibleCount: newEligibleCount,
            candidatesProcessed: newCandidates,
            duplicatesSkipped: newDups,
            missingContactSkipped: newMissing,
            errorsCount: newErrors,
            contactRequirement: payload.contact_requirement,
          })
        : null;

      const updatedPayload: MapsJobPayload = {
        ...payload,
        queue: stepRes.queue,
        cursor: stepRes.nextCursor,
        candidates_processed: newCandidates,
        eligible_count: newEligibleCount,
        duplicates_skipped: newDups,
        missing_contact_skipped: newMissing,
        errors_count: newErrors,
        provider_errors: mergedErrors,
        live_leads: mergedLeads,
        current_target: stepRes.currentTarget || payload.current_target,
        shortfall_reason: shortfallReason,
        seen_domains: Array.from(seenDomains).slice(-600),
        seen_place_ids: Array.from(seenPlaceIds).slice(-600),
        seen_emails: Array.from(seenEmails).slice(-600),
        seen_phones: Array.from(seenPhones).slice(-600),
      };

      if (wasCancelled) {
        await completeActiveSearchJob(
          jobId,
          "CANCELLED",
          newEligibleCount,
          payload.search_record_id,
          undefined,
          updatedPayload,
          `Cancelled by user — preserved ${newEligibleCount} saved leads.`
        );
      } else if (stepRes.done) {
        const finalMsg = shortfallReason
          ? `Completed with ${newEligibleCount}/${payload.requested_quantity} qualified leads. ${shortfallReason}`
          : `Completed! Discovered and auto-saved ${newEligibleCount} qualified leads.`;
        await completeActiveSearchJob(
          jobId,
          "COMPLETED",
          newEligibleCount,
          payload.search_record_id,
          mergedErrors.length > 0 && newEligibleCount === 0 ? mergedErrors[0] : undefined,
          updatedPayload,
          finalMsg
        );
        await logAccountAudit({
          adminId: userId,
          adminEmail: subCheck.userRecord?.email || subCheck.userRecord?.username || "client",
          clientId: userId,
          clientEmail: subCheck.userRecord?.email || subCheck.userRecord?.username || "",
          workspaceId,
          action: "GOOGLE_MAPS_SEARCH",
          details: {
            job_id: jobId,
            keyword: jobRow.keyword,
            countries: payload.countries,
            requested: payload.requested_quantity,
            qualified_count: newEligibleCount,
          },
        }).catch(() => {});
      } else {
        await updateActiveSearchJobProgress(jobId, workspaceId, {
          progressCount: newEligibleCount,
          progressMessage: `Scanning ${stepRes.currentTarget || "selected markets"} (${stepRes.nextCursor}/${stepRes.queue.length} batches) — ${newEligibleCount} qualified leads saved so far...`,
          jobPayload: updatedPayload,
        });
      }

      const finalRow = await getActiveSearchJobById(jobId, workspaceId);
      return NextResponse.json({
        status: "success",
        job: serializeJob(finalRow),
      });
    }

    return NextResponse.json({ status: "error", message: `Unsupported job action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[Maps Job API] Error:", err);
    return NextResponse.json(
      { status: "error", message: err?.message || "Google Maps research job failed." },
      { status: 500 }
    );
  }
}
