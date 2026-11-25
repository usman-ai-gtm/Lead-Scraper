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
  acquireActiveSearchJob,
  completeActiveSearchJob,
} from "@/lib/neon-db";
import { interpretSearchIntent, SearchIntentResult } from "@/lib/ai-search-parser";
import { evaluateContactRequirement, calculateLeadQualityScore, ContactRequirement } from "@/lib/lead-quality-engine";
import { getCountryGlCode, normalizeCountryName } from "@/lib/countries";
import { parseMapsCountriesAndCities } from "@/lib/maps-extractor";
import {
  cleanDomain,
  cleanBusinessName,
  isGenericTitleText,
  generateB2bKeywordVariations,
  extractContactsFromText,
  crawlWebsiteForContacts,
  querySerperForDomainContact,
  mergeLeadIntoList,
  QualifiedLeadItem
} from "@/lib/search-intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SerperOrganicItem {
  title?: string;
  link?: string;
  snippet?: string;
  sitelinks?: Array<{ title?: string; link?: string }>;
  position?: number;
}

interface SourceStatus {
  source_name: string;
  status: "WORKING" | "NO RESULTS" | "NOT CONFIGURED" | "RATE LIMITED" | "ACCESS RESTRICTED" | "NOT AVAILABLE";
  leads_contributed: number;
  sample_url?: string;
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
    const useBusinessProfile = Boolean(body.use_business_profile || body.use_profile);
    const targetCount = Math.min(1000, Math.max(1, Number(body.target_count || body.limit) || 50));

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
        {
          status: "error",
          message: authCheck.message,
        },
        { status: authCheck.statusCode || 403 }
      );
    }
    const workspaceId = Number(authCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;

    const contactRequirement: ContactRequirement = ["EMAIL_AND_PHONE", "EMAIL_ONLY", "PHONE_ONLY", "EMAIL_OR_PHONE"].includes(body.contact_requirement)
      ? (body.contact_requirement as ContactRequirement)
      : "EMAIL_OR_PHONE";

    if (!rawKeyword && !rawIndustry && !useBusinessProfile) {
      return NextResponse.json(
        {
          status: "error",
          message: "Please enter a target keyword or description (e.g. Dentists, Mobile Accessories, Software Houses).",
          qualified_count: 0,
          leads: [],
        },
        { status: 400 }
      );
    }

    const keyword = rawKeyword || rawIndustry || "Business Prospects";
    const country = countriesList.length > 5 ? `${countriesList.length} Countries` : countriesList.join(", ");
    const city = geo.specificCitiesEnabled
      ? geo.cities.map((c) => c.city).slice(0, 5).join(", ")
      : "";
    const rawCountry = countriesList[0] || "United States";
    const rawCity = geo.specificCitiesEnabled && geo.cities[0] ? geo.cities[0].city : "";

    // 1. One active search job per customer account lock
    const jobLock = await acquireActiveSearchJob(
      workspaceId,
      Number(authCheck.userRecord?.id || currentUser.id) || 1,
      "WEB_SEARCH",
      keyword,
      country,
      city,
      targetCount
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
    currentJobId = jobLock.jobId || null;

    const serperKey = process.env.SERPER_API_KEY || "2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297";
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

    // 2. Load Business Profile if requested
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

    // 3. AI-Powered Natural Language Search Intent Interpretation
    const aiStrategy: SearchIntentResult = await interpretSearchIntent(
      keyword,
      country || rawCountry,
      city || rawCity,
      businessProfile
    );

    const effectiveKeyword = aiStrategy.interpreted_keyword || keyword;
    const effectiveCountry = aiStrategy.detected_country || country || rawCountry;
    const effectiveCity = aiStrategy.detected_city || city || rawCity;

    // Build location string
    const locParts = [effectiveCity, effectiveCountry].filter(Boolean);
    const locStr = locParts.length > 0 ? locParts.join(" ") : "international";

    // 4. Keyword Variations from AI & B2B Expansion
    const b2bVariations = generateB2bKeywordVariations(effectiveKeyword, effectiveCountry, effectiveCity, rawIndustry);
    const combinedKeywordVariations = Array.from(
      new Set([
        ...aiStrategy.search_variations,
        ...b2bVariations,
        effectiveKeyword,
        keyword,
      ].filter(Boolean))
    );

    // 5. Preload permanent account-level leads for deduplication
    const existingSignatures = isNeonConfigured()
      ? await getNeonWorkspaceLeadSignatures(workspaceId)
      : { domains: new Set<string>(), emails: new Set<string>(), phones: new Set<string>(), placeIds: new Set<string>() };

    const seenDomains = new Set<string>(existingSignatures.domains);
    const seenEmails = new Set<string>(existingSignatures.emails);
    const seenNames = new Set<string>();
    let excludedExistingDuplicates = 0;

    // 6. Multi-Source Non-Maps Search Channels
    const sourceChannels = [
      {
        id: "google_organic",
        name: "Google Organic Web Search",
        platformLabel: "Google Organic Web Search",
        buildQuery: (kw: string) => `${kw} contact email`,
      },
      {
        id: "official_websites",
        name: "Official Business Websites",
        platformLabel: "Official Business Website",
        buildQuery: (kw: string) => `${kw} official website "email"`,
      },
      {
        id: "facebook_business",
        name: "Facebook Public Business Pages",
        platformLabel: "Facebook Public Business Page",
        buildQuery: (kw: string) => `site:facebook.com "${effectiveKeyword}" "email" OR "contact" ${locStr}`,
      },
      {
        id: "instagram_business",
        name: "Instagram Public Business Profiles",
        platformLabel: "Instagram Public Business Profile",
        buildQuery: (kw: string) => `site:instagram.com "${effectiveKeyword}" ("email:" OR "@gmail.com" OR "contact:") ${locStr}`,
      },
      {
        id: "linkedin_company",
        name: "LinkedIn Public Company Directory",
        platformLabel: "LinkedIn Public Company Profile",
        buildQuery: (kw: string) => `site:linkedin.com/company "${effectiveKeyword}" ${locStr}`,
      },
      {
        id: "commercial_directories",
        name: "Public Commercial Directories",
        platformLabel: "Public Commercial Directory",
        buildQuery: (kw: string) => `(site:yellowpages.com OR site:clutch.co OR site:yelp.com) "${effectiveKeyword}" ${locStr} contact email`,
      },
      {
        id: "youtube_business",
        name: "YouTube Public Channels",
        platformLabel: "YouTube Public Channel",
        buildQuery: (kw: string) => `site:youtube.com "${effectiveKeyword}" ("business inquiries" OR "email:" OR "@gmail.com") ${locStr}`,
      },
      {
        id: "x_twitter_business",
        name: "Public X / Twitter Business Profiles",
        platformLabel: "Public X / Twitter Business Profile",
        buildQuery: (kw: string) => `(site:twitter.com OR site:x.com) "${effectiveKeyword}" ("email:" OR "@gmail.com" OR "contact") ${locStr}`,
      },
      {
        id: "tiktok_business",
        name: "Public TikTok Business Profiles",
        platformLabel: "Public TikTok Business Profile",
        buildQuery: (kw: string) => `site:tiktok.com "${effectiveKeyword}" ("email:" OR "@gmail.com" OR "contact:") ${locStr}`,
      },
    ];

    const sourceStats: Record<string, SourceStatus> = {};
    for (const ch of sourceChannels) {
      sourceStats[ch.id] = {
        source_name: ch.name,
        status: "WORKING",
        leads_contributed: 0,
      };
    }

    let missingContactCount = 0;
    const countryStats: Record<string, { candidates: number; eligible: number; duplicates: number; missing_contact: number }> = {};
    for (const c of countriesList) {
      countryStats[c] = { candidates: 0, eligible: 0, duplicates: 0, missing_contact: 0 };
    }

    const geoTargets: Array<{ country: string; city: string | null }> =
      geo.specificCitiesEnabled && geo.cities.length > 0
        ? geo.cities.map((ct) => ({ country: normalizeCountryName(ct.country), city: ct.city }))
        : countriesList.map((c) => ({ country: normalizeCountryName(c), city: null }));

    const maxInternalPages = Math.min(6, Math.max(1, Math.ceil(targetCount / (6 * Math.max(1, geoTargets.length))) + 1));

    for (const geoTarget of geoTargets) {
      if (qualifiedLeads.length >= targetCount || Date.now() - startTime > 42000) break;
      const currentCountry = geoTarget.country;
      const currentCity = geoTarget.city || "";
      const targetGl = getCountryGlCode(currentCountry);
      const targetLocationPhrase = currentCity ? `${currentCity} ${currentCountry}` : currentCountry;

      for (let pageNum = 1; pageNum <= maxInternalPages; pageNum++) {
        if (qualifiedLeads.length >= targetCount || Date.now() - startTime > 42000) break;

        const currentVariation = combinedKeywordVariations[(pageNum - 1) % combinedKeywordVariations.length] || effectiveKeyword;

        const channelSearches = sourceChannels.map(async (channel) => {
          if (qualifiedLeads.length >= targetCount || Date.now() - startTime > 42000) return;

          const currentQuery = `${channel.buildQuery(currentVariation)} "${targetLocationPhrase}"`;

        try {
          const serperBody: Record<string, any> = {
            q: currentQuery,
            num: 10,
            page: pageNum,
          };
          if (targetGl) serperBody.gl = targetGl;

          const res = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(serperBody),
          });

          if (!res.ok) {
            if (res.status === 429) {
              sourceStats[channel.id].status = "RATE LIMITED";
            }
            return;
          }

          const data = await res.json();
          const items: SerperOrganicItem[] = data.organic || [];

          if (items.length === 0 && pageNum === 1) {
            sourceStats[channel.id].status = "NO RESULTS";
          }

          for (const item of items) {
            if (qualifiedLeads.length >= targetCount) break;

            const link = (item.link || "").trim();
            const rawTitle = (item.title || "").trim();
            const snippet = (item.snippet || "").trim();

            if (!link || !rawTitle) continue;

            if (["google.", "bing.", "yahoo.", "wikipedia.org", "youtube.com/watch", "reddit.com"].some((x) => link.includes(x))) {
              continue;
            }

            const dom = cleanDomain(link);
            if (!dom) continue;

            // Permanent Account Deduplication Check on Domain
            if (seenDomains.has(dom)) {
              excludedExistingDuplicates++;
              continue;
            }

            const fullText = `${rawTitle} ${snippet}`;
            const { emails, phones } = extractContactsFromText(fullText);

            let email = emails[0] || "";
            let emailSourceUrl = link;
            let emailEvidenceStatus = "FOUND IN SEARCH SNIPPET • FORMAT CHECKED";

            let phone = phones[0] || "";
            let phoneSourceUrl = link;
            let phoneEvidenceStatus = phone ? "FOUND IN SEARCH SNIPPET • FORMAT CHECKED" : "NOT LISTED";

            let businessName = cleanBusinessName(rawTitle, link, email);
            if (isGenericTitleText(businessName) || businessName.length < 2) {
              continue;
            }

            const isSocialHost = [
              "facebook.com", "instagram.com", "linkedin.com", "twitter.com",
              "x.com", "youtube.com", "tiktok.com"
            ].some((s) => dom.includes(s));

            // Deep Business Website Contact Page Extraction (bounded to prevent timeouts)
            const needsEmailNow = contactRequirement !== "PHONE_ONLY";
            if (!email && needsEmailNow && !isSocialHost && Date.now() - startTime < 38000) {
              const crawlResult = await crawlWebsiteForContacts(dom, email, phone);
              if (crawlResult.email) {
                email = crawlResult.email;
                emailSourceUrl = crawlResult.emailSourceUrl || link;
                emailEvidenceStatus = crawlResult.emailStatus;
              }
              if (!phone && crawlResult.phone) {
                phone = crawlResult.phone;
                phoneSourceUrl = crawlResult.phoneSourceUrl || link;
                phoneEvidenceStatus = crawlResult.phoneStatus;
              }

              if (!email && Date.now() - startTime < 36000) {
                const resolved = await querySerperForDomainContact(dom, serperKey);
                if (resolved.email) {
                  email = resolved.email;
                  emailSourceUrl = resolved.emailSourceUrl || link;
                  emailEvidenceStatus = "EXTRACTED FROM PUBLIC WEBSITE • SYNTAX CHECKED";
                }
                if (!phone && resolved.phone) {
                  phone = resolved.phone;
                  phoneSourceUrl = resolved.phoneSourceUrl || link;
                  phoneEvidenceStatus = "FOUND IN SOURCE EVIDENCE";
                }
              }
            } else if (email && !isSocialHost) {
              emailEvidenceStatus = "EXTRACTED FROM PUBLIC PAGE • SYNTAX CHECKED";
            } else if (email && isSocialHost) {
              emailEvidenceStatus = "FOUND ON PUBLIC BUSINESS PROFILE • SYNTAX CHECKED";
            } else if (email && (link.includes("yellowpages.") || link.includes("clutch.co") || link.includes("yelp."))) {
              emailEvidenceStatus = "FOUND ON THIRD-PARTY DIRECTORY • SYNTAX CHECKED";
            }

            // Evaluate Contact Requirement (EMAIL_AND_PHONE, EMAIL_ONLY, PHONE_ONLY, EMAIL_OR_PHONE)
            const contactEval = evaluateContactRequirement(
              { email, phone },
              contactRequirement,
              currentCountry
            );

            if (!contactEval.eligible) {
              missingContactCount++;
              if (countryStats[currentCountry]) countryStats[currentCountry].missing_contact++;
              continue;
            }

            const cleanEmail = contactEval.normalizedEmail || email;
            const cleanPhone = contactEval.normalizedPhone || phone;

            // Permanent Account Deduplication Check on Email
            if (cleanEmail && seenEmails.has(cleanEmail)) {
              excludedExistingDuplicates++;
              if (countryStats[currentCountry]) countryStats[currentCountry].duplicates++;
              continue;
            }

            const quality = calculateLeadQualityScore({
              business_name: businessName,
              email: cleanEmail,
              phone: cleanPhone,
              website: isSocialHost ? `https://${dom}` : (link.startsWith("http") ? link : `https://${dom}`),
              country: currentCountry,
              city: effectiveCity,
            });

            const pkt = getPktDateTime();
            const qualifiedItem: QualifiedLeadItem = {
              id: Date.now() + qualifiedLeads.length + 1,
              business_name: businessName,
              website: isSocialHost ? `https://${dom}` : (link.startsWith("http") ? link : `https://${dom}`),
              domain: dom,
              email: cleanEmail,
              email_source_url: emailSourceUrl,
              email_status: emailEvidenceStatus,
              phone: cleanPhone || "",
              phone_source_url: cleanPhone ? phoneSourceUrl : "",
              phone_status: phoneEvidenceStatus,
              country: currentCountry || "Global",
              city: currentCity || "",
              address: snippet.includes(",") ? snippet.slice(0, 100) : [currentCity, currentCountry].filter(Boolean).join(", "),
              industry: rawIndustry && rawIndustry !== "Any" ? rawIndustry : aiStrategy.industry || effectiveKeyword,
              source_platform: channel.platformLabel,
              original_source_url: link,
              search_keyword: effectiveKeyword,
              search_date: pkt.date,
              search_time: pkt.time,
              saved_date: pkt.date,
              saved_time: pkt.time,
              extraction_date: pkt.date,
              extraction_time: pkt.time,
              created_at: new Date().toISOString(),
              quality_score: quality.score,
              quality_category: quality.category,
              quality_reasons: quality.reasons,
              contact_requirement: contactRequirement,
            };

            const wasAdded = mergeLeadIntoList(qualifiedLeads, qualifiedItem, seenDomains, seenNames, seenEmails);
            if (wasAdded) {
              sourceStats[channel.id].leads_contributed += 1;
              sourceStats[channel.id].sample_url = link;
              if (countryStats[currentCountry]) countryStats[currentCountry].eligible++;
            }
          }
        } catch {
          // Channel query timeout or individual error, continue cleanly
        }
      });

      await Promise.allSettled(channelSearches);
    }
  }

    const pkt = getPktDateTime();
    const searchRecordId = `SR-${Date.now()}`;
    const configuredSources = sourceChannels.map((c) => c.name);

    // Permanent Persistence to Neon PostgreSQL & Serverless Cache
    if (qualifiedLeads.length > 0) {
      saveServerlessSearchRecordAndLeads(
        workspaceId,
        {
          keyword: effectiveKeyword,
          country: effectiveCountry,
          city: effectiveCity || locParts[0] || "",
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
              city: effectiveCity || locParts[0] || "",
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

    // Complete the active search job
    if (currentJobId) {
      await completeActiveSearchJob(currentJobId, "COMPLETED", qualifiedLeads.length, searchRecordId);
    }

    const durationMs = Date.now() - startTime;
    const leadsWithPhone = qualifiedLeads.filter((l) => Boolean(l.phone)).length;

    return NextResponse.json({
      status: "success",
      search_record_id: searchRecordId,
      search_date: pkt.date,
      search_time: pkt.time,
      completion_time: pkt.completionTime,
      keyword: effectiveKeyword,
      country: effectiveCountry || "Global",
      city: effectiveCity || "All Cities",
      selected_countries: countriesList,
      contact_requirement: contactRequirement,
      country_stats: countryStats,
      target_count: targetCount,
      qualified_count: qualifiedLeads.length,
      unique_businesses_count: qualifiedLeads.length,
      leads_with_phone_count: leadsWithPhone,
      duplicates_skipped: excludedExistingDuplicates,
      missing_contact_skipped: missingContactCount,
      duration_ms: durationMs,
      leads: qualifiedLeads,
      sources_breakdown: Object.values(sourceStats),
      ai_strategy: {
        raw_query: aiStrategy.raw_query,
        interpreted_keyword: aiStrategy.interpreted_keyword,
        target_business_type: aiStrategy.target_business_type,
        industry: aiStrategy.industry,
        target_audience: aiStrategy.target_audience,
        reasoning: aiStrategy.reasoning,
        used_business_profile: aiStrategy.used_business_profile,
        excluded_previous_duplicates: excludedExistingDuplicates,
      },
      message: qualifiedLeads.length >= targetCount
        ? `Successfully extracted and permanently saved ${qualifiedLeads.length} unique qualified leads matching "${contactRequirement}" into Neon PostgreSQL.`
        : `Discovered and permanently saved ${qualifiedLeads.length} unique qualified leads out of ${targetCount} requested. (${excludedExistingDuplicates} workspace duplicates excluded; ${missingContactCount} skipped due to missing ${contactRequirement.replace(/_/g, " ")} contact details).`,
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
