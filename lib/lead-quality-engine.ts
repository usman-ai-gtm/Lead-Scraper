/**
 * USMAN AI GTM — Lead Quality Scoring, Contact Validation & Verification Engine
 * Strictly evidence-based. Never assumes purchase intent without factual signals.
 */

export type ContactRequirement =
  | "EMAIL_AND_PHONE"
  | "EMAIL_ONLY"
  | "PHONE_ONLY"
  | "EMAIL_OR_PHONE";

export interface ContactValidationResult {
  eligible: boolean;
  missingReason?: string;
  emailValid: boolean;
  phoneValid: boolean;
  normalizedEmail?: string;
  normalizedPhone?: string;
}

export interface QualityScoreResult {
  score: number; // 0 - 100
  category: "Excellent" | "Good" | "Fair" | "Basic";
  reasons: string[];
}

/**
 * Strict syntax validation for business email addresses.
 */
export function validateEmailSyntax(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 254) return false;
  if (clean === "not found" || clean === "n/a" || clean === "none") return false;

  // RFC 5322 compatible regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return false;

  // Reject common dummy / example domains
  const dummyDomains = ["example.com", "test.com", "domain.com", "yoursite.com", "email.com", "sample.com"];
  const domain = clean.split("@")[1];
  if (dummyDomains.includes(domain)) return false;

  return true;
}

/**
 * Normalizes email by trimming, lowercasing, and stripping unnecessary mailto: prefixes.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "";
  let clean = email.trim().toLowerCase();
  if (clean.startsWith("mailto:")) {
    clean = clean.replace("mailto:", "").trim();
  }
  return clean;
}

/**
 * Strict phone number validation and normalization.
 */
export function validateAndNormalizePhone(phone?: string | null, defaultCountry?: string): { valid: boolean; normalized: string } {
  if (!phone || typeof phone !== "string") return { valid: false, normalized: "" };
  let clean = phone.trim();
  if (clean === "Not Found" || clean === "N/A" || clean === "none" || clean === "null") {
    return { valid: false, normalized: "" };
  }

  // Remove whitespace, brackets, hyphens for digit check
  const digitsOnly = clean.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, normalized: "" };
  }

  // Preserve leading '+' if present
  let normalized = clean.replace(/[^\d+]/g, "");
  if (!normalized.startsWith("+") && digitsOnly.length >= 10) {
    // If United States or Canada and 10 digits
    if (defaultCountry === "United States" || defaultCountry === "Canada") {
      normalized = "+1" + digitsOnly;
    } else if (defaultCountry === "United Kingdom" && digitsOnly.startsWith("44")) {
      normalized = "+" + digitsOnly;
    } else if (defaultCountry === "United Kingdom" && digitsOnly.startsWith("0")) {
      normalized = "+44" + digitsOnly.slice(1);
    } else if (defaultCountry === "Pakistan" && digitsOnly.startsWith("92")) {
      normalized = "+" + digitsOnly;
    } else if (defaultCountry === "Pakistan" && digitsOnly.startsWith("0")) {
      normalized = "+92" + digitsOnly.slice(1);
    } else {
      normalized = "+" + digitsOnly;
    }
  }

  return { valid: true, normalized };
}

/**
 * Checks whether a candidate lead satisfies the chosen Contact Requirement.
 */
export function evaluateContactRequirement(
  lead: { email?: string | null; phone?: string | null },
  requirement: ContactRequirement = "EMAIL_AND_PHONE",
  defaultCountry?: string
): ContactValidationResult {
  const normEmail = normalizeEmail(lead.email);
  const emailValid = validateEmailSyntax(normEmail);

  const phoneRes = validateAndNormalizePhone(lead.phone, defaultCountry);
  const phoneValid = phoneRes.valid;

  switch (requirement) {
    case "EMAIL_AND_PHONE":
      if (!emailValid && !phoneValid) {
        return { eligible: false, missingReason: "Missing both email and phone", emailValid, phoneValid };
      }
      if (!emailValid) {
        return { eligible: false, missingReason: "Missing valid email", emailValid, phoneValid };
      }
      if (!phoneValid) {
        return { eligible: false, missingReason: "Missing valid phone", emailValid, phoneValid };
      }
      return { eligible: true, emailValid, phoneValid, normalizedEmail: normEmail, normalizedPhone: phoneRes.normalized };

    case "EMAIL_ONLY":
      if (!emailValid) {
        return { eligible: false, missingReason: "Missing valid email", emailValid, phoneValid };
      }
      return { eligible: true, emailValid, phoneValid, normalizedEmail: normEmail, normalizedPhone: phoneRes.normalized };

    case "PHONE_ONLY":
      if (!phoneValid) {
        return { eligible: false, missingReason: "Missing valid phone", emailValid, phoneValid };
      }
      return { eligible: true, emailValid, phoneValid, normalizedEmail: normEmail, normalizedPhone: phoneRes.normalized };

    case "EMAIL_OR_PHONE":
      if (!emailValid && !phoneValid) {
        return { eligible: false, missingReason: "Missing both email and phone", emailValid, phoneValid };
      }
      return { eligible: true, emailValid, phoneValid, normalizedEmail: normEmail, normalizedPhone: phoneRes.normalized };

    default:
      return { eligible: emailValid && phoneValid, emailValid, phoneValid, normalizedEmail: normEmail, normalizedPhone: phoneRes.normalized };
  }
}

/**
 * Computes an explainable Lead Quality Score (0 to 100) based on verified evidence.
 */
export function calculateLeadQualityScore(lead: {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  business_name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  source?: string | null;
  [key: string]: any;
}): QualityScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Email check (Up to 30 points)
  const normEmail = normalizeEmail(lead.email);
  if (validateEmailSyntax(normEmail)) {
    score += 30;
    reasons.push("Syntax-validated commercial email provided");
  }

  // 2. Phone check (Up to 25 points)
  const phoneRes = validateAndNormalizePhone(lead.phone, lead.country || undefined);
  if (phoneRes.valid) {
    score += 25;
    reasons.push("Direct international business phone number available");
  }

  // 3. Official Website (Up to 20 points)
  if (lead.website && lead.website.startsWith("http")) {
    score += 20;
    reasons.push("Active official business website");
  }

  // 4. Verified Social Profiles (Up to 15 points)
  let socialPoints = 0;
  if (lead.linkedin && lead.linkedin.includes("linkedin.com")) {
    socialPoints += 8;
    reasons.push("Verified LinkedIn company profile");
  }
  if (lead.instagram && lead.instagram.includes("instagram.com")) {
    socialPoints += 4;
    reasons.push("Public Instagram business profile");
  }
  if (lead.facebook && lead.facebook.includes("facebook.com")) {
    socialPoints += 3;
    reasons.push("Public Facebook business page");
  }
  score += Math.min(15, socialPoints);

  // 5. Business Location & Identity Completeness (Up to 10 points)
  let identityPoints = 0;
  if (lead.business_name && lead.business_name.length > 2) {
    identityPoints += 4;
  }
  if (lead.city && lead.city !== "Global" && lead.city !== "Any") {
    identityPoints += 3;
  }
  if (lead.country && lead.country !== "Global" && lead.country !== "Any") {
    identityPoints += 3;
  }
  if (identityPoints > 0) {
    score += identityPoints;
    reasons.push("Complete geographic and business identity profile");
  }

  // Determine category
  let category: "Excellent" | "Good" | "Fair" | "Basic" = "Basic";
  if (score >= 80) {
    category = "Excellent";
  } else if (score >= 60) {
    category = "Good";
  } else if (score >= 40) {
    category = "Fair";
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    category,
    reasons,
  };
}

export type ContactReadinessCategory =
  | "Complete Contact"
  | "Email Available"
  | "Phone Available"
  | "Website Available"
  | "Incomplete Contact";

export interface ContactReadinessResult {
  category: ContactReadinessCategory;
  score: number;
  emailSyntaxValid: boolean;
  emailVerificationNote: string;
  phoneValid: boolean;
  hasCountryCode: boolean;
  normalizedPhone: string;
  hasWebsite: boolean;
  hasBusinessName: boolean;
  hasSourceUrl: boolean;
  factors: Array<{ label: string; met: boolean; points: number; detail: string }>;
}

/**
 * Assesses Contact Readiness using strictly factual fields already on the lead record.
 * Never claims mailbox deliverability is verified solely from email syntax.
 */
export function evaluateContactReadiness(lead: {
  email?: string | null;
  email_status?: string | null;
  phone?: string | null;
  website?: string | null;
  domain?: string | null;
  business_name?: string | null;
  source_url?: string | null;
  original_source_url?: string | null;
  country?: string | null;
  [key: string]: any;
}): ContactReadinessResult {
  const normEmail = normalizeEmail(lead.email);
  const emailSyntaxValid = validateEmailSyntax(normEmail);
  const emailVerificationNote = emailSyntaxValid
    ? "Syntax valid (SMTP/mailbox delivery unverified)"
    : "No valid business email syntax";

  const phoneCheck = validateAndNormalizePhone(lead.phone, lead.country || undefined);
  const phoneValid = phoneCheck.valid;
  const hasCountryCode = phoneValid && phoneCheck.normalized.startsWith("+");

  const websiteStr = String(lead.website || lead.domain || "").trim();
  const hasWebsite = Boolean(websiteStr && websiteStr.toLowerCase() !== "not found" && websiteStr.includes("."));
  const hasBusinessName = Boolean(lead.business_name && String(lead.business_name).trim().length >= 2);
  const sourceLink = String(lead.original_source_url || lead.source_url || "").trim();
  const hasSourceUrl = Boolean(sourceLink && sourceLink.startsWith("http"));

  const factors = [
    {
      label: "Email Syntax",
      met: emailSyntaxValid,
      points: emailSyntaxValid ? 35 : 0,
      detail: emailSyntaxValid ? `${normEmail} (${emailVerificationNote})` : "Missing or invalid email format",
    },
    {
      label: "Phone & Country Code",
      met: phoneValid,
      points: phoneValid ? (hasCountryCode ? 30 : 25) : 0,
      detail: phoneValid ? `${phoneCheck.normalized}${hasCountryCode ? " (E.164 code detected)" : ""}` : "Missing valid phone",
    },
    {
      label: "Official Website",
      met: hasWebsite,
      points: hasWebsite ? 15 : 0,
      detail: hasWebsite ? websiteStr : "No website/domain recorded",
    },
    {
      label: "Business Identity",
      met: hasBusinessName,
      points: hasBusinessName ? 10 : 0,
      detail: hasBusinessName ? String(lead.business_name).trim() : "Missing business name",
    },
    {
      label: "Source Evidence URL",
      met: hasSourceUrl,
      points: hasSourceUrl ? 10 : 0,
      detail: hasSourceUrl ? "Public source URL captured" : "No public source URL stored",
    },
  ];

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));

  let category: ContactReadinessCategory = "Incomplete Contact";
  if (emailSyntaxValid && phoneValid && hasWebsite && hasBusinessName) {
    category = "Complete Contact";
  } else if (emailSyntaxValid && phoneValid) {
    category = "Complete Contact";
  } else if (emailSyntaxValid) {
    category = "Email Available";
  } else if (phoneValid) {
    category = "Phone Available";
  } else if (hasWebsite) {
    category = "Website Available";
  }

  return {
    category,
    score,
    emailSyntaxValid,
    emailVerificationNote,
    phoneValid,
    hasCountryCode,
    normalizedPhone: phoneCheck.normalized,
    hasWebsite,
    hasBusinessName,
    hasSourceUrl,
    factors,
  };
}
