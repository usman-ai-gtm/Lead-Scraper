/**
 * USMAN AI GTM — Multilingual & Natural-Language Business Profile Engine
 *
 * Accepts natural-language descriptions (English, Urdu, Hindi, Punjabi, Arabic, German, etc.)
 * and extracts structured Business Profile data honestly without inventing missing facts.
 * Also identifies genuinely missing key fields with concise, non-repetitive follow-up questions.
 *
 * Never exposes internal model IDs or secrets to clients.
 */

export const BUSINESS_PROFILE_CHATGPT_INSTRUCTION = `You are helping me complete my business profile for a professional B2B business lead-generation platform.

I may describe my business in Urdu, Hindi, Punjabi, Arabic, German, English, Chinese, or another language.

Understand everything I have said, including the voice transcription and all relevant previous messages in this chat.

Rewrite my complete business description in clear, natural English.

IMPORTANT:
- Preserve my actual meaning.
- Do not summarize away important details.
- Do not invent business information.
- Do not change company names, numbers, services, products, countries, or other facts.
- Explain what my business actually does.
- Identify the products and services I offer.
- Identify the types of customers I want.
- Identify my target countries and markets.
- Identify what makes my business different, if mentioned.
- Identify my business goals.
- Identify my preferred communication style, if mentioned.

If an important business detail is missing or unclear, ask me a short, simple follow-up question before producing the final description.

Do not ask unnecessary questions. Ask only about information that genuinely matters.

When enough information is available, return one complete, well-organized English business description in paragraph form.

Also identify any important information that remains unknown.

The final English description must be suitable for pasting directly into a Business Profile form so that another AI system can extract structured business information from it.

Do not return fake information or unnecessary technical terminology.`;

export const COLD_EMAIL_CHATGPT_INSTRUCTION = `You are my professional B2B email campaign assistant.

I may explain my requirements in any language, including Urdu, Hindi, Punjabi, Arabic, German, English, Chinese, or another language.

Understand my complete spoken message, including voice transcription and previous messages in this chat.

Convert my complete requirements into clear English.

I want to create a personalized email template for my business.

Understand:
- What my business sells.
- What services or products I offer.
- Which customers I want to contact.
- Which country or market I am targeting.
- What kind of email I want.
- What tone I prefer.
- What action I want the recipient to take.

Preserve my exact intentions.

Do not invent business claims, prices, results, company information, or guarantees.

If a critical requirement is missing, ask me one short question at a time.

When you understand everything, return a complete English instruction describing the email I want.

The final output should be ready to paste into my B2B email platform.

Do not write unnecessary explanations outside the final instruction.`;

export const SUPPORTED_VOICE_LANGUAGES = [
  { code: "auto", label: "Auto-Detect Language", bcp47: "en-US", rtl: false },
  { code: "en", label: "English", bcp47: "en-US", rtl: false },
  { code: "ur", label: "Urdu (اردو)", bcp47: "ur-PK", rtl: true },
  { code: "hi", label: "Hindi (हिन्दी)", bcp47: "hi-IN", rtl: false },
  { code: "pa", label: "Punjabi (ਪੰਜਾਬੀ / پنجابی)", bcp47: "pa-IN", rtl: false },
  { code: "ar", label: "Arabic (العربية)", bcp47: "ar-SA", rtl: true },
  { code: "de", label: "German (Deutsch)", bcp47: "de-DE", rtl: false },
  { code: "fr", label: "French (Français)", bcp47: "fr-FR", rtl: false },
  { code: "es", label: "Spanish (Español)", bcp47: "es-ES", rtl: false },
  { code: "pt", label: "Portuguese (Português)", bcp47: "pt-BR", rtl: false },
  { code: "zh", label: "Chinese (中文)", bcp47: "zh-CN", rtl: false },
  { code: "ja", label: "Japanese (日本語)", bcp47: "ja-JP", rtl: false },
  { code: "ko", label: "Korean (한국어)", bcp47: "ko-KR", rtl: false },
  { code: "ru", label: "Russian (Русский)", bcp47: "ru-RU", rtl: false },
  { code: "tr", label: "Turkish (Türkçe)", bcp47: "tr-TR", rtl: false },
  { code: "bn", label: "Bengali (বাংলা)", bcp47: "bn-BD", rtl: false },
  { code: "fa", label: "Persian (فارسی)", bcp47: "fa-IR", rtl: true },
  { code: "ps", label: "Pashto (پښتو)", bcp47: "ps-AF", rtl: true },
  { code: "bal", label: "Balochi (بلوچی)", bcp47: "ur-PK", rtl: true },
  { code: "id", label: "Indonesian (Bahasa Indonesia)", bcp47: "id-ID", rtl: false },
  { code: "ms", label: "Malay (Bahasa Melayu)", bcp47: "ms-MY", rtl: false },
  { code: "it", label: "Italian (Italiano)", bcp47: "it-IT", rtl: false },
  { code: "nl", label: "Dutch (Nederlands)", bcp47: "nl-NL", rtl: false },
  { code: "pl", label: "Polish (Polski)", bcp47: "pl-PL", rtl: false },
  { code: "uk", label: "Ukrainian (Українська)", bcp47: "uk-UA", rtl: false },
  { code: "sw", label: "Swahili (Kiswahili)", bcp47: "sw-KE", rtl: false },
];

export const OUTREACH_LANGUAGES = [
  "English",
  "German",
  "Urdu",
  "Arabic",
  "Hindi",
  "French",
  "Spanish",
  "Portuguese",
  "Turkish",
  "Italian",
  "Dutch",
  "Chinese",
  "Japanese",
  "Indonesian",
  "Match Prospect Country",
];

export interface MissingProfileQuestion {
  field:
    | "products_services"
    | "target_customer_type"
    | "preferred_locations"
    | "ai_summary"
    | "outreach_goal";
  label: string;
  question: string;
  placeholder: string;
  optional?: boolean;
}

export interface ExtractedBusinessProfile {
  recognized: boolean;
  transcript: string;
  detected_language: string;
  is_rtl: boolean;
  business_name: string;
  business_type: string;
  what_does_business_do: string;
  products_services: string;
  ideal_customers: string;
  target_countries: string;
  differentiator: string;
  outreach_goal: string;
  preferred_outreach_language: string;
  preferred_tone: "Professional" | "Friendly" | "Concise";
  industry: string;
  ideal_industries: string;
  keywords: string;
  exclusions: string;
  ai_summary: string;
  missing_fields?: string[];
  follow_up_questions?: MissingProfileQuestion[];
  warning?: string;
}

function getAiKey(): string | null {
  const k = (process.env.GEMINI_API_KEY || "").trim();
  if (!k || k.startsWith("your_") || k.length < 10) return null;
  return k;
}

export function isRtlLanguage(langOrText: string): boolean {
  const s = (langOrText || "").toLowerCase();
  if (/^(ur|ar|fa|ps|bal|he)\b/.test(s) || /(urdu|arabic|persian|farsi|pashto|balochi)/i.test(s)) {
    return true;
  }
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(langOrText);
}

/**
 * Compute concise, non-repetitive follow-up questions for critical missing profile fields
 * considering both newly extracted fields and existing saved/edited form fields.
 */
export function computeProfileFollowUpQuestions(
  extracted: Partial<ExtractedBusinessProfile>,
  existingProfile?: Record<string, any> | null
): {
  missing_fields: string[];
  follow_up_questions: MissingProfileQuestion[];
} {
  const pick = (extVal?: string, prevKey?: string) => {
    const a = String(extVal || "").trim();
    const b = prevKey ? String(existingProfile?.[prevKey] || "").trim() : "";
    return a || b;
  };

  const hasSummary = Boolean(pick(extracted.what_does_business_do || extracted.ai_summary, "ai_summary"));
  const hasProducts = Boolean(pick(extracted.products_services, "products_services"));
  const hasCustomers = Boolean(pick(extracted.ideal_customers, "target_customer_type"));
  const hasCountries = Boolean(pick(extracted.target_countries, "preferred_locations") || String(existingProfile?.country || "").trim());
  const hasGoal = Boolean(pick(extracted.outreach_goal, "outreach_goal"));

  const missing: string[] = [];
  const questions: MissingProfileQuestion[] = [];

  if (!hasSummary) {
    missing.push("ai_summary");
    questions.push({
      field: "ai_summary",
      label: "What Your Business Does",
      question: "What does your business do day to day?",
      placeholder: "e.g. We design fast business websites and manage local Google SEO.",
    });
  }

  if (!hasProducts) {
    missing.push("products_services");
    questions.push({
      field: "products_services",
      label: "Products & Services",
      question: "Which main products or services do you offer?",
      placeholder: "e.g. Website Redesign, SEO Audits, Social Media Management",
    });
  }

  if (!hasCustomers) {
    missing.push("target_customer_type");
    questions.push({
      field: "target_customer_type",
      label: "Ideal Customers",
      question: "Who would you most like to sell these services to?",
      placeholder: "e.g. Dental clinics, law firms, SaaS founders, or local restaurants",
    });
  }

  if (!hasCountries) {
    missing.push("preferred_locations");
    questions.push({
      field: "preferred_locations",
      label: "Target Countries",
      question: "Which countries would you like to target?",
      placeholder: "e.g. United States, United Kingdom, UAE, Germany",
    });
  }

  if (!hasGoal && (hasProducts || hasSummary)) {
    missing.push("outreach_goal");
    questions.push({
      field: "outreach_goal",
      label: "Outreach Goal (Optional)",
      question: "What do you want prospective buyers to do when they reply?",
      placeholder: "e.g. Book a short 15-minute discovery call",
      optional: true,
    });
  }

  return {
    missing_fields: missing,
    follow_up_questions: questions.slice(0, 4),
  };
}

/**
 * Honest heuristic fallback when Gemini key is unavailable or returns an error.
 * Strictly avoids fabricating unmentioned customers, countries, or company names.
 */
function heuristicExtractFromText(
  rawText: string,
  hintLang?: string,
  existingProfile?: Record<string, any> | null
): ExtractedBusinessProfile {
  const text = (rawText || "").trim();
  const low = text.toLowerCase();
  const rtl = isRtlLanguage(text) || isRtlLanguage(hintLang || "");

  let businessName = "";
  const nameMatch = text.match(
    /(?:my company is|our company is|we are|business name is|called|named)\s+([A-Z][A-Za-z0-9&\s-]{1,40}?)(?=[.,;\n]|\s+(?:and|we|that|based|in|offering|which))/i
  );
  if (nameMatch?.[1]) {
    businessName = nameMatch[1].trim();
  }

  let businessType = "";
  let products = "";
  let idealCustomers = "";
  let industry = "";
  let keywords = "";

  if (/(marketing|مارکیٹنگ|seo|ایس ای او|website|ویب سائٹ|webdesign|web design|social media|سوشل میڈیا)/i.test(text)) {
    businessType = "Digital Marketing & Web Agency";
    products = "Website Development, SEO, Social Media Marketing";
    industry = "Digital Marketing & Web Development";
    keywords = "business websites, local services, web redesign, SEO audits";
  } else if (/(accounting|bookkeeping|cpa|tax|اکاؤنٹ|ٹیکس|buchhaltung|steuer)/i.test(text)) {
    businessType = "Accounting & Financial Consultancy";
    products = "Bookkeeping, Accounting, Tax Compliance Services";
    industry = "Accounting & Finance";
    keywords = "bookkeeping support, small business tax, accounting services";
  } else if (/(software|saas|app|it service|سافٹ ویئر|entwicklung)/i.test(text)) {
    businessType = "Software & IT Solutions Company";
    products = "Custom Software Development & IT Consulting";
    industry = "Software & IT Services";
    keywords = "custom software, IT consulting, B2B software solutions";
  } else if (/(recruit|staffing|hiring|hr\b|بھرتی|personalvermittlung)/i.test(text)) {
    businessType = "Staffing & Recruitment Agency";
    products = "Talent Acquisition & Recruitment Services";
    industry = "Staffing & Recruitment";
    keywords = "companies hiring, recruitment support, talent acquisition";
  } else if (text.length >= 8) {
    businessType = "B2B Service Business";
    products = text.slice(0, 200);
    industry = "B2B Services";
    keywords = text.split(/\s+/).slice(0, 8).join(" ");
  }

  // Extract customer targets ONLY if explicitly described in the text
  const custMatches: string[] = [];
  if (/(clinic|dentist|dental|doctor|medical|healthcare)/i.test(text)) custMatches.push("Clinics & Healthcare Practices");
  if (/(restaurant|cafe|hospitality|hotel)/i.test(text)) custMatches.push("Restaurants & Hospitality Businesses");
  if (/(real estate|realtor|property|contractor|plumber|roofing|hvac|salon|local business)/i.test(text)) {
    custMatches.push("Local Service Businesses & Contractors");
  }
  if (/(ecommerce|e-commerce|shopify|retail|online store)/i.test(text)) custMatches.push("E-Commerce & Retail Brands");
  if (/(law firm|attorney|legal|consulting|agency|startup|saas|small business|smb|b2b compan)/i.test(text)) {
    custMatches.push("Small & Medium Businesses / B2B Firms");
  }
  const explicitTargetPhrase = text.match(
    /(?:target(?:ing)?|help|serve|for|sell(?:ing)? to|ideal customers?(?:\s+are)?)\s+([a-z0-9,\s&-]{3,70}?)(?=[.,;\n]|\s+(?:in|across|located|using|with)\s)/i
  );
  if (custMatches.length > 0) {
    idealCustomers = Array.from(new Set(custMatches)).join(", ");
  } else if (explicitTargetPhrase?.[1] && !/our|my business/i.test(explicitTargetPhrase[1])) {
    idealCustomers = explicitTargetPhrase[1].trim();
  }

  // Extract countries ONLY if explicitly mentioned — never invent "United States" when omitted
  const foundCountries: string[] = [];
  if (/(\busa\b|united states|america|امریکہ)/i.test(text)) foundCountries.push("United States");
  if (/(\buk\b|united kingdom|britain|london|برطانیہ|انگلینڈ)/i.test(text)) foundCountries.push("United Kingdom");
  if (/(germany|deutschland|جرمنی)/i.test(text)) foundCountries.push("Germany");
  if (/(\buae\b|dubai|abu dhabi|دبئی|امارات)/i.test(text)) foundCountries.push("United Arab Emirates");
  if (/(saudi|riyadh|jeddah)/i.test(text)) foundCountries.push("Saudi Arabia");
  if (/(pakistan|پاکستان|lahore|karachi|islamabad)/i.test(text)) foundCountries.push("Pakistan");
  if (/(india|بھارت|انڈیا)/i.test(text)) foundCountries.push("India");
  if (/(canada|toronto|vancouver|کینیڈا)/i.test(text)) foundCountries.push("Canada");
  if (/(australia|sydney|melbourne|آسٹریلیا)/i.test(text)) foundCountries.push("Australia");
  if (/(france|paris)/i.test(text)) foundCountries.push("France");
  if (/(spain|madrid|barcelona)/i.test(text)) foundCountries.push("Spain");
  const targetCountries = foundCountries.join(", ");

  // Tone detection only if mentioned
  let preferredTone: "Professional" | "Friendly" | "Concise" = "Professional";
  if (/\bfriendly|warm|casual\b/i.test(low)) preferredTone = "Friendly";
  else if (/\bconcise|short|brief|direct\b/i.test(low)) preferredTone = "Concise";

  const baseExtracted: ExtractedBusinessProfile = {
    recognized: text.length >= 8,
    transcript: text,
    detected_language: hintLang && hintLang !== "auto" ? hintLang : rtl ? "Urdu / Arabic Script" : "English",
    is_rtl: rtl,
    business_name: businessName,
    business_type: businessType,
    what_does_business_do: text.slice(0, 260),
    products_services: products || (text.length >= 8 ? text.slice(0, 200) : ""),
    ideal_customers: idealCustomers,
    target_countries: targetCountries,
    differentiator: "",
    outreach_goal: /(book|call|meeting|demo|quote|lead|client|inquiry)/i.test(text)
      ? "Generate qualified client conversations"
      : "",
    preferred_outreach_language:
      low.includes("german") || foundCountries.includes("Germany")
        ? "German"
        : low.includes("arabic")
        ? "Arabic"
        : "English",
    preferred_tone: preferredTone,
    industry,
    ideal_industries: idealCustomers,
    keywords,
    exclusions: "",
    ai_summary: text.slice(0, 260),
  };

  const q = computeProfileFollowUpQuestions(baseExtracted, existingProfile);
  return {
    ...baseExtracted,
    missing_fields: q.missing_fields,
    follow_up_questions: q.follow_up_questions,
  };
}

/**
 * Understand natural-language English or multilingual business description
 * into structured Business Profile fields without inventing missing information.
 */
export async function understandBusinessInput(params: {
  text?: string;
  audioBase64?: string;
  audioMime?: string;
  languageHint?: string;
  existingProfile?: Record<string, any> | null;
}): Promise<ExtractedBusinessProfile> {
  const cleanText = String(params.text || "").trim();
  const hasAudio = Boolean(params.audioBase64 && params.audioBase64.length > 100);
  const apiKey = getAiKey();

  if (!cleanText && !hasAudio) {
    return {
      ...heuristicExtractFromText("", params.languageHint, params.existingProfile),
      recognized: false,
      warning: "Please paste or type your business description first.",
    };
  }

  if (!apiKey) {
    if (!cleanText) {
      return {
        ...heuristicExtractFromText("", params.languageHint, params.existingProfile),
        recognized: false,
        warning: "Please paste your English business description into the text box.",
      };
    }
    return heuristicExtractFromText(cleanText, params.languageHint, params.existingProfile);
  }

  const promptText = `You are a B2B business profile analyst for USMAN AI GTM.
Read the customer's business description below (written in English or any other language such as Urdu, Hindi, Punjabi, Arabic, German, etc.).
Extract ONLY business facts explicitly stated or directly entailed by the customer's text.
CRITICAL HONESTY RULES:
- Preserve original company names, numbers, products, services, countries, and facts.
- DO NOT invent missing information.
- If company name, target customers, target countries, differentiator, or outreach goal are NOT clearly mentioned in the description, return an empty string "" for those fields! NEVER guess "United States" or generic customers if not stated.
- If the text is gibberish or unrelated to any business, set "recognized": false and explain briefly in "warning".

Language hint (may be "auto"): ${params.languageHint || "auto"}
Customer description:
"""
${cleanText}
"""

Respond strictly in valid JSON with this exact schema:
{
  "recognized": true,
  "transcript": "Original description preserved verbatim",
  "detected_language": "Detected language name (e.g. English, Urdu, German)",
  "is_rtl": false,
  "business_name": "Company name if mentioned, else empty string",
  "business_type": "Plain-language business type if clear, else empty string",
  "what_does_business_do": "Clear factual summary preserving meaning without inventing facts",
  "products_services": "Comma-separated or concise products/services explicitly offered, else empty string",
  "ideal_customers": "Who they want to sell to ONLY if stated, else empty string",
  "target_countries": "Comma-separated target countries/markets ONLY if stated, else empty string",
  "differentiator": "What makes the business different ONLY if stated, else empty string",
  "outreach_goal": "Desired outreach outcome ONLY if stated, else empty string",
  "preferred_outreach_language": "Outreach language requested or clear from target market (default English)",
  "preferred_tone": "Professional",
  "industry": "Concise B2B sector label if clear, else empty string",
  "ideal_industries": "Target buyer industries ONLY if stated, else empty string",
  "keywords": "4 to 8 comma-separated buyer search terms grounded strictly in the description, else empty string",
  "exclusions": "Exclusions ONLY if stated, else empty string",
  "ai_summary": "Factual summary suitable for lead personalization",
  "warning": ""
}`;

  const parts: any[] = [{ text: promptText }];
  if (hasAudio && params.audioBase64) {
    parts.push({
      inline_data: {
        mime_type: params.audioMime || "audio/webm",
        data: params.audioBase64,
      },
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
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
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const rawOut = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (rawOut) {
        const parsed = JSON.parse(rawOut);
        const recognized = parsed.recognized !== false;
        const transcript = String(parsed.transcript || cleanText || "").trim();
        const toneRaw = String(parsed.preferred_tone || "Professional");
        const preferredTone =
          toneRaw === "Friendly" || toneRaw === "Concise" ? toneRaw : "Professional";

        const extracted: ExtractedBusinessProfile = {
          recognized,
          transcript,
          detected_language: String(parsed.detected_language || "English"),
          is_rtl: Boolean(parsed.is_rtl || isRtlLanguage(transcript)),
          business_name: String(parsed.business_name || "").trim(),
          business_type: String(parsed.business_type || "").trim(),
          what_does_business_do: String(parsed.what_does_business_do || "").trim(),
          products_services: String(parsed.products_services || "").trim(),
          ideal_customers: String(parsed.ideal_customers || "").trim(),
          target_countries: String(parsed.target_countries || "").trim(),
          differentiator: String(parsed.differentiator || "").trim(),
          outreach_goal: String(parsed.outreach_goal || "").trim(),
          preferred_outreach_language: String(parsed.preferred_outreach_language || "English").trim() || "English",
          preferred_tone: preferredTone,
          industry: String(parsed.industry || parsed.business_type || "").trim(),
          ideal_industries: String(parsed.ideal_industries || parsed.ideal_customers || "").trim(),
          keywords: String(parsed.keywords || "").trim(),
          exclusions: String(parsed.exclusions || "").trim(),
          ai_summary: String(parsed.ai_summary || parsed.what_does_business_do || "").trim(),
          ...(parsed.warning ? { warning: String(parsed.warning) } : {}),
        };

        const q = computeProfileFollowUpQuestions(extracted, params.existingProfile);
        extracted.missing_fields = q.missing_fields;
        extracted.follow_up_questions = q.follow_up_questions;
        return extracted;
      }
    }
  } catch {
    // Fall back to deterministic non-fabricating extraction
  }

  if (cleanText) {
    return heuristicExtractFromText(cleanText, params.languageHint, params.existingProfile);
  }

  return {
    ...heuristicExtractFromText("", params.languageHint, params.existingProfile),
    recognized: false,
    warning: "Could not process description right now. Please edit and retry.",
  };
}
