/**
 * USMAN AI GTM — Multilingual Voice & Natural-Language Business Profile Engine
 *
 * Accepts typed natural descriptions OR recorded browser audio across international languages
 * (Urdu, Hindi, Punjabi, Arabic, German, French, Spanish, English, Persian, Pashto, Balochi, Turkish, etc.)
 * and extracts clean structured Business Profile data for user confirmation.
 *
 * Never exposes internal model IDs or secrets to clients.
 */

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
  // Internal search & matching enrichment (optional advanced fields)
  industry: string;
  ideal_industries: string;
  keywords: string;
  exclusions: string;
  ai_summary: string;
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

function heuristicExtractFromText(rawText: string, hintLang?: string): ExtractedBusinessProfile {
  const text = (rawText || "").trim();
  const low = text.toLowerCase();
  const rtl = isRtlLanguage(text) || isRtlLanguage(hintLang || "");

  let businessType = "";
  let products = "";
  let idealCustomers = "";
  let targetCountries = "";
  let industry = "";
  let keywords = "";

  if (/(marketing|مارکیٹنگ|seo|ایس ای او|website|ویب سائٹ|webdesign|web design|social media|سوشل میڈیا)/i.test(text)) {
    businessType = "Digital Marketing & Web Agency";
    products = "Website Development, SEO, Social Media Marketing";
    idealCustomers = "Small and medium businesses seeking stronger digital presence";
    industry = "Digital Marketing & Web Development";
    keywords = "small business websites, local businesses, companies needing web redesign, SEO prospects";
  } else if (/(accounting|bookkeeping|cpa|tax|اکاؤنٹ|ٹیکس|buchhaltung|steuer)/i.test(text)) {
    businessType = "Accounting & Financial Consultancy";
    products = "Bookkeeping, Accounting, Tax Compliance Services";
    idealCustomers = "Growing SMBs needing outsourced accounting";
    industry = "Accounting & Finance";
    keywords = "small businesses, startups, retail companies, service firms";
  } else if (/(software|saas|app|it service|سافٹ ویئر|entwicklung)/i.test(text)) {
    businessType = "Software & IT Solutions Company";
    products = "Custom Software Development & IT Consulting";
    idealCustomers = "Mid-market businesses scaling operations";
    industry = "Software & IT Services";
    keywords = "B2B technology companies, growing enterprises, IT hiring companies";
  } else if (/(recruit|staffing|hiring|hr\b|بھرتی|personalvermittlung)/i.test(text)) {
    businessType = "Staffing & Recruitment Agency";
    products = "Talent Acquisition & Recruitment Services";
    idealCustomers = "Companies actively hiring specialists";
    industry = "Staffing & Recruitment";
    keywords = "companies hiring, open roles, growing teams";
  } else {
    businessType = "Commercial B2B Service Provider";
    products = text.slice(0, 180);
    idealCustomers = "Businesses that benefit from your services";
    industry = "B2B Services";
    keywords = text.split(/\s+/).slice(0, 8).join(" ");
  }

  const foundCountries: string[] = [];
  if (/(usa|united states|america|امریکہ)/i.test(text)) foundCountries.push("United States");
  if (/(uk|united kingdom|britain|london|برطانیہ|انگلینڈ)/i.test(text)) foundCountries.push("United Kingdom");
  if (/(germany|deutschland|جرمنی)/i.test(text)) foundCountries.push("Germany");
  if (/(uae|dubai|دبئی|امارات)/i.test(text)) foundCountries.push("United Arab Emirates");
  if (/(pakistan|پاکستان|lahore|karachi)/i.test(text)) foundCountries.push("Pakistan");
  if (/(india|بھارت|انڈیا)/i.test(text)) foundCountries.push("India");
  if (/(canada|کینیڈا)/i.test(text)) foundCountries.push("Canada");
  if (/(australia|آسٹریلیا)/i.test(text)) foundCountries.push("Australia");
  targetCountries = foundCountries.join(", ") || "United States";

  return {
    recognized: text.length >= 8,
    transcript: text,
    detected_language: hintLang && hintLang !== "auto" ? hintLang : rtl ? "Urdu / Arabic Script" : "English",
    is_rtl: rtl,
    business_name: "",
    business_type: businessType,
    what_does_business_do: products || text.slice(0, 220),
    products_services: products || text.slice(0, 220),
    ideal_customers: idealCustomers,
    target_countries: targetCountries,
    differentiator: "",
    outreach_goal: "Connect with qualified business prospects who need our services",
    preferred_outreach_language: foundCountries.some((c) => ["United States", "United Kingdom", "Canada", "Australia"].includes(c))
      ? "English"
      : low.includes("deutsch") || foundCountries.includes("Germany")
      ? "German"
      : "English",
    preferred_tone: "Professional",
    industry,
    ideal_industries: idealCustomers,
    keywords,
    exclusions: "competitors, agencies offering identical services unless requested",
    ai_summary: products || text.slice(0, 220),
  };
}

/**
 * Understand spoken audio OR typed natural-language description into a structured Business Profile.
 */
export async function understandBusinessInput(params: {
  text?: string;
  audioBase64?: string;
  audioMime?: string;
  languageHint?: string;
}): Promise<ExtractedBusinessProfile> {
  const cleanText = String(params.text || "").trim();
  const hasAudio = Boolean(params.audioBase64 && params.audioBase64.length > 100);
  const apiKey = getAiKey();

  if (!cleanText && !hasAudio) {
    return {
      ...heuristicExtractFromText(""),
      recognized: false,
      warning: "Please speak or type a short description of your business first.",
    };
  }

  if (!apiKey) {
    if (!cleanText) {
      return {
        ...heuristicExtractFromText(""),
        recognized: false,
        warning: "Voice transcription requires server speech configuration. Please type your description or enable live browser speech.",
      };
    }
    return heuristicExtractFromText(cleanText, params.languageHint);
  }

  const promptText = `You are a multilingual B2B business profile analyst.
Listen to the attached audio (if provided) and/or read the user's text in ANY language (including English, Urdu, Hindi, Punjabi, Arabic, German, French, Spanish, Turkish, Persian, Pashto, Balochi, Chinese, etc.).
Extract ONLY business facts stated or directly implied by what the user actually said.
If the speech/text is completely unrelated to describing a business or empty/unintelligible noise, set "recognized": false and explain politely in "warning".
Preserve original proper names and key details accurately without inventing company facts.

Language hint from UI (may be "auto"): ${params.languageHint || "auto"}
${cleanText ? `User text / live transcript:\n"""\n${cleanText}\n"""` : ""}

Respond strictly in valid JSON with this exact schema:
{
  "recognized": true,
  "transcript": "Exact transcription or original text in the user's spoken/written language",
  "detected_language": "Language name (e.g. Urdu, English, German, Arabic)",
  "is_rtl": false,
  "business_name": "Company name if mentioned, else empty string",
  "business_type": "Plain-language business type in English (e.g. Digital Marketing Agency)",
  "what_does_business_do": "Simple 1-2 sentence explanation of what the business does",
  "products_services": "Comma-separated or concise description of products/services offered",
  "ideal_customers": "Who the ideal buyers are in everyday language",
  "target_countries": "Target countries mentioned (e.g. United States, United Kingdom)",
  "differentiator": "What makes the business different if mentioned, else empty string",
  "outreach_goal": "What the customer wants to achieve (e.g. Find SMBs needing website redesign)",
  "preferred_outreach_language": "Best outreach email language based on target countries and user request (e.g. English, German, Urdu, Arabic)",
  "preferred_tone": "Professional",
  "industry": "Internal B2B category label",
  "ideal_industries": "Specific target niches/sectors for search matching",
  "keywords": "5 to 8 clean comma-separated search terms representing prospective BUYERS",
  "exclusions": "Competitors or non-target terms to exclude",
  "ai_summary": "Concise summary for internal search and personalization",
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
            temperature: 0.15,
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

        return {
          recognized,
          transcript,
          detected_language: String(parsed.detected_language || "English"),
          is_rtl: Boolean(parsed.is_rtl || isRtlLanguage(transcript)),
          business_name: String(parsed.business_name || ""),
          business_type: String(parsed.business_type || ""),
          what_does_business_do: String(parsed.what_does_business_do || ""),
          products_services: String(parsed.products_services || parsed.what_does_business_do || ""),
          ideal_customers: String(parsed.ideal_customers || ""),
          target_countries: String(parsed.target_countries || ""),
          differentiator: String(parsed.differentiator || ""),
          outreach_goal: String(parsed.outreach_goal || ""),
          preferred_outreach_language: String(parsed.preferred_outreach_language || "English"),
          preferred_tone: preferredTone,
          industry: String(parsed.industry || parsed.business_type || ""),
          ideal_industries: String(parsed.ideal_industries || parsed.ideal_customers || ""),
          keywords: String(parsed.keywords || ""),
          exclusions: String(parsed.exclusions || ""),
          ai_summary: String(parsed.ai_summary || parsed.what_does_business_do || ""),
          ...(parsed.warning ? { warning: String(parsed.warning) } : {}),
        };
      }
    }
  } catch {
    // Graceful fallback below without leaking internal provider strings
  }

  if (cleanText) {
    return heuristicExtractFromText(cleanText, params.languageHint);
  }

  return {
    ...heuristicExtractFromText(""),
    recognized: false,
    warning: "Could not process audio clearly right now. Please try speaking again or type your business description directly.",
  };
}
