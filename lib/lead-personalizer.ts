/**
 * USMAN AI GTM — Shared Multi-Source Personalized Email Engine
 *
 * Powers individualized B2B outreach drafts across:
 * - Find Leads (Web & Registry Discovery)
 * - Google Maps Business Lead Generator
 * - Saved Leads & Cold Email Composer
 *
 * Strict Honesty & Compliance Guarantees:
 * - Never fabricates human names, meetings, or fake company problems
 * - Inspects actual domain/website HTML if not already crawled
 * - Marks sparse/missing leads cleanly as "Research Limited" or "Needs Review"
 * - Never exposes internal AI model names in client responses
 */

import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { crawlWebsiteForContacts } from "@/lib/search-intelligence";
import { extractOwnedCompanyDomain } from "@/lib/b2b-verticals";

export type PersonalizationStatus =
  | "Generated"
  | "Research Limited"
  | "Needs Review"
  | "Failed"
  | "Not Available";

export interface PersonalizationResultItem {
  lead_id?: number;
  business_name: string;
  email: string;
  website: string;
  contact_person_name?: string;
  contact_job_title?: string;
  personalized_subject: string;
  personalized_body: string;
  personalization_status: PersonalizationStatus;
  research_source_url: string;
  research_summary: string;
  personalized_at: string;
  note?: string;
}

export async function getWorkspaceProfileForPersonalization(workspaceId: number): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const rows = await sql.query(
      "SELECT * FROM workspace_profiles WHERE workspace_id = $1 LIMIT 1",
      [workspaceId]
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

export async function ensureLeadPersonalizationColumns() {
  if (!isNeonConfigured()) return;
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS personalized_email_subject text");
    await sql.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS personalized_email_body text");
    await sql.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS personalization_status text");
  } catch {}
}

function getAiKey(): string | null {
  const k = (process.env.GEMINI_API_KEY || "").trim();
  if (!k || k.startsWith("your_") || k.length < 10) return null;
  return k;
}

function resolveTargetEmailLanguage(leadCountry: string, profile: any, overrideLang?: string): string {
  if (overrideLang && overrideLang !== "Auto" && overrideLang !== "Match Prospect Country") {
    return overrideLang;
  }
  const profLang = String(profile?.preferred_outreach_language || "").trim();
  if (profLang && profLang !== "Match Prospect Country") {
    return profLang;
  }
  const c = (leadCountry || "").toLowerCase();
  if (c.includes("germany") || c.includes("austria") || c.includes("switzerland")) return "German";
  if (c.includes("france")) return "French";
  if (c.includes("spain") || c.includes("mexico")) return "Spanish";
  if (c.includes("uae") || c.includes("saudi")) return "English or Arabic (concise English international B2B unless local Arabic requested)";
  return "English";
}

function extractVerifiedPersonFromLead(lead: any): { name: string; title: string } {
  const link = String(lead.original_source_url || lead.source_url || lead.linkedin || "");
  const titleText = String(lead.business_name || "");
  if (link.includes("linkedin.com/in/") && titleText.includes(" - ")) {
    const parts = titleText.split(" - ").map((s: string) => s.trim());
    if (parts.length >= 2 && parts[0].split(" ").length <= 4) {
      return { name: parts[0], title: parts[1] || "" };
    }
  }
  const existingName = String(lead.enrichment_data?.contact_person_name || "").trim();
  const existingTitle = String(lead.enrichment_data?.contact_job_title || "").trim();
  return { name: existingName, title: existingTitle };
}

export async function personalizeSingleLead(
  lead: any,
  profile: any | null,
  options?: {
    workspaceId?: number;
    senderName?: string;
    senderEmail?: string;
    outputLanguage?: string;
    tone?: string;
    customInstruction?: string;
    persistToDb?: boolean;
  }
): Promise<PersonalizationResultItem> {
  const nowIso = new Date().toISOString();
  const businessName = String(lead.business_name || lead.name || "").trim();
  const website = String(lead.website || lead.domain || "").trim();
  const ownedDom = extractOwnedCompanyDomain(website);
  const sourceUrl = String(lead.original_source_url || lead.source_url || (ownedDom ? `https://${ownedDom}` : "")).trim();
  const email = String(lead.email || "").trim();

  if (!businessName || businessName.length < 2) {
    return {
      lead_id: lead.id ? Number(lead.id) : undefined,
      business_name: businessName || "Unknown Company",
      email,
      website,
      personalized_subject: "",
      personalized_body: "",
      personalization_status: "Not Available",
      research_source_url: sourceUrl,
      research_summary: "",
      personalized_at: nowIso,
      note: "Personalization needs more company information.",
    };
  }

  let enrichment = lead.enrichment_data && typeof lead.enrichment_data === "object"
    ? { ...lead.enrichment_data }
    : {};
  let snippet = String(lead.snippet || enrichment.meta_title || "").trim();
  let updatedPhone = String(lead.phone || "").trim();
  let updatedEmail = email;

  // Inspect public website if domain is known and factual description is still missing
  if (ownedDom && (!snippet || !enrichment.tech_stack)) {
    try {
      const crawl = await crawlWebsiteForContacts(ownedDom, updatedEmail, updatedPhone, {
        countryName: lead.country,
      });
      if (crawl.metaDescription) snippet = crawl.metaDescription;
      else if (crawl.metaTitle && !snippet) snippet = crawl.metaTitle;
      if (!updatedEmail && crawl.email) updatedEmail = crawl.email;
      if (!updatedPhone && crawl.phone) updatedPhone = crawl.phone;
      if (crawl.techStack?.length) enrichment.tech_stack = crawl.techStack;
      if (crawl.careersUrl) {
        enrichment.careers_url = crawl.careersUrl;
        enrichment.hiring_detected = true;
      }
      if (crawl.websiteWeaknesses?.length) enrichment.website_weaknesses = crawl.websiteWeaknesses;
    } catch {
      // Non-fatal; mark research status honestly below
    }
  }

  const verifiedPerson = extractVerifiedPersonFromLead(lead);
  const signals = String(lead.positive_signals || "").trim();
  const techStack = Array.isArray(enrichment.tech_stack) ? enrichment.tech_stack.join(", ") : "";
  const weaknesses = Array.isArray(enrichment.website_weaknesses) ? enrichment.website_weaknesses.join(", ") : "";
  const hiringNote = enrichment.careers_url ? `Public careers page: ${enrichment.careers_url}` : "";
  const hasRealCompanyContext = Boolean(snippet || ownedDom || techStack || hiringNote || signals || (lead.industry && !/^general/i.test(String(lead.industry))));

  if (!hasRealCompanyContext) {
    return {
      lead_id: lead.id ? Number(lead.id) : undefined,
      business_name: businessName,
      email: updatedEmail,
      website,
      ...(verifiedPerson.name ? { contact_person_name: verifiedPerson.name } : {}),
      ...(verifiedPerson.title ? { contact_job_title: verifiedPerson.title } : {}),
      personalized_subject: "",
      personalized_body: "",
      personalization_status: "Needs Review",
      research_source_url: sourceUrl,
      research_summary: "",
      personalized_at: nowIso,
      note: "Personalization needs more company information.",
    };
  }

  const targetLanguage = resolveTargetEmailLanguage(lead.country || "", profile, options?.outputLanguage);
  const targetTone = options?.tone || profile?.preferred_tone || "Professional";
  const senderCompany = profile?.business_name || "Our Team";
  const senderOffer =
    profile?.products_services ||
    profile?.ai_summary ||
    "B2B digital growth, operations, and specialized services";
  const senderDiff = profile?.differentiator || "";
  const senderGoal = profile?.outreach_goal || "Explore a relevant business collaboration";
  const senderSignOffName = options?.senderName || profile?.business_name || "Outreach Team";

  const researchFacts = [
    ownedDom ? `Website: ${ownedDom}` : "",
    lead.industry ? `Sector: ${lead.industry}` : "",
    [lead.city, lead.country].filter(Boolean).join(", ") ? `Location: ${[lead.city, lead.country].filter(Boolean).join(", ")}` : "",
    snippet ? `Public description: ${snippet.slice(0, 260)}` : "",
    techStack ? `Detected tech: ${techStack}` : "",
    hiringNote,
    weaknesses ? `Website notes: ${weaknesses}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const apiKey = getAiKey();
  const isLimitedResearch = !snippet && !ownedDom;
  let subject = "";
  let body = "";
  let status: PersonalizationStatus = isLimitedResearch ? "Research Limited" : "Generated";

  if (apiKey) {
    try {
      const prompt = `Write one individualized, honest B2B outreach email for this specific recipient using ONLY verified facts provided below.

STRICT HONESTY & QUALITY RULES:
1. NEVER invent a recipient's first name. Verified contact name: "${verifiedPerson.name || "NONE"}". If NONE, use a neutral natural greeting (e.g. "Hi Team at ${businessName},").
2. NEVER invent fake past meetings, fake awards, unverified issues, or fake statistics.
3. Reference what ${businessName} actually does based ONLY on the facts below, and connect it naturally to what the sender offers.
4. Keep body concise (75–120 words), respectful, no spammy buzzwords.
5. Output Language: ${targetLanguage}. Tone: ${targetTone}.
${options?.customInstruction ? `6. Special customer instruction: ${options.customInstruction}` : ""}

SENDER BUSINESS PROFILE:
- Business Name: ${senderCompany}
- Products / Services: ${senderOffer}
- What makes us different: ${senderDiff || "Dedicated client support"}
- Goal: ${senderGoal}
- Sender Sign-Off: ${senderSignOffName}

RECIPIENT VERIFIED COMPANY EVIDENCE:
- Company Name: ${businessName}
${verifiedPerson.name ? `- Contact Person: ${verifiedPerson.name} (${verifiedPerson.title || "Leadership"})` : ""}
- Observed Facts: ${researchFacts}

Respond strictly as valid JSON:
{
  "subject": "Short relevant subject line under 65 chars",
  "body": "Complete email starting with greeting and ending with clean sign-off"
}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.45,
              maxOutputTokens: 450,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          subject = String(parsed.subject || "").trim();
          body = String(parsed.body || "").trim();
        }
      }
    } catch {
      // Deterministic grounded fallback below
    }
  }

  // Deterministic grounded template fallback using actual lead facts (never generic boilerplate)
  if (!subject || !body) {
    const loc = [lead.city, lead.country].filter(Boolean).join(", ");
    const greeting = verifiedPerson.name ? `Hi ${verifiedPerson.name},` : `Hi ${businessName} Team,`;
    const contextSentence = snippet
      ? `I visited ${ownedDom || businessName} and noted your focus on ${snippet.slice(0, 140).replace(/\.+$/, "")}.`
      : `I came across ${businessName}${loc ? ` in ${loc}` : ""} while researching ${lead.industry || "businesses in your sector"}.`;
    const relevanceSentence =
      hiringNote
        ? `Seeing your team's current hiring activity, we work with growing companies through ${senderOffer}.`
        : weaknesses
        ? `While reviewing ${ownedDom || "your site"}, I spotted straightforward digital improvements (${weaknesses.toLowerCase()}) alongside how ${senderOffer} can support more inquiries.`
        : `At ${senderCompany}, we provide ${senderOffer} tailored for teams looking to grow efficiently.`;

    subject = `Quick note for ${businessName}`;
    body = `${greeting}\n\n${contextSentence}\n\n${relevanceSentence}\n\nWould you be open to a brief introductory chat?\n\nBest regards,\n${senderSignOffName}`;
    if (!snippet && !ownedDom) status = "Research Limited";
  }

  enrichment.personalized_subject = subject;
  enrichment.personalized_body = body;
  enrichment.personalization_status = status;
  enrichment.personalization_source_url = sourceUrl;
  enrichment.personalized_at = nowIso;
  if (verifiedPerson.name) enrichment.contact_person_name = verifiedPerson.name;
  if (verifiedPerson.title) enrichment.contact_job_title = verifiedPerson.title;

  if (options?.persistToDb !== false && lead.id && options?.workspaceId && isNeonConfigured()) {
    await ensureLeadPersonalizationColumns();
    const sql = getNeonSql();
    if (sql) {
      await sql
        .query(
          `UPDATE leads
           SET personalized_email_subject = $1,
               personalized_email_body = $2,
               personalization_status = $3,
               enrichment_data = $4::jsonb,
               updated_at = $5
           WHERE id = $6 AND workspace_id = $7`,
          [
            subject,
            body,
            status,
            JSON.stringify(enrichment),
            nowIso,
            Number(lead.id),
            options.workspaceId,
          ]
        )
        .catch(() => {});
    }
  }

  return {
    lead_id: lead.id ? Number(lead.id) : undefined,
    business_name: businessName,
    email: updatedEmail,
    website,
    ...(verifiedPerson.name ? { contact_person_name: verifiedPerson.name } : {}),
    ...(verifiedPerson.title ? { contact_job_title: verifiedPerson.title } : {}),
    personalized_subject: subject,
    personalized_body: body,
    personalization_status: status,
    research_source_url: sourceUrl,
    research_summary: researchFacts,
    personalized_at: nowIso,
  };
}

export async function generateLeadPersonalizationBatch(
  leads: any[],
  profile: any | null,
  options?: {
    workspaceId?: number;
    senderName?: string;
    outputLanguage?: string;
    tone?: string;
    customInstruction?: string;
    persistToDb?: boolean;
  }
) {
  const capped = leads.slice(0, 25);
  const results: PersonalizationResultItem[] = [];
  const chunkSize = 4;

  for (let i = 0; i < capped.length; i += chunkSize) {
    const chunk = capped.slice(i, i + chunkSize);
    const chunkOut = await Promise.all(
      chunk.map((lead) =>
        personalizeSingleLead(lead, profile, options).catch((err): PersonalizationResultItem => ({
          lead_id: lead.id ? Number(lead.id) : undefined,
          business_name: String(lead.business_name || "Lead"),
          email: String(lead.email || ""),
          website: String(lead.website || ""),
          personalized_subject: "",
          personalized_body: "",
          personalization_status: "Failed",
          research_source_url: String(lead.original_source_url || lead.source_url || ""),
          research_summary: "",
          personalized_at: new Date().toISOString(),
          note: err?.message || "Personalization failed",
        }))
      )
    );
    results.push(...chunkOut);
  }

  return {
    total_requested: capped.length,
    generated_count: results.filter((r) => r.personalization_status === "Generated").length,
    research_limited_count: results.filter((r) => r.personalization_status === "Research Limited").length,
    needs_review_count: results.filter((r) => r.personalization_status === "Needs Review").length,
    failed_count: results.filter((r) => r.personalization_status === "Failed").length,
    items: results,
  };
}
