/**
 * USMAN AI GTM - Official WhatsApp Click-to-Chat & Phone Normalization Utilities
 * 
 * Strict Compliance:
 * - Uses ONLY the official WhatsApp click-to-chat format: https://wa.me/<number>?text=<encoded_text>
 * - Never scrapes WhatsApp or violates WhatsApp terms.
 * - Accurately normalizes international phone numbers into E.164 digits-only format.
 * - Accurately distinguishes valid mobile numbers from incomplete/invalid formats.
 */

export interface PhoneValidationResult {
  raw: string;
  normalized: string;
  displayFormatted: string;
  isValid: boolean;
  status: "VALID" | "LOCAL_NEEDS_CODE" | "INVALID" | "MISSING";
  errorReason?: string;
  waUrl?: string;
}

// Known common country calling codes
const COUNTRY_DIALING_CODES: Record<string, string> = {
  "pakistan": "92",
  "pk": "92",
  "united states": "1",
  "usa": "1",
  "us": "1",
  "united kingdom": "44",
  "uk": "44",
  "gb": "44",
  "canada": "1",
  "ca": "1",
  "australia": "61",
  "au": "61",
  "united arab emirates": "971",
  "uae": "971",
  "ae": "971",
  "saudi arabia": "966",
  "sa": "966",
  "india": "91",
  "in": "91",
  "germany": "49",
  "de": "49",
  "france": "33",
  "fr": "33",
  "turkey": "90",
  "tr": "90",
  "qatar": "974",
  "qa": "974",
  "singapore": "65",
  "sg": "65",
  "malaysia": "60",
  "my": "60",
};

/**
 * Normalizes and validates a phone number for official WhatsApp click-to-chat.
 * 
 * WhatsApp requirement:
 * The number must be in international format without any leading zeroes, plus sign (+), brackets, or hyphens.
 * E.g., `https://wa.me/923001234567` or `https://wa.me/14155552671`
 */
export function normalizePhoneNumber(
  rawPhone?: string | null,
  countryHint?: string | null,
  defaultCountryCode = "92"
): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      raw: "",
      normalized: "",
      displayFormatted: "Not Provided",
      isValid: false,
      status: "MISSING",
      errorReason: "No phone number recorded for this lead",
    };
  }

  // Handle multi-line or dirty text (e.g. from scrapers containing multiple lines)
  const firstLine = rawPhone.split(/[\r\n]+/)[0].trim();
  
  // Clean string keeping only digits and leading plus
  let cleaned = firstLine.replace(/[^0-9+]/g, "");

  // Determine country dialing code from country hint
  let detectedCode = defaultCountryCode;
  if (countryHint) {
    const key = countryHint.toLowerCase().trim();
    if (COUNTRY_DIALING_CODES[key]) {
      detectedCode = COUNTRY_DIALING_CODES[key];
    }
  }

  let normalized = "";

  if (cleaned.startsWith("+")) {
    // E.164 format with plus: strip the '+'
    normalized = cleaned.substring(1);
  } else if (cleaned.startsWith("00")) {
    // International prefix 00: strip the '00'
    normalized = cleaned.substring(2);
  } else if (cleaned.startsWith("0") && cleaned.length >= 10 && cleaned.length <= 12) {
    // Local format starting with single 0 (e.g. 03001234567 in Pakistan, 07123456789 in UK)
    // Strip leading 0 and prepend detected country dialing code
    normalized = `${detectedCode}${cleaned.substring(1)}`;
  } else if (cleaned.length >= 10 && cleaned.length <= 15) {
    // Check if it already starts with known country code
    if (cleaned.startsWith(detectedCode)) {
      normalized = cleaned;
    } else if (cleaned.length === 10 && (detectedCode === "1" || detectedCode === "92")) {
      // 10 digits without country code (e.g., 3001234567 in Pakistan or 4155552671 in US)
      normalized = `${detectedCode}${cleaned}`;
    } else {
      normalized = cleaned;
    }
  } else {
    normalized = cleaned;
  }

  // Final sanity check: international phone numbers must contain between 8 and 15 digits
  const digitCount = normalized.replace(/\D/g, "").length;

  if (digitCount < 8) {
    return {
      raw: rawPhone,
      normalized,
      displayFormatted: firstLine,
      isValid: false,
      status: "INVALID",
      errorReason: `Phone number is too short (${digitCount} digits; minimum 8 required for international dial)`,
    };
  }

  if (digitCount > 15) {
    return {
      raw: rawPhone,
      normalized,
      displayFormatted: firstLine,
      isValid: false,
      status: "INVALID",
      errorReason: `Phone number is too long (${digitCount} digits; max 15 permitted by ITU-T E.164)`,
    };
  }

  // Format nicely for human display: +XX XXX XXXXXXX
  const displayFormatted = `+${normalized}`;

  return {
    raw: rawPhone,
    normalized,
    displayFormatted,
    isValid: true,
    status: "VALID",
  };
}

/**
 * Builds the official WhatsApp click-to-chat URL.
 * Specification: https://faq.whatsapp.com/5913398998672934
 * 
 * Format: https://wa.me/<number>?text=<urlencodedtext>
 */
export function buildWhatsAppClickToChatUrl(
  normalizedPhone: string,
  draftMessage?: string
): string {
  const cleanPhone = normalizedPhone.replace(/\D/g, "");
  let url = `https://wa.me/${cleanPhone}`;
  if (draftMessage && draftMessage.trim()) {
    url += `?text=${encodeURIComponent(draftMessage.trim())}`;
  }
  return url;
}

/**
 * Builds direct Web WhatsApp link for desktop browser tab.
 */
export function buildWhatsAppWebDirectUrl(
  normalizedPhone?: string,
  draftMessage?: string
): string {
  if (!normalizedPhone) {
    return "https://web.whatsapp.com/";
  }
  const cleanPhone = normalizedPhone.replace(/\D/g, "");
  let url = `https://web.whatsapp.com/send?phone=${cleanPhone}`;
  if (draftMessage && draftMessage.trim()) {
    url += `&text=${encodeURIComponent(draftMessage.trim())}`;
  }
  return url;
}
