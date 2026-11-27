/**
 * USMAN AI GTM — B2B Search Intelligence, Website HTML Research & Deduplication Engine
 *
 * Capabilities:
 * 1. Vertical-aware query generation (zero unwanted "importers" drift on clinics/agencies/hiring)
 * 2. Strict Email & E.164/Regional Phone extraction & normalization
 * 3. Single-pass Website HTML Intelligence Crawler:
 *    - Extracts mailto/tel/text contacts + DNS MX verification
 *    - Extracts <title>, <meta description>, social links, CMS/tech stack, /careers links, & website audit signals
 * 4. Noise/Listicle Filtering & Honest Relevance Scoring
 * 5. Cross-Platform, Country-Aware Multi-Signal Deduplication
 */

import {
  LeadUseCaseId,
  GeoSpec,
  classifyUseCaseIntent,
  canonicalCountryKey,
  extractOwnedCompanyDomain,
  isPlatformOrDirectoryHost,
  resolveGeoSpec,
} from "@/lib/b2b-verticals";
import { validateAndNormalizePhone } from "@/lib/lead-quality-engine";

export interface ExtractedSocialLinks {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

export interface WebsiteResearchSignals {
  metaTitle?: string;
  metaDescription?: string;
  socials?: ExtractedSocialLinks;
  techStack?: string[];
  careersUrl?: string;
  hiringDetected?: boolean;
  hasContactForm?: boolean;
  isHttps?: boolean;
  websiteWeaknesses?: string[];
}

export interface DiscoveredContact extends WebsiteResearchSignals {
  email: string;
  emailSourceUrl: string;
  emailStatus: string;
  phone: string;
  phoneSourceUrl: string;
  phoneStatus: string;
}

export interface QualifiedLeadItem {
  id: number;
  business_name: string;
  website: string;
  domain: string;
  email: string;
  email_source_url: string;
  email_status: string;
  phone: string;
  phone_source_url: string;
  phone_status: string;
  country: string;
  city: string;
  address: string;
  industry: string;
  category?: string;
  source_platform: string;
  original_source_url: string;
  search_keyword: string;
  search_date: string;
  search_time: string;
  saved_date: string;
  saved_time: string;
  extraction_date: string;
  extraction_time: string;
  created_at: string;
  last_verified_at?: string;
  collection_timestamp?: string;
  quality_score?: number;
  quality_category?: string;
  quality_reasons?: string[];
  relevance_score?: number;
  relevance_reasons?: string[];
  contact_requirement?: string;
  snippet?: string;
  positive_signals?: string;
  negative_signals?: string;
  missing_info?: string;
  buying_intent_category?: string;
  enrichment_data?: Record<string, any>;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  is_enriched?: boolean;
}

// Bounded crawl cache (max 600 domains to prevent unbounded memory growth)
const domainCrawlCache = new Map<string, DiscoveredContact>();

function cacheDomainResult(domain: string, result: DiscoveredContact) {
  if (domainCrawlCache.size >= 600) {
    const oldest = domainCrawlCache.keys().next().value;
    if (oldest) domainCrawlCache.delete(oldest);
  }
  domainCrawlCache.set(domain, result);
}

/**
 * Clean hostname from any URL or string (returns host even for social URLs when raw host is needed;
 * use extractOwnedCompanyDomain() whenever checking canonical company domain).
 */
export function cleanDomain(url: string): string {
  if (!url) return "";
  let clean = url.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  try {
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return clean.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

/**
 * Generate vertical-aware commercial keyword variations without appending "importers" onto clinics, agencies, or hiring searches.
 */
export function generateB2bKeywordVariations(
  rawKeyword: string,
  country?: string,
  city?: string,
  industry?: string,
  useCaseOverride?: LeadUseCaseId
): string[] {
  const kw = rawKeyword.trim();
  if (!kw) return [];

  const geo = resolveGeoSpec(country, city);
  const locStr = [geo.cityName, geo.countryName !== "Global" ? geo.countryName : ""].filter(Boolean).join(" ");
  const useCase = useCaseOverride || classifyUseCaseIntent(kw);
  const withLoc = (term: string) => (locStr ? `${term} ${locStr}`.trim() : term.trim());

  const variations: string[] = [withLoc(kw)];

  if (useCase === "wholesale_manufacturing") {
    variations.push(withLoc(`${kw} suppliers`), withLoc(`${kw} manufacturers`), withLoc(`${kw} distributors`));
  } else if (useCase === "hiring_signals") {
    variations.push(withLoc(`${kw} careers`), withLoc(`hiring ${kw} jobs`), withLoc(`${kw} open position`));
  } else if (useCase === "ecommerce_shopify") {
    variations.push(withLoc(`${kw} store`), withLoc(`${kw} shopify`), withLoc(`${kw} shop online`));
  } else if (useCase === "agency_web_audit") {
    variations.push(withLoc(`${kw} official website`), withLoc(`${kw} agency`), withLoc(`${kw} digital services`));
  } else if (useCase === "commercial_real_estate") {
    variations.push(withLoc(`${kw} brokerage`), withLoc(`${kw} commercial property`), withLoc(`${kw} leasing`));
  } else if (useCase === "decision_makers") {
    variations.push(withLoc(`${kw} founder`), withLoc(`${kw} director`), withLoc(`${kw} managing partner`));
  } else {
    variations.push(withLoc(`${kw} official website`), withLoc(`${kw} company`));
    if (industry && industry !== "Any" && industry.toLowerCase() !== kw.toLowerCase()) {
      variations.push(withLoc(`${kw} ${industry}`));
    }
  }

  return Array.from(new Set(variations.filter(Boolean)));
}

const NOISE_AGGREGATORS = [
  "yelp.com", "yellowpages.com", "bbb.org", "zoominfo.com", "dnb.com",
  "tripadvisor.com", "mapquest.com", "superpages.com", "dexknows.com", "manta.com",
  "angis.com", "angi.com", "thumbtack.com", "houzz.com", "trustpilot.com",
  "glassdoor.com", "indeed.com", "ziprecruiter.com", "monster.com", "simplyhired.com",
  "leadiq.com", "lusha.com", "apollo.io", "rocketreach.co", "adapt.io", "seamless.ai",
  "hunter.io", "contactout.com", "reddit.com", "quora.com", "pinterest.com",
  "wikipedia.org", "clutch.co", "goodfirms.co", "designrush.com", "sortlist.com",
];

/**
 * Filter out generic web page titles that do not represent genuine business identities.
 */
export function isGenericTitleText(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const genericTerms = [
    "home", "homepage", "welcome", "contact", "contact us", "contact-us",
    "about", "about us", "about-us", "privacy policy", "terms of service",
    "terms and conditions", "sign in", "login", "log in", "register",
    "shopping cart", "my account", "404 not found", "error 404", "search results",
    "untitled", "loading...", "checkout", "faq", "faqs", "help center",
    "customer support", "support", "index", "default", "impressum", "kontakt"
  ];
  if (genericTerms.includes(lower) || lower.length < 2) return true;
  if (/^(?:the\s+)?(?:best|top)\s+\d+/i.test(lower)) return true;
  return false;
}

/**
 * Detect editorial roundup lists, blogs, forums, and multi-listing aggregator search pages
 * that are NOT individual target businesses.
 */
export function isNoiseOrListicleResult(
  url: string,
  title: string,
  useCase: LeadUseCaseId
): boolean {
  const lowerUrl = (url || "").toLowerCase();
  const lowerTitle = (title || "").toLowerCase().trim();
  const host = cleanDomain(url);

  // Allow company ATS job pages strictly when searching active hiring signals
  if (
    useCase === "hiring_signals" &&
    /\b(boards\.greenhouse\.io|jobs\.lever\.co|apply\.workable\.com|jobs\.ashbyhq\.com|jobs\.smartrecruiters\.com)\b/i.test(host)
  ) {
    return false;
  }

  // Filter pure forums, Q&A, listicle aggregators, and Shopify's own platform documentation/app pages
  if (
    NOISE_AGGREGATORS.some((d) => host === d || host.endsWith("." + d)) ||
    host === "shopify.com" ||
    host === "apps.shopify.com" ||
    host === "themes.shopify.com" ||
    host === "community.shopify.com" ||
    host === "help.shopify.com"
  ) {
    return true;
  }

  // Reject clear blog roundup titles ("10 Best Dental Clinics in New York", "Top 25 Recruitment Agencies")
  if (
    /^(?:the\s+)?(?:top|best)\s+\d+\b/i.test(lowerTitle) ||
    /\b\d+\s+best\s+[a-z\s]+\b(?:in|near|for)\b/i.test(lowerTitle) ||
    /\b(?:list of|directory of)\b/i.test(lowerTitle) ||
    lowerUrl.includes("/blog/best-") ||
    lowerUrl.includes("/top-10-") ||
    lowerUrl.includes("/best-")
  ) {
    return true;
  }

  // Avoid Wikipedia/dictionary/stock-ticker pages
  if (lowerUrl.includes("/wiki/") || lowerUrl.includes("/dictionary/")) {
    return true;
  }

  return false;
}

/**
 * Clean business title into authentic company name.
 * Strips SEO slogans, separator fluff, emojis, and job-post suffixes on ATS pages.
 */
export function cleanBusinessName(rawTitle: string, linkUrl?: string, email?: string): string {
  if (!rawTitle && !email) return "";
  let name = (rawTitle || "").trim();

  // ATS job boards often title pages "Job Application for Senior Accountant at Acme Corp" or "Acme Corp - Jobs"
  if (linkUrl) {
    const atMatch = name.match(/\bat\s+([A-Z][A-Za-z0-9&.,\s-]{2,45})$/);
    if (atMatch && /\b(boards\.greenhouse\.io|jobs\.lever\.co|workable\.com|ashbyhq\.com)\b/i.test(linkUrl)) {
      name = atMatch[1].trim();
    } else if (/\bjobs\.lever\.co\/([a-zA-Z0-9_-]+)/i.test(linkUrl) && name.toLowerCase().includes(" - ")) {
      name = name.split(" - ")[0].trim();
    }
  }

  const isPromoOrQuestion =
    name.endsWith("?") || /^(is|are|do|does|why|how to|what|looking for)\b/i.test(name);
  if (isPromoOrQuestion && email) {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (local.length >= 3 && !["info", "contact", "support", "sales", "hello", "admin"].includes(local.toLowerCase())) {
      return local
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  if (linkUrl && (linkUrl.includes("instagram.com") || linkUrl.includes("facebook.com") || linkUrl.includes("tiktok.com"))) {
    const profileMatch = linkUrl.match(/(?:instagram|facebook|tiktok)\.com\/([a-zA-Z0-9._-]+)(?:\/|$)/i);
    if (
      profileMatch &&
      !["p", "reel", "reels", "stories", "tv", "groups", "posts", "watch", "share"].includes(profileMatch[1].toLowerCase())
    ) {
      const handle = profileMatch[1].replace(/[._-]+/g, " ").trim();
      if (handle.length >= 2) {
        return handle
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }

    const atHandle = name.match(/@([a-zA-Z0-9._-]+)/);
    if (atHandle && atHandle[1].length >= 3) {
      const handle = atHandle[1].replace(/[._-]+/g, " ").trim();
      return handle
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  name = name.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])/g, "").trim();
  name = name.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();

  const separators = [" - ", " | ", " : ", " • ", " – ", " — ", " :: "];
  for (const sep of separators) {
    if (name.includes(sep)) {
      const parts = name.split(sep);
      for (const p of parts) {
        const pt = p.trim();
        if (pt.length >= 2 && !isGenericTitleText(pt)) {
          name = pt;
          break;
        }
      }
    }
  }

  name = name
    .replace(/\s*(?:\||\-)?\s*(?:Home|Homepage|Official Website|Official Site|Buy Online|Shop Online|LinkedIn|Careers)\s*$/i, "")
    .trim();

  if (name.length > 60) {
    const clause = name.split(/[.,;!?]/)[0].trim();
    if (clause.length >= 3 && clause.length <= 60) {
      name = clause;
    }
  }

  return name;
}

/**
 * Extract public emails and validated phone numbers from raw HTML or snippet text.
 * Rejects image/asset fake emails, placeholder local parts, aggregator domains, and junk numeric sequences.
 */
export function extractContactsFromText(
  text: string,
  countryName?: string
): { emails: string[]; phones: string[] } {
  if (!text) return { emails: [], phones: [] };

  const rawEmails = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
  const cleanEmails = rawEmails
    .map((e) => e.replace(/\.+$/, "").trim().toLowerCase())
    .filter((e) => {
      const invalidExtensions = [
        ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".bmp",
        ".css", ".js", ".json", ".woff", ".woff2", ".ttf", ".eot", ".pdf",
      ];
      if (invalidExtensions.some((ext) => e.endsWith(ext) || e.includes(ext + "@"))) {
        return false;
      }

      const invalidDomains = [
        "example.com", "domain.com", "sentry.io", "wixpress.com", "schema.org",
        "w3.org", "github.com", "cloudflare.com", "googleapis.com", "wordpress.org",
        "email.com", "test.com", "sample.com", "yourdomain.com", "company.com",
        "site.com", "mycompany.com", "localhost", "127.0.0.1", "google.com",
        ...NOISE_AGGREGATORS,
        "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
        "youtube.com", "tiktok.com",
      ];
      const parts = e.split("@");
      if (parts.length !== 2) return false;
      const [localPart, domainPart] = parts;

      if (invalidDomains.some((d) => domainPart === d || domainPart.endsWith("." + d))) {
        return false;
      }

      const dummyLocals = [
        "yourname", "username", "name", "email", "user", "test", "demo", "sample",
        "flast", "first.last", "first_last", "firstname.lastname", "fname.lname",
        "fname", "lname", "first", "last", "user.name", "someone", "nobody", "noreply", "no-reply",
      ];
      if (dummyLocals.includes(localPart)) return false;
      if (localPart.length > 64 || localPart.length < 1) return false;

      const tld = domainPart.split(".").pop();
      if (!tld || tld.length < 2 || tld.length > 16 || /\d/.test(tld)) return false;

      return true;
    });

  // Prioritize role-generic B2B emails ONLY AFTER direct/descriptive ones? No — info@/contact@/sales@ are the gold standard when direct personal isn't there, while ignoring asset strings.
  const phoneMatches = text.match(/(?:\+\d{1,3}[-.\s]?|\(\d{2,4}\)[-.\s]?)\d{2,4}[-.\s]?\d{3,4}(?:[-.\s]?\d{2,4})?|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g) || [];
  const validPhones: string[] = [];

  for (const raw of phoneMatches) {
    const p = raw.trim();
    // Skip ISO date-like patterns (e.g. 2025-11-27 or 2024-01-2025) or year ranges
    if (/^(19|20)\d{2}[-.\s](0?\d|1[0-2])[-.\s]/.test(p)) continue;
    const checked = validateAndNormalizePhone(p, countryName);
    if (checked.valid) {
      validPhones.push(checked.normalized);
    }
  }

  return {
    emails: Array.from(new Set(cleanEmails)),
    phones: Array.from(new Set(validPhones)),
  };
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHtmlResearchFromSlice(html: string, finalUrl: string): WebsiteResearchSignals {
  const titleMatch = html.match(/<title[^>]*>([\s\S]{2,180}?)<\/title>/i);
  const metaTitle = titleMatch ? decodeBasicEntities(titleMatch[1].replace(/<[^>]+>/g, "")) : undefined;

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{8,320})["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']{8,320})["'][^>]+name=["']description["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{8,320})["']/i);
  const metaDescription = descMatch ? decodeBasicEntities(descMatch[1]) : undefined;

  const socials: ExtractedSocialLinks = {};
  const hrefs = html.match(/href=["'](https?:\/\/[^"'\s>]+)["']/gi) || [];
  let careersUrl: string | undefined;

  for (const h of hrefs) {
    const link = h.slice(6, -1).trim();
    const low = link.toLowerCase();
    if (!socials.linkedin && (low.includes("linkedin.com/company/") || low.includes("linkedin.com/in/"))) {
      socials.linkedin = link.split("?")[0];
    } else if (!socials.facebook && low.includes("facebook.com/") && !low.includes("/sharer") && !low.includes("/tr?")) {
      socials.facebook = link.split("?")[0];
    } else if (!socials.instagram && low.includes("instagram.com/") && !low.includes("/p/")) {
      socials.instagram = link.split("?")[0];
    } else if (!socials.youtube && (low.includes("youtube.com/channel/") || low.includes("youtube.com/@"))) {
      socials.youtube = link;
    } else if (!socials.twitter && (low.includes("twitter.com/") || low.includes("x.com/")) && !low.includes("/intent/")) {
      socials.twitter = link.split("?")[0];
    } else if (!socials.tiktok && low.includes("tiktok.com/@")) {
      socials.tiktok = link.split("?")[0];
    }
    if (
      !careersUrl &&
      (/\/(?:careers|jobs|join-us|work-with-us|vacancies)\b/i.test(low) ||
        /\b(boards\.greenhouse\.io|jobs\.lever\.co|apply\.workable\.com|bamboohr\.com)\b/i.test(low))
    ) {
      careersUrl = link;
    }
  }

  // Also check relative career hrefs
  if (!careersUrl) {
    const relCareer = html.match(/href=["'](\/[^"'\s>]*(?:careers|jobs|join-us|vacancies)[^"'\s>]*)["']/i);
    if (relCareer?.[1]) {
      try {
        careersUrl = new URL(relCareer[1], finalUrl).toString();
      } catch {}
    }
  }

  const techStack: string[] = [];
  const lowHtml = html.toLowerCase();
  if (lowHtml.includes("cdn.shopify.com") || lowHtml.includes("shopify.theme") || lowHtml.includes("myshopify.com")) {
    techStack.push("Shopify");
  }
  if (lowHtml.includes("woocommerce") || lowHtml.includes("wc-block")) {
    techStack.push("WooCommerce");
  }
  if (lowHtml.includes("wp-content") || lowHtml.includes("wp-includes")) {
    techStack.push("WordPress");
  }
  if (lowHtml.includes("wixstatic.com") || lowHtml.includes("x-wix-")) {
    techStack.push("Wix");
  }
  if (lowHtml.includes("squarespace.com") || lowHtml.includes("static1.squarespace")) {
    techStack.push("Squarespace");
  }
  if (lowHtml.includes("webflow.com") || lowHtml.includes("website-files.com")) {
    techStack.push("Webflow");
  }
  if (lowHtml.includes("js.hs-scripts.com") || lowHtml.includes("hubspot")) {
    techStack.push("HubSpot");
  }

  const hasContactForm = /<form[\s>][\s\S]{0,2500}(?:type=["']email["']|name=["']email["']|contact)/i.test(html);
  const isHttps = finalUrl.toLowerCase().startsWith("https://");
  const hiringDetected = Boolean(
    careersUrl || /\b(we'?re hiring|we are hiring|now hiring|open positions|current openings)\b/i.test(html)
  );

  const websiteWeaknesses: string[] = [];
  if (!isHttps) websiteWeaknesses.push("Non-HTTPS website");
  if (!metaDescription) websiteWeaknesses.push("Missing meta description");
  if (!hasContactForm) websiteWeaknesses.push("No web contact form detected");
  if (techStack.includes("Wix") || techStack.includes("Squarespace")) {
    websiteWeaknesses.push(`DIY builder (${techStack.find((t) => t === "Wix" || t === "Squarespace")})`);
  }

  return {
    ...(metaTitle ? { metaTitle } : {}),
    ...(metaDescription ? { metaDescription } : {}),
    ...(Object.keys(socials).length > 0 ? { socials } : {}),
    ...(techStack.length > 0 ? { techStack } : {}),
    ...(careersUrl ? { careersUrl } : {}),
    hiringDetected,
    hasContactForm,
    isHttps,
    websiteWeaknesses,
  };
}

/**
 * Direct Lightweight HTTP Contact & Research Crawler
 * Fetches homepage & prioritized contact pages once, extracting contacts AND SEO/social/CMS/hiring intelligence.
 */
export async function crawlWebsiteForContacts(
  domain: string,
  existingEmail?: string,
  existingPhone?: string,
  options?: {
    countryName?: string;
    extraPaths?: string[];
    checkCareers?: boolean;
  }
): Promise<DiscoveredContact> {
  const normDom = cleanDomain(domain);
  if (!normDom || normDom.length < 4 || isPlatformOrDirectoryHost(normDom)) {
    return {
      email: existingEmail || "",
      emailSourceUrl: "",
      emailStatus: existingEmail ? "Syntax Valid" : "Not Found",
      phone: existingPhone || "",
      phoneSourceUrl: "",
      phoneStatus: existingPhone ? "Source Listed" : "Not Found",
    };
  }

  if (domainCrawlCache.has(normDom)) {
    const cached = domainCrawlCache.get(normDom)!;
    return {
      ...cached,
      email: cached.email || existingEmail || "",
      emailSourceUrl: cached.emailSourceUrl || (existingEmail ? `https://${normDom}` : ""),
      emailStatus: cached.email ? cached.emailStatus : existingEmail ? "Syntax Valid" : "Not Found",
      phone: cached.phone || existingPhone || "",
      phoneSourceUrl: cached.phoneSourceUrl || (existingPhone ? `https://${normDom}` : ""),
      phoneStatus: cached.phone ? cached.phoneStatus : existingPhone ? "Source Listed" : "Not Found",
    };
  }

  let discoveredEmail = existingEmail || "";
  let emailSourceUrl = existingEmail ? `https://${normDom}` : "";
  let emailStatus = existingEmail ? "Syntax Valid" : "Not Found";

  let discoveredPhone = existingPhone || "";
  let phoneSourceUrl = existingPhone ? `https://${normDom}` : "";
  let phoneStatus = existingPhone ? "Source Listed" : "Not Found";

  const geoExtraPaths = (options?.extraPaths && options.extraPaths.length > 0
    ? options.extraPaths
    : normDom.endsWith(".de")
    ? ["/impressum", "/kontakt"]
    : []
  ).map((p) => `https://${normDom}${p}`);

  const priorityRounds: string[][] = [
    [
      `https://${normDom}`,
      `https://${normDom}/contact`,
      `https://${normDom}/contact-us`,
      ...geoExtraPaths,
    ].slice(0, 4),
    [
      `https://${normDom}/about-us`,
      `https://${normDom}/about`,
      ...(options?.checkCareers ? [`https://${normDom}/careers`, `https://${normDom}/jobs`] : [`https://${normDom}/pages/contact-us`]),
    ].slice(0, 3),
  ];

  const inspectUrl = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; UsmanAIGTM/1.0; +https://lead-scraper-mxs5.vercel.app)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
      const rawText = await res.text();
      return { finalUrl: res.url || url, bodySlice: rawText.slice(0, 120000) };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  };

  let research: WebsiteResearchSignals = {};

  for (const round of priorityRounds) {
    if (discoveredEmail && discoveredPhone && research.metaTitle && (!options?.checkCareers || research.careersUrl)) {
      break;
    }
    const settled = await Promise.all(round.map((u) => inspectUrl(u)));
    for (const page of settled) {
      if (!page) continue;
      const { finalUrl, bodySlice } = page;

      // Capture rich HTML research (prioritize homepage title/description + merge socials/tech/careers)
      const sig = extractHtmlResearchFromSlice(bodySlice, finalUrl);
      research = {
        metaTitle: research.metaTitle || sig.metaTitle,
        metaDescription: research.metaDescription || sig.metaDescription,
        socials: { ...(sig.socials || {}), ...(research.socials || {}) },
        techStack: Array.from(new Set([...(research.techStack || []), ...(sig.techStack || [])])),
        careersUrl: research.careersUrl || sig.careersUrl,
        hiringDetected: Boolean(research.hiringDetected || sig.hiringDetected),
        hasContactForm: Boolean(research.hasContactForm || sig.hasContactForm),
        isHttps: research.isHttps !== undefined ? research.isHttps : sig.isHttps,
        websiteWeaknesses: Array.from(
          new Set([...(research.websiteWeaknesses || []), ...(sig.websiteWeaknesses || [])])
        ),
      };

      if (!discoveredEmail) {
        const mailtoMatches = bodySlice.match(/href=["']mailto:([^"'>?]+)/gi) || [];
        for (const m of mailtoMatches) {
          const clean = m.replace(/href=["']mailto:/i, "").trim().toLowerCase();
          const { emails } = extractContactsFromText(clean, options?.countryName);
          if (emails.length > 0) {
            discoveredEmail = emails[0];
            emailSourceUrl = finalUrl;
            emailStatus = "Syntax Valid";
            break;
          }
        }
      }

      if (!discoveredPhone) {
        const telMatches = bodySlice.match(/href=["']tel:([^"'>]+)/gi) || [];
        for (const t of telMatches) {
          const clean = t.replace(/href=["']tel:/i, "").replace(/[^0-9+\s\-()]/g, "").trim();
          const checked = validateAndNormalizePhone(clean, options?.countryName);
          if (checked.valid) {
            discoveredPhone = checked.normalized;
            phoneSourceUrl = finalUrl;
            phoneStatus = "Format Valid";
            break;
          }
        }
      }

      if (!discoveredEmail || !discoveredPhone) {
        const stripped = bodySlice
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
          .replace(/<[^>]+>/g, " ");

        const { emails, phones } = extractContactsFromText(stripped, options?.countryName);
        if (!discoveredEmail && emails.length > 0) {
          discoveredEmail = emails[0];
          emailSourceUrl = finalUrl;
          emailStatus = "Syntax Valid";
        }
        if (!discoveredPhone && phones.length > 0) {
          discoveredPhone = phones[0];
          phoneSourceUrl = finalUrl;
          phoneStatus = "Format Valid";
        }
      }
    }
  }

  let finalEmail = discoveredEmail;
  let finalEmailStatus = emailStatus;
  let finalPhone = discoveredPhone;
  let finalPhoneStatus = phoneStatus;

  if (finalEmail || finalPhone) {
    try {
      const { verifyLeadEmailTruthfully, evaluatePhoneQualityTruthfully } = await import("@/lib/contact-verification");
      if (finalEmail) {
        const emailCheck = await verifyLeadEmailTruthfully(finalEmail, { resolveMx: true });
        finalEmail = emailCheck.email || finalEmail;
        finalEmailStatus = emailCheck.displayLabel;
      }
      if (finalPhone) {
        const phoneCheck = evaluatePhoneQualityTruthfully(finalPhone, options?.countryName, phoneSourceUrl);
        finalPhone = phoneCheck.normalized || finalPhone;
        finalPhoneStatus = phoneCheck.displayLabel;
      }
    } catch {
      // Preserve verified syntax results if DNS environment throttles
    }
  }

  const result: DiscoveredContact = {
    email: finalEmail,
    emailSourceUrl,
    emailStatus: finalEmailStatus,
    phone: finalPhone,
    phoneSourceUrl,
    phoneStatus: finalPhoneStatus,
    ...research,
  };

  cacheDomainResult(normDom, result);
  return result;
}

/**
 * Fallback Domain Contact Resolution via Targeted Serper Site Query.
 */
export async function querySerperForDomainContact(
  domain: string,
  apiKey: string,
  countryName?: string
): Promise<{ email: string; emailSourceUrl: string; phone: string; phoneSourceUrl: string }> {
  const normDom = cleanDomain(domain);
  if (!normDom || normDom.length < 4 || isPlatformOrDirectoryHost(normDom)) {
    return { email: "", emailSourceUrl: "", phone: "", phoneSourceUrl: "" };
  }

  const query = `site:${normDom} contact OR email OR impressum OR "info@" OR "hello@"`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 3 }),
    });
    clearTimeout(timer);

    if (!res.ok) return { email: "", emailSourceUrl: "", phone: "", phoneSourceUrl: "" };
    const data = await res.json();
    const organic = data.organic || [];

    for (const item of organic) {
      const text = `${item.snippet || ""} ${item.title || ""}`;
      const { emails, phones } = extractContactsFromText(text, countryName);
      if (emails.length > 0 || phones.length > 0) {
        return {
          email: emails[0] || "",
          emailSourceUrl: item.link || `https://${normDom}/contact`,
          phone: phones[0] || "",
          phoneSourceUrl: item.link || `https://${normDom}/contact`,
        };
      }
    }
  } catch {
    // Timeout
  }
  return { email: "", emailSourceUrl: "", phone: "", phoneSourceUrl: "" };
}

/**
 * Deterministic relevance scorer [0..100] checking query intent, industry keywords, geo evidence, and signals.
 */
export function computeLeadRelevanceScore(params: {
  businessName: string;
  title?: string;
  snippet?: string;
  url?: string;
  ownedDomain?: string;
  keyword: string;
  useCase: LeadUseCaseId;
  geo: GeoSpec;
  research?: WebsiteResearchSignals;
}): { score: number; reasons: string[] } {
  let score = 35;
  const reasons: string[] = [];
  const haystack = `${params.businessName} ${params.title || ""} ${params.snippet || ""} ${params.research?.metaTitle || ""} ${params.research?.metaDescription || ""}`.toLowerCase();

  // 1. Keyword token match
  const stopWords = new Set(["the", "and", "for", "with", "in", "of", "companies", "firms", "businesses", "agencies", "stores", "services"]);
  const tokens = params.keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t));

  if (tokens.length > 0) {
    const matched = tokens.filter((t) => haystack.includes(t) || (params.ownedDomain || "").includes(t));
    const ratio = matched.length / tokens.length;
    if (ratio >= 0.8) {
      score += 25;
      reasons.push(`Strong keyword match (${matched.join(", ")})`);
    } else if (ratio >= 0.4) {
      score += 14;
      reasons.push(`Partial keyword match (${matched.join(", ")})`);
    }
  }

  // 2. Geographic relevance match
  if (params.geo.cityName && haystack.includes(params.geo.cityName.toLowerCase())) {
    score += 15;
    reasons.push(`Matched city: ${params.geo.cityName}`);
  }
  if (params.geo.countryName !== "Global") {
    const tldMatched = params.geo.preferredTlds.some((tld) => (params.ownedDomain || "").endsWith(tld) && tld !== ".com");
    const aliasMatched = params.geo.countryAliases.some((a) => haystack.includes(a));
    if (tldMatched || aliasMatched) {
      score += 12;
      reasons.push(`Matched region: ${params.geo.countryName}`);
    }
  }

  // 3. Use-case specific signal confirmation
  if (params.useCase === "ecommerce_shopify") {
    if (params.research?.techStack?.includes("Shopify") || haystack.includes("shopify")) {
      score += 20;
      reasons.push("Shopify platform detected");
    }
  } else if (params.useCase === "hiring_signals") {
    if (params.research?.hiringDetected || /\b(hiring|careers|jobs|apply|vacancy|openings)\b/i.test(`${haystack} ${params.url || ""}`)) {
      score += 20;
      reasons.push("Active hiring/career evidence detected");
    }
  } else if (params.ownedDomain) {
    score += 8;
    reasons.push("Official business domain");
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}

/**
 * Multi-Signal, Country-Aware Deduplication & Evidence Merging.
 * Identity signals:
 * 1. Canonical Owned Domain (ignoring platform/directory hosts)
 * 2. Normalized Email
 * 3. Normalized Phone
 * 4. Normalized Business Name + Country (`name::country`)
 */
export function mergeLeadIntoList(
  leadsList: QualifiedLeadItem[],
  newLead: QualifiedLeadItem,
  seenDomains: Set<string>,
  seenNames: Set<string>,
  seenEmails: Set<string>,
  seenPhones?: Set<string>
): boolean {
  const normDom = extractOwnedCompanyDomain(newLead.domain || newLead.website);
  const normName = (newLead.business_name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const countryKey = canonicalCountryKey(newLead.country);
  const scopedNameKey = normName ? `${normName}::${countryKey}` : "";
  const normEmail = (newLead.email || "").toLowerCase().trim();
  const normPhone = (newLead.phone || "").replace(/[^0-9+]/g, "").trim();

  const hasSeenDom = Boolean(normDom && seenDomains.has(normDom));
  const hasSeenName = Boolean(scopedNameKey && seenNames.has(scopedNameKey));
  const hasSeenEmail = Boolean(normEmail && seenEmails.has(normEmail));
  const hasSeenPhone = Boolean(normPhone.length >= 7 && seenPhones?.has(normPhone));

  if (hasSeenDom || hasSeenName || hasSeenEmail || hasSeenPhone) {
    const existing = leadsList.find((l) => {
      const eDom = extractOwnedCompanyDomain(l.domain || l.website);
      const eName = (l.business_name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
      const eCountry = canonicalCountryKey(l.country);
      const eEmail = (l.email || "").toLowerCase().trim();
      const ePhone = (l.phone || "").replace(/[^0-9+]/g, "").trim();
      return (
        (normDom && eDom && normDom === eDom) ||
        (normEmail && eEmail && normEmail === eEmail) ||
        (normPhone.length >= 7 && ePhone && normPhone === ePhone) ||
        (normName && eName && normName === eName && countryKey === eCountry)
      );
    });

    if (existing) {
      if (!existing.email && newLead.email) {
        existing.email = newLead.email;
        existing.email_source_url = newLead.email_source_url;
        existing.email_status = newLead.email_status;
      } else if (
        existing.email &&
        newLead.email &&
        existing.email_status &&
        !existing.email_status.includes("Domain Valid") &&
        newLead.email_status?.includes("Domain Valid")
      ) {
        existing.email = newLead.email;
        existing.email_source_url = newLead.email_source_url;
        existing.email_status = newLead.email_status;
      }

      if (!existing.phone && newLead.phone) {
        existing.phone = newLead.phone;
        existing.phone_source_url = newLead.phone_source_url;
        existing.phone_status = newLead.phone_status;
      }
      if (!existing.website && newLead.website) existing.website = newLead.website;
      if (!existing.domain && normDom) existing.domain = normDom;
      if (!existing.linkedin && newLead.linkedin) existing.linkedin = newLead.linkedin;
      if (!existing.instagram && newLead.instagram) existing.instagram = newLead.instagram;
      if (!existing.facebook && newLead.facebook) existing.facebook = newLead.facebook;
      if (!existing.twitter && newLead.twitter) existing.twitter = newLead.twitter;
      if (!existing.youtube && newLead.youtube) existing.youtube = newLead.youtube;
      if (!existing.tiktok && newLead.tiktok) existing.tiktok = newLead.tiktok;
      if (!existing.positive_signals && newLead.positive_signals) {
        existing.positive_signals = newLead.positive_signals;
      }
      if (newLead.source_platform && !existing.source_platform.includes(newLead.source_platform)) {
        existing.source_platform = `${existing.source_platform} • ${newLead.source_platform}`;
      }
      if ((!existing.address || existing.address.length < 5) && newLead.address) {
        existing.address = newLead.address;
      }
    }
    return false;
  }

  if (normDom) seenDomains.add(normDom);
  if (scopedNameKey) seenNames.add(scopedNameKey);
  if (normEmail) seenEmails.add(normEmail);
  if (normPhone.length >= 7 && seenPhones) seenPhones.add(normPhone);

  leadsList.push(newLead);
  return true;
}
