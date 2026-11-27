/**
 * USMAN AI GTM — Shared B2B Verticals, Intent Classification & Geography Engine
 *
 * Centralizes:
 * 1. Canonical 10 B2B Search Use Cases / Verticals
 * 2. Country -> ISO gl code, TLD hints, and local contact page paths (e.g. /impressum for DE)
 * 3. Intent detection from natural language + explicit focus selector
 * 4. Platform/aggregator host classification (so linkedin.com / facebook.com never pollute normalized_domain)
 */

export type LeadUseCaseId =
  | "general_b2b"
  | "hiring_signals"
  | "agency_web_audit"
  | "decision_makers"
  | "ecommerce_shopify"
  | "commercial_real_estate"
  | "wholesale_manufacturing"
  | "finance_accounting"
  | "local_services"
  | "software_it";

export interface UseCaseProfile {
  id: LeadUseCaseId;
  label: string;
  shortLabel: string;
  description: string;
  usePlaces: boolean;
  defaultChannelIds: string[];
  queryHint: string;
}

export const B2B_USE_CASE_PROFILES: Record<LeadUseCaseId, UseCaseProfile> = {
  general_b2b: {
    id: "general_b2b",
    label: "All B2B Discovery",
    shortLabel: "All B2B",
    description: "Balanced discovery across official websites, Google Maps, LinkedIn companies, and public profiles.",
    usePlaces: true,
    defaultChannelIds: ["google_places", "official_websites", "google_organic", "linkedin_companies"],
    queryHint: "official website contact email",
  },
  hiring_signals: {
    id: "hiring_signals",
    label: "Hiring Companies (Buying Signal)",
    shortLabel: "Hiring Now",
    description: "Finds companies with active job openings, career pages, or public ATS boards indicating budget & growth.",
    usePlaces: false,
    defaultChannelIds: ["company_careers", "ats_boards", "linkedin_jobs", "google_organic"],
    queryHint: "careers jobs hiring apply",
  },
  agency_web_audit: {
    id: "agency_web_audit",
    label: "Marketing & Web Prospects",
    shortLabel: "Agency Prospects",
    description: "Discovers agencies or SMBs and surfaces factual website signals (HTTPS, metadata, CMS, contact forms).",
    usePlaces: true,
    defaultChannelIds: ["google_places", "official_websites", "google_organic", "linkedin_companies", "instagram_business"],
    queryHint: "official website email services",
  },
  decision_makers: {
    id: "decision_makers",
    label: "Decision Makers & Leadership",
    shortLabel: "Decision Makers",
    description: "Targets founders, directors, managing partners, and department heads via LinkedIn & company leadership pages.",
    usePlaces: false,
    defaultChannelIds: ["linkedin_people", "linkedin_companies", "official_websites", "google_organic"],
    queryHint: "founder CEO director partner leadership contact",
  },
  ecommerce_shopify: {
    id: "ecommerce_shopify",
    label: "E-commerce & Shopify Brands",
    shortLabel: "Shopify / E-com",
    description: "Identifies Shopify, WooCommerce, and D2C retail stores with observed storefront & tech stack signals.",
    usePlaces: false,
    defaultChannelIds: ["ecommerce_shopify", "official_websites", "instagram_business", "google_organic"],
    queryHint: "shopify store contact email",
  },
  commercial_real_estate: {
    id: "commercial_real_estate",
    label: "Commercial Real Estate",
    shortLabel: "Commercial RE",
    description: "Targets CRE brokerages, property managers, leasing advisors, and commercial real estate firms.",
    usePlaces: true,
    defaultChannelIds: ["google_places", "official_websites", "linkedin_companies", "google_organic"],
    queryHint: "commercial real estate brokerage leasing contact",
  },
  wholesale_manufacturing: {
    id: "wholesale_manufacturing",
    label: "Wholesale & Manufacturing",
    shortLabel: "Wholesale / Mfg",
    description: "Discovers manufacturers, industrial suppliers, exporters, and wholesale distributors with legal registry enrichment.",
    usePlaces: true,
    defaultChannelIds: ["official_websites", "wholesale_b2b", "google_places", "linkedin_companies"],
    queryHint: "manufacturer wholesale distributor contact email",
  },
  finance_accounting: {
    id: "finance_accounting",
    label: "Accounting & Financial Firms",
    shortLabel: "Finance / CPA",
    description: "Finds CPA practices, chartered accountants, tax consultancies, and advisory firms.",
    usePlaces: true,
    defaultChannelIds: ["google_places", "official_websites", "linkedin_companies", "google_organic"],
    queryHint: "accounting CPA tax firm contact email",
  },
  local_services: {
    id: "local_services",
    label: "Clinics, Contractors & Local SMBs",
    shortLabel: "Local SMBs",
    description: "High-precision Google Maps + local website discovery for clinics, contractors, law firms, and regional businesses.",
    usePlaces: true,
    defaultChannelIds: ["google_places", "official_websites", "facebook_business", "google_organic"],
    queryHint: "clinic services phone contact",
  },
  software_it: {
    id: "software_it",
    label: "Software, SaaS & IT Services",
    shortLabel: "Software / IT",
    description: "Discovers SaaS companies, custom dev agencies, MSPs, and IT consultancies.",
    usePlaces: true,
    defaultChannelIds: ["official_websites", "linkedin_companies", "google_organic", "google_places"],
    queryHint: "software technology solutions contact email",
  },
};

import { normalizeCountryName, getCountryGlCode } from "@/lib/countries";

export interface GeoSpec {
  countryName: string;
  glCode: string;
  cityName: string;
  countryAliases: string[];
  preferredTlds: string[];
  extraContactPaths: string[];
}

const COUNTRY_HINTS: Record<string, { aliases: string[]; tlds: string[]; paths: string[] }> = {
  "united states": { aliases: ["usa", "u.s.", "us", "united states", "america"], tlds: [".com", ".us", ".io", ".org"], paths: [] },
  "united kingdom": { aliases: ["uk", "u.k.", "united kingdom", "britain", "england", "london"], tlds: [".co.uk", ".uk", ".org.uk", ".com"], paths: [] },
  "canada": { aliases: ["canada", "ca", "toronto", "vancouver", "montreal"], tlds: [".ca", ".com"], paths: [] },
  "australia": { aliases: ["australia", "au", "sydney", "melbourne", "brisbane", "perth"], tlds: [".com.au", ".au", ".com"], paths: [] },
  "germany": { aliases: ["germany", "deutschland", "de", "berlin", "munich", "hamburg", "frankfurt"], tlds: [".de", ".com"], paths: ["/impressum", "/kontakt", "/ueber-uns"] },
  "united arab emirates": { aliases: ["uae", "u.a.e.", "united arab emirates", "dubai", "abu dhabi", "sharjah"], tlds: [".ae", ".com"], paths: [] },
  "pakistan": { aliases: ["pakistan", "pk", "karachi", "lahore", "islamabad", "rawalpindi"], tlds: [".pk", ".com.pk", ".com"], paths: [] },
  "india": { aliases: ["india", "in", "mumbai", "delhi", "bangalore", "bengaluru", "chennai", "hyderabad", "pune"], tlds: [".in", ".co.in", ".com"], paths: [] },
  "saudi arabia": { aliases: ["saudi arabia", "ksa", "sa", "riyadh", "jeddah", "dammam"], tlds: [".sa", ".com.sa", ".com"], paths: [] },
  "france": { aliases: ["france", "fr", "paris", "lyon", "marseille"], tlds: [".fr", ".com"], paths: ["/mentions-legales", "/contact"] },
  "netherlands": { aliases: ["netherlands", "holland", "nl", "amsterdam", "rotterdam"], tlds: [".nl", ".com"], paths: ["/contact"] },
  "spain": { aliases: ["spain", "es", "madrid", "barcelona"], tlds: [".es", ".com"], paths: ["/contacto"] },
  "italy": { aliases: ["italy", "it", "milan", "rome"], tlds: [".it", ".com"], paths: ["/contatti"] },
  "brazil": { aliases: ["brazil", "brasil", "br", "sao paulo"], tlds: [".com.br", ".br", ".com"], paths: ["/contato"] },
  "mexico": { aliases: ["mexico", "mx", "mexico city"], tlds: [".mx", ".com.mx", ".com"], paths: ["/contacto"] },
  "turkey": { aliases: ["turkey", "turkiye", "tr", "istanbul", "ankara"], tlds: [".com.tr", ".tr", ".com"], paths: ["/iletisim"] },
};

export function resolveGeoSpec(country?: string, city?: string): GeoSpec {
  const rawCountry = String(country || "")
    .replace(/^(ALL COUNTRIES|All Countries|Any|Global|Worldwide)$/i, "")
    .trim();
  const cleanCountry = rawCountry ? normalizeCountryName(rawCountry) : "Global";
  const cleanCity = String(city || "")
    .replace(/^(ALL_CITIES|All Cities|Any)$/i, "")
    .trim();

  const glCode = cleanCountry !== "Global" ? (getCountryGlCode(cleanCountry) || "") : "";
  const key = cleanCountry.toLowerCase();
  const hints = COUNTRY_HINTS[key];

  return {
    countryName: cleanCountry,
    glCode,
    cityName: cleanCity,
    countryAliases: hints?.aliases || (cleanCountry !== "Global" ? [key] : []),
    preferredTlds: hints?.tlds || (glCode ? [`.${glCode}`, ".com"] : [".com"]),
    extraContactPaths: hints?.paths || [],
  };
}

/**
 * Normalize country names cleanly so "USA", "US", "United States" map consistently in dedup keys.
 */
export function canonicalCountryKey(country?: string): string {
  const raw = String(country || "").trim();
  if (!raw || /^(global|any|all countries|worldwide)$/i.test(raw)) return "global";
  return normalizeCountryName(raw).toLowerCase();
}

/**
 * Hostnames that represent social media networks, job boards, ATS hosts, or business directories.
 * These must NEVER be stored as an individual company's canonical `normalized_domain`,
 * because `idx_leads_ws_normalized_domain` allows only one lead per domain per workspace!
 */
export const PLATFORM_OR_DIRECTORY_HOSTS = [
  "facebook.com", "fb.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
  "youtube.com", "youtu.be", "tiktok.com", "pinterest.com", "reddit.com", "quora.com",
  "medium.com", "substack.com", "wikipedia.org",
  "yelp.com", "yellowpages.com", "clutch.co", "goodfirms.co", "sortlist.com",
  "agency-list.com", "designrush.com", "bbb.org", "zoominfo.com", "dnb.com",
  "tripadvisor.com", "mapquest.com", "superpages.com", "dexknows.com", "manta.com",
  "angis.com", "angi.com", "thumbtack.com", "houzz.com", "trustpilot.com",
  "glassdoor.com", "indeed.com", "ziprecruiter.com", "monster.com", "simplyhired.com",
  "kompass.com", "europages.com", "thomasnet.com", "indiamart.com", "tradeindia.com",
  "alibaba.com", "made-in-china.com", "exportersindia.com", "justdial.com", "sulekha.com",
  "leadiq.com", "lusha.com", "apollo.io", "rocketreach.co", "adapt.io", "seamless.ai",
  "hunter.io", "contactout.com", "crunchbase.com", "pitchbook.com", "owler.com",
  "boards.greenhouse.io", "greenhouse.io", "jobs.lever.co", "lever.co",
  "apply.workable.com", "workable.com", "bamboohr.com", "ashbyhq.com", "myworkdayjobs.com",
  "smartrecruiters.com", "icims.com", "taleo.net", "recruitee.com",
  "google.com", "maps.google.com", "bing.com", "yahoo.com",
];

export function isPlatformOrDirectoryHost(domainOrUrl: string): boolean {
  if (!domainOrUrl) return false;
  let host = domainOrUrl.trim().toLowerCase();
  if (host.includes("://")) {
    try {
      host = new URL(host).hostname.toLowerCase();
    } catch {
      host = host.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    }
  }
  host = host.replace(/^www\./, "").split("/")[0].split(":")[0];
  if (!host) return false;
  return PLATFORM_OR_DIRECTORY_HOSTS.some((p) => host === p || host.endsWith("." + p));
}

export function extractOwnedCompanyDomain(websiteOrUrl?: string): string {
  if (!websiteOrUrl) return "";
  let clean = websiteOrUrl.trim();
  if (!clean || clean.toLowerCase() === "not found" || clean.toLowerCase() === "n/a") return "";
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  try {
    const host = new URL(clean).hostname.replace(/^www\./i, "").toLowerCase();
    if (!host || !host.includes(".") || isPlatformOrDirectoryHost(host)) return "";
    return host;
  } catch {
    const host = clean.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
    if (!host || !host.includes(".") || isPlatformOrDirectoryHost(host)) return "";
    return host;
  }
}

/**
 * Fast, reliable vertical/use-case classifier based on natural query + optional explicit focus override.
 */
export function classifyUseCaseIntent(query: string, explicitFocus?: string): LeadUseCaseId {
  const validIds = Object.keys(B2B_USE_CASE_PROFILES) as LeadUseCaseId[];
  if (explicitFocus && explicitFocus !== "auto" && validIds.includes(explicitFocus as LeadUseCaseId)) {
    return explicitFocus as LeadUseCaseId;
  }

  const q = ` ${query.toLowerCase()} `;

  if (/\b(hiring|recruiting|looking to hire|job openings?|open roles?|careers?|staff accountant|companies hiring)\b/i.test(q) &&
      !/\b(recruitment agenc|staffing agenc|headhunter|recruiter firms?)\b/i.test(q)) {
    return "hiring_signals";
  }

  if (/\b(shopify|woocommerce|magento|bigcommerce|e-?commerce|online stores?|dtc brands?|d2c brands?)\b/i.test(q)) {
    return "ecommerce_shopify";
  }

  if (/\b(commercial real estate|cre\b|real estate brokers?|property management|commercial property|realtor|realty|leasing)\b/i.test(q)) {
    return "commercial_real_estate";
  }

  if (/\b(founder|ceo|cfo|cto|coo|director|vp of|head of|decision maker|owner email|managing partner|c-suite)\b/i.test(q)) {
    return "decision_makers";
  }

  if (/\b(wholesale|wholesaler|distributor|distributors|manufacturer|manufacturers|manufacturing|factory|supplier|suppliers|exporter|importer|industrial)\b/i.test(q)) {
    return "wholesale_manufacturing";
  }

  if (/\b(accounting|accountant|cpa|bookkeeping|tax firm|chartered accountant|audit firm|financial advisor|wealth management)\b/i.test(q)) {
    return "finance_accounting";
  }

  if (/\b(marketing agenc|seo agenc|web design|website redesign|digital agenc|smma|branding agenc|creative agenc|advertising agenc|lead generation agenc)\b/i.test(q)) {
    return "agency_web_audit";
  }

  if (/\b(software|saas|it services?|it consulting|managed service|msp|cloud consulting|app development|web development)\b/i.test(q)) {
    return "software_it";
  }

  if (/\b(dental|dentist|clinic|chiropractor|orthodont|hospital|medical|construction|contractor|plumbing|hvac|roofing|salon|restaurant|hotel|law firm|attorney|recruitment agenc|staffing agenc)\b/i.test(q)) {
    return "local_services";
  }

  return "general_b2b";
}
