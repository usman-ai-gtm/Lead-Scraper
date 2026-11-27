/**
 * USMAN AI GTM — Public Business Lead Enrichment Engine
 *
 * Discovers factual public web presence without synthetic guesses:
 * 1. Direct website HTML inspection (email, phone, socials, CMS/tech stack, careers page, HTTPS/SEO signals)
 * 2. Serper public web search for LinkedIn/Instagram/Facebook/YouTube/Website
 * 3. Free open GLEIF Global LEI Registry corroboration (when registered entity matches)
 * 4. Free open RDAP domain registration check (creation date, registrar)
 */

import { getNeonSql } from "@/lib/neon-db";
import { calculateLeadQualityScore, validateEmailSyntax } from "@/lib/lead-quality-engine";
import { crawlWebsiteForContacts } from "@/lib/search-intelligence";
import { lookupGleifEntity, lookupRdapDomainMeta } from "@/lib/free-sources";
import { extractOwnedCompanyDomain } from "@/lib/b2b-verticals";

export interface EnrichmentResult {
  lead_id: number;
  fields_found: string[];
  fields_unavailable: string[];
  changes: Record<string, { old: any; new: any }>;
  updated_lead: any;
}

export async function enrichLeadRecord(
  lead: any,
  workspaceId: number
): Promise<EnrichmentResult> {
  const sql = getNeonSql();
  const changes: Record<string, { old: any; new: any }> = {};
  const fieldsFound: string[] = [];
  const fieldsUnavailable: string[] = [];

  const businessName = (lead.business_name || "").trim();
  const location = [lead.city, lead.country].filter(Boolean).join(" ");
  const serperKey = (process.env.SERPER_API_KEY || "").trim();

  const updated = { ...lead };
  let existingEnrichment: Record<string, any> = {};
  if (lead.enrichment_data && typeof lead.enrichment_data === "object") {
    existingEnrichment = { ...lead.enrichment_data };
  }

  // 1. Serper social & website discovery
  if (businessName && serperKey) {
    try {
      const query = `"${businessName}" ${location} (site:linkedin.com/company OR site:instagram.com OR site:facebook.com OR site:youtube.com)`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 8 }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const organic = data?.organic || [];

        for (const item of organic) {
          const link = item.link || "";
          if (link.includes("linkedin.com/company/") && !updated.linkedin) {
            changes["linkedin"] = { old: lead.linkedin || null, new: link };
            updated.linkedin = link;
            fieldsFound.push("LinkedIn Company Page");
          }
          if (link.includes("instagram.com/") && !updated.instagram && !link.includes("/explore/") && !link.includes("/p/")) {
            changes["instagram"] = { old: lead.instagram || null, new: link };
            updated.instagram = link;
            fieldsFound.push("Instagram Business Profile");
          }
          if (link.includes("facebook.com/") && !updated.facebook && !link.includes("/sharer") && !link.includes("/help")) {
            changes["facebook"] = { old: lead.facebook || null, new: link };
            updated.facebook = link;
            fieldsFound.push("Facebook Business Page");
          }
          if ((link.includes("youtube.com/channel/") || link.includes("youtube.com/@")) && !updated.youtube) {
            changes["youtube"] = { old: lead.youtube || null, new: link };
            updated.youtube = link;
            fieldsFound.push("YouTube Public Channel");
          }
          if (!updated.website) {
            const owned = extractOwnedCompanyDomain(link);
            if (owned) {
              const rootUrl = `https://${owned}`;
              changes["website"] = { old: null, new: rootUrl };
              updated.website = rootUrl;
              updated.domain = owned;
              fieldsFound.push("Official Website");
            }
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // 2. Direct website HTML crawl (contacts + tech stack + careers + socials + metadata)
  const ownedDom = extractOwnedCompanyDomain(updated.website || updated.domain);
  if (ownedDom) {
    const [crawlRes, rdapMeta] = await Promise.all([
      crawlWebsiteForContacts(ownedDom, updated.email, updated.phone, {
        countryName: updated.country,
        checkCareers: true,
      }),
      lookupRdapDomainMeta(ownedDom),
    ]);

    if (!updated.email && crawlRes.email) {
      changes["email"] = { old: lead.email || null, new: crawlRes.email };
      updated.email = crawlRes.email;
      updated.email_status = crawlRes.emailStatus;
      fieldsFound.push("Public Business Email");
    }
    if (!updated.phone && crawlRes.phone) {
      changes["phone"] = { old: lead.phone || null, new: crawlRes.phone };
      updated.phone = crawlRes.phone;
      updated.phone_status = crawlRes.phoneStatus;
      fieldsFound.push("Public Business Phone");
    }
    if (crawlRes.socials?.linkedin && !updated.linkedin) {
      updated.linkedin = crawlRes.socials.linkedin;
      fieldsFound.push("LinkedIn Company Page");
    }
    if (crawlRes.socials?.facebook && !updated.facebook) {
      updated.facebook = crawlRes.socials.facebook;
      fieldsFound.push("Facebook Business Page");
    }
    if (crawlRes.socials?.instagram && !updated.instagram) {
      updated.instagram = crawlRes.socials.instagram;
      fieldsFound.push("Instagram Business Profile");
    }
    if (crawlRes.metaDescription && !updated.snippet) {
      updated.snippet = crawlRes.metaDescription;
      fieldsFound.push("Company Description");
    }
    if (crawlRes.techStack && crawlRes.techStack.length > 0) {
      existingEnrichment.tech_stack = crawlRes.techStack;
      fieldsFound.push(`Tech Stack (${crawlRes.techStack.join(", ")})`);
    }
    if (crawlRes.careersUrl) {
      existingEnrichment.careers_url = crawlRes.careersUrl;
      existingEnrichment.hiring_detected = true;
      fieldsFound.push("Careers Page");
    }
    if (crawlRes.websiteWeaknesses && crawlRes.websiteWeaknesses.length > 0) {
      existingEnrichment.website_weaknesses = crawlRes.websiteWeaknesses;
    }
    if (rdapMeta) {
      existingEnrichment.rdap = rdapMeta;
      fieldsFound.push("Domain Registration (RDAP)");
    }
  }

  // 3. Free open GLEIF Legal Entity lookup (zero key, commercial permitted)
  if (businessName) {
    const gleif = await lookupGleifEntity(businessName, updated.country);
    if (gleif) {
      existingEnrichment.gleif = gleif;
      fieldsFound.push(`Legal Registry (${gleif.lei})`);
    }
  }

  if (!updated.website) fieldsUnavailable.push("Official Website");
  if (!updated.email || !validateEmailSyntax(updated.email)) fieldsUnavailable.push("Verified Email");
  if (!updated.phone) fieldsUnavailable.push("Direct Phone");
  if (!updated.linkedin) fieldsUnavailable.push("LinkedIn Company Page");
  if (!updated.instagram) fieldsUnavailable.push("Instagram Business Profile");
  if (!updated.facebook) fieldsUnavailable.push("Facebook Business Page");

  const signalsList: string[] = [];
  if (existingEnrichment.tech_stack?.length) signalsList.push(`Tech: ${existingEnrichment.tech_stack.join(", ")}`);
  if (existingEnrichment.hiring_detected) signalsList.push("Hiring / Careers page detected");
  if (existingEnrichment.gleif?.lei) signalsList.push(`LEI Verified (${existingEnrichment.gleif.countryCode})`);
  if (signalsList.length > 0) {
    updated.positive_signals = signalsList.join(" | ");
  }

  const quality = calculateLeadQualityScore(updated);
  updated.quality_score = quality.score;
  updated.quality_category = quality.category;
  updated.quality_reasons = quality.reasons;
  updated.enrichment_data = existingEnrichment;
  updated.is_enriched = true;
  updated.enriched_at = new Date().toISOString();

  if (sql && lead.id) {
    try {
      await sql`
        UPDATE leads
        SET
          website = COALESCE(${updated.website}, website),
          email = COALESCE(NULLIF(${updated.email || ""}, ''), email),
          email_status = COALESCE(NULLIF(${updated.email_status || ""}, ''), email_status),
          phone = COALESCE(NULLIF(${updated.phone || ""}, ''), phone),
          phone_status = COALESCE(NULLIF(${updated.phone_status || ""}, ''), phone_status),
          linkedin = COALESCE(${updated.linkedin}, linkedin),
          instagram = COALESCE(${updated.instagram}, instagram),
          facebook = COALESCE(${updated.facebook}, facebook),
          youtube = COALESCE(${updated.youtube}, youtube),
          snippet = COALESCE(NULLIF(${updated.snippet || ""}, ''), snippet),
          positive_signals = COALESCE(NULLIF(${updated.positive_signals || ""}, ''), positive_signals),
          enrichment_data = ${JSON.stringify(existingEnrichment)}::jsonb,
          quality_score = ${updated.quality_score},
          quality_category = ${updated.quality_category},
          quality_reasons = ${JSON.stringify(updated.quality_reasons)},
          is_enriched = true,
          enriched_at = CURRENT_TIMESTAMP
        WHERE id = ${lead.id} AND workspace_id = ${workspaceId}
      `;

      if (Object.keys(changes).length > 0) {
        await sql`
          INSERT INTO lead_enrichment_logs (workspace_id, lead_id, changes, source)
          VALUES (${workspaceId}, ${lead.id}, ${JSON.stringify(changes)}, 'MULTI_SOURCE_PUBLIC_ENRICHMENT')
        `;
      }
    } catch (dbErr) {
      console.error("Database update lead enrichment error:", dbErr);
    }
  }

  return {
    lead_id: lead.id,
    fields_found: Array.from(new Set(fieldsFound)),
    fields_unavailable: fieldsUnavailable,
    changes,
    updated_lead: updated,
  };
}
