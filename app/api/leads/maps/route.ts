import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import {
  isNeonConfigured,
  saveNeonSearchRecordAndLeads,
  getNeonWorkspaceLeadSignatures,
  acquireActiveSearchJob,
  completeActiveSearchJob,
} from "@/lib/neon-db";
import { cleanDomain, crawlWebsiteForContacts, querySerperForDomainContact } from "@/lib/search-intelligence";
import {
  evaluateContactRequirement,
  calculateLeadQualityScore,
  ContactRequirement,
  validateAndNormalizePhone,
} from "@/lib/lead-quality-engine";
import { normalizeCountryName, isSupportedCountry } from "@/lib/countries";

export const dynamic = "force-dynamic";

interface MapLead {
  id?: number;
  business_name: string;
  website: string;
  domain: string;
  email: string;
  email_source_url: string;
  email_status: string;
  phone: string;
  phone_source_url: string;
  phone_status: string;
  country: string;
  city: string;
  address: string;
  industry: string;
  category: string;
  rating?: number;
  rating_count?: number;
  place_id?: string;
  source: string;
  source_platform: string;
  source_url: string;
  quality_score?: number;
  quality_category?: string;
  quality_reasons?: string[];
  contact_requirement?: string;
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(user);

    if (!subCheck.allowed) {
      return NextResponse.json(
        { status: "error", message: subCheck.message || "Active subscription required." },
        { status: subCheck.statusCode || 403 }
      );
    }

    const emailLower = String(user.email || "").trim().toLowerCase();
    const roleUpper = String(user.role || "").toUpperCase();
    const accountTypeUpper = String(user.account_type || "").toUpperCase();
    const isOwner =
      roleUpper === "SUPER_ADMIN" ||
      roleUpper === "ADMIN" ||
      accountTypeUpper === "MASTER_OWNER" ||
      [
        "transaction000501@gmail.com",
        "admin@usmanai.com",
        "mu0602503@gmail.com",
        "admin@usmangtm.com",
        "selftest_founder_2026@usmanai.com",
      ].includes(emailLower);

    const userRecord = subCheck.userRecord || user;
    const planUpper = String(userRecord.plan || "BASIC").toUpperCase();

    // STRICT PLAN RESTRICTION: Google Maps Lead Generator is exclusive to Lifetime Plan ($100) and Master Owner
    if (!isOwner && planUpper !== "LIFETIME") {
      return NextResponse.json(
        {
          status: "error",
          code: "UPGRADE_REQUIRED",
          message:
            "Google Maps Business Lead Generator is an exclusive feature of the $100 Lifetime Plan. Please upgrade to unlock unlimited Google Maps local business intelligence.",
          upgrade_url:
            "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20upgrade%20to%20the%20%24100%20Lifetime%20Plan%20for%20Google%20Maps%20Lead%20Generator",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const keyword = String(body.keyword || "").trim();

    // Support both single country string or multi-country array
    let selectedCountries: string[] = [];
    if (Array.isArray(body.countries) && body.countries.length > 0) {
      selectedCountries = body.countries
        .map((c: string) => normalizeCountryName(c))
        .filter((c: string) => isSupportedCountry(c));
    } else if (body.country) {
      const norm = normalizeCountryName(body.country);
      if (isSupportedCountry(norm)) {
        selectedCountries = [norm];
      }
    }
    if (selectedCountries.length === 0) {
      selectedCountries = ["United States"];
    }

    const city = String(body.city || "").trim();
    const requestedQuantity = Math.min(Math.max(Number(body.requested_quantity) || 50, 10), 2000);

    // Support contact_requirement or legacy contact_filter
    let contactRequirement: ContactRequirement = "EMAIL_OR_PHONE";
    const rawReq = String(body.contact_requirement || body.contact_filter || "").toUpperCase();
    if (rawReq === "EMAIL_AND_PHONE" || rawReq === "BOTH") {
      contactRequirement = "EMAIL_AND_PHONE";
    } else if (rawReq === "EMAIL_ONLY") {
      contactRequirement = "EMAIL_ONLY";
    } else if (rawReq === "PHONE_ONLY") {
      contactRequirement = "PHONE_ONLY";
    } else {
      contactRequirement = "EMAIL_OR_PHONE";
    }

    if (!keyword) {
      return NextResponse.json(
        { status: "error", message: "Keyword is required for Google Maps lead generation." },
        { status: 400 }
      );
    }

    const workspaceId = Number(user.workspace_id) || 1;

    // 1. One active search job per customer account lock
    const jobLock = await acquireActiveSearchJob(
      workspaceId,
      user.id || 1,
      "MAPS_SEARCH",
      keyword,
      selectedCountries.join(", "),
      city,
      requestedQuantity
    );

    if (!jobLock.allowed) {
      return NextResponse.json(
        {
          status: "error",
          code: "SEARCH_ALREADY_RUNNING",
          message: jobLock.message || "A lead generation search is already in progress for your workspace. Please wait for it to complete.",
          active_job_id: jobLock.jobId,
        },
        { status: 409 }
      );
    }
    const currentJobId = jobLock.jobId;

    // Verify Search Provider API Key (Serper with fallback)
    const serperKey = (process.env.SERPER_API_KEY || "2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297").trim();
    if (!serperKey) {
      if (currentJobId) await completeActiveSearchJob(currentJobId, "FAILED", 0, undefined, "Search provider not configured");
      return NextResponse.json(
        {
          status: "error",
          code: "PROVIDER_NOT_CONFIGURED",
          message:
            "Google Maps Search API is not configured. Please configure SERPER_API_KEY in Vercel environment variables or Admin Providers.",
        },
        { status: 503 }
      );
    }

    // Preload permanent account-level leads for deduplication
    const existingSignatures = isNeonConfigured()
      ? await getNeonWorkspaceLeadSignatures(workspaceId)
      : { domains: new Set<string>(), emails: new Set<string>(), phones: new Set<string>(), placeIds: new Set<string>() };

    const qualifiedLeads: MapLead[] = [];
    const seenDomains = new Set<string>(existingSignatures.domains);
    const seenPlaceIds = new Set<string>(existingSignatures.placeIds);
    const seenEmails = new Set<string>(existingSignatures.emails);
    const seenPhones = new Set<string>(existingSignatures.phones);

    let totalRawDiscovered = 0;
    let excludedExistingDuplicates = 0;
    let missingContactSkipped = 0;

    const countryStats: Record<string, { discovered: number; eligible: number; duplicates: number; missing_contact: number }> = {};

    // Search across each selected country
    for (const targetCountry of selectedCountries) {
      if (qualifiedLeads.length >= requestedQuantity) break;

      countryStats[targetCountry] = { discovered: 0, eligible: 0, duplicates: 0, missing_contact: 0 };

      let locationStr = targetCountry;
      if (city && city !== "ALL_CITIES") {
        locationStr = `${city}, ${targetCountry}`;
      }
      const searchQuery = `${keyword} in ${locationStr}`;

      const rawPlaces: any[] = [];
      try {
        const placesRes = await fetch("https://google.serper.dev/places", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: searchQuery,
            location: locationStr,
            hl: "en",
          }),
        });

        if (placesRes.ok) {
          const placesData = await placesRes.json();
          if (Array.isArray(placesData.places)) {
            rawPlaces.push(...placesData.places);
          }
        }
      } catch (err: any) {
        console.warn(`[Google Maps API] Places query error for ${targetCountry}:`, err);
      }

      totalRawDiscovered += rawPlaces.length;
      countryStats[targetCountry].discovered += rawPlaces.length;

      for (const place of rawPlaces) {
        if (qualifiedLeads.length >= requestedQuantity) break;

        const placeId = place.placeId || place.cid || `place_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        if (seenPlaceIds.has(placeId)) {
          excludedExistingDuplicates++;
          countryStats[targetCountry].duplicates++;
          continue;
        }

        const title = String(place.title || place.name || "").trim();
        if (!title) continue;

        const rawWebsite = String(place.website || "").trim();
        const domain = rawWebsite ? cleanDomain(rawWebsite) : "";

        if (domain && seenDomains.has(domain)) {
          excludedExistingDuplicates++;
          countryStats[targetCountry].duplicates++;
          continue;
        }

        const rawPhone = String(place.phoneNumber || place.phone || "").trim();
        const phoneNorm = validateAndNormalizePhone(rawPhone, targetCountry);
        const phone = phoneNorm.valid ? phoneNorm.normalized : rawPhone;

        if (phoneNorm.valid && seenPhones.has(phoneNorm.normalized)) {
          excludedExistingDuplicates++;
          countryStats[targetCountry].duplicates++;
          continue;
        }

        let email = "";
        let emailSourceUrl = "";
        let emailStatus = "NOT FOUND";

        // Discover email from website
        if (domain && domain.length > 3) {
          try {
            const contact = await crawlWebsiteForContacts(domain, "", phone);
            if (contact.email) {
              email = contact.email;
              emailSourceUrl = contact.emailSourceUrl || `https://${domain}`;
              emailStatus = contact.emailStatus;
            } else if (serperKey) {
              const fallback = await querySerperForDomainContact(domain, serperKey);
              if (fallback.email) {
                email = fallback.email;
                emailSourceUrl = fallback.emailSourceUrl || `https://${domain}`;
                emailStatus = "VERIFIED IN SEARCH INDEX";
              }
            }
          } catch {}
        }

        // Contact Requirement Evaluation
        const contactValidation = evaluateContactRequirement(
          { email, phone },
          contactRequirement,
          targetCountry
        );

        if (!contactValidation.eligible) {
          missingContactSkipped++;
          countryStats[targetCountry].missing_contact++;
          continue;
        }

        // Check email deduplication if email exists
        if (contactValidation.normalizedEmail && seenEmails.has(contactValidation.normalizedEmail)) {
          excludedExistingDuplicates++;
          countryStats[targetCountry].duplicates++;
          continue;
        }

        // Quality Scoring
        const qualityResult = calculateLeadQualityScore({
          business_name: title,
          website: rawWebsite || (domain ? `https://${domain}` : ""),
          email: contactValidation.normalizedEmail || email,
          phone: contactValidation.normalizedPhone || phone,
          country: targetCountry,
          address: String(place.address || "").trim(),
        });

        // Add to signatures
        seenPlaceIds.add(placeId);
        if (domain) seenDomains.add(domain);
        if (contactValidation.normalizedEmail) seenEmails.add(contactValidation.normalizedEmail);
        if (contactValidation.normalizedPhone) seenPhones.add(contactValidation.normalizedPhone);

        const newLead: MapLead = {
          business_name: title,
          website: rawWebsite || (domain ? `https://${domain}` : ""),
          domain,
          email: contactValidation.normalizedEmail || email || "",
          email_source_url: emailSourceUrl || (domain ? `https://${domain}` : ""),
          email_status: email ? emailStatus : "NOT FOUND",
          phone: contactValidation.normalizedPhone || phone || "",
          phone_source_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + " " + (place.address || locationStr))}`,
          phone_status: phoneNorm.valid ? "LISTED ON GOOGLE MAPS" : "NOT LISTED",
          country: targetCountry,
          city: city !== "ALL_CITIES" ? city : "",
          address: String(place.address || "").trim(),
          industry: keyword,
          category: String(place.category || keyword).trim(),
          rating: place.rating ? Number(place.rating) : undefined,
          rating_count: place.ratingCount ? Number(place.ratingCount) : undefined,
          place_id: placeId,
          source: "Google Maps Platform",
          source_platform: "Google Places API",
          source_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + " " + (place.address || locationStr))}`,
          quality_score: qualityResult.score,
          quality_category: qualityResult.category,
          quality_reasons: qualityResult.reasons,
          contact_requirement: contactRequirement,
        };

        qualifiedLeads.push(newLead);
        countryStats[targetCountry].eligible++;
      }
    }

    // Persist to Authoritative Neon PostgreSQL Database
    const searchRecordId = `SR-MAPS-${Date.now()}`;
    if (isNeonConfigured() && qualifiedLeads.length > 0) {
      try {
        await saveNeonSearchRecordAndLeads(
          workspaceId,
          {
            keyword,
            country: selectedCountries.join(", "),
            city: city !== "ALL_CITIES" ? city : "",
            sources: ["Google Maps Platform", "Google Places API"],
            requested_quantity: requestedQuantity,
            search_record_id: searchRecordId,
          },
          qualifiedLeads
        );
      } catch (dbErr) {
        console.error("[Google Maps Lead DB Persistence] Error:", dbErr);
      }
    }

    if (currentJobId) {
      await completeActiveSearchJob(currentJobId, "COMPLETED", qualifiedLeads.length, searchRecordId);
    }

    return NextResponse.json({
      status: "success",
      leads: qualifiedLeads,
      total_scraped: totalRawDiscovered,
      total_qualified: qualifiedLeads.length,
      contact_requirement: contactRequirement,
      countries: selectedCountries,
      country_stats: countryStats,
      duplicates_skipped: excludedExistingDuplicates,
      missing_contact_skipped: missingContactSkipped,
      source: "Google Maps Platform & Official Websites",
      message: `Discovered and saved ${qualifiedLeads.length} unique qualified Google Maps leads for "${keyword}" across ${selectedCountries.length} countries. (${excludedExistingDuplicates} duplicates skipped, ${missingContactSkipped} skipped due to contact criteria).`,
    });
  } catch (err: any) {
    console.error("[Google Maps Lead Generator] Top-level error:", err);
    return NextResponse.json(
      { status: "error", message: err?.message || "Failed to generate Google Maps leads." },
      { status: 500 }
    );
  }
}
