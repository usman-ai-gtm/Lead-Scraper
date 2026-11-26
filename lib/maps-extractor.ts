import {
  cleanDomain,
  crawlWebsiteForContacts,
  querySerperForDomainContact,
} from "@/lib/search-intelligence";
import {
  evaluateContactRequirement,
  calculateLeadQualityScore,
  ContactRequirement,
  validateAndNormalizePhone,
} from "@/lib/lead-quality-engine";
import {
  normalizeCountryName,
  isSupportedCountry,
  getCountryGlCode,
} from "@/lib/countries";

export interface MapsCityTarget {
  city: string;
  country: string;
}

export interface MapsQueueTask {
  country: string;
  city: string | null;
  page: number;
  variantIdx: number;
}

export interface MapsCountryStat {
  discovered: number;
  eligible: number;
  duplicates: number;
  missing_contact: number;
  errors: number;
}

export interface MapsLeadItem {
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
  last_verified_at?: string;
  collection_timestamp?: string;
  country: string;
  city: string;
  address: string;
  industry: string;
  category: string;
  rating?: number;
  rating_count?: number;
  place_id?: string;
  source: string;
  source_url: string;
  quality_score?: number;
  quality_category?: string;
  quality_reasons?: string[];
  contact_requirement?: string;
}

export interface MapsJobPayload {
  countries: string[];
  specific_cities_enabled: boolean;
  cities: MapsCityTarget[];
  contact_requirement: ContactRequirement;
  requested_quantity: number;
  queue: MapsQueueTask[];
  cursor: number;
  candidates_processed: number;
  eligible_count: number;
  duplicates_skipped: number;
  missing_contact_skipped: number;
  errors_count: number;
  provider_errors: string[];
  country_stats: Record<string, MapsCountryStat>;
  live_leads: MapsLeadItem[];
  current_target: string;
  shortfall_reason: string | null;
  search_record_id: string;
  seen_domains: string[];
  seen_place_ids: string[];
  seen_emails: string[];
  seen_phones: string[];
}

export function resolveSerperKey(): string {
  return (process.env.SERPER_API_KEY || "").trim();
}

export function parseContactRequirement(raw?: any): ContactRequirement {
  const r = String(raw || "").toUpperCase();
  if (r === "EMAIL_AND_PHONE" || r === "BOTH") return "EMAIL_AND_PHONE";
  if (r === "EMAIL_ONLY") return "EMAIL_ONLY";
  if (r === "PHONE_ONLY") return "PHONE_ONLY";
  return "EMAIL_OR_PHONE";
}

export function parseMapsCountriesAndCities(body: any): {
  countries: string[];
  specificCitiesEnabled: boolean;
  cities: MapsCityTarget[];
  error?: string;
} {
  let countries: string[] = [];
  if (Array.isArray(body?.countries) && body.countries.length > 0) {
    countries = Array.from(
      new Set(
        body.countries
          .map((c: any) => normalizeCountryName(String(c)))
          .filter((c: string) => isSupportedCountry(c))
      )
    );
  } else if (body?.country) {
    const norm = normalizeCountryName(String(body.country));
    if (isSupportedCountry(norm)) countries = [norm];
  }

  if (countries.length === 0) {
    return {
      countries: [],
      specificCitiesEnabled: false,
      cities: [],
      error: "Please select at least 1 valid country before running a search.",
    };
  }

  const specificCitiesEnabled = Boolean(body?.specific_cities_enabled);
  const rawCities = Array.isArray(body?.cities) ? body.cities : [];
  const legacyCity =
    typeof body?.city === "string" &&
    body.city.trim() &&
    body.city.trim() !== "ALL_CITIES" &&
    body.city.trim() !== "Commercial Business Center"
      ? body.city.trim()
      : "";

  const countrySet = new Set(countries);
  const parsedCities: MapsCityTarget[] = [];
  const seenKeys = new Set<string>();

  if (specificCitiesEnabled) {
    for (const item of rawCities) {
      if (typeof item === "string" && item.trim()) {
        const c = item.trim();
        const cntry = countries[0];
        const key = `${c.toLowerCase()}||${cntry.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          parsedCities.push({ city: c, country: cntry });
        }
      } else if (item && typeof item === "object" && item.city) {
        const c = String(item.city).trim();
        const cntry = normalizeCountryName(String(item.country || countries[0]));
        if (c && countrySet.has(cntry)) {
          const key = `${c.toLowerCase()}||${cntry.toLowerCase()}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            parsedCities.push({ city: c, country: cntry });
          }
        }
      }
    }

    if (parsedCities.length === 0 && legacyCity) {
      parsedCities.push({ city: legacyCity, country: countries[0] });
    }

    if (parsedCities.length === 0) {
      return {
        countries,
        specificCitiesEnabled: true,
        cities: [],
        error: "Please select at least 1 city when 'Select Specific Cities' is enabled, or disable it for whole-country search.",
      };
    }
  } else if (legacyCity && !body?.hasOwnProperty("specific_cities_enabled")) {
    // Support explicit legacy API calls passing `city` without toggle
    parsedCities.push({ city: legacyCity, country: countries[0] });
    return {
      countries,
      specificCitiesEnabled: true,
      cities: parsedCities,
    };
  }

  return {
    countries,
    specificCitiesEnabled: parsedCities.length > 0 && specificCitiesEnabled,
    cities: parsedCities,
  };
}

export function buildInitialMapsQueue(
  countries: string[],
  specificCitiesEnabled: boolean,
  cities: MapsCityTarget[]
): MapsQueueTask[] {
  const tasks: MapsQueueTask[] = [];
  if (specificCitiesEnabled && cities.length > 0) {
    for (const ct of cities) {
      tasks.push({ country: ct.country, city: ct.city, page: 1, variantIdx: 0 });
    }
  } else {
    for (const c of countries) {
      tasks.push({ country: c, city: null, page: 1, variantIdx: 0 });
    }
  }
  return tasks;
}

async function fetchSerperPlaces(
  serperKey: string,
  keyword: string,
  task: MapsQueueTask
): Promise<{ places: any[]; error?: string }> {
  const gl = getCountryGlCode(task.country);
  const locationParts = [task.city, task.country].filter(Boolean);
  const locationLabel = locationParts.join(", ");

  const cleanKw = keyword.trim().slice(0, 120);
  const variantPrefixes = [cleanKw, `${cleanKw} business`, `${cleanKw} company`];
  const baseQuery = variantPrefixes[task.variantIdx] || cleanKw;
  const searchQuery = `${baseQuery} in ${locationLabel}`;

  const requestBody: Record<string, any> = {
    q: searchQuery,
    hl: "en",
  };
  if (gl) requestBody.gl = gl;
  if (locationLabel && locationLabel.length <= 80) {
    requestBody.location = locationLabel;
  }
  if (task.page > 1) {
    requestBody.page = task.page;
  }

  const execFetch = async (payload: Record<string, any>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);
    try {
      const res = await fetch("https://google.serper.dev/places", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      clearTimeout(timer);
      const rawText = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
      return { ok: res.ok, status: res.status, rawText, parsed };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        ok: false,
        status: 0,
        rawText: err?.name === "AbortError" ? "Request timed out after 7.5s" : (err?.message || "Network failure"),
        parsed: null,
      };
    }
  };

  let resp = await execFetch(requestBody);

  // If Serper rejects optional `location` formatting (HTTP 400), retry using `q` + `gl` only
  if (!resp.ok && resp.status === 400 && requestBody.location) {
    const fallbackPayload = { ...requestBody };
    delete fallbackPayload.location;
    resp = await execFetch(fallbackPayload);
  }

  if (!resp.ok) {
    const providerMsg =
      resp.parsed?.message ||
      resp.parsed?.error ||
      resp.rawText?.slice(0, 200) ||
      `HTTP ${resp.status}`;
    return {
      places: [],
      error: `Places provider error for ${locationLabel} (HTTP ${resp.status}): ${providerMsg}`,
    };
  }

  const places = Array.isArray(resp.parsed?.places) ? resp.parsed.places : [];
  return { places };
}

export interface ProcessMapsBatchInput {
  serperKey: string;
  keyword: string;
  contactRequirement: ContactRequirement;
  requestedQuantity: number;
  queue: MapsQueueTask[];
  cursor: number;
  countryStats: Record<string, MapsCountryStat>;
  seenPlaceIds: Set<string>;
  seenDomains: Set<string>;
  seenEmails: Set<string>;
  seenPhones: Set<string>;
  existingEligibleCount: number;
  maxTasksPerStep?: number;
  timeBudgetMs?: number;
}

export interface ProcessMapsBatchOutput {
  newLeads: MapsLeadItem[];
  nextCursor: number;
  queue: MapsQueueTask[];
  candidatesDelta: number;
  duplicatesDelta: number;
  missingContactDelta: number;
  errorsDelta: number;
  providerErrors: string[];
  currentTarget: string;
  done: boolean;
}

export async function processMapsBatchStep(
  input: ProcessMapsBatchInput
): Promise<ProcessMapsBatchOutput> {
  const stepStart = Date.now();
  const maxTasks = input.maxTasksPerStep ?? 2;
  const timeBudgetMs = input.timeBudgetMs ?? 6500;

  const queue = [...input.queue];
  let cursor = input.cursor;
  let eligibleTotal = input.existingEligibleCount;

  const newLeads: MapsLeadItem[] = [];
  const providerErrors: string[] = [];
  let candidatesDelta = 0;
  let duplicatesDelta = 0;
  let missingContactDelta = 0;
  let errorsDelta = 0;
  let currentTarget = "";

  const needsEmail =
    input.contactRequirement === "EMAIL_ONLY" || input.contactRequirement === "EMAIL_AND_PHONE";

  let tasksRun = 0;
  while (
    cursor < queue.length &&
    eligibleTotal < input.requestedQuantity &&
    tasksRun < maxTasks &&
    Date.now() - stepStart < timeBudgetMs
  ) {
    const task = queue[cursor];
    cursor++;
    tasksRun++;

    currentTarget = task.city ? `${task.city}, ${task.country}` : task.country;
    if (!input.countryStats[task.country]) {
      input.countryStats[task.country] = {
        discovered: 0,
        eligible: 0,
        duplicates: 0,
        missing_contact: 0,
        errors: 0,
      };
    }

    const { places, error } = await fetchSerperPlaces(input.serperKey, input.keyword, task);
    if (error) {
      errorsDelta++;
      input.countryStats[task.country].errors++;
      providerErrors.push(error);
      continue;
    }

    candidatesDelta += places.length;
    input.countryStats[task.country].discovered += places.length;

    // If this target produced a full page and we still need many more leads, enqueue next page (up to page 3)
    if (
      places.length >= 10 &&
      task.page < 3 &&
      eligibleTotal + newLeads.length < input.requestedQuantity
    ) {
      queue.push({
        country: task.country,
        city: task.city,
        page: task.page + 1,
        variantIdx: task.variantIdx,
      });
    } else if (
      places.length > 0 &&
      places.length < 10 &&
      task.variantIdx === 0 &&
      task.page === 1 &&
      queue.length <= 12 &&
      eligibleTotal + newLeads.length < input.requestedQuantity
    ) {
      queue.push({
        country: task.country,
        city: task.city,
        page: 1,
        variantIdx: 1,
      });
    }

    // First-pass dedup & prepare website crawl list
    interface CandidatePrep {
      place: any;
      placeId: string;
      title: string;
      rawWebsite: string;
      domain: string;
      phone: string;
      phoneValid: boolean;
      phoneNormalized: string;
    }

    const crawlCandidates: CandidatePrep[] = [];

    for (const place of places) {
      const placeId = String(
        place.placeId || place.cid || `place_${task.country}_${task.city || "all"}_${place.title || ""}_${place.address || ""}`
      ).trim();

      if (input.seenPlaceIds.has(placeId)) {
        duplicatesDelta++;
        input.countryStats[task.country].duplicates++;
        continue;
      }

      const title = String(place.title || place.name || "").trim();
      if (!title) continue;

      const rawWebsite = String(place.website || "").trim();
      const domain = rawWebsite ? cleanDomain(rawWebsite) : "";

      if (domain && input.seenDomains.has(domain)) {
        duplicatesDelta++;
        input.countryStats[task.country].duplicates++;
        continue;
      }

      const rawPhone = String(place.phoneNumber || place.phone || "").trim();
      const phoneNorm = validateAndNormalizePhone(rawPhone, task.country);
      const phone = phoneNorm.valid ? phoneNorm.normalized : rawPhone;

      if (phoneNorm.valid && input.seenPhones.has(phoneNorm.normalized)) {
        duplicatesDelta++;
        input.countryStats[task.country].duplicates++;
        continue;
      }

      // Skip crawling if contact requirement is strictly PHONE_ONLY and phone is missing
      if (input.contactRequirement === "PHONE_ONLY" && !phoneNorm.valid) {
        missingContactDelta++;
        input.countryStats[task.country].missing_contact++;
        continue;
      }

      // Skip crawling if requirement needs email (`EMAIL_ONLY` / `EMAIL_AND_PHONE`) and business has no website domain at all
      if (needsEmail && (!domain || domain.length < 4)) {
        missingContactDelta++;
        input.countryStats[task.country].missing_contact++;
        continue;
      }
      if (input.contactRequirement === "EMAIL_AND_PHONE" && !phoneNorm.valid) {
        missingContactDelta++;
        input.countryStats[task.country].missing_contact++;
        continue;
      }

      crawlCandidates.push({
        place,
        placeId,
        title,
        rawWebsite,
        domain,
        phone,
        phoneValid: phoneNorm.valid,
        phoneNormalized: phoneNorm.normalized,
      });
    }

    // Crawl websites in bounded parallel chunks of 5
    const chunkSize = 5;
    for (let i = 0; i < crawlCandidates.length; i += chunkSize) {
      if (eligibleTotal >= input.requestedQuantity) break;
      const chunk = crawlCandidates.slice(i, i + chunkSize);

      const contactResults = await Promise.all(
        chunk.map(async (c) => {
          if (input.contactRequirement === "PHONE_ONLY") {
            return { email: "", emailSourceUrl: "", emailStatus: "NOT NEEDED (PHONE ONLY)" };
          }
          if (!c.domain || c.domain.length < 4) {
            return { email: "", emailSourceUrl: "", emailStatus: "NOT FOUND" };
          }
          try {
            const found = await crawlWebsiteForContacts(c.domain, "", c.phone);
            if (found.email) {
              return {
                email: found.email,
                emailSourceUrl: found.emailSourceUrl || `https://${c.domain}`,
                emailStatus: found.emailStatus,
              };
            }
            if ((needsEmail || !c.phoneValid) && input.serperKey) {
              const fb = await querySerperForDomainContact(c.domain, input.serperKey);
              if (fb.email) {
                return {
                  email: fb.email,
                  emailSourceUrl: fb.emailSourceUrl || `https://${c.domain}`,
                  emailStatus: "FOUND IN PUBLIC INDEX • SYNTAX CHECKED",
                };
              }
            }
          } catch {}
          return { email: "", emailSourceUrl: "", emailStatus: "NOT FOUND" };
        })
      );

      for (let idx = 0; idx < chunk.length; idx++) {
        if (eligibleTotal >= input.requestedQuantity) break;
        const c = chunk[idx];
        const disc = contactResults[idx];

        const contactValidation = evaluateContactRequirement(
          { email: disc.email, phone: c.phone },
          input.contactRequirement,
          task.country
        );

        if (!contactValidation.eligible) {
          missingContactDelta++;
          input.countryStats[task.country].missing_contact++;
          continue;
        }

        if (contactValidation.normalizedEmail && input.seenEmails.has(contactValidation.normalizedEmail)) {
          duplicatesDelta++;
          input.countryStats[task.country].duplicates++;
          continue;
        }
        if (c.placeId && input.seenPlaceIds.has(c.placeId)) {
          duplicatesDelta++;
          input.countryStats[task.country].duplicates++;
          continue;
        }
        if (c.domain && input.seenDomains.has(c.domain)) {
          duplicatesDelta++;
          input.countryStats[task.country].duplicates++;
          continue;
        }

        input.seenPlaceIds.add(c.placeId);
        if (c.domain) input.seenDomains.add(c.domain);
        if (contactValidation.normalizedEmail) input.seenEmails.add(contactValidation.normalizedEmail);
        if (contactValidation.normalizedPhone) input.seenPhones.add(contactValidation.normalizedPhone);

        const locationLabel = task.city ? `${task.city}, ${task.country}` : task.country;
        const qualityResult = calculateLeadQualityScore({
          business_name: c.title,
          website: c.rawWebsite || (c.domain ? `https://${c.domain}` : ""),
          email: contactValidation.normalizedEmail || disc.email,
          phone: contactValidation.normalizedPhone || c.phone,
          country: task.country,
          city: task.city || "",
          address: String(c.place.address || "").trim(),
          source: "Google Maps (Serper Places)",
        });

        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${c.title} ${c.place.address || locationLabel}`.trim()
        )}`;

        const { verifyLeadEmailTruthfully, evaluatePhoneQualityTruthfully } = await import("@/lib/contact-verification");
        const emailText = contactValidation.normalizedEmail || disc.email || "";
        const emailCheck = emailText
          ? await verifyLeadEmailTruthfully(emailText, { resolveMx: true })
          : null;
        const phoneCheck = evaluatePhoneQualityTruthfully(
          contactValidation.normalizedPhone || c.phone || "",
          task.country,
          mapsLink
        );
        const finalEmail = emailCheck?.email || emailText;
        const finalPhone = phoneCheck.normalized || contactValidation.normalizedPhone || c.phone || "";
        const verifiedAtIso = emailCheck?.checkedAt || phoneCheck.checkedAt || new Date().toISOString();

        newLeads.push({
          business_name: c.title,
          website: c.rawWebsite || (c.domain ? `https://${c.domain}` : ""),
          domain: c.domain,
          email: finalEmail,
          email_source_url: disc.emailSourceUrl || (c.domain ? `https://${c.domain}` : ""),
          email_status: emailCheck ? emailCheck.displayLabel : "Not Found",
          phone: finalPhone,
          phone_source_url: mapsLink,
          phone_status: phoneCheck.displayLabel,
          last_verified_at: verifiedAtIso,
          collection_timestamp: verifiedAtIso,
          country: task.country,
          city: task.city || "",
          address: String(c.place.address || "").trim(),
          industry: input.keyword,
          category: String(c.place.category || input.keyword).trim(),
          rating: c.place.rating ? Number(c.place.rating) : undefined,
          rating_count: c.place.ratingCount ? Number(c.place.ratingCount) : undefined,
          place_id: c.placeId,
          source: "Google Maps (Serper Places)",
          source_url: mapsLink,
          quality_score: qualityResult.score,
          quality_category: qualityResult.category,
          quality_reasons: qualityResult.reasons,
          contact_requirement: input.contactRequirement,
        });

        eligibleTotal++;
        input.countryStats[task.country].eligible++;
      }
    }
  }

  const done = cursor >= queue.length || eligibleTotal >= input.requestedQuantity;
  return {
    newLeads,
    nextCursor: cursor,
    queue,
    candidatesDelta,
    duplicatesDelta,
    missingContactDelta,
    errorsDelta,
    providerErrors,
    currentTarget,
    done,
  };
}

export function buildShortfallMessage(params: {
  keyword: string;
  requestedQuantity: number;
  eligibleCount: number;
  candidatesProcessed: number;
  duplicatesSkipped: number;
  missingContactSkipped: number;
  errorsCount: number;
  contactRequirement: ContactRequirement;
}): string | null {
  if (params.eligibleCount >= params.requestedQuantity) return null;
  if (params.candidatesProcessed === 0) {
    return params.errorsCount > 0
      ? "Search provider returned errors before returning listings. Review provider diagnostics below."
      : `0 business listings matched "${params.keyword}" in the selected markets.`;
  }
  const parts: string[] = [];
  if (params.duplicatesSkipped > 0) {
    parts.push(`${params.duplicatesSkipped} excluded as existing workspace duplicates`);
  }
  if (params.missingContactSkipped > 0) {
    parts.push(`${params.missingContactSkipped} lacked required ${params.contactRequirement.replace(/_/g, " ")} contact info`);
  }
  const reasonDetail = parts.length > 0 ? ` (${parts.join("; ")})` : "";
  return `Requested ${params.requestedQuantity}, found ${params.eligibleCount} qualified leads out of ${params.candidatesProcessed} map listings scanned${reasonDetail}. Try adding more cities/countries or loosening the contact filter.`;
}
