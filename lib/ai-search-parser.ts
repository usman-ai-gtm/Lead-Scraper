/**
 * USMAN AI GTM — AI Search Intent & Natural Language Lead Query Parser
 * Interprets natural-language descriptions, long sentences, and ideal client profiles
 * into structured B2B lead generation strategies using Gemini AI (with resilient fallback).
 */

export interface SearchIntentResult {
  raw_query: string;
  interpreted_keyword: string;
  target_business_type: string;
  industry: string;
  target_audience: string;
  detected_country: string;
  detected_city: string;
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

/**
 * Intelligent Heuristic Fallback Parser
 * Guarantees instant, zero-failure interpretation if AI model is unreachable.
 */
function heuristicSearchIntent(
  query: string,
  explicitCountry?: string,
  explicitCity?: string,
  businessProfile?: any
): SearchIntentResult {
  const qClean = query.toLowerCase();

  // 1. Detect locations from query text
  let detectedCountry = explicitCountry && explicitCountry !== "ALL COUNTRIES" && explicitCountry !== "All Countries" ? explicitCountry : "";
  let detectedCity = explicitCity && explicitCity !== "ALL_CITIES" && explicitCity !== "All Cities" ? explicitCity : "";

  const locationMap: Array<{ pattern: RegExp; city: string; country: string }> = [
    { pattern: /\b(dubai|uae|united arab emirates)\b/i, city: "Dubai", country: "United Arab Emirates" },
    { pattern: /\b(london|uk|united kingdom|england|britain)\b/i, city: "London", country: "United Kingdom" },
    { pattern: /\b(new york|nyc|united states|usa|us)\b/i, city: "New York", country: "United States" },
    { pattern: /\b(los angeles|california)\b/i, city: "Los Angeles", country: "United States" },
    { pattern: /\b(chicago|illinois)\b/i, city: "Chicago", country: "United States" },
    { pattern: /\b(toronto|canada)\b/i, city: "Toronto", country: "Canada" },
    { pattern: /\b(sydney|melbourne|australia)\b/i, city: "Sydney", country: "Australia" },
    { pattern: /\b(lahore|karachi|islamabad|pakistan)\b/i, city: "Lahore", country: "Pakistan" },
    { pattern: /\b(riyadh|saudi arabia|ksa)\b/i, city: "Riyadh", country: "Saudi Arabia" },
    { pattern: /\b(paris|france)\b/i, city: "Paris", country: "France" },
    { pattern: /\b(berlin|germany)\b/i, city: "Berlin", country: "Germany" },
  ];

  for (const loc of locationMap) {
    if (loc.pattern.test(qClean)) {
      if (!detectedCity && loc.city) detectedCity = loc.city;
      if (!detectedCountry && loc.country) detectedCountry = loc.country;
      break;
    }
  }

  // 2. Identify target business type & industry
  let targetBusinessType = "Commercial Enterprises";
  let industry = "B2B & Commercial";
  let cleanKeyword = query;

  // Remove conversational boilerplate phrases
  cleanKeyword = cleanKeyword
    .replace(/^(i need|i want|find me|find|look for|looking for|search for|give me|get me|show me)\s+/i, "")
    .replace(/\b(who need|that need|that sell|who sell|offering|looking to|in need of)\b/gi, "")
    .replace(/\b(in|near|around|located in)\s+(the\s+)?(united states|usa|us|uk|united kingdom|london|dubai|uae|canada|australia|pakistan|new york|chicago|los angeles)\b/gi, "")
    .trim();

  if (qClean.includes("furniture")) {
    targetBusinessType = "Office & Commercial Furniture Dealers";
    industry = "Furniture & Interior Architecture";
    cleanKeyword = "office furniture suppliers";
  } else if (qClean.includes("accounting") || qClean.includes("bookkeeping") || qClean.includes("financial reporting")) {
    if (businessProfile?.products_services?.toLowerCase().includes("accounting") || businessProfile?.industry?.toLowerCase().includes("accounting")) {
      targetBusinessType = "Small & Mid-Sized Businesses Needing Accounting";
      industry = "Commercial SMBs & High-Growth Startups";
      cleanKeyword = "small business owners";
    } else {
      targetBusinessType = "Accounting & CPA Firms";
      industry = "Accounting & Financial Services";
      cleanKeyword = "accounting firms";
    }
  } else if (qClean.includes("construction") || qClean.includes("contractor") || qClean.includes("builder")) {
    targetBusinessType = "Commercial & Residential General Contractors";
    industry = "Construction & Contracting";
    cleanKeyword = "construction companies";
  } else if (qClean.includes("dentist") || qClean.includes("dental") || qClean.includes("clinic")) {
    targetBusinessType = "Dental Practices & Dental Clinics";
    industry = "Healthcare & Dentistry";
    cleanKeyword = "dental clinics";
  } else if (qClean.includes("marketing") || qClean.includes("advertising") || qClean.includes("agency")) {
    targetBusinessType = "Digital Marketing & Advertising Agencies";
    industry = "Marketing & Advertising";
    cleanKeyword = "marketing agencies";
  } else if (qClean.includes("real estate") || qClean.includes("property") || qClean.includes("realtor")) {
    targetBusinessType = "Real Estate Brokerages & Agencies";
    industry = "Real Estate & Property Management";
    cleanKeyword = "real estate agencies";
  }

  // Factor in Business Profile if active
  if (businessProfile) {
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

  const locQualifier = [detectedCity, detectedCountry].filter(Boolean).join(" ");
  const baseTerm = cleanKeyword || query;

  const variations = [
    `${baseTerm} ${locQualifier}`.trim(),
    `${targetBusinessType} ${locQualifier}`.trim(),
    `${baseTerm} official website email ${locQualifier}`.trim(),
    `${baseTerm} company profile ${locQualifier}`.trim(),
    `top ${baseTerm} ${locQualifier}`.trim(),
  ];

  return {
    raw_query: query,
    interpreted_keyword: cleanKeyword || query,
    target_business_type: targetBusinessType,
    industry,
    target_audience: businessProfile?.target_customer_type || `Businesses seeking ${cleanKeyword}`,
    detected_country: detectedCountry || explicitCountry || "United States",
    detected_city: detectedCity || explicitCity || "",
    search_variations: variations,
    recommended_sources: [
      "Official Business Websites",
      "Google Organic Web Search",
      "Public Commercial Directories",
      "LinkedIn Public Company Directory"
    ],
    reasoning: `Converted natural query into structured B2B search targeting ${targetBusinessType} in ${detectedCity || detectedCountry || "global market"}.`,
    used_business_profile: Boolean(businessProfile),
  };
}

/**
 * Primary AI-Powered Search Intent Interpreter
 * Uses Gemini AI to understand natural language statements, sentences, ICPs, and target audience needs.
 */
export async function interpretSearchIntent(
  query: string,
  explicitCountry?: string,
  explicitCity?: string,
  businessProfile?: any
): Promise<SearchIntentResult> {
  const fallback = heuristicSearchIntent(query, explicitCountry, explicitCity, businessProfile);
  const apiKey = getGeminiApiKey();

  // If query is very short (1-2 simple words) and no profile used, heuristic is instant and optimal
  if ((!query || query.trim().split(/\s+/).length <= 2) && !businessProfile) {
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
- Instructions: Prioritize potential clients who NEED the user's offerings, rather than the user's direct competitors.`;
    }

    const systemPrompt = `You are the lead intelligence parser for USMAN AI GTM.
Analyze the user's lead search query (which may be a short keyword, a category, a long natural-language statement, or a detailed customer description).
${profileContext}

User Query: "${query}"
Explicit Country Filter: "${explicitCountry || "None"}"
Explicit City Filter: "${explicitCity || "None"}"

Respond strictly with valid JSON with these exact fields:
{
  "interpreted_keyword": "Short, clean 2-4 word commercial search query for search engines",
  "target_business_type": "Specific type of businesses to extract (e.g. Dental Clinics, Office Furniture Suppliers)",
  "industry": "Primary industry classification",
  "target_audience": "Specific ideal customer/prospect persona",
  "detected_country": "Country detected from query or explicit filter (e.g. United States, United Kingdom, United Arab Emirates, Pakistan)",
  "detected_city": "City detected from query or explicit filter (e.g. London, Dubai, New York, Chicago)",
  "search_variations": ["4 to 6 specific commercial keyword variations for web searching"],
  "recommended_sources": ["3 to 4 recommended platforms like Official Websites, Google Organic, LinkedIn, Directories"],
  "reasoning": "One concise sentence explaining how the search strategy targets the user's requested prospects."
}
Only output the JSON object. Do not include markdown code blocks or extra text.`;

    const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 500,
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
            return {
              raw_query: query,
              interpreted_keyword: parsed.interpreted_keyword || fallback.interpreted_keyword,
              target_business_type: parsed.target_business_type || fallback.target_business_type,
              industry: parsed.industry || fallback.industry,
              target_audience: parsed.target_audience || fallback.target_audience,
              detected_country: parsed.detected_country || fallback.detected_country,
              detected_city: parsed.detected_city || fallback.detected_city,
              search_variations: Array.isArray(parsed.search_variations) && parsed.search_variations.length > 0
                ? parsed.search_variations
                : fallback.search_variations,
              recommended_sources: Array.isArray(parsed.recommended_sources) && parsed.recommended_sources.length > 0
                ? parsed.recommended_sources
                : fallback.recommended_sources,
              reasoning: parsed.reasoning || fallback.reasoning,
              used_business_profile: Boolean(businessProfile),
            };
          }
        }
      } catch {
        // Try next model or fallback
      }
    }
  } catch {
    // Graceful fallback to heuristic
  }

  return fallback;
}
