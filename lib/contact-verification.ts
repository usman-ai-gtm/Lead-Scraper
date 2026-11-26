import dns from "dns/promises";
import { validateEmailSyntax, normalizeEmail, validateAndNormalizePhone } from "@/lib/lead-quality-engine";
import {
  CanonicalEmailStatus,
  CanonicalPhoneStatus,
  normalizePersistedEmailStatus,
  normalizePersistedPhoneStatus,
} from "@/lib/contact-taxonomy";

export type { CanonicalEmailStatus, CanonicalPhoneStatus };
export { normalizePersistedEmailStatus, normalizePersistedPhoneStatus };

export interface EmailVerificationResult {
  email: string;
  canonicalStatus: CanonicalEmailStatus;
  displayLabel: string;
  mxRecordsFound: boolean;
  domain: string;
  isRoleBased: boolean;
  checkedAt: string;
}

export interface PhoneQualityResult {
  phone: string;
  normalized: string;
  canonicalStatus: CanonicalPhoneStatus;
  displayLabel: string;
  checkedAt: string;
}

const ROLE_BASED_PREFIXES = new Set([
  "info",
  "contact",
  "hello",
  "support",
  "sales",
  "admin",
  "office",
  "help",
  "billing",
  "noreply",
  "no-reply",
  "donotreply",
  "jobs",
  "careers",
  "press",
  "media",
  "team",
  "enquiries",
  "inquiries",
]);

const mxCache = new Map<string, { hasMx: boolean; ts: number }>();
const MX_TTL_MS = 10 * 60 * 1000;

export async function checkDomainHasMx(domain: string, timeoutMs = 1800): Promise<boolean> {
  const clean = String(domain || "").trim().toLowerCase();
  if (!clean || !clean.includes(".")) return false;

  const cached = mxCache.get(clean);
  if (cached && Date.now() - cached.ts < MX_TTL_MS) {
    return cached.hasMx;
  }

  let hasMx = false;
  try {
    const res = await Promise.race([
      dns.resolveMx(clean),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("MX_TIMEOUT")), timeoutMs)
      ),
    ]);
    hasMx = Array.isArray(res) && res.length > 0 && Boolean(res[0]?.exchange);
  } catch {
    hasMx = false;
  }

  if (mxCache.size > 500) {
    const firstKey = mxCache.keys().next().value;
    if (firstKey) mxCache.delete(firstKey);
  }
  mxCache.set(clean, { hasMx, ts: Date.now() });
  return hasMx;
}

export async function verifyLeadEmailTruthfully(
  rawEmail?: string | null,
  options?: { resolveMx?: boolean; providerVerified?: boolean }
): Promise<EmailVerificationResult> {
  const checkedAt = new Date().toISOString();
  const clean = String(rawEmail || "").trim().toLowerCase();

  if (!clean || clean === "not found" || clean === "none" || clean === "n/a") {
    return {
      email: "",
      canonicalStatus: "Not Found",
      displayLabel: "Not Found",
      mxRecordsFound: false,
      domain: "",
      isRoleBased: false,
      checkedAt,
    };
  }

  const isSyntaxValid = validateEmailSyntax(clean);
  if (!isSyntaxValid) {
    return {
      email: clean,
      canonicalStatus: "Invalid",
      displayLabel: "Invalid Email Format",
      mxRecordsFound: false,
      domain: "",
      isRoleBased: false,
      checkedAt,
    };
  }

  const normalized = normalizeEmail(clean) || clean;
  const [localPart, domain] = normalized.split("@");
  const isRoleBased = ROLE_BASED_PREFIXES.has(localPart);

  if (localPart === "noreply" || localPart === "no-reply" || localPart === "donotreply") {
    return {
      email: normalized,
      canonicalStatus: "Risky",
      displayLabel: "Risky (No-Reply Address)",
      mxRecordsFound: false,
      domain,
      isRoleBased: true,
      checkedAt,
    };
  }

  if (options?.providerVerified) {
    return {
      email: normalized,
      canonicalStatus: "Provider Verified",
      displayLabel: "Provider Verified",
      mxRecordsFound: true,
      domain,
      isRoleBased,
      checkedAt,
    };
  }

  let hasMx = false;
  if (options?.resolveMx !== false) {
    hasMx = await checkDomainHasMx(domain);
  }

  if (hasMx) {
    return {
      email: normalized,
      canonicalStatus: "Domain Valid",
      displayLabel: isRoleBased
        ? "Domain Valid (MX Found • Role Inbox • Mailbox Unverified)"
        : "Domain Valid (MX Found • Mailbox Unverified)",
      mxRecordsFound: true,
      domain,
      isRoleBased,
      checkedAt,
    };
  }

  return {
    email: normalized,
    canonicalStatus: "Syntax Valid",
    displayLabel:
      options?.resolveMx === false
        ? "Syntax Valid (Domain Check Pending)"
        : "Syntax Valid (No MX Record Found — Risky)",
    mxRecordsFound: false,
    domain,
    isRoleBased,
    checkedAt,
  };
}

export function evaluatePhoneQualityTruthfully(
  rawPhone?: string | null,
  countryName?: string | null,
  sourceUrl?: string | null
): PhoneQualityResult {
  const checkedAt = new Date().toISOString();
  const clean = String(rawPhone || "").trim();

  if (!clean || clean === "Not Found" || clean === "Not Listed" || clean === "None") {
    return {
      phone: "",
      normalized: "",
      canonicalStatus: "Not Found",
      displayLabel: "Not Found",
      checkedAt,
    };
  }

  const check = validateAndNormalizePhone(clean, countryName || undefined);
  if (check.valid) {
    return {
      phone: check.normalized,
      normalized: check.normalized,
      canonicalStatus: "Format Valid",
      displayLabel: sourceUrl ? "Format Valid (Source Listed)" : "Format Valid",
      checkedAt,
    };
  }

  return {
    phone: clean,
    normalized: clean,
    canonicalStatus: clean.replace(/\D/g, "").length >= 7 ? "Source Listed" : "Invalid",
    displayLabel: clean.replace(/\D/g, "").length >= 7 ? "Source Listed (Unformatted)" : "Invalid",
    checkedAt,
  };
}
