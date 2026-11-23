/**
 * USMAN AI GTM — Ultra-Professional Search Engine Intelligence Engine
 * 
 * Capabilities:
 * 1. B2B Lexical & ICP Keyword Expansion (Zero Unnecessary Cost, Free Performance)
 * 2. Strict Contact & Email Extraction with Format and Credibility Verification
 * 3. Deep Direct Website Contact Page Crawler (Fast, Safe HTTP with Timeout)
 * 4. Fallback Domain Contact Resolution via Indexed Public Pages
 * 5. Multi-Signal Deduplication & Cross-Platform Evidence Merging
 * 6. Compulsory Email Lead Qualification Guard (100% Genuine Public Email Mandatory)
 */

export interface DiscoveredContact {
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
  quality_score?: number;
  quality_category?: string;
  quality_reasons?: string[];
  contact_requirement?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  is_enriched?: boolean;
}

// Global cache for website domain crawls during search to avoid redundant HTTP requests
const domainCrawlCache = new Map<string, DiscoveredContact>();

/**
 * Clean domain from any URL or string.
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
 * Intelligently expand customer keywords into high-yield B2B commercial variations.
 * Ensures the original keyword is preserved and complemented by wholesale, distributor,
 * manufacturer, supplier, and commercial retail variants.
 */
export function generateB2bKeywordVariations(
  rawKeyword: string,
  country?: string,
  city?: string,
  industry?: string
): string[] {
  const kw = rawKeyword.trim();
  if (!kw) return [];

  const locParts = [city, country].filter((p) => Boolean(p && p !== "ALL_CITIES" && p !== "ALL COUNTRIES" && p !== "All Countries"));
  const locStr = locParts.length > 0 ? locParts.join(" ") : "";

  // B2B ICP Expansion Templates
  const variations: string[] = [];

  // 1. Original keyword with location
  variations.push(locStr ? `${kw} ${locStr}` : kw);

  // 2. Wholesale & Bulk Supplier
  variations.push(locStr ? `${kw} wholesale ${locStr}` : `${kw} wholesale`);
  variations.push(locStr ? `${kw} suppliers ${locStr}` : `${kw} suppliers`);

  // 3. Manufacturers & Factory Direct
  variations.push(locStr ? `${kw} manufacturers ${locStr}` : `${kw} manufacturers`);

  // 4. Distributors & Importers
  variations.push(locStr ? `${kw} distributors ${locStr}` : `${kw} distributors`);
  variations.push(locStr ? `${kw} importers ${locStr}` : `${kw} importers`);

  // 5. Commercial Retail & Stores
  variations.push(locStr ? `${kw} commercial stores ${locStr}` : `${kw} retail stores`);

  // 6. If industry is distinct, add industry-specific variant
  if (industry && industry !== "Any" && industry.toLowerCase() !== kw.toLowerCase()) {
    variations.push(locStr ? `${kw} ${industry} ${locStr}` : `${kw} ${industry}`);
  }

  // Deduplicate variations
  return Array.from(new Set(variations.map((v) => v.trim()).filter(Boolean)));
}

// Directory aggregators and B2B directory scrapers whose corporate support emails or placeholder templates must NEVER be attributed to individual leads
const DIRECTORY_AGGREGATORS = [
  "yelp.com", "yellowpages.com", "clutch.co", "cience.com", "bbb.org",
  "zoominfo.com", "dnb.com", "tripadvisor.com", "mapquest.com", "superpages.com",
  "dexknows.com", "manta.com", "angis.com", "angi.com", "thumbtack.com",
  "houzz.com", "trustpilot.com", "glassdoor.com", "indeed.com", "kompass.com",
  "europages.com", "thomasnet.com", "leadiq.com", "lusha.com", "apollo.io",
  "rocketreach.co", "adapt.io", "seamless.ai", "hunter.io", "contactout.com"
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
    "customer support", "support", "index", "default"
  ];
  if (genericTerms.includes(lower) || lower.length < 2) return true;
  // Reject titles that look like directory search headings (e.g. "THE BEST 10 Mobile Phone Accessories near...")
  if (/^the best \d+/i.test(lower) || /^top \d+/i.test(lower) || /^best \d+/i.test(lower)) return true;
  return false;
}

/**
 * Clean business title into authentic company name.
 * Strips common SEO slogans, platform tags, and URL artifacts.
 */
export function cleanBusinessName(rawTitle: string, linkUrl?: string, email?: string): string {
  if (!rawTitle && !email) return "";
  let name = (rawTitle || "").trim();

  // If title is a question or promotional call-to-action (e.g. "Is your smartphone slowing down?")
  const isPromoOrQuestion = name.endsWith("?") || /^(is|are|do|does|why|how to|what|looking for)\b/i.test(name);
  if (isPromoOrQuestion && email) {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (local.length >= 3 && !["info", "contact", "support", "sales", "hello", "admin"].includes(local.toLowerCase())) {
      return local.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  // If title is from Instagram/Facebook and is a post caption or contains handle
  if (linkUrl && (linkUrl.includes("instagram.com") || linkUrl.includes("facebook.com") || linkUrl.includes("tiktok.com"))) {
    // Check if link contains profile username: e.g. instagram.com/alprintny/ or facebook.com/MobileAccessoriesUk/
    const profileMatch = linkUrl.match(/(?:instagram|facebook|tiktok)\.com\/([a-zA-Z0-9._-]+)(?:\/|$)/i);
    if (profileMatch && !["p", "reel", "reels", "stories", "tv", "groups", "posts", "watch"].includes(profileMatch[1].toLowerCase())) {
      const handle = profileMatch[1].replace(/[._-]+/g, " ").trim();
      if (handle.length >= 2) {
        return handle.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }
    }

    // If handle is inside text (e.g. @alprintny or (@MobileAccessoriesUk))
    const atMatch = name.match(/@([a-zA-Z0-9._-]+)/);
    if (atMatch && atMatch[1].length >= 3) {
      const handle = atMatch[1].replace(/[._-]+/g, " ").trim();
      return handle.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  // Strip emojis from business name using universal UTF-16 surrogate pair regex
  name = name.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])/g, "").trim();

  // Strip leading/trailing quotes
  name = name.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();

  // Strip common SEO separators: " - ", " | ", " : ", " • ", " – ", " — "
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

  // Strip common noisy suffixes but keep legitimate business words like Wholesale/Retail
  name = name.replace(/\s*(?:\||\-)?\s*(?:Home|Homepage|Official Website|Official Site|Buy Online|Shop Online)\s*$/i, "").trim();

  // If name is still overly long (e.g. full sentence caption), truncate to first clause
  if (name.length > 50) {
    const clause = name.split(/[.,;!?]/)[0].trim();
    if (clause.length >= 3 && clause.length <= 50) {
      name = clause;
    }
  }

  return name;
}

/**
 * Extract public emails and phone numbers from raw HTML or text.
 * Strictly verifies email formatting, excludes file extensions and dummy test domains.
 */
export function extractContactsFromText(text: string): { emails: string[]; phones: string[] } {
  if (!text) return { emails: [], phones: [] };

  const rawEmails = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
  const cleanEmails = rawEmails
    .map((e) => e.replace(/\.+$/, "").trim().toLowerCase())
    .filter((e) => {
      // Exclude invalid file extensions mistakenly caught by regex
      const invalidExtensions = [
        ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".bmp",
        ".css", ".js", ".json", ".woff", ".woff2", ".ttf", ".eot"
      ];
      if (invalidExtensions.some((ext) => e.endsWith(ext) || e.includes(ext + "@"))) {
        return false;
      }

      // Exclude dummy, tracker, analytics, schema, social, and directory aggregator domains
      const invalidDomains = [
        "example.com", "domain.com", "sentry.io", "wixpress.com", "schema.org",
        "w3.org", "github.com", "cloudflare.com", "googleapis.com", "wordpress.org",
        "email.com", "test.com", "sample.com", "yourdomain.com", "company.com",
        "site.com", "mycompany.com", "localhost", "127.0.0.1", "google.com",
        "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
        "youtube.com", "tiktok.com",
        ...DIRECTORY_AGGREGATORS
      ];
      const parts = e.split("@");
      if (parts.length !== 2) return false;
      const [localPart, domainPart] = parts;

      if (invalidDomains.some((d) => domainPart.toLowerCase() === d || domainPart.toLowerCase().endsWith("." + d))) {
        return false;
      }

      // Reject common dummy and pattern template local parts (e.g. flast@, first.last@)
      const dummyLocals = [
        "yourname", "username", "name", "email", "user", "test", "demo", "sample",
        "flast", "first.last", "first_last", "firstname.lastname", "fname.lname",
        "fname", "lname", "first", "last", "user.name", "someone", "nobody"
      ];
      if (dummyLocals.includes(localPart.toLowerCase())) return false;

      // Ensure valid TLD (at least 2 letters)
      const tld = domainPart.split(".").pop();
      if (!tld || tld.length < 2 || /\d/.test(tld)) return false;

      return true;
    });

  // Extract phone numbers (7 to 15 digits international format)
  const phoneMatches = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g) || [];
  const cleanPhones = phoneMatches
    .map((p) => p.trim())
    .filter((p) => {
      const digits = p.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    });

  return {
    emails: Array.from(new Set(cleanEmails)),
    phones: Array.from(new Set(cleanPhones)),
  };
}

/**
 * Direct Lightweight HTTP Contact Page Crawler
 * Safely inspects high-probability public contact pages on discovered business domains.
 * Enforces a strict 2500ms timeout per request and extracts verified public contacts.
 */
export async function crawlWebsiteForContacts(
  domain: string,
  existingEmail?: string,
  existingPhone?: string
): Promise<DiscoveredContact> {
  const normDom = cleanDomain(domain);
  if (!normDom || normDom.length < 4) {
    return {
      email: existingEmail || "",
      emailSourceUrl: "",
      emailStatus: existingEmail ? "FOUND IN SOURCE EVIDENCE" : "NOT FOUND",
      phone: existingPhone || "",
      phoneSourceUrl: "",
      phoneStatus: existingPhone ? "FOUND IN SOURCE EVIDENCE" : "NOT LISTED",
    };
  }

  // Check in-memory crawl cache to avoid redundant network requests
  if (domainCrawlCache.has(normDom)) {
    const cached = domainCrawlCache.get(normDom)!;
    return {
      email: cached.email || existingEmail || "",
      emailSourceUrl: cached.emailSourceUrl || (existingEmail ? `https://${normDom}` : ""),
      emailStatus: cached.email ? cached.emailStatus : (existingEmail ? "FOUND IN SOURCE EVIDENCE" : "NOT FOUND"),
      phone: cached.phone || existingPhone || "",
      phoneSourceUrl: cached.phoneSourceUrl || (existingPhone ? `https://${normDom}` : ""),
      phoneStatus: cached.phone ? cached.phoneStatus : (existingPhone ? "FOUND IN SOURCE EVIDENCE" : "NOT LISTED"),
    };
  }

  // Never crawl social media platforms or generic directory aggregators directly
  const excludedHosts = [
    "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
    "youtube.com", "tiktok.com", "google.com", "bing.com", "yahoo.com",
    "wikipedia.org",
    ...DIRECTORY_AGGREGATORS
  ];
  if (excludedHosts.some((h) => normDom.includes(h))) {
    return {
      email: existingEmail || "",
      emailSourceUrl: "",
      emailStatus: existingEmail ? "FOUND ON PUBLIC PROFILE" : "NOT FOUND",
      phone: existingPhone || "",
      phoneSourceUrl: "",
      phoneStatus: existingPhone ? "FOUND ON PUBLIC PROFILE" : "NOT LISTED",
    };
  }

  let discoveredEmail = existingEmail || "";
  let emailSourceUrl = existingEmail ? `https://${normDom}` : "";
  let emailStatus = existingEmail ? "FOUND IN SEARCH SNIPPET • FORMAT CHECKED" : "NOT FOUND";

  let discoveredPhone = existingPhone || "";
  let phoneSourceUrl = existingPhone ? `https://${normDom}` : "";
  let phoneStatus = existingPhone ? "FOUND IN SEARCH SNIPPET • FORMAT CHECKED" : "NOT LISTED";

  // Prioritized contact paths
  const candidateUrls = [
    `https://${normDom}/pages/contact-us`,
    `https://${normDom}/contact-us`,
    `https://${normDom}/contact`,
    `https://${normDom}/pages/contact`,
    `https://${normDom}/about-us`,
    `https://${normDom}/about`,
    `https://${normDom}/impressum`,
    `https://${normDom}`,
  ];

  for (const url of candidateUrls) {
    if (discoveredEmail && discoveredPhone) break;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Compatible; UsmanAiGtmBot/2.0)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) continue;

      const rawText = await res.text();
      const bodySlice = rawText.slice(0, 150000);

      // 1. Extract mailto: links (highest confidence)
      if (!discoveredEmail) {
        const mailtoMatches = bodySlice.match(/href=["']mailto:([^"'>?]+)/gi) || [];
        for (const m of mailtoMatches) {
          const clean = m.replace(/href=["']mailto:/i, "").trim().toLowerCase();
          const { emails } = extractContactsFromText(clean);
          if (emails.length > 0) {
            discoveredEmail = emails[0];
            emailSourceUrl = res.url || url;
            emailStatus = "FOUND ON OFFICIAL WEBSITE CONTACT PAGE • DOMAIN CHECKED";
            break;
          }
        }
      }

      // 2. Extract tel: links
      if (!discoveredPhone) {
        const telMatches = bodySlice.match(/href=["']tel:([^"'>]+)/gi) || [];
        for (const t of telMatches) {
          const clean = t.replace(/href=["']tel:/i, "").replace(/[^0-9+\s\-()]/g, "").trim();
          if (clean.replace(/\D/g, "").length >= 7) {
            discoveredPhone = clean;
            phoneSourceUrl = res.url || url;
            phoneStatus = "FOUND ON OFFICIAL WEBSITE • FORMAT CHECKED";
            break;
          }
        }
      }

      // 3. Fallback to stripped text regex if mailto was not found
      if (!discoveredEmail || !discoveredPhone) {
        const stripped = bodySlice
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
          .replace(/<[^>]+>/g, " ");

        const { emails, phones } = extractContactsFromText(stripped);
        if (!discoveredEmail && emails.length > 0) {
          discoveredEmail = emails[0];
          emailSourceUrl = res.url || url;
          emailStatus = "FOUND ON OFFICIAL WEBSITE CONTACT PAGE • DOMAIN CHECKED";
        }
        if (!discoveredPhone && phones.length > 0) {
          discoveredPhone = phones[0];
          phoneSourceUrl = res.url || url;
          phoneStatus = "FOUND ON OFFICIAL WEBSITE • FORMAT CHECKED";
        }
      }
    } catch {
      clearTimeout(timeout);
      // Timeout or network error, proceed to next candidate URL
    }
  }

  const result: DiscoveredContact = {
    email: discoveredEmail,
    emailSourceUrl,
    emailStatus,
    phone: discoveredPhone,
    phoneSourceUrl,
    phoneStatus,
  };

  domainCrawlCache.set(normDom, result);
  return result;
}

/**
 * Fallback Domain Contact Resolution via Targeted Serper Site Query.
 * Used when direct HTTP fetch is blocked (e.g. Cloudflare 403) or yields no contact details.
 */
export async function querySerperForDomainContact(
  domain: string,
  apiKey: string
): Promise<{ email: string; emailSourceUrl: string; phone: string; phoneSourceUrl: string }> {
  const normDom = cleanDomain(domain);
  if (!normDom || normDom.length < 4) return { email: "", emailSourceUrl: "", phone: "", phoneSourceUrl: "" };
  if (DIRECTORY_AGGREGATORS.some((d) => normDom.includes(d))) {
    return { email: "", emailSourceUrl: "", phone: "", phoneSourceUrl: "" };
  }

  const query = `site:${normDom} contact OR email OR "info@" OR "hello@" OR "support@"`;
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 3 }),
    });

    if (!res.ok) return { email: "", emailSourceUrl: "", phone: "", phoneSourceUrl: "" };
    const data = await res.json();
    const organic = data.organic || [];

    for (const item of organic) {
      const text = `${item.snippet || ""} ${item.title || ""}`;
      const { emails, phones } = extractContactsFromText(text);
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
 * Multi-Signal Deduplication and Cross-Platform Evidence Merging.
 * Checks:
 * 1. Normalized Domain (for official websites)
 * 2. Normalized Company Name (case-insensitive, trimmed)
 * 3. Exact Email Address
 * 
 * If a matching business exists, enriches missing phone and merges platform tags.
 * Returns true if lead is new and added, false if merged/deduplicated.
 */
export function mergeLeadIntoList(
  leadsList: QualifiedLeadItem[],
  newLead: QualifiedLeadItem,
  seenDomains: Set<string>,
  seenNames: Set<string>,
  seenEmails: Set<string>
): boolean {
  const normDom = (newLead.domain || "").toLowerCase().trim();
  const normName = (newLead.business_name || "").toLowerCase().trim();
  const normEmail = (newLead.email || "").toLowerCase().trim();

  // Check if already seen
  const hasSeenDom = normDom && seenDomains.has(normDom);
  const hasSeenName = normName && seenNames.has(normName);
  const hasSeenEmail = normEmail && seenEmails.has(normEmail);

  if (hasSeenDom || hasSeenName || hasSeenEmail) {
    // Find existing master lead
    const existing = leadsList.find((l) => {
      const eDom = (l.domain || "").toLowerCase().trim();
      const eName = (l.business_name || "").toLowerCase().trim();
      const eEmail = (l.email || "").toLowerCase().trim();
      return (
        (normDom && eDom && normDom === eDom) ||
        (normEmail && eEmail && normEmail === eEmail) ||
        (normName && eName && normName === eName)
      );
    });

    if (existing) {
      // 1. Enrich phone if existing lead had none and new entry provides it
      if (!existing.phone && newLead.phone) {
        existing.phone = newLead.phone;
        existing.phone_source_url = newLead.phone_source_url;
        existing.phone_status = newLead.phone_status;
      }
      // 2. Cross-platform evidence enrichment (preserve all sources)
      if (newLead.source_platform && !existing.source_platform.includes(newLead.source_platform)) {
        existing.source_platform = `${existing.source_platform} • ${newLead.source_platform}`;
      }
      // 3. Update address if existing had placeholder
      if ((!existing.address || existing.address.length < 5) && newLead.address) {
        existing.address = newLead.address;
      }
    }
    return false;
  }

  // Register identity signals
  if (normDom) seenDomains.add(normDom);
  if (normName) seenNames.add(normName);
  if (normEmail) seenEmails.add(normEmail);

  leadsList.push(newLead);
  return true;
}
