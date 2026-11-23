/**
 * USMAN AI GTM — Public Business Lead Enrichment Engine
 * Discovers public web presence (LinkedIn, Instagram, Facebook, YouTube, Website, Bio)
 * without touching private accounts or bypassing logins.
 */

import { getNeonSql } from "@/lib/neon-db";
import { calculateLeadQualityScore, validateEmailSyntax, validateAndNormalizePhone } from "@/lib/lead-quality-engine";

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

  // Working copy
  const updated = { ...lead };

  if (businessName && serperKey) {
    try {
      // 1. Search for public company social presence
      const query = `"${businessName}" ${location} (site:linkedin.com/company OR site:instagram.com OR site:facebook.com OR site:youtube.com)`;
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 10 }),
      });

      if (res.ok) {
        const data = await res.json();
        const organic = data?.organic || [];

        for (const item of organic) {
          const link = item.link || "";

          // LinkedIn company
          if (link.includes("linkedin.com/company/") && !updated.linkedin) {
            changes["linkedin"] = { old: lead.linkedin || null, new: link };
            updated.linkedin = link;
            fieldsFound.push("LinkedIn Company Page");
          }

          // Instagram
          if (link.includes("instagram.com/") && !updated.instagram) {
            // Filter out explore or tag pages
            if (!link.includes("/explore/") && !link.includes("/tags/") && !link.includes("/p/")) {
              changes["instagram"] = { old: lead.instagram || null, new: link };
              updated.instagram = link;
              fieldsFound.push("Instagram Business Profile");
            }
          }

          // Facebook
          if (link.includes("facebook.com/") && !updated.facebook) {
            if (!link.includes("/sharer") && !link.includes("/help")) {
              changes["facebook"] = { old: lead.facebook || null, new: link };
              updated.facebook = link;
              fieldsFound.push("Facebook Business Page");
            }
          }

          // YouTube
          if ((link.includes("youtube.com/channel/") || link.includes("youtube.com/@")) && !updated.youtube) {
            changes["youtube"] = { old: lead.youtube || null, new: link };
            updated.youtube = link;
            fieldsFound.push("YouTube Public Channel");
          }

          // Discover website if lead had none
          if (!updated.website && !link.includes("linkedin.com") && !link.includes("instagram.com") && !link.includes("facebook.com") && !link.includes("youtube.com") && !link.includes("twitter.com")) {
            try {
              const urlObj = new URL(link);
              const rootUrl = `${urlObj.protocol}//${urlObj.hostname}`;
              changes["website"] = { old: null, new: rootUrl };
              updated.website = rootUrl;
              fieldsFound.push("Official Website");
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn("Enrichment web query error:", err);
    }
  }

  // Check what remains unavailable
  if (!updated.website) fieldsUnavailable.push("Official Website");
  if (!updated.email || !validateEmailSyntax(updated.email)) fieldsUnavailable.push("Verified Email");
  if (!updated.phone) fieldsUnavailable.push("Direct Phone");
  if (!updated.linkedin) fieldsUnavailable.push("LinkedIn Company Page");
  if (!updated.instagram) fieldsUnavailable.push("Instagram Business Profile");
  if (!updated.facebook) fieldsUnavailable.push("Facebook Business Page");
  if (!updated.youtube) fieldsUnavailable.push("YouTube Channel");

  // Re-calculate quality score with enriched data
  const quality = calculateLeadQualityScore(updated);
  updated.quality_score = quality.score;
  updated.quality_category = quality.category;
  updated.quality_reasons = quality.reasons;
  updated.is_enriched = true;
  updated.enriched_at = new Date().toISOString();

  // If changes occurred, update DB and write audit log
  if (sql && lead.id) {
    try {
      await sql`
        UPDATE leads
        SET 
          website = COALESCE(${updated.website}, website),
          linkedin = COALESCE(${updated.linkedin}, linkedin),
          instagram = COALESCE(${updated.instagram}, instagram),
          facebook = COALESCE(${updated.facebook}, facebook),
          youtube = COALESCE(${updated.youtube}, youtube),
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
          VALUES (${workspaceId}, ${lead.id}, ${JSON.stringify(changes)}, 'SERPER_PUBLIC_WEB')
        `;
      }
    } catch (dbErr) {
      console.error("Database update lead enrichment error:", dbErr);
    }
  }

  return {
    lead_id: lead.id,
    fields_found: fieldsFound,
    fields_unavailable: fieldsUnavailable,
    changes,
    updated_lead: updated,
  };
}
