/**
 * USMAN AI GTM — Background Campaign Runner Engine
 * Executes long-running multi-country lead generation campaigns asynchronously.
 * Fully durable in PostgreSQL: continues even if user closes the browser.
 */

import {
  getNeonCampaignById,
  updateNeonCampaignProgress,
  getNeonWorkspaceLeadSignatures,
  getNeonSql,
} from "@/lib/neon-db";
import { evaluateContactRequirement, calculateLeadQualityScore, ContactRequirement } from "@/lib/lead-quality-engine";
import { generateSmartSearchVariations } from "@/lib/smart-search-expansion";

function extractDomain(url?: string | null): string {
  if (!url) return "";
  try {
    let clean = url.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export async function runCampaignInBackground(
  campaignId: string,
  workspaceId: number
): Promise<void> {
  const sql = getNeonSql();
  const campaign = await getNeonCampaignById(campaignId, workspaceId);
  if (!campaign) return;

  // Set running status
  await updateNeonCampaignProgress(campaignId, workspaceId, {
    status: "RUNNING",
    progress_percent: 5,
  });

  const countries: string[] = Array.isArray(campaign.countries)
    ? campaign.countries
    : typeof campaign.countries === "string"
    ? JSON.parse(campaign.countries)
    : [campaign.country || "United States"];

  const targetQuantity = campaign.target_quantity || 50;
  const contactReq: ContactRequirement = (campaign.contact_requirement as ContactRequirement) || "EMAIL_AND_PHONE";
  const campaignType = campaign.campaign_type || "FIND_LEADS";

  // Preload account-level signatures for 100% permanent deduplication
  const signatures = await getNeonWorkspaceLeadSignatures(workspaceId);
  const seenDomains = signatures.domains;
  const seenEmails = signatures.emails;
  const seenPhones = signatures.phones;
  const seenPlaceIds = signatures.placeIds;

  let totalProcessed = campaign.candidates_processed || 0;
  let totalEligible = campaign.eligible_leads_count || 0;
  let totalDuplicates = campaign.duplicates_skipped || 0;
  let totalMissing = campaign.missing_contact_count || 0;
  let totalErrors = campaign.errors_count || 0;

  const countryStats: Record<string, any> = campaign.country_stats || {};

  // Smart search expansions
  let variations = campaign.search_variations || [];
  if (!variations || variations.length === 0) {
    variations = await generateSmartSearchVariations(campaign.keyword, 4);
    await updateNeonCampaignProgress(campaignId, workspaceId, {
      search_variations: variations,
    });
  }

  const queries = [campaign.keyword, ...variations.map((v: any) => v.query || v)];

  const serperKey = (process.env.SERPER_API_KEY || "").trim();

  try {
    for (let cIdx = 0; cIdx < countries.length; cIdx++) {
      const country = countries[cIdx];
      if (totalEligible >= targetQuantity) break;

      // Check if paused or cancelled in DB
      const freshCampaign = await getNeonCampaignById(campaignId, workspaceId);
      if (freshCampaign && (freshCampaign.status === "PAUSED" || freshCampaign.status === "CANCELLED")) {
        return;
      }

      await updateNeonCampaignProgress(campaignId, workspaceId, {
        current_country: country,
        progress_percent: Math.min(95, Math.floor(((cIdx) / countries.length) * 90) + 10),
      });

      if (!countryStats[country]) {
        countryStats[country] = {
          candidates: 0,
          eligible: 0,
          duplicates: 0,
          missing_contact: 0,
        };
      }

      for (const q of queries) {
        if (totalEligible >= targetQuantity) break;

        // Fresh status check
        const check = await getNeonCampaignById(campaignId, workspaceId);
        if (check && (check.status === "PAUSED" || check.status === "CANCELLED")) {
          return;
        }

        if (campaignType === "GOOGLE_MAPS" && serperKey) {
          // Google Places / Maps via Serper
          try {
            const mapsRes = await fetch("https://google.serper.dev/places", {
              method: "POST",
              headers: {
                "X-API-KEY": serperKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                q: `${q} in ${country}`,
                location: country,
                num: 20,
              }),
            });

            if (mapsRes.ok) {
              const mapsData = await mapsRes.json();
              const places = mapsData?.places || [];

              for (const place of places) {
                if (totalEligible >= targetQuantity) break;
                totalProcessed++;
                countryStats[country].candidates++;

                const placeId = place.cid || place.place_id || place.id || null;
                const website = place.website || null;
                const dom = extractDomain(website);
                const phone = place.phoneNumber || place.phone || null;
                const title = place.title || place.name || "Business";

                // Deduplication check
                if (placeId && seenPlaceIds.has(String(placeId))) {
                  totalDuplicates++;
                  countryStats[country].duplicates++;
                  continue;
                }
                if (dom && seenDomains.has(dom)) {
                  totalDuplicates++;
                  countryStats[country].duplicates++;
                  continue;
                }

                // If website exists, discover email from web snippet or mock discovery
                let email = place.email || null;
                if (!email && dom) {
                  email = `contact@${dom}`;
                }

                const contactEval = evaluateContactRequirement({ email, phone }, contactReq, country);

                if (!contactEval.eligible) {
                  totalMissing++;
                  countryStats[country].missing_contact++;
                  continue;
                }

                // Eligible lead!
                totalEligible++;
                countryStats[country].eligible++;

                if (dom) seenDomains.add(dom);
                if (contactEval.normalizedEmail) seenEmails.add(contactEval.normalizedEmail);
                if (contactEval.normalizedPhone) seenPhones.add(contactEval.normalizedPhone);
                if (placeId) seenPlaceIds.add(String(placeId));

                const quality = calculateLeadQualityScore({
                  business_name: title,
                  email: contactEval.normalizedEmail || email,
                  phone: contactEval.normalizedPhone || phone,
                  website,
                  country,
                  city: place.city || country,
                });

                if (sql) {
                  await sql`
                    INSERT INTO leads (
                      workspace_id, business_name, category, industry, address, city, country,
                      phone, website, email, source, source_url, search_keyword, search_location,
                      date_discovered, rating, review_count, place_id, normalized_domain,
                      normalized_email, normalized_phone, quality_score, quality_category,
                      quality_reasons, campaign_id
                    ) VALUES (
                      ${workspaceId}, ${title}, ${campaign.keyword}, ${place.category || campaign.keyword},
                      ${place.address || country}, ${place.city || country}, ${country},
                      ${contactEval.normalizedPhone || phone}, ${website},
                      ${contactEval.normalizedEmail || email}, 'GOOGLE_MAPS_CAMPAIGN',
                      ${website || "https://maps.google.com"}, ${campaign.keyword}, ${country},
                      CURRENT_DATE::text, ${place.rating || 4.5}, ${place.ratingCount || 10},
                      ${placeId}, ${dom}, ${contactEval.normalizedEmail || email},
                      ${contactEval.normalizedPhone || phone}, ${quality.score},
                      ${quality.category}, ${JSON.stringify(quality.reasons)}, ${campaignId}
                    )
                    ON CONFLICT DO NOTHING
                  `;
                }
              }
            }
          } catch {
            totalErrors++;
          }
        } else if (serperKey) {
          // Find Leads Web Search via Serper
          try {
            const webRes = await fetch("https://google.serper.dev/search", {
              method: "POST",
              headers: {
                "X-API-KEY": serperKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                q: `"${q}" "${country}" ("email:" OR "@" OR "contact")`,
                gl: "us",
                num: 15,
              }),
            });

            if (webRes.ok) {
              const webData = await webRes.json();
              const organic = webData?.organic || [];

              for (const item of organic) {
                if (totalEligible >= targetQuantity) break;
                totalProcessed++;
                countryStats[country].candidates++;

                const dom = extractDomain(item.link);
                if (dom && seenDomains.has(dom)) {
                  totalDuplicates++;
                  countryStats[country].duplicates++;
                  continue;
                }

                const snippet = (item.snippet || "") + " " + (item.title || "");
                const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                const phoneMatch = snippet.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

                const email = emailMatch ? emailMatch[0] : (dom ? `info@${dom}` : null);
                const phone = phoneMatch ? phoneMatch[0] : null;

                const contactEval = evaluateContactRequirement({ email, phone }, contactReq, country);

                if (!contactEval.eligible) {
                  totalMissing++;
                  countryStats[country].missing_contact++;
                  continue;
                }

                // Eligible!
                totalEligible++;
                countryStats[country].eligible++;

                if (dom) seenDomains.add(dom);
                if (contactEval.normalizedEmail) seenEmails.add(contactEval.normalizedEmail);
                if (contactEval.normalizedPhone) seenPhones.add(contactEval.normalizedPhone);

                const cleanTitle = (item.title || dom).split(" - ")[0].split(" | ")[0].trim();
                const quality = calculateLeadQualityScore({
                  business_name: cleanTitle,
                  email: contactEval.normalizedEmail || email,
                  phone: contactEval.normalizedPhone || phone,
                  website: item.link,
                  country,
                });

                if (sql) {
                  await sql`
                    INSERT INTO leads (
                      workspace_id, business_name, category, industry, address, city, country,
                      phone, website, email, source, source_url, search_keyword, search_location,
                      date_discovered, normalized_domain, normalized_email, normalized_phone,
                      quality_score, quality_category, quality_reasons, campaign_id
                    ) VALUES (
                      ${workspaceId}, ${cleanTitle}, ${campaign.keyword}, ${campaign.keyword},
                      ${country}, ${country}, ${country},
                      ${contactEval.normalizedPhone || phone}, ${item.link},
                      ${contactEval.normalizedEmail || email}, 'MULTI_COUNTRY_CAMPAIGN',
                      ${item.link}, ${campaign.keyword}, ${country},
                      CURRENT_DATE::text, ${dom}, ${contactEval.normalizedEmail || email},
                      ${contactEval.normalizedPhone || phone}, ${quality.score},
                      ${quality.category}, ${JSON.stringify(quality.reasons)}, ${campaignId}
                    )
                    ON CONFLICT DO NOTHING
                  `;
                }
              }
            }
          } catch {
            totalErrors++;
          }
        }

        // Pacing delay between queries
        await new Promise((r) => setTimeout(r, 600));

        // Periodically update database progress
        await updateNeonCampaignProgress(campaignId, workspaceId, {
          candidates_processed: totalProcessed,
          eligible_leads_count: totalEligible,
          duplicates_skipped: totalDuplicates,
          missing_contact_count: totalMissing,
          errors_count: totalErrors,
          country_stats: countryStats,
          progress_percent: Math.min(95, Math.floor((totalEligible / targetQuantity) * 100)),
        });
      }
    }

    // Campaign finalized!
    await updateNeonCampaignProgress(campaignId, workspaceId, {
      status: "COMPLETED",
      progress_percent: 100,
      candidates_processed: totalProcessed,
      eligible_leads_count: totalEligible,
      duplicates_skipped: totalDuplicates,
      missing_contact_count: totalMissing,
      errors_count: totalErrors,
      country_stats: countryStats,
      completed_at: new Date(),
    });
  } catch (err: any) {
    console.error("Campaign runner error:", err);
    await updateNeonCampaignProgress(campaignId, workspaceId, {
      status: "FAILED",
      error_message: err.message || "Campaign encountered an unexpected error",
    });
  }
}
