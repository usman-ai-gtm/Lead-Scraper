/**
 * USMAN AI GTM — Verified Free & Optional Registry Data Sources
 *
 * Implements ONLY legitimate, commercially permitted open/public APIs:
 * 1. GLEIF Global LEI Registry API v1 (api.gleif.org) — 100% free, no API key, commercial use permitted (~60 req/min).
 * 2. UK Companies House REST API — 100% free official UK registry when Owner sets `COMPANIES_HOUSE_API_KEY`.
 * 3. RDAP Bootstrap API (rdap.org) — free open domain registration metadata (cached, single-lead enrichment only).
 * 4. Optional Hunter.io Free Tier Hook (`HUNTER_API_KEY`) — email verification/finder when Owner sets `HUNTER_API_KEY`.
 */

import { extractOwnedCompanyDomain } from "@/lib/b2b-verticals";
import { getCountryIsoCode } from "@/lib/countries";

export interface GleifEntityMatch {
  lei: string;
  legalName: string;
  countryCode: string;
  city: string;
  addressLines: string[];
  postalCode: string;
  entityStatus: string;
  jurisdiction: string;
  registryUrl: string;
}

export interface CompaniesHouseMatch {
  companyNumber: string;
  companyName: string;
  companyStatus: string;
  companyType: string;
  locality: string;
  postalCode: string;
  addressSnippet: string;
  dateOfCreation?: string;
  registryUrl: string;
}

export interface RdapDomainMeta {
  domain: string;
  registrationDate?: string;
  expirationDate?: string;
  registrar?: string;
  rdapUrl: string;
}

const gleifCache = new Map<string, GleifEntityMatch | null>();
const rdapCache = new Map<string, RdapDomainMeta | null>();

function boundedSet<K, V>(map: Map<K, V>, key: K, val: V, max = 300) {
  if (map.size >= max) {
    const first = map.keys().next().value;
    if (first !== undefined) map.delete(first);
  }
  map.set(key, val);
}

export function resolveIso2CountryCode(country?: string): string {
  const clean = String(country || "").trim();
  if (!clean) return "";
  if (clean.length === 2) return clean.toUpperCase();
  return getCountryIsoCode(clean) || "";
}

/**
 * Look up verified corporate legal entity record in GLEIF (api.gleif.org).
 * Strictly zero-key, commercial use permitted. Never throws.
 */
export async function lookupGleifEntity(
  companyName: string,
  countryName?: string,
  timeoutMs = 2400
): Promise<GleifEntityMatch | null> {
  const cleanName = String(companyName || "")
    .replace(/\b(inc|llc|ltd|limited|gmbh|ag|corp|corporation|pvt|pty|plc|co\.?)\b\.?/gi, "")
    .replace(/[^a-zA-Z0-9\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanName.length < 3) return null;
  const iso2 = resolveIso2CountryCode(countryName);
  const cacheKey = `${cleanName.toLowerCase()}::${iso2}`;
  if (gleifCache.has(cacheKey)) return gleifCache.get(cacheKey) || null;

  try {
    const params = new URLSearchParams({
      "filter[entity.legalName]": cleanName,
      "page[size]": "3",
    });
    if (iso2) {
      params.set("filter[entity.legalAddress.country]", iso2);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://api.gleif.org/api/v1/lei-records?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        "Accept": "application/vnd.api+json",
        "User-Agent": "USMAN-AI-GTM/1.0 (B2B Lead Research)",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      boundedSet(gleifCache, cacheKey, null);
      return null;
    }

    const json = await res.json();
    const items: any[] = Array.isArray(json?.data) ? json.data : [];
    const active = items.find((it) => it?.attributes?.entity?.status === "ACTIVE") || items[0];
    if (!active?.attributes?.entity) {
      boundedSet(gleifCache, cacheKey, null);
      return null;
    }

    const entity = active.attributes.entity;
    const legalName = String(entity?.legalName?.name || "").trim();
    const tokens = cleanName.toLowerCase().split(" ").filter((t) => t.length >= 3);
    const matched = tokens.length > 0 && tokens.every((t) => legalName.toLowerCase().includes(t));
    if (!matched) {
      boundedSet(gleifCache, cacheKey, null);
      return null;
    }

    const hq = entity.headquartersAddress || entity.legalAddress || {};
    const lei = String(active.id || active.attributes.lei || "").trim();
    const match: GleifEntityMatch = {
      lei,
      legalName,
      countryCode: String(hq.country || iso2 || ""),
      city: String(hq.city || ""),
      addressLines: Array.isArray(hq.addressLines) ? hq.addressLines : [],
      postalCode: String(hq.postalCode || ""),
      entityStatus: String(entity.status || "ACTIVE"),
      jurisdiction: String(entity.jurisdiction || ""),
      registryUrl: `https://search.gleif.org/#/record/${lei}`,
    };

    boundedSet(gleifCache, cacheKey, match);
    return match;
  } catch {
    boundedSet(gleifCache, cacheKey, null);
    return null;
  }
}

/**
 * Optional UK Companies House REST API Search.
 * Active ONLY when `COMPANIES_HOUSE_API_KEY` env var is provided and target country is UK.
 */
export async function searchUkCompaniesHouse(
  query: string,
  city?: string,
  limit = 10
): Promise<{
  configured: boolean;
  companies: CompaniesHouseMatch[];
  error?: string;
}> {
  const apiKey = (process.env.COMPANIES_HOUSE_API_KEY || "").trim();
  if (!apiKey || apiKey.length < 8) {
    return { configured: false, companies: [] };
  }

  try {
    const qStr = [query.trim(), city?.trim()].filter(Boolean).join(" ");
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(qStr)}&items_per_page=${Math.min(limit, 20)}`,
      {
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      }
    );
    clearTimeout(timer);

    if (!res.ok) {
      return {
        configured: true,
        companies: [],
        error: `Companies House API HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    const active = items
      .filter((it) => String(it.company_status || "").toLowerCase() === "active" && it.title)
      .map((it) => ({
        companyNumber: String(it.company_number || ""),
        companyName: String(it.title || "").trim(),
        companyStatus: String(it.company_status || "active"),
        companyType: String(it.company_type || ""),
        locality: String(it.address?.locality || ""),
        postalCode: String(it.address?.postal_code || ""),
        addressSnippet: String(it.address_snippet || ""),
        dateOfCreation: it.date_of_creation || undefined,
        registryUrl: `https://find-and-update.company-information.service.gov.uk/company/${it.company_number}`,
      }));

    return { configured: true, companies: active };
  } catch (err: any) {
    return {
      configured: true,
      companies: [],
      error: err?.message || "Companies House lookup error",
    };
  }
}

/**
 * Lightweight cached RDAP lookup for domain registration context (single-lead enrichment only).
 */
export async function lookupRdapDomainMeta(
  websiteOrDomain: string,
  timeoutMs = 2200
): Promise<RdapDomainMeta | null> {
  const domain = extractOwnedCompanyDomain(websiteOrDomain);
  if (!domain) return null;
  if (rdapCache.has(domain)) return rdapCache.get(domain) || null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "application/rdap+json, application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) {
      boundedSet(rdapCache, domain, null);
      return null;
    }

    const data = await res.json();
    const events: any[] = Array.isArray(data?.events) ? data.events : [];
    const regEvent = events.find((e) => e.eventAction === "registration");
    const expEvent = events.find((e) => e.eventAction === "expiration");

    let registrar = "";
    const entities: any[] = Array.isArray(data?.entities) ? data.entities : [];
    const regEntity = entities.find((en) => Array.isArray(en.roles) && en.roles.includes("registrar"));
    if (regEntity?.vcardArray?.[1]) {
      const fn = regEntity.vcardArray[1].find((row: any[]) => row[0] === "fn");
      if (fn?.[3]) registrar = String(fn[3]);
    }

    const meta: RdapDomainMeta = {
      domain,
      registrationDate: regEvent?.eventDate ? String(regEvent.eventDate).slice(0, 10) : undefined,
      expirationDate: expEvent?.eventDate ? String(expEvent.eventDate).slice(0, 10) : undefined,
      registrar: registrar || undefined,
      rdapUrl: `https://rdap.org/domain/${domain}`,
    };

    boundedSet(rdapCache, domain, meta);
    return meta;
  } catch {
    boundedSet(rdapCache, domain, null);
    return null;
  }
}

/**
 * Return current status of external free/optional providers for transparent reporting in UI & QA.
 */
export function getFreeSourceCapabilities() {
  return {
    gleif_registry: { configured: true, mode: "zero_key_public" },
    rdap_domain: { configured: true, mode: "zero_key_public" },
    dns_mx_verifier: { configured: true, mode: "native_dns" },
    website_html_inspector: { configured: true, mode: "native_http" },
    uk_companies_house: {
      configured: Boolean((process.env.COMPANIES_HOUSE_API_KEY || "").trim().length >= 8),
      env_var: "COMPANIES_HOUSE_API_KEY",
    },
    hunter_verifier: {
      configured: Boolean((process.env.HUNTER_API_KEY || "").trim().length >= 8),
      env_var: "HUNTER_API_KEY",
    },
  };
}
