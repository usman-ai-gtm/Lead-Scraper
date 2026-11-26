export type CanonicalEmailStatus =
  | "Not Found"
  | "Syntax Valid"
  | "Domain Valid"
  | "Provider Verified"
  | "Risky"
  | "Invalid"
  | "Unknown";

export type CanonicalPhoneStatus =
  | "Not Found"
  | "Source Listed"
  | "Format Valid"
  | "Verified"
  | "Invalid"
  | "Unknown";

export function normalizePersistedEmailStatus(
  rawStatus?: string | null,
  email?: string | null
): CanonicalEmailStatus {
  const e = String(email || "").trim();
  if (!e || e.toLowerCase() === "not found" || e.toLowerCase() === "none") return "Not Found";
  const s = String(rawStatus || "").toUpperCase();
  if (s.includes("PROVIDER VERIFIED")) return "Provider Verified";
  if (s.includes("DOMAIN VALID") || s.includes("MX FOUND") || s.includes("MX VALID")) return "Domain Valid";
  if (s.includes("RISKY") || s.includes("NO MX") || s.includes("NO-REPLY")) return "Risky";
  if (s.includes("INVALID")) return "Invalid";
  if (s.includes("SYNTAX") || s.includes("FOUND") || s.includes("FORMAT") || s.includes("EXTRACTED")) {
    return "Syntax Valid";
  }
  return "Unknown";
}

export function normalizePersistedPhoneStatus(
  rawStatus?: string | null,
  phone?: string | null
): CanonicalPhoneStatus {
  const p = String(phone || "").trim();
  if (!p || p.toLowerCase() === "not found" || p.toLowerCase() === "not listed" || p.toLowerCase() === "none") {
    return "Not Found";
  }
  const s = String(rawStatus || "").toUpperCase();
  if (s.includes("VERIFIED")) return "Verified";
  if (s.includes("FORMAT VALID")) return "Format Valid";
  if (s.includes("LISTED") || s.includes("FOUND") || s.includes("EXTRACTED") || s.includes("FORMAT CHECKED")) {
    return "Source Listed";
  }
  if (s.includes("INVALID")) return "Invalid";
  return "Unknown";
}
