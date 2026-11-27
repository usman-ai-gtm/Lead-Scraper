/**
 * USMAN AI GTM — AI Search Intent & Natural Language Lead Query Parser
 * Interprets natural-language descriptions, B2B buying intents, hiring queries, tech-stack queries,
 * and geographic qualifiers across all 10 major B2B customer verticals.
 */

import {
  LeadUseCaseId,
  B2B_USE_CASE_PROFILES,
  classifyUseCaseIntent,
  resolveGeoSpec,
} from "@/lib/b2b-verticals";

export interface SearchIntentResult {
  raw_query: string;
  interpreted_keyword: string;
  use_case: LeadUseCaseId;
  target_business_type: string;
  industry: string;
  target_audience: string;
  detected_country: string;
  detected_city: string;
  hiring_role?: string;
  tech_stack_hint?: string;
  search_variations: string[];
  recommended_sources: string[];
  reasoning: string;
  used_business_profile?: boolean;
}

function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key || key.startsWith("your_") || key.length < 10) return null;
  return key.trim();
}

const INLINE_LOCATION_PATTERNS: Array<{ pattern: RegExp; city: string; country: string }> = [
  { pattern: /\b(new york|nyc)\b/i, city: "New York", country: "United States" },
  { pattern: /\b(los angeles|california)\b/i, city: "Los Angeles", country: "United States" },
  { pattern: /\b(chicago|illinois)\b/i, city: "Chicago", country: "United States" },
  { pattern: /\b(texas|houston|dallas|austin)\b/i, city: "Texas", country: "United States" },
  { pattern: /\b(miami|florida)\b/i, city: "Miami", country: "United States" },
  { pattern: /\b(united states|u\.s\.a\.|usa|u\.s\.)\b/i, city: "", country: "United States" },
  { pattern: /\b(london)\b/i, city: "London", country: "United Kingdom" },
  { pattern: /\b(manchester|birmingham|united kingdom|uk|britain|england)\b/i, city: "", country: "United Kingdom" },
  { pattern: /\b(toronto|vancouver|montreal|canada)\b/i, city: "", country: "Canada" },
  { pattern: /\b(sydney|melbourne|brisbane|australia)\b/i, city: "", country: "Australia" },
  { pattern: /\b(dubai|abu dhabi|sharjah|uae|united arab emirates)\b/i, city: "Dubai", country: "United Arab Emirates" },
  { pattern: /\b(berlin|munich|hamburg|frankfurt|germany|deutschland)\b/i, city: "", country: "Germany" },
  { pattern: /\b(karachi|lahore|islamabad|pakistan)\b/i, city: "", country: "Pakistan" },
  { pattern: /\b(mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|pune|india)\b/i, city: "", country: "India" },
  { pattern: /\b(riyadh|jeddah|saudi arabia|ksa)\b/i, city: "", country: "Saudi Arabia" },
  { pattern: /\b(singapore)\b/i, city: "Singapore", country: "Singapore" },
  { pattern: /\b(paris|france)\b/i, city: "Paris", country: "France" },
];

function stripGeoBoilerplate(raw: string): string {
  return raw
    .replace(/^(i need|i want|find me|find|look for|looking for|search for|give me|get me|show me)\s+/i, "")
    .replace(/\b(who need|that need|that sell|who sell|looking to)\b/gi, "")
    .replace(
      /\b(?:in|near|around|across|within|located in|based in)\s+(?:the\s+)?(?:united states|u\.s\.a\.|usa|us|united kingdom|uk|england|britain|london|dubai|uae|united arab emirates|canada|toronto|vancouver|australia|sydney|melbourne|germany|berlin|munich|pakistan|karachi|lahore|islamabad|india|mumbai|delhi|bangalore|texas|houston|dallas|austin|new york|nyc|los angeles|chicago|florida|miami|saudi arabia|riyadh|france|paris|singapore)\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractHiringRole(raw: string): string {
  const m = raw.match(/\b(?:hiring|recruiting|looking for|seeking|open roles? for)\s+(?:a\s+|an\s+|for\s+)?([a-zA-Z0-9\s/-]{3,40}?)(?:\s+(?:in|at|across|near|for|with)\b|$)/i);
  if (!m?.[1]) return "";
  return m[1]
    .replace(/\b(right now|currently|today|urgently)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function heuristicSearchIntent(
  query: string,
  explicitCountry?: string,
  explicitCity?: string,
  businessProfile?: any,
  explicitFocus?: string
): SearchIntentResult {
  const qClean = query.toLowerCase();
  const explicitGeo = resolveGeoSpec(explicitCountry, explicitCity);

  let detectedCountry = explicitGeo.countryName !== "Global" ? explicitGeo.countryName : "";
  let detectedCity = explicitGeo.cityName;

  for (const loc of INLINE_LOCATION_PATTERNS) {
    if (loc.pattern.test(qClean)) {
      if (!detectedCity && loc.city) detectedCity = loc.city;
      if (!detectedCountry && loc.country) detectedCountry = loc.country;
      break;
    }
  }

  const useCase = classifyUseCaseIntent(query, explicitFocus);
  const profileMeta = B2B_USE_CASE_PROFILES[useCase];

  let cleanKeyword = stripGeoBoilerplate(query) || query.trim();
  let targetBusinessType = profileMeta.label;
  let industry = "B2B & Commercial";
  let hiringRole = "";
  let techStackHint = "";

  if (useCase === "hiring_signals") {
    hiringRole = extractHiringRole(query) || cleanKeyword.replace(/\b(companies|firms|businesses|hiring)\b/gi, "").trim() || "specialists";
    targetBusinessType = `Companies Actively Hiring (${hiringRole})`;
    industry = "Active Hiring & Talent Demand";
    cleanKeyword = hiringRole;
  } else if (useCase === "ecommerce_shopify") {
    techStackHint = qClean.includes("woo") ? "WooCommerce" : "Shopify";
    targetBusinessType = `${techStackHint} E-commerce Brands & Online Stores`;
    industry = "E-commerce & Online Retail";
  } else if (useCase === "commercial_real_estate") {
    targetBusinessType = "Commercial Real Estate Brokers & Property Firms";
    industry = "Commercial Real Estate";
  } else if (useCase === "decision_makers") {
    targetBusinessType = "B2B Decision Makers & Company Leadership";
    industry = "Executive & B2B Decision Makers";
  } else if (useCase === "wholesale_manufacturing") {
    targetBusinessType = "Manufacturers, Wholesalers & Industrial Distributors";
    industry = "Wholesale & Manufacturing";
  } else if (useCase === "finance_accounting") {
    if (
      businessProfile?.industry?.toLowerCase().includes("accounting") &&
      qClean.includes("need")
    ) {
      targetBusinessType = "SMBs Needing Accounting & Tax Services";
      industry = "Commercial SMBs";
    } else {
      targetBusinessType = "Accounting, CPA & Financial Advisory Firms";
      industry = "Accounting & Finance";
    }
  } else if (useCase === "agency_web_audit") {
    targetBusinessType = "Marketing, SEO & Digital Agencies";
    industry = "Marketing & Advertising";
  } else if (useCase === "software_it") {
    targetBusinessType = "Software, SaaS & IT Consulting Companies";
    industry = "Software & IT Services";
  } else if (useCase === "local_services") {
    industry = qClean.includes("dental") || qClean.includes("dentist")
      ? "Healthcare & Dentistry"
      : qClean.includes("construct") || qClean.includes("contract")
      ? "Construction & Engineering"
      : qClean.includes("recruit") || qClean.includes("staffing")
      ? "Staffing & Recruiting"
      : "Local Services & Clinics";
    targetBusinessType = cleanKeyword || industry;
  } else if (qClean.includes("recruit") || qClean.includes("staffing")) {
    targetBusinessType = "Recruitment & Staffing Agencies";
    industry = "Staffing & Recruiting";
  } else if (qClean.includes("furniture")) {
    targetBusinessType = "Office & Commercial Furniture Dealers";
    industry = "Furniture & Interior Architecture";
    cleanKeyword = "office furniture suppliers";
  }

  if (businessProfile && useCase === "general_b2b") {
    if (businessProfile.target_customer_type) {
      targetBusinessType = `${businessProfile.target_customer_type} relevant to ${businessProfile.business_name || "client offerings"}`;
    }
    if (businessProfile.ideal_industries) {
      industry = businessProfile.ideal_industries;
    }
    if (!detectedCountry && businessProfile.country) {
      detectedCountry = businessProfile.country;
    }
    if (!detectedCity && businessProfile.city) {
      detectedCity = businessProfile.city;
    }
  }

  const baseTerm = cleanKeyword || query.trim();
  const variations: string[] = [];

  if (useCase === "hiring_signals") {
    variations.push(
      `companies hiring ${baseTerm}`,
      `hiring ${baseTerm} careers`,
      `${baseTerm} job opening careers email`
    );
  } else if (useCase === "ecommerce_shopify") {
    variations.push(
      baseTerm,
      `${baseTerm} "powered by shopify"`,
      `${baseTerm} online store contact`
    );
  } else {
    variations.push(
      baseTerm,
      `${baseTerm} ${profileMeta.queryHint}`.trim(),
      `${targetBusinessType}`.trim()
    );
  }

  return {
    raw_query: query,
    interpreted_keyword: baseTerm,
    use_case: useCase,
    target_business_type: targetBusinessType,
    industry,
    target_audience: businessProfile?.target_customer_type || `Commercial prospects for ${baseTerm}`,
    detected_country: detectedCountry || explicitCountry || "United States",
    detected_city: detectedCity || explicitCity || "",
    ...(hiringRole ? { hiring_role: hiringRole } : {}),
    ...(techStackHint ? { tech_stack_hint: techStackHint } : {}),
    search_variations: Array.from(new Set(variations)).slice(0, 5),
    recommended_sources: profileMeta.defaultChannelIds,
    reasoning: `Targeted ${profileMeta.label} strategy matching "${baseTerm}" in ${[detectedCity, detectedCountry].filter(Boolean).join(", ") || "selected region"}.`,
    used_business_profile: Boolean(businessProfile),
  };
}

/**
 * Primary AI-Powered Search Intent Interpreter
 */
export async function interpretSearchIntent(
  query: string,
  explicitCountry?: string,
  explicitCity?: string,
  businessProfile?: any,
  explicitFocus?: string
): Promise<SearchIntentResult> {
  const fallback = heuristicSearchIntent(query, explicitCountry, explicitCity, businessProfile, explicitFocus);
  const apiKey = getGeminiApiKey();

  // Short clear queries work fastest and most deterministically via vertical classifier
  const wordCount = (query || "").trim().split(/\s+/).filter(Boolean).length;
  if ((!query || wordCount <= 3) && !businessProfile) {
    return fallback;
  }

  if (!apiKey) {
    return fallback;
  }

  try {
    let profileContext = "";
    if (businessProfile) {
      profileContext = `
USER'S SAVED BUSINESS PROFILE:
- Business Name: ${businessProfile.business_name || "N/A"}
- Industry: ${businessProfile.industry || "N/A"}
- Offerings/Services: ${businessProfile.products_services || "N/A"}
- Ideal Customer Profile: ${businessProfile.target_customer_type || "N/A"}
- Target Industries: ${businessProfile.ideal_industries || "N/A"}
- Preferred Locations: ${businessProfile.preferred_locations || businessProfile.country || "N/A"}
- Instructions: Prioritize potential buyers who NEED the user's offerings rather than direct competitors unless user explicitly requested competitors.`;
    }

    const validUseCases = Object.keys(B2B_USE_CASE_PROFILES).join(", ");
    const systemPrompt = `You are the B2B search intent parser for USMAN AI GTM.
Analyze the user's lead generation query and classify it cleanly. Do NOT add unrelated words like "importers" to clinics, agencies, software firms, or hiring queries.
${profileContext}

User Query: "${query}"
Explicit Country Filter: "${explicitCountry || "None"}"
Explicit City Filter: "${explicitCity || "None"}"
Explicit Focus Override: "${explicitFocus || "auto"}"
Allowed use_case values: ${validUseCases}

Respond strictly with valid JSON:
{
  "interpreted_keyword": "Clean core subject without filler words or country name (2-5 words, e.g. 'dental clinics', 'accountant', 'shopify stores', 'commercial real estate brokers')",
  "use_case": "One exact value from allowed use_case list",
  "target_business_type": "Specific type of businesses to find",
  "industry": "Primary industry classification",
  "target_audience": "Specific ideal prospect persona",
  "detected_country": "Country from query or explicit filter",
  "detected_city": "City/State from query or explicit filter, empty string if none",
  "hiring_role": "If use_case is hiring_signals, exact role being hired, else empty string",
  "tech_stack_hint": "If looking for Shopify/WooCommerce/WordPress etc, platform name, else empty string",
  "search_variations": ["3 to 5 tightly relevant B2B search phrases"],
  "reasoning": "One concise sentence explaining the targeting logic."
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3800);

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 450,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const resolvedUseCase =
          explicitFocus && explicitFocus !== "auto"
            ? fallback.use_case
            : ((parsed.use_case as LeadUseCaseId) in B2B_USE_CASE_PROFILES
                ? (parsed.use_case as LeadUseCaseId)
                : fallback.use_case);

        return {
          raw_query: query,
          interpreted_keyword: parsed.interpreted_keyword || fallback.interpreted_keyword,
          use_case: resolvedUseCase,
          target_business_type: parsed.target_business_type || fallback.target_business_type,
          industry: parsed.industry || fallback.industry,
          target_audience: parsed.target_audience || fallback.target_audience,
          detected_country: parsed.detected_country || fallback.detected_country,
          detected_city: parsed.detected_city ?? fallback.detected_city,
          ...(parsed.hiring_role || fallback.hiring_role
            ? { hiring_role: parsed.hiring_role || fallback.hiring_role }
            : {}),
          ...(parsed.tech_stack_hint || fallback.tech_stack_hint
            ? { tech_stack_hint: parsed.tech_stack_hint || fallback.tech_stack_hint }
            : {}),
          search_variations:
            Array.isArray(parsed.search_variations) && parsed.search_variations.length > 0
              ? parsed.search_variations
              : fallback.search_variations,
          recommended_sources: B2B_USE_CASE_PROFILES[resolvedUseCase].defaultChannelIds,
          reasoning: parsed.reasoning || fallback.reasoning,
          used_business_profile: Boolean(businessProfile),
        };
      }
    }
  } catch {
    // Graceful instant fallback
  }

  return fallback;
}
