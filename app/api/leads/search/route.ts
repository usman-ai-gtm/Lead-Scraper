import { NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  verifyClientActiveSubscription,
  saveServerlessSearchRecordAndLeads,
  getPktDateTime,
} from "@/lib/serverless-auth";
import {
  saveNeonSearchRecordAndLeads,
  isNeonConfigured,
  getNeonSql,
  getNeonWorkspaceLeadSignatures,
  getWorkspaceLeadQuotaState,
  acquireActiveSearchJob,
  completeActiveSearchJob,
  logAccountAudit,
} from "@/lib/neon-db";
import { interpretSearchIntent, SearchIntentResult } from "@/lib/ai-search-parser";
import {
  LeadUseCaseId,
  B2B_USE_CASE_PROFILES,
  classifyUseCaseIntent,
  canonicalCountryKey,
  extractOwnedCompanyDomain,
  resolveGeoSpec,
} from "@/lib/b2b-verticals";
import {
  evaluateContactRequirement,
  calculateLeadQualityScore,
  ContactRequirement,
} from "@/lib/lead-quality-engine";
import { normalizeCountryName } from "@/lib/countries";
import { parseMapsCountriesAndCities } from "@/lib/maps-extractor";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
import {
  verifyLeadEmailTruthfully,
  evaluatePhoneQualityTruthfully,
} from "@/lib/contact-verification";
import {
  lookupGleifEntity,
  searchUkCompaniesHouse,
  getFreeSourceCapabilities,
} from "@/lib/free-sources";
import {
  cleanDomain,
  cleanBusinessName,
  isGenericTitleText,
  isNoiseOrListicleResult,
  generateB2bKeywordVariations,
  extractContactsFromText,
  crawlWebsiteForContacts,
  querySerperForDomainContact,
  computeLeadRelevanceScore,
  mergeLeadIntoList,
  QualifiedLeadItem,
  DiscoveredContact,
} from "@/lib/search-intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SerperOrganicItem {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
}

interface SourceStatus {
  id: string;
  source_name: string;
  status: "WORKING" | "NO RESULTS" | "NOT CONFIGURED" | "RATE LIMITED" | "ERROR" | "SKIPPED";
  leads_contributed: number;
  sample_url?: string;
  error_detail?: string;
}

interface SearchChannel {
  id: string;
  name: string;
  platformLabel: string;
  buildQuery: (variation: string, geoCity: string, geoCountry: string, gl: string) => string;
}

interface CollectedCandidate {
  channelId: string;
  platformLabel: string;
  title: string;
  link: string;
  snippet: string;
  rawHost: string;
  ownedDomain: string;
  businessName: string;
  snippetEmails: string[];
  snippetPhones: string[];
  country: string;
  city: string;
}

function buildIntentChannels(
  useCase: LeadUseCaseId,
  effectiveKeyword: string,
  aiStrategy: SearchIntentResult,
  countryName: string,
  glCode: string
): SearchChannel[] {
  const shortCountry =
    countryName === "United States"
      ? "USA"
      : countryName === "United Kingdom"
      ? "UK"
      : countryName === "United Arab Emirates"
      ? "UAE"
      : countryName === "Global"
      ? ""
      : countryName;

  const tldHint =
    glCode === "de"
      ? "site:.de"
      : glCode === "gb"
      ? "site:.co.uk OR site:.uk"
      : glCode === "au"
      ? "site:.com.au"
      : glCode === "ca"
      ? "site:.ca"
      : glCode === "ae"
      ? "site:.ae OR Dubai"
      : glCode === "pk"
      ? "site:.pk OR Pakistan"
      : glCode === "in"
      ? "site:.in OR India"
      : "";

  const deLegalHint = glCode === "de" ? "(impressum OR kontakt OR e-mail)" : "(contact OR email OR phone)";

  const channels: SearchChannel[] = [];

  if (useCase === "hiring_signals") {
    const role = aiStrategy.hiring_role || effectiveKeyword;
    channels.push(
      {
        id: "company_careers",
        name: "Company Career & Hiring Pages",
        platformLabel: "Company Career Page (Hiring Signal)",
        buildQuery: (_v, c, co) =>
          `"${role}" (careers OR "we are hiring" OR "join our team" OR "open positions") ${[c, shortCountry || co].filter(Boolean).join(" ")} -site:indeed.com -site:glassdoor.com -site:ziprecruiter.com`,
      },
      {
        id: "ats_boards",
        name: "Public ATS Job Portals (Greenhouse/Lever/Workable)",
        platformLabel: "Public ATS Career Portal",
        buildQuery: (_v, c, co) =>
          `(site:boards.greenhouse.io OR site:jobs.lever.co OR site:apply.workable.com OR site:jobs.ashbyhq.com) "${role}" ${[c, shortCountry || co].filter(Boolean).join(" ")}`,
      },
      {
        id: "google_organic",
        name: "Google Organic Hiring Announcements",
        platformLabel: "Google Organic Hiring Search",
        buildQuery: (_v, c, co) =>
          `"hiring ${role}" OR "looking for ${role}" ${[c, shortCountry || co].filter(Boolean).join(" ")} email -site:indeed.com -site:glassdoor.com`,
      }
    );
    return channels;
  }

  if (useCase === "ecommerce_shopify") {
    channels.push(
      {
        id: "ecommerce_shopify",
        name: "Shopify Storefronts & E-commerce Brands",
        platformLabel: "Shopify Storefront",
        buildQuery: (v, c, co) =>
          `("powered by shopify" OR "myshopify.com" OR "shopify") "${v}" ${[c, shortCountry || co].filter(Boolean).join(" ")} (contact OR email) -site:shopify.com/blog`,
      },
      {
        id: "official_websites",
        name: "Regional E-commerce Websites",
        platformLabel: "Official Store Website",
        buildQuery: (v, c, co) =>
          `${tldHint ? `(${tldHint}) ` : ""}"${v}" ${deLegalHint} ${c || shortCountry || co} -"top 10" -"best"`,
      },
      {
        id: "instagram_business",
        name: "Instagram E-commerce Brands",
        platformLabel: "Instagram Store Profile",
        buildQuery: (v, c, co) =>
          `site:instagram.com "${v}" ${[c, shortCountry || co].filter(Boolean).join(" ")} (email OR "@gmail.com" OR shop)`,
      }
    );
    return channels;
  }

  if (useCase === "decision_makers") {
    channels.push(
      {
        id: "linkedin_people",
        name: "LinkedIn Public Decision Makers",
        platformLabel: "LinkedIn Decision Maker",
        buildQuery: (v, c, co) =>
          `site:linkedin.com/in ("founder" OR "CEO" OR "managing partner" OR "director") "${v}" ${[c, shortCountry || co].filter(Boolean).join(" ")}`,
      },
      {
        id: "official_websites",
        name: "Company Leadership & Contact Pages",
        platformLabel: "Official Company Website",
        buildQuery: (v, c, co) =>
          `"${v}" (leadership OR "our team" OR founders OR partner) contact email ${[c, shortCountry || co].filter(Boolean).join(" ")}`,
      },
      {
        id: "linkedin_company",
        name: "LinkedIn Company Directory",
        platformLabel: "LinkedIn Company Profile",
        buildQuery: (v, c, co) =>
          `site:linkedin.com/company "${v}" ${[c, shortCountry || co].filter(Boolean).join(" ")}`,
      }
    );
    return channels;
  }

  if (useCase === "wholesale_manufacturing") {
    channels.push(
      {
        id: "official_websites",
        name: "Official Manufacturer & Supplier Websites",
        platformLabel: "Official Company Website",
        buildQuery: (v, c, co) =>
          `${tldHint ? `(${tldHint}) ` : ""}${v} ${deLegalHint} ${[c, shortCountry || co].filter(Boolean).join(" ")} -"top 10" -site:alibaba.com -site:made-in-china.com`,
      },
      {
        id: "wholesale_b2b",
        name: "B2B Distributors & Trade Suppliers",
        platformLabel: "B2B Trade Website",
        buildQuery: (v, c, co) =>
          `"${effectiveKeyword}" (manufacturer OR distributor OR wholesale OR factory) email ${[c, shortCountry || co].filter(Boolean).join(" ")} -"top 10"`,
      },
      {
        id: "linkedin_company",
        name: "LinkedIn Company Directory",
        platformLabel: "LinkedIn Company Profile",
        buildQuery: (v, c, co) =>
          `site:linkedin.com/company "${effectiveKeyword}" ${[c, shortCountry || co].filter(Boolean).join(" ")}`,
      }
    );
    return channels;
  }

  // Balanced B2B defaults for local_services, agency_web_audit, finance_accounting, commercial_real_estate, software_it, general_b2b
  channels.push(
    {
      id: "official_websites",
      name: "Official Business Websites",
      platformLabel: "Official Business Website",
      buildQuery: (v, c, co) =>
        `${tldHint ? `(${tldHint}) ` : ""}${v} ${deLegalHint} ${c || shortCountry || co} -"top 10" -"best 10" -reddit -quora`,
    },
    {
      id: "google_organic",
      name: "Google Organic Web Search",
      platformLabel: "Google Organic Web Search",
      buildQuery: (v, c, co) =>
        `${v} ${c || shortCountry || co} email OR phone -"top 10" -"best" -pinterest -reddit`,
    },
    {
      id: "linkedin_company",
      name: "LinkedIn Public Company Directory",
      platformLabel: "LinkedIn Public Company Profile",
      buildQuery: (_v, c, co) =>
        `site:linkedin.com/company "${effectiveKeyword}" ${[c, shortCountry || co].filter(Boolean).join(" ")}`,
    },
    {
      id: "social_business",
      name: "Facebook & Instagram Business Profiles",
      platformLabel: "Public Social Business Profile",
      buildQuery: (_v, c, co) =>
        `(site:facebook.com OR site:instagram.com) "${effectiveKeyword}" ${[c, shortCountry || co].filter(Boolean).join(" ")} (email OR contact OR "@")`,
    }
  );

  return channels;
}

/**
 * Bounded resolver for ATS / LinkedIn company pages lacking public emails on the platform URL itself.
 */
async function resolveOfficialCompanyDomain(
  businessName: string,
  country: string,
  serperKey: string
): Promise<string> {
  if (!businessName || !serperKey) return "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const shortCo =
      country === "United States" ? "USA" : country === "United Kingdom" ? "UK" : country === "Global" ? "" : country;
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `"${businessName}" ${shortCo} official website -site:linkedin.com -site:greenhouse.io -site:lever.co -site:indeed.com -site:glassdoor.com`,
        num: 4,
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    const data = await res.json();
    const organic: SerperOrganicItem[] = data.organic || [];
    for (const o of organic) {
      const owned = extractOwnedCompanyDomain(o.link);
      if (owned) return owned;
    }
  } catch {
    // Non-fatal
  }
  return "";
}

export async function POST(req: Request) {
  const startTime = Date.now();
  let currentJobId: string | null = null;
  const qualifiedLeads: QualifiedLeadItem[] = [];

  try {
    const body = await req.json().catch(() => ({}));
    const currentUser = getCurrentUserFromRequest(req);

    const rawKeyword = String(body.keyword || body.query || body.natural_query || "").trim();
    const rawIndustry = String(body.industry || "").trim();
    const explicitFocus = String(body.search_focus || body.use_case || "auto").trim();
    const useBusinessProfile = Boolean(body.use_business_profile || body.use_profile);
    let targetCount = Math.min(1000, Math.max(1, Number(body.target_count || body.limit) || 50));

    const geo = parseMapsCountriesAndCities(body);
    if (geo.error) {
      return NextResponse.json(
        { status: "error", message: geo.error, qualified_count: 0, leads: [] },
        { status: 400 }
      );
    }
    const countriesList = geo.countries;

    const authCheck = await verifyClientActiveSubscription(
      currentUser,
      countriesList.length > 1 ? "multi_country_search" : "find_leads"
    );
    if (!authCheck.allowed) {
      return NextResponse.json(
        { status: "error", message: authCheck.message },
        { status: authCheck.statusCode || 403 }
      );
    }
    const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

    if (isNeonConfigured()) {
      const quota = await getWorkspaceLeadQuotaState(workspaceId, authCheck.userRecord);
      if (quota.remainingLeadsQuota !== null) {
        if (quota.remainingLeadsQuota <= 0) {
          return NextResponse.json(
            {
              status: "error",
              code: "LEAD_QUOTA_EXCEEDED",
              message: `Plan lead allowance exhausted (${quota.leadsUsedInPeriod}/${quota.maxLeadsQuota} leads generated in this subscription period). Upgrade or renew to generate more leads.`,
              remaining_leads_quota: 0,
              max_leads_quota: quota.maxLeadsQuota,
            },
            { status: 403 }
          );
        }
        targetCount = Math.min(targetCount, quota.remainingLeadsQuota);
      }
    }

    const contactRequirement: ContactRequirement = [
      "EMAIL_AND_PHONE",
      "EMAIL_ONLY",
      "PHONE_ONLY",
      "EMAIL_OR_PHONE",
    ].includes(body.contact_requirement)
      ? (body.contact_requirement as ContactRequirement)
      : "EMAIL_OR_PHONE";

    if (!rawKeyword && !rawIndustry && !useBusinessProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Please enter a target keyword or description (e.g. Dental clinics, Shopify stores, Recruitment agencies).",
          qualified_count: 0,
          leads: [],
        },
        { status: 400 }
      );
    }

    const keyword = rawKeyword || rawIndustry || "Business Prospects";
    const countrySummary = countriesList.length > 5 ? `${countriesList.length} Countries` : countriesList.join(", ");
    const citySummary = geo.specificCitiesEnabled
      ? geo.cities.map((c) => c.city).slice(0, 5).join(", ")
      : "";
    const rawCountry = countriesList[0] || "United States";
    const rawCity = geo.specificCitiesEnabled && geo.cities[0] ? geo.cities[0].city : "";

    const rl = await consumeRateLimit({
      bucket: "lead_search",
      identifier: String(workspaceId),
      limit: 20,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(
        rl.retryAfterSeconds,
        `Search rate limit reached. Please retry in ${rl.retryAfterSeconds} seconds.`
      );
    }

    const serperKey = (process.env.SERPER_API_KEY || "").trim();
    if (!serperKey || serperKey.startsWith("your_")) {
      return NextResponse.json(
        {
          status: "error",
          message: "Search engine API provider is currently being configured by system administrator.",
          qualified_count: 0,
          leads: [],
        },
        { status: 503 }
      );
    }

    const jobLock = await acquireActiveSearchJob(
      workspaceId,
      Number(authCheck.userRecord?.id || currentUser.id) || 1,
      "WEB_SEARCH",
      keyword,
      countrySummary,
      citySummary,
      targetCount
    );
    if (!jobLock.allowed) {
      return NextResponse.json(
        {
          status: "error",
          code: "SEARCH_ALREADY_RUNNING",
          message:
            jobLock.message ||
            "A lead generation search is already in progress for your workspace. Please wait for it to complete.",
          active_job_id: jobLock.jobId,
        },
        { status: 409 }
      );
    }
    currentJobId = jobLock.jobId || null;

    let businessProfile: any = null;
    if (useBusinessProfile && isNeonConfigured()) {
      try {
        const sql = getNeonSql();
        if (sql) {
          const profileRows = await sql.query(
            "SELECT * FROM workspace_profiles WHERE workspace_id = $1 LIMIT 1",
            [workspaceId]
          );
          if (profileRows && profileRows.length > 0) {
            businessProfile = profileRows[0];
          }
        }
      } catch (err) {
        console.error("Error loading workspace profile for search:", err);
      }
    }

    const aiStrategy: SearchIntentResult = await interpretSearchIntent(
      keyword,
      countrySummary || rawCountry,
      citySummary || rawCity,
      businessProfile,
      explicitFocus
    );

    const effectiveUseCase: LeadUseCaseId =
      explicitFocus && explicitFocus !== "auto"
        ? classifyUseCaseIntent(keyword, explicitFocus)
        : aiStrategy.use_case;
    const effectiveKeyword = aiStrategy.interpreted_keyword || keyword;
    const effectiveCountry = aiStrategy.detected_country || countrySummary || rawCountry;
    const effectiveCity = aiStrategy.detected_city || citySummary || rawCity;

    const combinedVariations = Array.from(
      new Set([
        effectiveKeyword,
        ...aiStrategy.search_variations,
        ...generateB2bKeywordVariations(effectiveKeyword, effectiveCountry, effectiveCity, rawIndustry, effectiveUseCase),
      ].filter(Boolean))
    );

    // Preload workspace deduplication signatures (ignoring legacy platform domains)
    const existingSignatures = isNeonConfigured()
      ? await getNeonWorkspaceLeadSignatures(workspaceId)
      : { domains: new Set<string>(), emails: new Set<string>(), phones: new Set<string>(), placeIds: new Set<string>() };

    const seenDomains = new Set<string>(
      Array.from(existingSignatures.domains).filter((d) => Boolean(extractOwnedCompanyDomain(d)))
    );
    const seenEmails = new Set<string>(existingSignatures.emails);
    const seenPhones = new Set<string>(existingSignatures.phones);
    const seenNames = new Set<string>();
    const seenUrls = new Set<string>();

    let candidatesScanned = 0;
    let excludedExistingDuplicates = 0;
    let missingContactCount = 0;
    const failedProviders: string[] = [];

    const sourceStats: Record<string, SourceStatus> = {};
    const registerChannelStat = (id: string, name: string) => {
      if (!sourceStats[id]) {
        sourceStats[id] = { id, source_name: name, status: "WORKING", leads_contributed: 0 };
      }
    };

    const countryStats: Record<
      string,
      { candidates: number; eligible: number; duplicates: number; missing_contact: number }
    > = {};
    for (const c of countriesList) {
      countryStats[c] = { candidates: 0, eligible: 0, duplicates: 0, missing_contact: 0 };
    }

    const geoTargets: Array<{ country: string; city: string | null }> =
      geo.specificCitiesEnabled && geo.cities.length > 0
        ? geo.cities.map((ct) => ({ country: normalizeCountryName(ct.country), city: ct.city }))
        : countriesList.map((c) => ({ country: normalizeCountryName(c), city: null }));

    const maxPagesPerGeo = Math.min(3, Math.max(1, Math.ceil(targetCount / (8 * Math.max(1, geoTargets.length))) + 1));

    // Optional UK Companies House discovery when key configured
    const hasUkTarget = geoTargets.some((g) => g.country.toLowerCase() === "united kingdom");
    const chCapabilities = getFreeSourceCapabilities().uk_companies_house;
    if (hasUkTarget) {
      registerChannelStat("uk_companies_house", "UK Companies House Official Registry");
      if (!chCapabilities.configured) {
        sourceStats["uk_companies_house"].status = "NOT CONFIGURED";
        sourceStats["uk_companies_house"].error_detail = `Set ${chCapabilities.env_var} to enable direct UK Companies House filings.`;
      }
    }

    for (const geoTarget of geoTargets) {
      if (qualifiedLeads.length >= targetCount || Date.now() - startTime > 38000) break;

      const currentCountry = geoTarget.country;
      const currentCity = geoTarget.city || effectiveCity || "";
      const geoSpec = resolveGeoSpec(currentCountry, currentCity);
      const channels = buildIntentChannels(effectiveUseCase, effectiveKeyword, aiStrategy, currentCountry, geoSpec.glCode);
      for (const ch of channels) registerChannelStat(ch.id, ch.name);

      // Optional UK Companies House feed if active & UK selected
      if (currentCountry.toLowerCase() === "united kingdom" && chCapabilities.configured && Date.now() - startTime < 35000) {
        const chRes = await searchUkCompaniesHouse(effectiveKeyword, currentCity, 8);
        if (chRes.error) {
          sourceStats["uk_companies_house"].status = "ERROR";
          sourceStats["uk_companies_house"].error_detail = chRes.error;
          failedProviders.push(`UK Companies House: ${chRes.error}`);
        } else if (chRes.companies.length === 0) {
          sourceStats["uk_companies_house"].status = "NO RESULTS";
        } else {
          const chResolved = await Promise.all(
            chRes.companies.slice(0, 6).map(async (comp) => {
              const dom = await resolveOfficialCompanyDomain(comp.companyName, "United Kingdom", serperKey);
              return { comp, dom };
            })
          );
          for (const { comp, dom } of chResolved) {
            if (!dom || seenDomains.has(dom)) continue;
            const crawl = await crawlWebsiteForContacts(dom, "", "", { countryName: "United Kingdom" });
            const evalRes = evaluateContactRequirement({ email: crawl.email, phone: crawl.phone }, contactRequirement, "United Kingdom");
            if (!evalRes.eligible) continue;
            const pkt = getPktDateTime();
            const q = calculateLeadQualityScore({
              business_name: comp.companyName,
              email: evalRes.normalizedEmail || crawl.email,
              phone: evalRes.normalizedPhone || crawl.phone,
              website: `https://${dom}`,
              country: "United Kingdom",
              city: comp.locality || currentCity,
            });
            const rel = computeLeadRelevanceScore({
              businessName: comp.companyName,
              ownedDomain: dom,
              keyword: effectiveKeyword,
              useCase: effectiveUseCase,
              geo: geoSpec,
              research: crawl,
            });
            const item: QualifiedLeadItem = {
              id: Date.now() + qualifiedLeads.length + 1,
              business_name: comp.companyName,
              website: `https://${dom}`,
              domain: dom,
              email: evalRes.normalizedEmail || crawl.email,
              email_source_url: crawl.emailSourceUrl || `https://${dom}`,
              email_status: crawl.emailStatus || "Domain Valid",
              phone: evalRes.normalizedPhone || crawl.phone,
              phone_source_url: crawl.phoneSourceUrl || "",
              phone_status: crawl.phoneStatus || "Not Found",
              country: "United Kingdom",
              city: comp.locality || currentCity,
              address: comp.addressSnippet || [comp.locality, comp.postalCode, "United Kingdom"].filter(Boolean).join(", "),
              industry: aiStrategy.industry || effectiveKeyword,
              source_platform: "UK Companies House + Website",
              original_source_url: comp.registryUrl,
              search_keyword: effectiveKeyword,
              search_date: pkt.date,
              search_time: pkt.time,
              saved_date: pkt.date,
              saved_time: pkt.time,
              extraction_date: pkt.date,
              extraction_time: pkt.time,
              created_at: new Date().toISOString(),
              quality_score: q.score,
              quality_category: q.category,
              quality_reasons: q.reasons,
              relevance_score: rel.score,
              relevance_reasons: rel.reasons,
              positive_signals: `Companies House Active #${comp.companyNumber}`,
              buying_intent_category: B2B_USE_CASE_PROFILES[effectiveUseCase].label,
              enrichment_data: { companies_house: comp, tech_stack: crawl.techStack || [] },
              contact_requirement: contactRequirement,
            };
            if (mergeLeadIntoList(qualifiedLeads, item, seenDomains, seenNames, seenEmails, seenPhones)) {
              sourceStats["uk_companies_house"].leads_contributed += 1;
              sourceStats["uk_companies_house"].sample_url = comp.registryUrl;
              if (countryStats[currentCountry]) countryStats[currentCountry].eligible++;
            }
          }
        }
      }

      for (let pageNum = 1; pageNum <= maxPagesPerGeo; pageNum++) {
        if (qualifiedLeads.length >= targetCount || Date.now() - startTime > 36000) break;

        const variation = combinedVariations[(pageNum - 1) % combinedVariations.length] || effectiveKeyword;

        // 1. Fire channel Serper queries concurrently for this page
        const serperResults = await Promise.all(
          channels.map(async (channel) => {
            const qStr = channel.buildQuery(variation, currentCity, currentCountry, geoSpec.glCode);
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 5000);
              const serperBody: Record<string, any> = {
                q: qStr,
                num: 10,
                page: pageNum,
              };
              if (geoSpec.glCode) serperBody.gl = geoSpec.glCode;

              const res = await fetch("https://google.serper.dev/search", {
                method: "POST",
                signal: controller.signal,
                headers: {
                  "X-API-KEY": serperKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(serperBody),
              });
              clearTimeout(timer);

              if (!res.ok) {
                const st = res.status === 429 ? "RATE LIMITED" : "ERROR";
                sourceStats[channel.id].status = st;
                sourceStats[channel.id].error_detail = `HTTP ${res.status}`;
                failedProviders.push(`${channel.name} (HTTP ${res.status})`);
                return { channel, items: [] as SerperOrganicItem[] };
              }
              const data = await res.json();
              const organic: SerperOrganicItem[] = Array.isArray(data?.organic) ? data.organic : [];
              if (organic.length === 0 && pageNum === 1 && sourceStats[channel.id].leads_contributed === 0) {
                sourceStats[channel.id].status = "NO RESULTS";
              }
              return { channel, items: organic };
            } catch (err: any) {
              sourceStats[channel.id].status = "ERROR";
              sourceStats[channel.id].error_detail = err?.name === "AbortError" ? "Timeout" : "Fetch failure";
              return { channel, items: [] as SerperOrganicItem[] };
            }
          })
        );

        // 2. Collect, clean & deduplicate raw SERP candidates BEFORE network crawls
        const batchCandidates: CollectedCandidate[] = [];
        for (const { channel, items } of serperResults) {
          for (const item of items) {
            const link = (item.link || "").trim();
            const rawTitle = (item.title || "").trim();
            const snippet = (item.snippet || "").trim();
            if (!link || !rawTitle) continue;

            const normUrl = link.replace(/\/$/, "").toLowerCase();
            if (seenUrls.has(normUrl)) continue;
            seenUrls.add(normUrl);

            if (isNoiseOrListicleResult(link, rawTitle, effectiveUseCase)) {
              continue;
            }

            const rawHost = cleanDomain(link);
            if (!rawHost) continue;
            const ownedDomain = extractOwnedCompanyDomain(link);

            if (ownedDomain && seenDomains.has(ownedDomain)) {
              excludedExistingDuplicates++;
              if (countryStats[currentCountry]) countryStats[currentCountry].duplicates++;
              continue;
            }

            const fullText = `${rawTitle} ${snippet}`;
            const { emails, phones } = extractContactsFromText(fullText, currentCountry);

            if (emails[0] && seenEmails.has(emails[0])) {
              excludedExistingDuplicates++;
              if (countryStats[currentCountry]) countryStats[currentCountry].duplicates++;
              continue;
            }

            const businessName = cleanBusinessName(rawTitle, link, emails[0]);
            if (!businessName || isGenericTitleText(businessName) || businessName.length < 2) {
              continue;
            }

            candidatesScanned++;
            if (countryStats[currentCountry]) countryStats[currentCountry].candidates++;

            batchCandidates.push({
              channelId: channel.id,
              platformLabel: channel.platformLabel,
              title: rawTitle,
              link,
              snippet,
              rawHost,
              ownedDomain,
              businessName,
              snippetEmails: emails,
              snippetPhones: phones,
              country: currentCountry,
              city: currentCity,
            });
          }
        }

        // 3. Process candidates concurrently in bounded chunks of 8
        const chunkSize = 8;
        for (let i = 0; i < batchCandidates.length; i += chunkSize) {
          if (qualifiedLeads.length >= targetCount || Date.now() - startTime > 36000) break;
          const chunk = batchCandidates.slice(i, i + chunkSize);

          const processed = await Promise.all(
            chunk.map(async (cand) => {
              let email = cand.snippetEmails[0] || "";
              let emailSourceUrl = email ? cand.link : "";
              let phone = cand.snippetPhones[0] || "";
              let phoneSourceUrl = phone ? cand.link : "";
              let targetDomain = cand.ownedDomain;
              let resolvedWebsite = cand.ownedDomain ? `https://${cand.ownedDomain}` : "";
              let research: DiscoveredContact | undefined;

              const isAtsOrLinkedIn =
                !targetDomain &&
                (cand.rawHost.includes("linkedin.com") ||
                  cand.rawHost.includes("greenhouse.io") ||
                  cand.rawHost.includes("lever.co") ||
                  cand.rawHost.includes("workable.com") ||
                  cand.rawHost.includes("ashbyhq.com"));

              // For ATS job portals or LinkedIn companies lacking public email/phone in snippet,
              // try resolving official company domain cleanly when within budget
              if (
                isAtsOrLinkedIn &&
                ((!email && contactRequirement !== "PHONE_ONLY") || (!phone && contactRequirement !== "EMAIL_ONLY")) &&
                Date.now() - startTime < 31000
              ) {
                const resolvedDom = await resolveOfficialCompanyDomain(cand.businessName, cand.country, serperKey);
                if (resolvedDom && !seenDomains.has(resolvedDom)) {
                  targetDomain = resolvedDom;
                  resolvedWebsite = `https://${resolvedDom}`;
                }
              }

              // Direct website HTML research & contact extraction
              if (targetDomain && Date.now() - startTime < 34000) {
                const crawl = await crawlWebsiteForContacts(targetDomain, email, phone, {
                  countryName: cand.country,
                  extraPaths: geoSpec.extraContactPaths,
                  checkCareers: effectiveUseCase === "hiring_signals",
                });
                research = crawl;
                if (!email && crawl.email) {
                  email = crawl.email;
                  emailSourceUrl = crawl.emailSourceUrl || `https://${targetDomain}`;
                }
                if (!phone && crawl.phone) {
                  phone = crawl.phone;
                  phoneSourceUrl = crawl.phoneSourceUrl || `https://${targetDomain}`;
                }

                // Fallback indexed search on the owned domain if still missing needed contact
                const stillNeedsEmail = contactRequirement !== "PHONE_ONLY" && !email;
                const stillNeedsPhone = contactRequirement === "PHONE_ONLY" && !phone;
                if ((stillNeedsEmail || stillNeedsPhone) && Date.now() - startTime < 32000) {
                  const fb = await querySerperForDomainContact(targetDomain, serperKey, cand.country);
                  if (!email && fb.email) {
                    email = fb.email;
                    emailSourceUrl = fb.emailSourceUrl || `https://${targetDomain}`;
                  }
                  if (!phone && fb.phone) {
                    phone = fb.phone;
                    phoneSourceUrl = fb.phoneSourceUrl || `https://${targetDomain}`;
                  }
                }
              }

              // Truthful DNS MX & phone verification for every extracted contact
              let emailStatus = "Not Found";
              if (email) {
                const ev = await verifyLeadEmailTruthfully(email, { resolveMx: true });
                email = ev.email || email;
                emailStatus = ev.displayLabel;
              }

              let phoneStatus = "Not Found";
              if (phone) {
                const pv = evaluatePhoneQualityTruthfully(phone, cand.country, phoneSourceUrl || cand.link);
                phone = pv.normalized || phone;
                phoneStatus = pv.displayLabel;
              }

              return {
                cand,
                email,
                emailSourceUrl,
                emailStatus,
                phone,
                phoneSourceUrl,
                phoneStatus,
                targetDomain,
                resolvedWebsite,
                research,
              };
            })
          );

          for (const resItem of processed) {
            if (qualifiedLeads.length >= targetCount) break;
            const { cand, email, emailSourceUrl, emailStatus, phone, phoneSourceUrl, phoneStatus, targetDomain, resolvedWebsite, research } = resItem;

            const contactEval = evaluateContactRequirement({ email, phone }, contactRequirement, cand.country);
            if (!contactEval.eligible) {
              missingContactCount++;
              if (countryStats[cand.country]) countryStats[cand.country].missing_contact++;
              continue;
            }

            const cleanEmail = contactEval.normalizedEmail || email;
            const cleanPhone = contactEval.normalizedPhone || phone;

            if (cleanEmail && seenEmails.has(cleanEmail)) {
              excludedExistingDuplicates++;
              if (countryStats[cand.country]) countryStats[cand.country].duplicates++;
              continue;
            }
            if (targetDomain && seenDomains.has(targetDomain)) {
              excludedExistingDuplicates++;
              if (countryStats[cand.country]) countryStats[cand.country].duplicates++;
              continue;
            }
            if (cleanPhone && seenPhones.has(cleanPhone)) {
              excludedExistingDuplicates++;
              if (countryStats[cand.country]) countryStats[cand.country].duplicates++;
              continue;
            }

            const canonicalWebsite = resolvedWebsite || (cand.link.startsWith("http") ? cand.link : "");
            const quality = calculateLeadQualityScore({
              business_name: cand.businessName,
              email: cleanEmail,
              phone: cleanPhone,
              website: canonicalWebsite,
              country: cand.country,
              city: cand.city,
              snippet: research?.metaDescription || cand.snippet,
            });
            const relevance = computeLeadRelevanceScore({
              businessName: cand.businessName,
              title: cand.title,
              snippet: cand.snippet,
              url: cand.link,
              ownedDomain: targetDomain,
              keyword: effectiveKeyword,
              useCase: effectiveUseCase,
              geo: geoSpec,
              research,
            });

            const observedSignals: string[] = [];
            if (research?.techStack?.length) observedSignals.push(`Tech: ${research.techStack.join(", ")}`);
            if (research?.hiringDetected || effectiveUseCase === "hiring_signals") {
              if (research?.careersUrl || cand.link.includes("greenhouse.io") || cand.link.includes("lever.co") || cand.link.includes("workable.com") || /\bhiring|careers|jobs\b/i.test(`${cand.title} ${cand.snippet}`)) {
                observedSignals.push("Active Hiring / Careers Signal");
              }
            }
            if (research?.websiteWeaknesses?.length && effectiveUseCase === "agency_web_audit") {
              observedSignals.push(`Site Audit: ${research.websiteWeaknesses.slice(0, 2).join(", ")}`);
            }
            if (emailStatus.includes("Domain Valid")) {
              observedSignals.push("MX Domain Valid");
            }

            const socials = research?.socials || {};
            if (!socials.linkedin && cand.link.includes("linkedin.com/")) socials.linkedin = cand.link;
            if (!socials.facebook && cand.link.includes("facebook.com/")) socials.facebook = cand.link;
            if (!socials.instagram && cand.link.includes("instagram.com/")) socials.instagram = cand.link;

            const pkt = getPktDateTime();
            const qualifiedItem: QualifiedLeadItem = {
              id: Date.now() + qualifiedLeads.length + 1,
              business_name: cand.businessName,
              website: canonicalWebsite,
              domain: targetDomain,
              email: cleanEmail,
              email_source_url: emailSourceUrl || canonicalWebsite || cand.link,
              email_status: emailStatus,
              phone: cleanPhone || "",
              phone_source_url: cleanPhone ? phoneSourceUrl || cand.link : "",
              phone_status: phoneStatus,
              country: cand.country || "Global",
              city: cand.city || "",
              address: cand.city ? `${cand.city}, ${cand.country}` : cand.country,
              industry: rawIndustry && rawIndustry !== "Any" ? rawIndustry : aiStrategy.industry || effectiveKeyword,
              category: B2B_USE_CASE_PROFILES[effectiveUseCase].label,
              source_platform: cand.platformLabel,
              original_source_url: cand.link,
              search_keyword: effectiveKeyword,
              search_date: pkt.date,
              search_time: pkt.time,
              saved_date: pkt.date,
              saved_time: pkt.time,
              extraction_date: pkt.date,
              extraction_time: pkt.time,
              created_at: new Date().toISOString(),
              last_verified_at: new Date().toISOString(),
              collection_timestamp: new Date().toISOString(),
              quality_score: quality.score,
              quality_category: quality.category,
              quality_reasons: quality.reasons,
              relevance_score: relevance.score,
              relevance_reasons: relevance.reasons,
              snippet: research?.metaDescription || cand.snippet || undefined,
              positive_signals: observedSignals.join(" | ") || undefined,
              buying_intent_category: B2B_USE_CASE_PROFILES[effectiveUseCase].label,
              enrichment_data: {
                ...(research?.techStack?.length ? { tech_stack: research.techStack } : {}),
                ...(research?.careersUrl ? { careers_url: research.careersUrl } : {}),
                ...(research?.hiringDetected ? { hiring_detected: true } : {}),
                ...(research?.websiteWeaknesses?.length ? { website_weaknesses: research.websiteWeaknesses } : {}),
                ...(research?.metaTitle ? { meta_title: research.metaTitle } : {}),
              },
              linkedin: socials.linkedin,
              facebook: socials.facebook,
              instagram: socials.instagram,
              twitter: socials.twitter,
              youtube: socials.youtube,
              tiktok: socials.tiktok,
              contact_requirement: contactRequirement,
            };

            const wasAdded = mergeLeadIntoList(
              qualifiedLeads,
              qualifiedItem,
              seenDomains,
              seenNames,
              seenEmails,
              seenPhones
            );
            if (wasAdded) {
              sourceStats[cand.channelId].leads_contributed += 1;
              if (!sourceStats[cand.channelId].sample_url) {
                sourceStats[cand.channelId].sample_url = cand.link;
              }
              if (countryStats[cand.country]) countryStats[cand.country].eligible++;
            } else {
              excludedExistingDuplicates++;
            }
          }
        }
      }
    }

    // Optional zero-key GLEIF Global Registry corroboration for corporate verticals (bounded <= 2s)
    if (
      qualifiedLeads.length > 0 &&
      Date.now() - startTime < 42000 &&
      ["wholesale_manufacturing", "finance_accounting", "software_it", "commercial_real_estate"].includes(effectiveUseCase)
    ) {
      registerChannelStat("gleif_registry", "GLEIF Global Legal Entity Registry");
      const gleifTargets = qualifiedLeads.slice(0, 6);
      const gleifResults = await Promise.all(
        gleifTargets.map((l) => lookupGleifEntity(l.business_name, l.country, 1800))
      );
      let gleifMatched = 0;
      gleifResults.forEach((match, idx) => {
        if (!match) return;
        gleifMatched++;
        const lead = gleifTargets[idx];
        lead.enrichment_data = { ...(lead.enrichment_data || {}), gleif: match };
        const sig = `LEI Registry Verified (${match.lei})`;
        lead.positive_signals = lead.positive_signals ? `${lead.positive_signals} | ${sig}` : sig;
        if (!lead.city && match.city) lead.city = match.city;
      });
      sourceStats["gleif_registry"].status = gleifMatched > 0 ? "WORKING" : "NO RESULTS";
      sourceStats["gleif_registry"].leads_contributed = gleifMatched;
    }

    // Sort highest relevance + quality leads to the top
    qualifiedLeads.sort((a, b) => {
      const scoreA = (a.relevance_score || 50) * 0.55 + (a.quality_score || 50) * 0.45;
      const scoreB = (b.relevance_score || 50) * 0.55 + (b.quality_score || 50) * 0.45;
      return scoreB - scoreA;
    });

    const pkt = getPktDateTime();
    const searchRecordId = `SR-${Date.now()}`;
    const configuredSources = Object.values(sourceStats).map((s) => s.source_name);

    // Save ONLY when actual leads found (partial or full) — zero quota impact on failed searches
    if (qualifiedLeads.length > 0) {
      saveServerlessSearchRecordAndLeads(
        workspaceId,
        {
          keyword: effectiveKeyword,
          country: effectiveCountry,
          city: effectiveCity,
          sources: configuredSources,
          requested_quantity: targetCount,
          search_record_id: searchRecordId,
        },
        qualifiedLeads
      );

      if (isNeonConfigured()) {
        try {
          await saveNeonSearchRecordAndLeads(
            workspaceId,
            {
              keyword: effectiveKeyword,
              country: effectiveCountry,
              city: effectiveCity,
              sources: configuredSources,
              requested_quantity: targetCount,
              search_record_id: searchRecordId,
            },
            qualifiedLeads
          );
        } catch (dbErr) {
          console.error("Neon PostgreSQL search auto-save error:", dbErr);
        }
      }
    }

    if (currentJobId) {
      await completeActiveSearchJob(currentJobId, "COMPLETED", qualifiedLeads.length, searchRecordId);
    }

    const searchUserId = Number(authCheck.userRecord?.id || currentUser.id) || 0;
    if (searchUserId > 0) {
      await logAccountAudit({
        adminId: searchUserId,
        adminEmail: authCheck.userRecord?.email || authCheck.userRecord?.username || "client",
        clientId: searchUserId,
        clientEmail: authCheck.userRecord?.email || authCheck.userRecord?.username || "",
        workspaceId,
        action: "FIND_LEADS_SEARCH",
        details: {
          keyword: effectiveKeyword,
          use_case: effectiveUseCase,
          country: effectiveCountry || "Global",
          city: effectiveCity || "All Cities",
          requested: targetCount,
          qualified_count: qualifiedLeads.length,
          search_record_id: searchRecordId,
        },
      }).catch(() => {});
    }

    const durationMs = Date.now() - startTime;
    const leadsWithEmail = qualifiedLeads.filter((l) => Boolean(l.email)).length;
    const mxVerifiedEmails = qualifiedLeads.filter((l) => String(l.email_status || "").includes("Domain Valid")).length;
    const leadsWithPhone = qualifiedLeads.filter((l) => Boolean(l.phone)).length;

    return NextResponse.json({
      status: "success",
      search_record_id: searchRecordId,
      search_date: pkt.date,
      search_time: pkt.time,
      completion_time: pkt.completionTime,
      keyword: effectiveKeyword,
      use_case: effectiveUseCase,
      use_case_label: B2B_USE_CASE_PROFILES[effectiveUseCase].label,
      country: effectiveCountry || "Global",
      city: effectiveCity || "All Cities",
      selected_countries: countriesList,
      contact_requirement: contactRequirement,
      country_stats: countryStats,
      target_count: targetCount,
      qualified_count: qualifiedLeads.length,
      unique_businesses_count: qualifiedLeads.length,
      emails_found_count: leadsWithEmail,
      mx_verified_emails_count: mxVerifiedEmails,
      leads_with_phone_count: leadsWithPhone,
      candidates_scanned: candidatesScanned,
      duplicates_skipped: excludedExistingDuplicates,
      missing_contact_skipped: missingContactCount,
      failed_providers: Array.from(new Set(failedProviders)),
      duration_ms: durationMs,
      leads: qualifiedLeads,
      sources_breakdown: Object.values(sourceStats),
      capabilities: getFreeSourceCapabilities(),
      ai_strategy: {
        raw_query: aiStrategy.raw_query,
        interpreted_keyword: aiStrategy.interpreted_keyword,
        use_case: effectiveUseCase,
        use_case_label: B2B_USE_CASE_PROFILES[effectiveUseCase].label,
        target_business_type: aiStrategy.target_business_type,
        industry: aiStrategy.industry,
        target_audience: aiStrategy.target_audience,
        reasoning: aiStrategy.reasoning,
        used_business_profile: aiStrategy.used_business_profile,
        excluded_previous_duplicates: excludedExistingDuplicates,
      },
      message:
        qualifiedLeads.length >= targetCount
          ? `Discovered and saved ${qualifiedLeads.length} unique leads (${mxVerifiedEmails} MX-domain verified emails, ${leadsWithPhone} phones) in ${(durationMs / 1000).toFixed(1)}s.`
          : qualifiedLeads.length > 0
          ? `Discovered and saved ${qualifiedLeads.length} unique qualified leads (${leadsWithEmail} emails, ${mxVerifiedEmails} MX-verified, ${leadsWithPhone} phones) out of ${targetCount} requested. (${excludedExistingDuplicates} workspace duplicates excluded; ${missingContactCount} skipped due to contact filter).`
          : `0 new unique leads matched "${keyword}" in the selected markets under ${contactRequirement.replace(/_/g, " ")}. (${excludedExistingDuplicates} already saved in workspace; ${missingContactCount} lacked required contact fields).`,
    });
  } catch (err: any) {
    if (currentJobId) {
      await completeActiveSearchJob(currentJobId, "FAILED", 0, undefined, err?.message);
    }
    return NextResponse.json(
      {
        status: "error",
        message: err?.message || "Search extraction failed.",
        qualified_count: 0,
        leads: [],
      },
      { status: 500 }
    );
  }
}
