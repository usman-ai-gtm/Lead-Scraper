/**
 * USMAN AI GTM — Smart Search Expansion Engine
 * Discovers tightly-coupled vertical query variations without drifting or adding irrelevant "importers"/"agencies".
 */

import { classifyUseCaseIntent, LeadUseCaseId } from "@/lib/b2b-verticals";

export interface SearchVariation {
  query: string;
  category: string;
  rationale: string;
}

const VERTICAL_EXPANSIONS: Array<{ pattern: RegExp; category: string; queries: string[] }> = [
  {
    pattern: /\b(dental|dentist|orthodont)\b/i,
    category: "Healthcare / Dental",
    queries: ["dental clinics", "cosmetic dentistry practices", "family dental centers", "orthodontic clinics"],
  },
  {
    pattern: /\b(recruit|staffing|headhunt|talent acquisition)\b/i,
    category: "Staffing & Recruiting",
    queries: ["recruitment agencies", "executive search firms", "staffing agencies", "talent acquisition agencies"],
  },
  {
    pattern: /\b(commercial real estate|cre|real estate broker|property management|realtor)\b/i,
    category: "Commercial Real Estate",
    queries: ["commercial real estate brokers", "commercial property management", "CRE advisory firms", "real estate investment brokers"],
  },
  {
    pattern: /\b(manufactur|factory|industrial)\b/i,
    category: "Manufacturing & Industrial",
    queries: ["manufacturing companies", "industrial manufacturers", "contract manufacturing", "production facilities"],
  },
  {
    pattern: /\b(wholesale|distributor|supplier|importer|exporter)\b/i,
    category: "Wholesale & Distribution",
    queries: ["wholesale distributors", "B2B wholesale suppliers", "commercial distributors", "trade wholesalers"],
  },
  {
    pattern: /\b(shopify|e-?commerce|woocommerce|dtc|online store)\b/i,
    category: "E-commerce & D2C",
    queries: ["shopify stores", "ecommerce brands", "direct to consumer online stores", "woocommerce stores"],
  },
  {
    pattern: /\b(marketing|seo|advertising|branding|digital agency|smma)\b/i,
    category: "Marketing & Digital Agencies",
    queries: ["digital marketing agencies", "performance marketing agencies", "SEO agencies", "creative advertising agencies"],
  },
  {
    pattern: /\b(construct|contractor|builder|civil engineering)\b/i,
    category: "Construction & Contracting",
    queries: ["construction companies", "general contractors", "commercial building contractors", "civil engineering firms"],
  },
  {
    pattern: /\b(account|cpa|bookkeep|chartered|tax|audit)\b/i,
    category: "Accounting & Financial",
    queries: ["accounting firms", "CPA firms", "chartered accountants", "corporate tax & bookkeeping firms"],
  },
  {
    pattern: /\b(software|saas|it service|it consulting|msp|cloud)\b/i,
    category: "Software & IT",
    queries: ["software development companies", "B2B SaaS companies", "IT consulting firms", "managed IT service providers"],
  },
  {
    pattern: /\b(law|legal|attorney|solicitor)\b/i,
    category: "Legal Services",
    queries: ["corporate law firms", "commercial attorneys", "business legal practices", "solicitors"],
  },
];

export async function generateSmartSearchVariations(
  keyword: string,
  targetCount: number = 4,
  useCaseOverride?: LeadUseCaseId
): Promise<SearchVariation[]> {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return [];

  const useCase = useCaseOverride || classifyUseCaseIntent(cleanKeyword);
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (apiKey && apiKey.length > 10 && cleanKeyword.split(/\s+/).length >= 3) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const prompt = `Generate ${targetCount} tightly relevant commercial B2B search variations for: "${cleanKeyword}" (use case: ${useCase}).
Rules:
1. Keep exact business/hiring/tech-stack intent intact. Never append unrelated terms like "importers" to clinics/agencies/software.
2. Return ONLY a JSON array of objects:
[{"query": "...", "category": "...", "rationale": "..."}]`;

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 350,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, targetCount).map((item: any) => ({
              query: String(item.query || cleanKeyword).trim(),
              category: String(item.category || cleanKeyword),
              rationale: String(item.rationale || "Semantic B2B synonym"),
            }));
          }
        }
      }
    } catch {
      // Deterministic vertical fallback below
    }
  }

  for (const rule of VERTICAL_EXPANSIONS) {
    if (rule.pattern.test(cleanKeyword)) {
      return rule.queries.slice(0, targetCount).map((q) => ({
        query: q,
        category: rule.category,
        rationale: `Targeted ${rule.category} B2B query`,
      }));
    }
  }

  return [
    { query: cleanKeyword, category: useCase, rationale: "Exact search term" },
    { query: `${cleanKeyword} B2B`, category: useCase, rationale: "Commercial entity focus" },
    { query: `${cleanKeyword} official site`, category: useCase, rationale: "Direct business website discovery" },
  ].slice(0, targetCount);
}

export async function expandSearchQuery(
  keyword: string,
  targetCount: number = 4
): Promise<string[]> {
  const list = await generateSmartSearchVariations(keyword, targetCount);
  return list.map((item) => item.query);
}
