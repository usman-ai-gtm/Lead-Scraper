/**
 * USMAN AI GTM — Smart Search Expansion Engine
 * Discovers tightly-coupled industry query variations to expand search breadth
 * without drifting into unrelated domains.
 */

export interface SearchVariation {
  query: string;
  category: string;
  rationale: string;
}

const COMMON_EXPANSIONS: Record<string, string[]> = {
  marketing: [
    "digital marketing agencies",
    "online marketing agencies",
    "seo and content agencies",
    "performance marketing companies",
    "social media marketing firms",
  ],
  realtor: [
    "real estate agencies",
    "commercial real estate brokers",
    "property management companies",
    "residential realtors",
  ],
  dentist: [
    "dental clinics",
    "cosmetic dentistry practices",
    "orthodontic specialists",
    "family dental centers",
  ],
  software: [
    "software development companies",
    "custom web app agencies",
    "saas development firms",
    "it consulting companies",
  ],
  accounting: [
    "chartered accounting firms",
    "cpa firms",
    "corporate tax consultancies",
    "bookkeeping services",
  ],
  plumbing: [
    "commercial plumbing contractors",
    "emergency plumbing services",
    "hvac and plumbing companies",
  ],
  law: [
    "corporate law firms",
    "commercial litigation attorneys",
    "business legal consultancies",
  ],
};

export async function generateSmartSearchVariations(
  keyword: string,
  targetCount: number = 5
): Promise<SearchVariation[]> {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return [];

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  // Try Gemini 3.5 Flash-Lite
  if (apiKey && apiKey.length > 10) {
    try {
      const prompt = `Generate ${targetCount} closely related, high-intent B2B search query variations for the commercial keyword: "${cleanKeyword}".
Rules:
1. ONLY return strictly relevant synonyms or specific sub-disciplines of "${cleanKeyword}".
2. NEVER drift into unrelated industries.
3. Return ONLY a valid JSON array of objects with format:
[
  {"query": "exact variation", "category": "sub-discipline", "rationale": "why this matches"}
]`;

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
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item) => ({
              query: item.query || cleanKeyword,
              category: item.category || cleanKeyword,
              rationale: item.rationale || "Semantic synonym",
            }));
          }
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Rule-based fallback
  const lower = cleanKeyword.toLowerCase();
  for (const [key, list] of Object.entries(COMMON_EXPANSIONS)) {
    if (lower.includes(key)) {
      return list.map((item) => ({
        query: item,
        category: key,
        rationale: `Targeted ${key} category synonym`,
      }));
    }
  }

  // Generic natural expansions
  return [
    { query: `${cleanKeyword} companies`, category: cleanKeyword, rationale: "Company entity modifier" },
    { query: `${cleanKeyword} agencies`, category: cleanKeyword, rationale: "Agency entity modifier" },
    { query: `${cleanKeyword} services`, category: cleanKeyword, rationale: "Service entity modifier" },
    { query: `commercial ${cleanKeyword}`, category: cleanKeyword, rationale: "Commercial sector focus" },
  ];
}

/**
 * Convenience helper returning string queries directly.
 */
export async function expandSearchQuery(
  keyword: string,
  targetCount: number = 4
): Promise<string[]> {
  const list = await generateSmartSearchVariations(keyword, targetCount);
  return list.map((item) => item.query);
}
