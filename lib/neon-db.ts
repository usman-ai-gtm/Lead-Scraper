import { neon } from "@neondatabase/serverless";
import { encryptToken, decryptToken } from "@/lib/token-crypto";
import {
  resolveUserEntitlements,
  calculateCustomPlanExpiresAt,
  normalizeFeatures,
  formatDurationLabel,
  BASIC_FEATURES,
  ALL_FEATURES_ENABLED,
  BASIC_DAILY_EMAIL_LIMIT,
  LIFETIME_GMAIL_DAILY_SAFE_CAP,
  MAX_GMAIL_DAILY_SAFE_CAP,
  DurationUnit,
  FeatureMap,
} from "@/lib/entitlements";
import { resolvePlanLeadAllowance } from "@/lib/custom-plans";
import { extractOwnedCompanyDomain } from "@/lib/b2b-verticals";

function getConnectionString(): string | null {
  let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl || !dbUrl.includes("postgres")) {
    try {
      // Local fallback for local development and test scripts
      const fs = require("fs");
      const p = "C:/Users/Dell/.config/neon/db_url.txt";
      if (fs.existsSync(p)) {
        dbUrl = fs.readFileSync(p, "utf8").trim();
      }
    } catch {}
  }
  if (!dbUrl || !dbUrl.includes("postgres")) return null;
  // Sanitize connection string for serverless HTTP fetch driver
  return dbUrl.replace("&channel_binding=require", "").replace("channel_binding=require&", "");
}

export function getNeonSql() {
  const dbUrl = getConnectionString();
  if (!dbUrl) return null;
  return neon(dbUrl, {
    fetchOptions: {
      cache: "no-store",
    },
  });
}

export function isNeonConfigured(): boolean {
  const dbUrl = getConnectionString();
  return Boolean(dbUrl && dbUrl.includes("postgres"));
}

export function getPktDateTime(): {
  date: string;
  time: string;
  completionTime: string;
} {
  const now = new Date();
  const pktDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const pktTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const pktCompletion = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  return {
    date: pktDate,
    time: pktTime,
    completionTime: `${pktCompletion} PKT`,
  };
}

export async function getNeonSearchRecords(
  workspaceId: number,
  dateFilter?: string,
  keywordFilter?: string
) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    let query = "SELECT * FROM search_records WHERE workspace_id = $1";
    const params: any[] = [workspaceId];

    if (dateFilter && dateFilter !== "ALL" && dateFilter !== "All" && dateFilter !== "All Dates") {
      params.push(`%${dateFilter}%`);
      query += ` AND (search_date ILIKE $${params.length} OR created_at ILIKE $${params.length})`;
    }

    if (keywordFilter) {
      params.push(`%${keywordFilter}%`);
      query += ` AND keyword ILIKE $${params.length}`;
    }

    query += " ORDER BY created_at DESC";
    const rows = await sql.query(query, params);
    return rows.map((r: any) => ({
      ...r,
      sources: typeof r.sources === "string" ? JSON.parse(r.sources) : (r.sources || []),
    }));
  } catch (e) {
    console.error("Neon getSearchRecords error:", e);
    return null;
  }
}

export async function getNeonSearchRecordById(workspaceId: number, searchId: string) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const recs = await sql.query(
      "SELECT * FROM search_records WHERE workspace_id = $1 AND id = $2",
      [workspaceId, searchId]
    );
    if (!recs || recs.length === 0) return null;
    const rec = recs[0];

    const links = await sql.query(
      "SELECT * FROM search_record_leads WHERE workspace_id = $1 AND search_record_id = $2 ORDER BY id ASC",
      [workspaceId, searchId]
    );

    const leads = links.map((l: any) => {
      let snap: any = {};
      try {
        snap = typeof l.lead_snapshot === "string" ? JSON.parse(l.lead_snapshot) : (l.lead_snapshot || {});
      } catch {
        snap = {};
      }
      return snap;
    });

    return {
      ...rec,
      sources: typeof rec.sources === "string" ? JSON.parse(rec.sources) : (rec.sources || []),
      leads,
    };
  } catch (e) {
    console.error("Neon getSearchRecordById error:", e);
    return null;
  }
}

export async function getNeonDistinctDates(workspaceId: number): Promise<string[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const rows = await sql.query(
      "SELECT DISTINCT search_date FROM search_records WHERE workspace_id = $1 ORDER BY search_date DESC",
      [workspaceId]
    );
    return rows.map((r: any) => r.search_date).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getNeonLeadsForDate(workspaceId: number, dateStr: string): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const links = await sql.query(
      `SELECT srl.lead_snapshot 
       FROM search_record_leads srl 
       JOIN search_records sr ON srl.search_record_id = sr.id 
       WHERE sr.workspace_id = $1 AND (sr.search_date ILIKE $2 OR sr.created_at ILIKE $2)
       ORDER BY srl.id ASC`,
      [workspaceId, `%${dateStr}%`]
    );
    const seenEmails = new Set<string>();
    const leads: any[] = [];
    for (const row of links) {
      try {
        const lead = typeof row.lead_snapshot === "string" ? JSON.parse(row.lead_snapshot) : row.lead_snapshot;
        const email = String(lead?.email || "").toLowerCase().trim();
        if (email && !seenEmails.has(email)) {
          seenEmails.add(email);
          leads.push(lead);
        }
      } catch {}
    }
    return leads;
  } catch (e) {
    console.error("Neon getLeadsForDate error:", e);
    return [];
  }
}

export async function saveNeonSearchRecordAndLeads(
  workspaceId: number,
  searchMeta: {
    keyword: string;
    country: string;
    city?: string;
    sources?: string[];
    requested_quantity?: number;
    search_record_id?: string;
  },
  leads: any[]
) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const pkt = getPktDateTime();
    const recordId = searchMeta.search_record_id || `SR-${Date.now()}`;
    const sources = searchMeta.sources || [
      "Google Organic Web Search",
      "Official Business Websites",
      "Facebook Business Public Pages",
      "Instagram Business Public Profiles",
      "LinkedIn Company Profiles",
      "Public Commercial Directories"
    ];

    let phoneCount = 0;
    const qualifiedLeads: any[] = [];

    for (const lead of leads) {
      const bName = String(lead.business_name || lead.name || "").trim();
      const email = String(lead.email || "").trim();
      const phone = String(lead.phone || "").trim();
      const hasValidEmail = Boolean(email && email.includes("@") && email.includes("."));
      const hasValidPhone = Boolean(phone && !["Not Listed", "Not Found", ""].includes(phone));
      if (!bName || (!hasValidEmail && !hasValidPhone)) continue;

      if (hasValidPhone) phoneCount++;
      qualifiedLeads.push(lead);
    }

    const nowIso = new Date().toISOString();

    await sql.query(
      `INSERT INTO search_records (
        id, workspace_id, user_id, keyword, country, city, sources,
        requested_quantity, qualified_quantity, leads_with_phone,
        search_status, search_date, search_time, completion_time, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        qualified_quantity = search_records.qualified_quantity + EXCLUDED.qualified_quantity,
        leads_with_phone = search_records.leads_with_phone + EXCLUDED.leads_with_phone,
        search_status = EXCLUDED.search_status,
        completion_time = EXCLUDED.completion_time`,
      [
        recordId,
        workspaceId,
        1,
        searchMeta.keyword || "General",
        searchMeta.country || "Global",
        searchMeta.city || "",
        JSON.stringify(sources),
        searchMeta.requested_quantity || qualifiedLeads.length,
        qualifiedLeads.length,
        phoneCount,
        "COMPLETED",
        pkt.date,
        pkt.time,
        pkt.completionTime,
        nowIso,
      ]
    );

    for (const lead of qualifiedLeads) {
      const bName = String(lead.business_name || lead.name || "").trim();
      const email = String(lead.email || "").trim();
      const website = String(lead.website || "").trim();
      const phone = String(lead.phone || "").trim();
      const dom = String(lead.domain || "").trim().toLowerCase();
      const city = String(lead.city || searchMeta.city || "").trim();
      const country = String(lead.country || searchMeta.country || "").trim();
      const address = String(lead.address || "").trim();
      const emailStatus = String(lead.email_status || (email ? "Syntax Valid (Mailbox Unverified)" : "Not Found")).trim();
      const phoneStatus = String(lead.phone_status || (phone ? "Source Listed" : "Not Found")).trim();
      const verifiedAt = String(lead.last_verified_at || nowIso).trim();
      const collectedAt = String(lead.collection_timestamp || lead.created_at || nowIso).trim();

      const normEmail = email.includes("@") ? email.toLowerCase().trim() : "";
      const normDom = extractOwnedCompanyDomain(dom || website);
      const normPhone = phone ? phone.replace(/[^0-9+]/g, "") : "";
      const placeId = String(lead.place_id || "").trim();
      const sourceUrlClean = String(lead.original_source_url || lead.source_url || website || "").trim();

      let leadId: number | null = null;
      if (normEmail || normDom || placeId || normPhone || sourceUrlClean) {
        const existingCheck = await sql.query(
          `SELECT id FROM leads 
           WHERE workspace_id = $1 
             AND (
               (normalized_email = $2 AND $2 != '')
               OR (normalized_domain = $3 AND $3 != '')
               OR (place_id = $4 AND $4 != '')
               OR (normalized_phone = $5 AND $5 != '')
               OR (source_url = $6 AND $6 != '')
             )
           LIMIT 1`,
          [workspaceId, normEmail, normDom, placeId, normPhone, sourceUrlClean]
        );
        if (existingCheck.length > 0) {
          leadId = existingCheck[0].id;
        }
      }

      const enrichmentJson =
        lead.enrichment_data && typeof lead.enrichment_data === "object"
          ? JSON.stringify(lead.enrichment_data)
          : null;
      const qualityReasonsJson = Array.isArray(lead.quality_reasons)
        ? JSON.stringify(lead.quality_reasons)
        : null;

      if (leadId) {
        try {
          await sql.query(
            `UPDATE leads
             SET
               phone = CASE WHEN phone IS NULL OR phone = '' OR phone = 'Not Listed' THEN NULLIF($1, '') ELSE phone END,
               phone_status = CASE WHEN phone IS NULL OR phone = '' OR phone = 'Not Listed' THEN $2 ELSE phone_status END,
               email = COALESCE(NULLIF(email, ''), NULLIF($3, '')),
               email_status = CASE WHEN email IS NULL OR email = '' THEN $4 ELSE email_status END,
               website = COALESCE(NULLIF(website, ''), NULLIF($5, '')),
               linkedin = COALESCE(NULLIF(linkedin, ''), NULLIF($6, '')),
               facebook = COALESCE(NULLIF(facebook, ''), NULLIF($7, '')),
               instagram = COALESCE(NULLIF(instagram, ''), NULLIF($8, '')),
               positive_signals = COALESCE(NULLIF($9, ''), positive_signals),
               snippet = COALESCE(NULLIF($10, ''), snippet),
               enrichment_data = COALESCE($11::jsonb, enrichment_data),
               updated_at = $12
             WHERE id = $13`,
            [
              phone,
              phoneStatus,
              email,
              emailStatus,
              website,
              String(lead.linkedin || "").trim(),
              String(lead.facebook || "").trim(),
              String(lead.instagram || "").trim(),
              String(lead.positive_signals || "").trim(),
              String(lead.snippet || "").trim(),
              enrichmentJson,
              nowIso,
              leadId,
            ]
          );
        } catch {}
      } else {
        const ins = await sql.query(
          `INSERT INTO leads (
            workspace_id, business_name, email, phone, website,
            source, source_url, search_keyword, search_location,
            lead_score, fit_score, lead_temperature, crm_stage,
            date_discovered, created_at, updated_at, last_verified_at, collection_timestamp,
            domain, city, country, address, email_status, phone_status,
            normalized_domain, normalized_email, normalized_phone, place_id,
            rating, review_count, industry, category,
            snippet, positive_signals, negative_signals, missing_info,
            buying_intent_category, quality_score, quality_category, quality_reasons,
            enrichment_data, contact_requirement, linkedin, facebook, instagram, twitter, youtube, tiktok
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::timestamptz,
            $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
            $33, $34, $35, $36, $37, $38, $39, $40::jsonb, $41::jsonb, $42, $43, $44, $45, $46, $47, $48
          )
          ON CONFLICT DO NOTHING
          RETURNING id`,
          [
            workspaceId,
            bName,
            email,
            phone,
            website,
            lead.source || lead.source_platform || "Google Organic Web Search",
            sourceUrlClean,
            searchMeta.keyword,
            city || country,
            Math.round(Number(lead.quality_score || lead.lead_score || 50)),
            Math.round(Number(lead.fit_score || lead.relevance_score || 50)),
            (lead.quality_score || 50) >= 80 ? "HOT" : "WARM",
            "Lead Discovered",
            pkt.date,
            nowIso,
            nowIso,
            verifiedAt,
            collectedAt,
            normDom || dom,
            city,
            country,
            address,
            emailStatus,
            phoneStatus,
            normDom,
            normEmail,
            normPhone,
            placeId,
            lead.rating != null ? Number(lead.rating) : null,
            lead.rating_count != null ? Math.round(Number(lead.rating_count)) : null,
            lead.industry || searchMeta.keyword || "General",
            lead.category || lead.industry || "General",
            String(lead.snippet || "").trim() || null,
            String(lead.positive_signals || "").trim() || null,
            String(lead.negative_signals || "").trim() || null,
            String(lead.missing_info || "").trim() || null,
            String(lead.buying_intent_category || "").trim() || null,
            lead.quality_score != null ? Math.round(Number(lead.quality_score)) : null,
            lead.quality_category || null,
            qualityReasonsJson,
            enrichmentJson,
            lead.contact_requirement || null,
            String(lead.linkedin || "").trim() || null,
            String(lead.facebook || "").trim() || null,
            String(lead.instagram || "").trim() || null,
            String(lead.twitter || "").trim() || null,
            String(lead.youtube || "").trim() || null,
            String(lead.tiktok || "").trim() || null,
          ]
        );
        leadId = ins[0]?.id || null;
      }

      if (leadId) {
        await sql.query(
          `INSERT INTO search_record_leads (
            search_record_id, lead_id, workspace_id, lead_snapshot, created_at
          ) VALUES ($1, $2, $3, $4, $5)`,
          [recordId, leadId, workspaceId, JSON.stringify(lead), nowIso]
        );
      }
    }

    return {
      id: recordId,
      workspace_id: workspaceId,
      user_id: 1,
      keyword: searchMeta.keyword,
      country: searchMeta.country,
      city: searchMeta.city || "",
      sources,
      requested_quantity: searchMeta.requested_quantity || qualifiedLeads.length,
      qualified_quantity: qualifiedLeads.length,
      leads_with_phone: phoneCount,
      search_status: "COMPLETED",
      search_date: pkt.date,
      search_time: pkt.time,
      completion_time: pkt.completionTime,
      created_at: nowIso,
      leads: qualifiedLeads,
    };
  } catch (e) {
    console.error("Neon saveSearchRecordAndLeads error:", e);
    return null;
  }
}

export async function getNeonExportHistory(workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    return await sql.query(
      "SELECT * FROM export_history WHERE workspace_id = $1 ORDER BY id DESC",
      [workspaceId]
    );
  } catch (e) {
    console.error("Neon getExportHistory error:", e);
    return null;
  }
}

export async function recordNeonExport(
  workspaceId: number,
  userId: number,
  target: string,
  format: string,
  count: number,
  searchRecordId?: string,
  dateFilter?: string
) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const pkt = getPktDateTime();
    const nowIso = new Date().toISOString();
    return await sql.query(
      `INSERT INTO export_history (
        workspace_id, user_id, export_target, search_record_id,
        export_date_filter, format, record_count, export_date, export_time, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        workspaceId,
        userId,
        target,
        searchRecordId || null,
        dateFilter || null,
        format,
        count,
        pkt.date,
        pkt.time,
        nowIso,
      ]
    );
  } catch (e) {
    console.error("Neon recordExport error:", e);
    return null;
  }
}

export async function getNeonLeads(
  workspaceId: number,
  options?: {
    keyword?: string;
    country?: string;
    city?: string;
    search_name?: string;
    search_email?: string;
    source?: string;
    date_preset?: string;
    date_from?: string;
    date_to?: string;
    sources?: string[];
    page?: number;
    page_size?: number;
    platform?: string;
    platforms?: string[];
    platform_mode?: "ANY" | "ALL";
    quality_category?: string;
    contact_requirement?: string;
    whatsapp_status?: string;
    has_email?: boolean;
    has_phone?: boolean;
    has_website?: boolean;
    campaign_id?: string;
  }
) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    let whereClause = "WHERE workspace_id = $1";
    const params: any[] = [workspaceId];

    if (options?.keyword) {
      params.push(`%${options.keyword}%`);
      whereClause += ` AND (business_name ILIKE $${params.length} OR email ILIKE $${params.length} OR search_keyword ILIKE $${params.length} OR industry ILIKE $${params.length})`;
    }
    if (options?.search_name) {
      params.push(`%${options.search_name}%`);
      whereClause += ` AND business_name ILIKE $${params.length}`;
    }
    if (options?.search_email) {
      params.push(`%${options.search_email}%`);
      whereClause += ` AND email ILIKE $${params.length}`;
    }
    if (Array.isArray(options?.sources) && options!.sources.length > 0) {
      params.push(options!.sources);
      whereClause += ` AND COALESCE(NULLIF(TRIM(source), ''), 'Unknown Source') = ANY($${params.length}::text[])`;
    } else if (options?.source && options.source !== "All" && options.source !== "ALL" && options.source !== "Any") {
      params.push(`%${options.source}%`);
      whereClause += ` AND source ILIKE $${params.length}`;
    }
    if (options?.country && options.country !== "Any" && options.country !== "ALL" && options.country !== "Global") {
      params.push(`%${options.country}%`);
      whereClause += ` AND country ILIKE $${params.length}`;
    }
    if (options?.city && options.city !== "Any" && options.city !== "ALL") {
      params.push(`%${options.city}%`);
      whereClause += ` AND city ILIKE $${params.length}`;
    }
    if (options?.campaign_id) {
      params.push(options.campaign_id);
      whereClause += ` AND campaign_id = $${params.length}`;
    }
    if (options?.quality_category && options.quality_category !== "ALL") {
      params.push(options.quality_category);
      whereClause += ` AND quality_category = $${params.length}`;
    }

    // Platform filters (Instagram, LinkedIn, Facebook, YouTube, TikTok, Website)
    const platList = options?.platforms || (options?.platform && options.platform !== "ALL" ? [options.platform] : []);
    if (platList.length > 0) {
      const mode = options?.platform_mode === "ALL" ? "AND" : "OR";
      const subClauses: string[] = [];

      for (const p of platList) {
        const pLower = p.toLowerCase();
        if (pLower === "instagram") {
          subClauses.push("(instagram IS NOT NULL AND instagram != '' AND instagram ILIKE '%instagram.com%')");
        } else if (pLower === "linkedin") {
          subClauses.push("(linkedin IS NOT NULL AND linkedin != '' AND linkedin ILIKE '%linkedin.com%')");
        } else if (pLower === "facebook") {
          subClauses.push("(facebook IS NOT NULL AND facebook != '' AND facebook ILIKE '%facebook.com%')");
        } else if (pLower === "youtube") {
          subClauses.push("(youtube IS NOT NULL AND youtube != '' AND youtube ILIKE '%youtube.com%')");
        } else if (pLower === "tiktok") {
          subClauses.push("(tiktok IS NOT NULL AND tiktok != '' AND tiktok ILIKE '%tiktok.com%')");
        } else if (pLower === "website") {
          subClauses.push("(website IS NOT NULL AND website != '' AND website != 'Not Found' AND website LIKE 'http%')");
        }
      }

      if (subClauses.length > 0) {
        whereClause += ` AND (${subClauses.join(` ${mode} `)})`;
      }
    }

    // Contact availability filters
    if (options?.has_email) {
      whereClause += ` AND (email IS NOT NULL AND email != '' AND email != 'Not Found' AND email LIKE '%@%')`;
    }
    if (options?.has_phone) {
      whereClause += ` AND (phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed')`;
    }
    if (options?.has_website) {
      whereClause += ` AND (website IS NOT NULL AND website != '' AND website != 'Not Found' AND website LIKE 'http%')`;
    }

    // Contact requirement filter
    if (options?.contact_requirement === "EMAIL_AND_PHONE") {
      whereClause += ` AND (email IS NOT NULL AND email != '' AND email != 'Not Found' AND email LIKE '%@%')`;
      whereClause += ` AND (phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed')`;
    } else if (options?.contact_requirement === "EMAIL_ONLY") {
      whereClause += ` AND (email IS NOT NULL AND email != '' AND email != 'Not Found' AND email LIKE '%@%')`;
    } else if (options?.contact_requirement === "PHONE_ONLY") {
      whereClause += ` AND (phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed')`;
    } else if (options?.contact_requirement === "EMAIL_OR_PHONE") {
      whereClause += ` AND ((email IS NOT NULL AND email != '' AND email != 'Not Found' AND email LIKE '%@%') OR (phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed'))`;
    }

    // Honest WhatsApp availability filter (only manually confirmed vs not confirmed vs not checked)
    if (options?.whatsapp_status && options.whatsapp_status !== "ALL" && options.whatsapp_status !== "all") {
      const waUp = options.whatsapp_status.toUpperCase();
      if (waUp === "CONFIRMED") {
        whereClause += ` AND UPPER(COALESCE(whatsapp_status, 'NOT_CHECKED')) = 'CONFIRMED'`;
      } else if (waUp === "NOT_CONFIRMED") {
        whereClause += ` AND UPPER(COALESCE(whatsapp_status, 'NOT_CHECKED')) = 'NOT_CONFIRMED'`;
      } else if (waUp === "NOT_CHECKED") {
        whereClause += ` AND UPPER(COALESCE(whatsapp_status, 'NOT_CHECKED')) = 'NOT_CHECKED'`;
      }
    }

    // Date filtering (UTC day/range comparisons)
    if (options?.date_preset === "today") {
      whereClause += ` AND (created_at::timestamptz >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`;
    } else if (options?.date_preset === "yesterday") {
      whereClause += ` AND (created_at::timestamptz >= (date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day') AT TIME ZONE 'UTC' AND created_at::timestamptz < date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`;
    } else if (options?.date_preset === "last_7_days") {
      whereClause += ` AND (created_at::timestamptz >= (date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '6 days') AT TIME ZONE 'UTC')`;
    } else if (options?.date_preset === "last_30_days") {
      whereClause += ` AND (created_at::timestamptz >= (date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '29 days') AT TIME ZONE 'UTC')`;
    } else if (options?.date_from && options?.date_to) {
      const fromIso = options.date_from.includes("T") ? options.date_from : `${options.date_from}T00:00:00.000Z`;
      const toIso = options.date_to.includes("T") ? options.date_to : `${options.date_to}T23:59:59.999Z`;
      params.push(fromIso);
      params.push(toIso);
      whereClause += ` AND (created_at::timestamptz >= $${params.length - 1}::timestamptz AND created_at::timestamptz <= $${params.length}::timestamptz)`;
    } else if (options?.date_from) {
      const fromIso = options.date_from.includes("T") ? options.date_from : `${options.date_from}T00:00:00.000Z`;
      params.push(fromIso);
      whereClause += ` AND (created_at::timestamptz >= $${params.length}::timestamptz)`;
    } else if (options?.date_to) {
      const toIso = options.date_to.includes("T") ? options.date_to : `${options.date_to}T23:59:59.999Z`;
      params.push(toIso);
      whereClause += ` AND (created_at::timestamptz <= $${params.length}::timestamptz)`;
    }

    const countRes = await sql.query(`SELECT COUNT(*) as cnt FROM leads ${whereClause}`, params);
    const total = parseInt(countRes[0]?.cnt || "0", 10);

    // Distinct non-empty sources across the workspace's saved leads
    const sourceRows = await sql.query(
      `SELECT COALESCE(NULLIF(TRIM(source), ''), 'Unknown Source') AS source_name, COUNT(*) AS cnt
       FROM leads
       WHERE workspace_id = $1
       GROUP BY COALESCE(NULLIF(TRIM(source), ''), 'Unknown Source')
       ORDER BY cnt DESC, source_name ASC`,
      [workspaceId]
    ).catch(() => []);

    const page = options?.page || 1;
    const pageSize = options?.page_size || 50;
    const offset = (page - 1) * pageSize;

    const limitParams = [...params, pageSize, offset];
    const rows = await sql.query(
      `SELECT * FROM leads ${whereClause} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      limitParams
    );

    return {
      total,
      leads: rows,
      available_sources: (sourceRows || []).map((r: any) => ({
        source: String(r.source_name),
        count: parseInt(r.cnt || "0", 10),
      })),
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize) || 1,
    };
  } catch (e) {
    console.error("Neon getLeads error:", e);
    return null;
  }
}

export async function addNeonLead(workspaceId: number, data: any) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const pkt = getPktDateTime();
    const nowIso = new Date().toISOString();
    const bName = String(data.business_name || data.name || "New Business").trim();
    const email = String(data.email || "").trim();
    const phone = String(data.phone || "").trim();
    const website = String(data.website || "").trim();

    const rows = await sql.query(
      `INSERT INTO leads (
        workspace_id, business_name, email, phone, website,
        category, industry, city, state, country, address,
        source, source_url, search_keyword, lead_score,
        crm_stage, date_discovered, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        workspaceId,
        bName,
        email,
        phone,
        website,
        data.category || "General",
        data.industry || "General",
        data.city || "",
        data.state || "",
        data.country || "",
        data.address || "",
        data.source || "Manual Entry",
        data.source_url || website,
        data.search_keyword || "",
        data.lead_score || 70,
        data.crm_stage || "New Lead",
        pkt.date,
        nowIso,
        nowIso,
      ]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("Neon addLead error:", e);
    return null;
  }
}

export async function getNeonLeadById(workspaceId: number, leadId: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const rows = await sql.query(
      "SELECT * FROM leads WHERE workspace_id = $1 AND id = $2 LIMIT 1",
      [workspaceId, leadId]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("Neon getLeadById error:", e);
    return null;
  }
}

export async function deleteNeonLead(workspaceId: number, leadId: number): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const res = await sql.query(
      "DELETE FROM leads WHERE workspace_id = $1 AND id = $2 RETURNING id",
      [workspaceId, leadId]
    );
    return res.length > 0;
  } catch (e) {
    console.error("Neon deleteLead error:", e);
    return false;
  }
}

/**
 * Ensure outreach_records table exists in Neon PostgreSQL
 */
export async function ensureOutreachTable() {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    try {
      await sql.query(`
        ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at TEXT;
        ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'STARTER';
        ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
        ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 1;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT;
        ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
      `);
    } catch {
      // non-blocking
    }
    await sql.query(`
      CREATE TABLE IF NOT EXISTS outreach_records (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL DEFAULT 1,
        lead_id INTEGER,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT,
        sender_email TEXT NOT NULL,
        sender_name TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        gmail_message_id TEXT,
        gmail_thread_id TEXT,
        outreach_status TEXT NOT NULL DEFAULT 'EMAIL SENT',
        followup_date TEXT,
        followup_notes TEXT,
        followup_status TEXT DEFAULT 'PENDING',
        sent_at TEXT NOT NULL,
        last_activity TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await sql.query("CREATE INDEX IF NOT EXISTS idx_outreach_records_ws ON outreach_records(workspace_id)");
    await sql.query("CREATE INDEX IF NOT EXISTS idx_outreach_records_lead ON outreach_records(lead_id)");
  } catch (e) {
    console.warn("Outreach table ensure warning:", e);
  }
}

/**
 * Get active Gmail connection for workspace
 */
export async function getNeonGmailAccount(workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const rows = await sql.query(
      `SELECT id, workspace_id, account_name, sender_name, sender_email,
              provider_type, daily_limit, sent_today, last_sent_at, is_active,
              health_status, last_error, last_refreshed_at, spf_status, dkim_status, dmarc_status, mx_status,
              created_at, updated_at
       FROM email_accounts
       WHERE workspace_id = $1 AND is_active = 1 AND COALESCE(health_status, 'CONNECTED') != 'DISCONNECTED'
       ORDER BY CASE WHEN health_status = 'CONNECTED' THEN 0 ELSE 1 END, id DESC LIMIT 1`,
      [workspaceId]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("Neon getGmailAccount error:", e);
    return null;
  }
}

/**
 * Get raw Gmail tokens securely for sending (server-side only)
 */
export async function getNeonGmailTokens(workspaceId: number, accountId?: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    let rows: any[] = [];
    if (accountId) {
      rows = await sql.query(
        `SELECT id, sender_email, sender_name, oauth_token_json, daily_limit, sent_today, health_status
         FROM email_accounts
         WHERE workspace_id = $1 AND id = $2 AND is_active = 1 AND COALESCE(health_status, 'CONNECTED') = 'CONNECTED'
         LIMIT 1`,
        [workspaceId, accountId]
      );
    } else {
      rows = await sql.query(
        `SELECT id, sender_email, sender_name, oauth_token_json, daily_limit, sent_today, health_status
         FROM email_accounts
         WHERE workspace_id = $1 AND is_active = 1 AND COALESCE(health_status, 'CONNECTED') = 'CONNECTED'
         ORDER BY id DESC LIMIT 1`,
        [workspaceId]
      );
    }
    if (!rows[0]) return null;
    let tokens: any = decryptToken(rows[0].oauth_token_json) || {};
    return {
      accountId: rows[0].id,
      senderEmail: rows[0].sender_email,
      senderName: rows[0].sender_name,
      dailyLimit: rows[0].daily_limit || 500,
      sentToday: rows[0].sent_today || 0,
      tokens,
    };
  } catch (e) {
    console.error("Neon getGmailTokens error:", e);
    return null;
  }
}

/**
 * Retrieve ALL active Gmail OAuth accounts with decrypted tokens for round-robin rotation
 */
export async function getNeonAllActiveGmailTokens(workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const rows = await sql.query(
      `SELECT id, sender_email, sender_name, oauth_token_json, daily_limit, sent_today
       FROM email_accounts
       WHERE workspace_id = $1 AND is_active = 1 AND COALESCE(health_status, 'CONNECTED') = 'CONNECTED'
       ORDER BY id ASC`,
      [workspaceId]
    );
    return rows.map((r: any) => ({
      accountId: r.id,
      senderEmail: r.sender_email,
      senderName: r.sender_name,
      dailyLimit: r.daily_limit || 500,
      sentToday: r.sent_today || 0,
      tokens: decryptToken(r.oauth_token_json) || {},
    }));
  } catch (e) {
    console.error("Neon getNeonAllActiveGmailTokens error:", e);
    return [];
  }
}

export async function markNeonGmailAccountHealth(
  workspaceId: number,
  accountId: number,
  healthStatus: "CONNECTED" | "RECONNECT_REQUIRED" | "REVOKED" | "DISCONNECTED",
  errorMessage?: string
): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const nowIso = new Date().toISOString();
    await sql.query(
      `UPDATE email_accounts
       SET health_status = $1,
           last_error = $2,
           revoked_at = CASE WHEN $1 IN ('RECONNECT_REQUIRED', 'REVOKED') THEN NOW() ELSE revoked_at END,
           updated_at = $3
       WHERE workspace_id = $4 AND id = $5`,
      [healthStatus, errorMessage ? errorMessage.slice(0, 400) : null, nowIso, workspaceId, accountId]
    );
    return true;
  } catch (e) {
    console.error("markNeonGmailAccountHealth error:", e);
    return false;
  }
}

/**
 * Save or connect Gmail OAuth account in workspace.
 * Supports multiple accounts per workspace and preserves existing refresh_token when Google omits it on re-consent.
 */
export async function saveNeonGmailAccount(
  workspaceId: number,
  data: {
    senderEmail: string;
    senderName: string;
    tokenData?: any;
    oauthTokens?: any;
    dailyLimit?: number;
  }
) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const nowIso = new Date().toISOString();
    const cleanEmail = data.senderEmail.toLowerCase().trim();
    const incomingTokens = { ...(data.tokenData || data.oauthTokens || {}) };
    const limit = data.dailyLimit || 500;

    // Check if this senderEmail is already connected in this workspace
    const existing = await sql.query(
      "SELECT id, oauth_token_json FROM email_accounts WHERE workspace_id = $1 AND LOWER(sender_email) = $2 LIMIT 1",
      [workspaceId, cleanEmail]
    );

    if (existing && existing.length > 0) {
      const prevTokens = existing[0].oauth_token_json ? decryptToken(existing[0].oauth_token_json) : null;
      if (!incomingTokens.refresh_token && prevTokens?.refresh_token) {
        incomingTokens.refresh_token = prevTokens.refresh_token;
      }
      if (!incomingTokens.obtained_at) {
        incomingTokens.obtained_at = Date.now();
      }
      const encryptedTokens = encryptToken(incomingTokens);
      // Update existing account credentials and reactivate
      const rows = await sql.query(
        `UPDATE email_accounts
         SET oauth_token_json = $1, sender_name = $2, is_active = 1,
             health_status = 'CONNECTED', last_error = NULL, revoked_at = NULL,
             last_refreshed_at = NOW(), daily_limit = $3, updated_at = $4
         WHERE id = $5
         RETURNING id, workspace_id, account_name, sender_name, sender_email, health_status, daily_limit`,
        [encryptedTokens, data.senderName, limit, nowIso, existing[0].id]
      );
      return rows[0] || null;
    }

    if (!incomingTokens.obtained_at) {
      incomingTokens.obtained_at = Date.now();
    }
    const encryptedTokens = encryptToken(incomingTokens);

    // Insert new connected Gmail account for this workspace
    const rows = await sql.query(
      `INSERT INTO email_accounts (
        workspace_id, account_name, sender_name, sender_email,
        provider_type, oauth_token_json, daily_limit, sent_today,
        is_active, health_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, workspace_id, account_name, sender_name, sender_email, health_status, daily_limit`,
      [
        workspaceId,
        `Gmail (${cleanEmail})`,
        data.senderName,
        cleanEmail,
        "GMAIL_OAUTH",
        encryptedTokens,
        limit,
        0,
        1,
        "CONNECTED",
        nowIso,
        nowIso,
      ]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("Neon saveGmailAccount error:", e);
    return null;
  }
}

/**
 * Disconnect Gmail account(s) from workspace.
 * If accountId is provided, disconnects only that account. Otherwise disconnects all.
 */
export async function disconnectNeonGmailAccount(workspaceId: number, accountId?: number): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    if (accountId) {
      await sql.query(
        "UPDATE email_accounts SET is_active = 0, health_status = 'DISCONNECTED', oauth_token_json = NULL, updated_at = $1 WHERE workspace_id = $2 AND id = $3",
        [new Date().toISOString(), workspaceId, accountId]
      );
    } else {
      await sql.query(
        "UPDATE email_accounts SET is_active = 0, health_status = 'DISCONNECTED', oauth_token_json = NULL, updated_at = $1 WHERE workspace_id = $2",
        [new Date().toISOString(), workspaceId]
      );
    }
    return true;
  } catch (e) {
    console.error("Neon disconnectGmailAccount error:", e);
    return false;
  }
}

/**
 * Check if a recipient email is suppressed in this workspace
 */
export async function isRecipientSuppressed(workspaceId: number, email: string): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const rows = await sql.query(
      "SELECT id FROM email_suppressions WHERE workspace_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1",
      [workspaceId, email.trim()]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check duplicate outreach: recipient already emailed within X days
 */
export async function isDuplicateOutreach(workspaceId: number, email: string, withinDays: number = 30): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const rows = await sql.query(
      `SELECT id FROM outreach_records
       WHERE workspace_id = $1 AND LOWER(recipient_email) = LOWER($2)
       AND sent_at >= (NOW() - ($3 || ' days')::INTERVAL)
       LIMIT 1`,
      [workspaceId, email.trim(), String(withinDays)]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Save an outreach message record and update lead status
 */
export async function saveNeonOutreachRecord(data: {
  workspaceId: number;
  userId?: number;
  leadId?: number;
  recipientEmail: string;
  recipientName?: string;
  senderEmail: string;
  senderName?: string;
  subject: string;
  body: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
  outreachStatus?: string;
  followupDate?: string;
  followupNotes?: string;
}) {
  const sql = getNeonSql();
  if (!sql) return null;
  await ensureOutreachTable();

  try {
    const nowIso = new Date().toISOString();
    const rows = await sql.query(
      `INSERT INTO outreach_records (
        workspace_id, user_id, lead_id, recipient_email, recipient_name,
        sender_email, sender_name, subject, body, gmail_message_id,
        gmail_thread_id, outreach_status, followup_date, followup_notes,
        followup_status, sent_at, last_activity, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        data.workspaceId,
        data.userId || 1,
        data.leadId || null,
        data.recipientEmail.toLowerCase().trim(),
        data.recipientName || "",
        data.senderEmail,
        data.senderName || "",
        data.subject,
        data.body,
        data.gmailMessageId || "",
        data.gmailThreadId || "",
        data.outreachStatus || "EMAIL SENT",
        data.followupDate || null,
        data.followupNotes || null,
        data.followupDate ? "SCHEDULED" : "NONE",
        nowIso,
        nowIso,
        nowIso,
      ]
    );

    const isSuccessSend = (data.outreachStatus || "EMAIL SENT") === "EMAIL SENT";

    // Update lead in leads table only on successful send (or explicit status change)
    if (data.leadId && isSuccessSend) {
      await sql.query(
        `UPDATE leads SET
          crm_stage = $1,
          last_contact = $2,
          next_followup = $3,
          updated_at = $4
        WHERE workspace_id = $5 AND id = $6`,
        [
          "EMAIL SENT",
          nowIso,
          data.followupDate || null,
          nowIso,
          data.workspaceId,
          data.leadId,
        ]
      );
    }

    // Increment sent count only for successful sends on the specific sender mailbox
    if (isSuccessSend) {
      await sql.query(
        `UPDATE email_accounts SET
          sent_today = (
            SELECT COUNT(*)::int FROM outreach_records
            WHERE workspace_id = $2
              AND outreach_status = 'EMAIL SENT'
              AND sent_at::timestamptz >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
              AND LOWER(sender_email) = LOWER(email_accounts.sender_email)
          ),
          last_sent_at = $1,
          updated_at = $1
        WHERE workspace_id = $2 AND LOWER(sender_email) = LOWER($3) AND is_active = 1`,
        [nowIso, data.workspaceId, data.senderEmail]
      );
    }

    return rows[0] || null;
  } catch (e) {
    console.error("Neon saveOutreachRecord error:", e);
    return null;
  }
}

export async function getNeonEmailsSentTodayUtc(workspaceId: number, senderEmail?: string): Promise<number> {
  const sql = getNeonSql();
  if (!sql) return 0;
  await ensureOutreachTable();
  try {
    const params: any[] = [workspaceId];
    let filterSender = "";
    if (senderEmail) {
      params.push(senderEmail.toLowerCase().trim());
      filterSender = ` AND LOWER(sender_email) = $${params.length}`;
    }
    const rows = await sql.query(
      `SELECT COUNT(*) AS cnt
       FROM outreach_records
       WHERE workspace_id = $1
         AND outreach_status = 'EMAIL SENT'
         AND sent_at::timestamptz >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
         ${filterSender}`,
      params
    );
    return parseInt(rows[0]?.cnt || "0", 10);
  } catch (e) {
    console.error("getNeonEmailsSentTodayUtc error:", e);
    return 0;
  }
}

/**
 * Get outreach records for workspace
 */
export async function getNeonOutreachRecords(workspaceId: number, statusFilter?: string) {
  const sql = getNeonSql();
  if (!sql) return [];
  await ensureOutreachTable();

  try {
    let query = "SELECT * FROM outreach_records WHERE workspace_id = $1";
    const params: any[] = [workspaceId];
    if (statusFilter && statusFilter !== "ALL") {
      params.push(statusFilter);
      query += ` AND outreach_status = $${params.length}`;
    }
    query += " ORDER BY id DESC LIMIT 100";
    return await sql.query(query, params);
  } catch (e) {
    console.error("Neon getOutreachRecords error:", e);
    return [];
  }
}

/**
 * Get leads with due follow-ups
 */
export async function getNeonDueFollowups(workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    return await sql.query(
      `SELECT * FROM leads
       WHERE workspace_id = $1
         AND next_followup IS NOT NULL
         AND next_followup != ''
         AND crm_stage != 'DO NOT CONTACT'
       ORDER BY next_followup ASC LIMIT 50`,
      [workspaceId]
    );
  } catch (e) {
    console.error("Neon getDueFollowups error:", e);
    return [];
  }
}

/**
 * Update lead outreach status (e.g. DO NOT CONTACT, INTERESTED, etc.)
 */
export async function updateNeonLeadOutreachStatus(
  workspaceId: number,
  leadId: number,
  status: string,
  followupDate?: string
) {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const nowIso = new Date().toISOString();
    await sql.query(
      `UPDATE leads SET
        crm_stage = $1,
        next_followup = $2,
        updated_at = $3
      WHERE workspace_id = $4 AND id = $5`,
      [status, followupDate || null, nowIso, workspaceId, leadId]
    );
    return true;
  } catch (e) {
    console.error("Neon updateLeadOutreachStatus error:", e);
    return false;
  }
}

/**
 * Authoritative Single Source of Truth for User Status & Subscription Evaluation.
 * Evaluates real-time DB fields and enforces:
 * - ADMIN: Always active Lifetime.
 * - Explicit manual lock/suspension/revocation strictly overrides everything.
 * - LIFETIME: Permanent active access (zero expiry).
 * - BASIC ($25/30d): Active only if subscription_expires_at > NOW(), auto-locked/expired otherwise.
 */
export function computeAuthoritativeUserStatus(user: {
  role?: string;
  status?: string;
  plan?: string;
  plan_type?: string | null;
  plan_label?: string | null;
  custom_duration_value?: number | null;
  custom_duration_unit?: string | null;
  custom_price_usd?: number | null;
  suggested_price_usd?: number | null;
  daily_email_limit?: number | null;
  google_maps_enabled?: boolean | null;
  features_json?: any;
  account_type?: string;
  email?: string;
  username?: string;
  subscription_start?: string | Date | null;
  subscription_expires_at?: string | Date | null;
}): {
  status: "ACTIVE" | "LOCKED" | "SUSPENDED" | "REVOKED" | "EXPIRED" | "PREVIEW_ONLY";
  isLocked: boolean;
  plan: "BASIC" | "LIFETIME" | "CUSTOM" | "FREE_PREVIEW";
  plan_type: string;
  plan_label: string;
  google_maps_enabled: boolean;
  daily_email_limit: number;
  features: FeatureMap;
  isExpired: boolean;
  daysRemaining: number | string;
  remainingDetailed: string;
  remainingMs: number;
} {
  const ent = resolveUserEntitlements(user);

  if (ent.isOwner) {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      plan_type: "OWNER_LIFETIME",
      plan_label: ent.planLabel,
      google_maps_enabled: true,
      daily_email_limit: ent.dailyEmailLimit,
      features: ent.features,
      isExpired: false,
      daysRemaining: "Permanent (Master Owner)",
      remainingDetailed: "Permanent Access — No Expiry",
      remainingMs: Infinity,
    };
  }

  const statusUpper = String(user.status || "LOCKED").toUpperCase();
  const mappedPlan: "BASIC" | "LIFETIME" | "CUSTOM" | "FREE_PREVIEW" =
    ent.planType === "CUSTOM"
      ? "CUSTOM"
      : ent.planType === "LIFETIME"
      ? "LIFETIME"
      : ent.planType === "FREE_PREVIEW"
      ? "FREE_PREVIEW"
      : "BASIC";

  if (ent.planType === "FREE_PREVIEW" || statusUpper === "PREVIEW_ONLY") {
    return {
      status: "PREVIEW_ONLY",
      isLocked: true,
      plan: "FREE_PREVIEW",
      plan_type: "FREE_PREVIEW",
      plan_label: ent.planLabel,
      google_maps_enabled: false,
      daily_email_limit: 0,
      features: ent.features,
      isExpired: false,
      daysRemaining: "Free Preview",
      remainingDetailed: "Free Preview Mode",
      remainingMs: 0,
    };
  }

  if (statusUpper === "REVOKED") {
    return {
      status: "REVOKED",
      isLocked: true,
      plan: mappedPlan,
      plan_type: ent.planType,
      plan_label: ent.planLabel,
      google_maps_enabled: false,
      daily_email_limit: 0,
      features: ent.features,
      isExpired: false,
      daysRemaining: 0,
      remainingDetailed: "Revoked by Administrator",
      remainingMs: 0,
    };
  }
  if (statusUpper === "SUSPENDED") {
    return {
      status: "SUSPENDED",
      isLocked: true,
      plan: mappedPlan,
      plan_type: ent.planType,
      plan_label: ent.planLabel,
      google_maps_enabled: false,
      daily_email_limit: 0,
      features: ent.features,
      isExpired: false,
      daysRemaining: 0,
      remainingDetailed: "Suspended by Administrator",
      remainingMs: 0,
    };
  }
  if (statusUpper === "LOCKED" || statusUpper === "PENDING" || statusUpper === "PENDING_APPROVAL") {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: mappedPlan,
      plan_type: ent.planType,
      plan_label: ent.planLabel,
      google_maps_enabled: false,
      daily_email_limit: 0,
      features: ent.features,
      isExpired: false,
      daysRemaining: 0,
      remainingDetailed: "Locked by Administrator",
      remainingMs: 0,
    };
  }

  if (ent.isLifetime) {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: mappedPlan === "CUSTOM" ? "CUSTOM" : "LIFETIME",
      plan_type: ent.planType,
      plan_label: ent.planLabel,
      google_maps_enabled: ent.googleMapsEnabled,
      daily_email_limit: ent.dailyEmailLimit,
      features: ent.features,
      isExpired: false,
      daysRemaining: "Lifetime Access — No Expiry",
      remainingDetailed: "Lifetime Access — No Expiry",
      remainingMs: Infinity,
    };
  }

  if (!user.subscription_expires_at) {
    return {
      status: statusUpper === "EXPIRED" ? "EXPIRED" : "LOCKED",
      isLocked: true,
      plan: mappedPlan,
      plan_type: ent.planType,
      plan_label: ent.planLabel,
      google_maps_enabled: ent.googleMapsEnabled,
      daily_email_limit: ent.dailyEmailLimit,
      features: ent.features,
      isExpired: true,
      daysRemaining: 0,
      remainingDetailed: "Expired",
      remainingMs: 0,
    };
  }

  const expTime = new Date(user.subscription_expires_at).getTime();
  const diffMs = expTime - Date.now();
  if (Number.isNaN(expTime) || diffMs <= 0) {
    return {
      status: "EXPIRED",
      isLocked: true,
      plan: mappedPlan,
      plan_type: ent.planType,
      plan_label: ent.planLabel,
      google_maps_enabled: ent.googleMapsEnabled,
      daily_email_limit: ent.dailyEmailLimit,
      features: ent.features,
      isExpired: true,
      daysRemaining: 0,
      remainingDetailed: "Expired",
      remainingMs: 0,
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingDetailed = days > 0 ? `${days}d ${hours}h ${minutes}m left` : `${hours}h ${minutes}m left`;

  return {
    status: "ACTIVE",
    isLocked: false,
    plan: mappedPlan,
    plan_type: ent.planType,
    plan_label: ent.planLabel,
    google_maps_enabled: ent.googleMapsEnabled,
    daily_email_limit: ent.dailyEmailLimit,
    features: ent.features,
    isExpired: false,
    daysRemaining: days > 0 ? days : `${hours}h ${minutes}m`,
    remainingDetailed,
    remainingMs: diffMs,
  };
}

/**
 * USMAN AI GTM - Multi-Tenant Client Management
 */
export async function getNeonClients() {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const clients = await sql.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.company,
        u.role,
        COALESCE(u.account_type, 'PAID_CLIENT') as account_type,
        u.workspace_id,
        u.status,
        COALESCE(u.plan, 'BASIC') as plan,
        u.plan_type,
        u.plan_label,
        u.custom_duration_value,
        u.custom_duration_unit,
        u.custom_price_usd,
        u.suggested_price_usd,
        u.daily_email_limit,
        u.google_maps_enabled,
        u.features_json,
        u.subscription_start,
        u.subscription_expires_at,
        u.subscription_status,
        u.subscription_notes,
        u.created_at,
        u.last_login,
        u.last_activity_at,
        u.first_google_signin_at,
        u.last_google_signin_at,
        u.google_sub,
        u.auth_provider,
        u.converted_from_preview_at,
        u.converted_by_admin_id,
        COALESCE(u.must_change_password, FALSE) as must_change_password,
        COALESCE(u.session_version, 1) as session_version,
        COALESCE(w.name, u.full_name || '''s Workspace') as workspace_name,
        COALESCE((SELECT COUNT(*) FROM leads l WHERE l.workspace_id = u.workspace_id), 0) as total_leads,
        COALESCE((SELECT COUNT(*) FROM search_records sr WHERE sr.workspace_id = u.workspace_id), 0) as total_searches,
        COALESCE((SELECT COUNT(*) FROM email_accounts ea WHERE ea.workspace_id = u.workspace_id AND ea.is_active = 1 AND COALESCE(ea.health_status, 'CONNECTED') = 'CONNECTED'), 0) as connected_accounts
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      WHERE u.role != 'ADMIN' AND u.role != 'SUPER_ADMIN' AND (u.account_type IS NULL OR u.account_type != 'MASTER_OWNER') AND (u.username IS NULL OR LOWER(u.username) != 'master_owner_usman')
      ORDER BY u.id DESC
    `);

    return clients.map((c: any) => {
      const computed = computeAuthoritativeUserStatus(c);
      const displayPlan =
        computed.plan === "CUSTOM"
          ? computed.plan_label ||
            `CUSTOM (${formatDurationLabel(c.custom_duration_value, c.custom_duration_unit)})`
          : computed.plan === "LIFETIME"
          ? "LIFETIME ($100)"
          : computed.plan === "FREE_PREVIEW"
          ? "FREE PREVIEW"
          : "BASIC ($25/30 Days)";

      return {
        ...c,
        raw_plan: computed.plan,
        plan_type: computed.plan_type,
        plan_label: computed.plan_label,
        google_maps_enabled: computed.google_maps_enabled,
        daily_email_limit: computed.daily_email_limit,
        features: computed.features,
        custom_price_usd: c.custom_price_usd != null ? Number(c.custom_price_usd) : null,
        suggested_price_usd: c.suggested_price_usd != null ? Number(c.suggested_price_usd) : null,
        plan: displayPlan,
        status: computed.status,
        payment_status: computed.status === "ACTIVE" ? "PAID" : computed.status === "PREVIEW_ONLY" ? "PREVIEW" : "PENDING",
        remaining_days: computed.daysRemaining,
        remaining_detailed: computed.remainingDetailed,
        remaining_ms: computed.remainingMs,
        subscription_start: c.subscription_start,
        subscription_expires_at: c.subscription_expires_at,
        created_at: c.created_at,
        total_leads: parseInt(c.total_leads || "0", 10),
        total_searches: parseInt(c.total_searches || "0", 10),
        connected_accounts: parseInt(c.connected_accounts || "0", 10),
      };
    });
  } catch (e) {
    console.error("Neon getNeonClients error:", e);
    return [];
  }
}

export async function createPaidClientAccount(data: {
  customerName?: string;
  username: string;
  passwordHash: string;
  plan: "BASIC" | "LIFETIME" | "CUSTOM";
  clientNotes?: string;
  durationValue?: number | null;
  durationUnit?: DurationUnit;
  features?: Partial<FeatureMap>;
  googleMapsEnabled?: boolean;
  dailyEmailLimit?: number;
  customPriceUsd?: number | null;
  suggestedPriceUsd?: number | null;
  planLabel?: string;
}) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database connection unavailable");

  const cleanUsername = data.username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("Username must be at least 3 characters long.");
  }

  const existing = await sql.query(
    "SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1",
    [cleanUsername]
  );
  if (existing.length > 0) {
    throw new Error(`Account with username '${cleanUsername}' already exists. Please choose a different username.`);
  }

  // Deliberate identity separation check if username ever belonged to a deleted tombstone
  const tombstones = await sql
    .query(
      "SELECT former_user_id FROM deleted_account_tombstones WHERE username_lower = LOWER($1) ORDER BY id DESC LIMIT 1",
      [cleanUsername]
    )
    .catch(() => []);
  const formerTombstoneUserId = tombstones?.[0]?.former_user_id ? Number(tombstones[0].former_user_id) : null;

  const nowDate = new Date();
  const nowIso = nowDate.toISOString();
  const customerName = (data.customerName || cleanUsername).trim();
  const baseWsName = `${customerName}'s Workspace`;
  const uniqueWsName = `${baseWsName} #${Date.now().toString().slice(-4)}`;

  let workspaceId: number;
  let createdWsName = uniqueWsName;
  try {
    const wsRes = await sql.query(
      `INSERT INTO workspaces (name, created_at, tenant_id, description)
       VALUES ($1, $2, 1, $3)
       RETURNING id, name`,
      [uniqueWsName, nowIso, `Paid Client workspace (${data.plan}) for ${customerName}`]
    );
    workspaceId = wsRes[0].id;
    createdWsName = wsRes[0].name;
  } catch {
    const fallbackWs = `${uniqueWsName}-${Date.now()}`;
    const wsRes = await sql.query(
      `INSERT INTO workspaces (name, created_at, tenant_id)
       VALUES ($1, $2, 1)
       RETURNING id, name`,
      [fallbackWs, nowIso]
    );
    workspaceId = wsRes[0].id;
    createdWsName = wsRes[0].name;
  }

  const planType = data.plan;
  let durationVal: number | null = null;
  let durationUnit: DurationUnit = "days";
  let subscriptionExpiresAt: string | null = null;
  let googleMapsEnabled = false;
  let dailyEmailLimit = BASIC_DAILY_EMAIL_LIMIT;
  let featuresObj: FeatureMap = { ...BASIC_FEATURES };
  let planLabel = data.planLabel || "";
  let customPriceUsd: number | null = data.customPriceUsd ?? null;
  let suggestedPriceUsd: number | null = data.suggestedPriceUsd ?? null;

  if (planType === "LIFETIME") {
    durationUnit = "lifetime";
    subscriptionExpiresAt = null;
    googleMapsEnabled = true;
    dailyEmailLimit = LIFETIME_GMAIL_DAILY_SAFE_CAP;
    featuresObj = { ...ALL_FEATURES_ENABLED };
    planLabel = planLabel || "Lifetime Plan ($100 One-Time)";
    customPriceUsd = customPriceUsd ?? 100;
    suggestedPriceUsd = suggestedPriceUsd ?? 100;
  } else if (planType === "BASIC") {
    durationVal = 30;
    durationUnit = "days";
    subscriptionExpiresAt = new Date(nowDate.getTime() + 30 * 86_400_000).toISOString();
    googleMapsEnabled = false;
    dailyEmailLimit = BASIC_DAILY_EMAIL_LIMIT;
    featuresObj = { ...BASIC_FEATURES };
    planLabel = planLabel || "Basic Plan ($25 / 30 Days)";
    customPriceUsd = customPriceUsd ?? 25;
    suggestedPriceUsd = suggestedPriceUsd ?? 25;
  } else {
    durationUnit = (data.durationUnit || "days") as DurationUnit;
    durationVal = durationUnit === "lifetime" ? null : Math.max(1, Math.floor(Number(data.durationValue) || 1));
    const expDate = calculateCustomPlanExpiresAt(nowDate, durationVal, durationUnit);
    subscriptionExpiresAt = expDate ? expDate.toISOString() : null;
    featuresObj = normalizeFeatures(data.features || {}, data.googleMapsEnabled);
    googleMapsEnabled = Boolean(featuresObj.google_maps && data.googleMapsEnabled !== false);
    if (!googleMapsEnabled) {
      featuresObj.google_maps = false;
      featuresObj.multi_country_maps = false;
    }
    dailyEmailLimit = featuresObj.cold_email
      ? Math.max(0, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Math.floor(Number(data.dailyEmailLimit ?? BASIC_DAILY_EMAIL_LIMIT))))
      : 0;
    const durLabel = formatDurationLabel(durationVal, durationUnit);
    planLabel = planLabel || `Custom Plan (${durLabel}${googleMapsEnabled ? " • Maps" : ""})`;
  }

  const userRes = await sql.query(
    `INSERT INTO users (
      username, email, password_hash, full_name, role, account_type,
      workspace_id, status, plan, plan_type, plan_label,
      custom_duration_value, custom_duration_unit, custom_price_usd, suggested_price_usd,
      daily_email_limit, google_maps_enabled, features_json,
      subscription_status, subscription_start, subscription_expires_at,
      subscription_notes, active, is_active, created_at, tenant_id
    ) VALUES (
      $1::text, $2::text, $3::text, $4::text, 'CLIENT', 'PAID_CLIENT',
      $5::int4, 'ACTIVE', $6::varchar, $7::text, $8::text,
      $9::int4, $10::text, $11::numeric, $12::numeric,
      $13::int4, $14::boolean, $15::jsonb,
      'ACTIVE', $16::timestamptz, $17::timestamptz,
      $18::text, 1, 1, $19::text, 1
    )
    RETURNING id, username, email, full_name, role, account_type, workspace_id,
              status, plan, plan_type, plan_label, custom_duration_value, custom_duration_unit,
              custom_price_usd, suggested_price_usd, daily_email_limit, google_maps_enabled, features_json,
              subscription_status, subscription_start, subscription_expires_at, created_at`,
    [
      cleanUsername,
      `${cleanUsername}@app.client`,
      data.passwordHash,
      customerName,
      workspaceId,
      planType,
      planType,
      planLabel,
      durationVal,
      durationUnit,
      customPriceUsd,
      suggestedPriceUsd,
      dailyEmailLimit,
      googleMapsEnabled,
      JSON.stringify(featuresObj),
      nowIso,
      subscriptionExpiresAt,
      data.clientNotes || `Paid ${planLabel} account created by Master Owner`,
      nowIso,
    ]
  );

  return {
    client: userRes[0],
    workspace: { id: workspaceId, name: createdWsName, plan: planType },
    formerTombstoneUserId,
  };
}

export async function provisionNeonClient(data: {
  email: string;
  fullName: string;
  company?: string;
  address?: string;
  plan?: string;
  passwordHash: string;
  maxQuota?: number;
}) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database connection unavailable");
  
  await ensureOutreachTable();

  const cleanEmail = data.email.trim().toLowerCase();
  
  // 1. Check if user already exists
  const existing = await sql.query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [cleanEmail]
  );
  if (existing.length > 0) {
    throw new Error(`Client with email ${cleanEmail} already exists.`);
  }

  // 2. Count active seats
  const activeCountRes = await sql.query(
    "SELECT COUNT(*) as cnt FROM users WHERE role != 'ADMIN' AND status != 'REVOKED'"
  );
  const activeCount = parseInt(activeCountRes[0]?.cnt || "0", 10);

  const nowIso = new Date().toISOString();
  let baseWsName = data.company ? `${data.company.trim()} Workspace` : `${data.fullName.trim()}'s Workspace`;
  const plan = data.plan || "STARTER";

  // Check if workspace name already exists (since name is UNIQUE in schema)
  const existingWs = await sql.query("SELECT id FROM workspaces WHERE name = $1 LIMIT 1", [baseWsName]);
  const wsName = existingWs.length > 0 ? `${baseWsName} #${Date.now().toString().slice(-4)}` : baseWsName;

  // 3. Create fresh, completely isolated workspace (0 leads, 0 accounts, 0 campaigns)
  let workspaceId: number;
  let createdWsName = wsName;
  try {
    const wsRes = await sql.query(
      `INSERT INTO workspaces (name, created_at, tenant_id, description)
       VALUES ($1, $2, 1, $3)
       RETURNING id, name`,
      [wsName, nowIso, `Client workspace for ${data.fullName.trim()}`]
    );
    workspaceId = wsRes[0].id;
    createdWsName = wsRes[0].name;
  } catch (wsErr: any) {
    const uniqueWsName = `${wsName}-${Date.now()}`;
    const wsRes = await sql.query(
      `INSERT INTO workspaces (name, created_at, tenant_id)
       VALUES ($1, $2, 1)
       RETURNING id, name`,
      [uniqueWsName, nowIso]
    );
    workspaceId = wsRes[0].id;
    createdWsName = wsRes[0].name;
  }

  // 4. Create client user linked strictly to this new workspace
  const userRes = await sql.query(
    `INSERT INTO users (
      username, email, password_hash, full_name, role, workspace_id, status, created_at, tenant_id
    ) VALUES ($1, $2, $3, $4, 'CLIENT', $5, 'ACTIVE', $6, 1)
    RETURNING id, email, full_name, role, workspace_id, status, created_at`,
    [
      cleanEmail,
      cleanEmail,
      data.passwordHash,
      data.fullName.trim(),
      workspaceId,
      nowIso,
    ]
  );

  return {
    client: userRes[0],
    workspace: { id: workspaceId, name: createdWsName, plan },
    active_seats_used: activeCount + 1,
    seats_remaining: "Unlimited",
  };
}

export async function updateNeonClientStatus(
  clientId: number,
  newStatus: string
): Promise<{ ok: boolean; effectiveStatus: string; restoredAccess: boolean }> {
  const sql = getNeonSql();
  if (!sql) return { ok: false, effectiveStatus: newStatus, restoredAccess: false };
  try {
    const validStatus = ["ACTIVE", "LOCKED", "SUSPENDED", "REVOKED", "EXPIRED"].includes(newStatus.toUpperCase())
      ? newStatus.toUpperCase()
      : "ACTIVE";

    // Never allow modifying Master Owner / Admin accounts
    const rows = await sql.query(
      `SELECT id, role, account_type, username, plan, plan_type, custom_duration_unit, subscription_expires_at
       FROM users
       WHERE id = $1
         AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
         AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
         AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
       LIMIT 1`,
      [clientId]
    );
    if (!rows || rows.length === 0) {
      return { ok: false, effectiveStatus: newStatus, restoredAccess: false };
    }

    const u = rows[0];
    const nowIso = new Date().toISOString();

    if (validStatus === "ACTIVE") {
      const planRaw = String(u.plan_type || u.plan || "BASIC").toUpperCase();
      const rawUnit = String(u.custom_duration_unit || "").toLowerCase();
      const isLifetime = planRaw === "LIFETIME" || (planRaw === "CUSTOM" && rawUnit === "lifetime");
      const expMs = u.subscription_expires_at ? new Date(u.subscription_expires_at).getTime() : NaN;
      const isExpired = !isLifetime && (!u.subscription_expires_at || Number.isNaN(expMs) || expMs <= Date.now());

      if (isExpired) {
        await sql.query(
          `UPDATE users
           SET status = 'EXPIRED',
               active = 0,
               is_active = 0,
               subscription_status = 'EXPIRED',
               updated_at = $1
           WHERE id = $2`,
          [nowIso, clientId]
        );
        return { ok: true, effectiveStatus: "EXPIRED", restoredAccess: false };
      }

      await sql.query(
        `UPDATE users
         SET status = 'ACTIVE',
             active = 1,
             is_active = 1,
             subscription_status = 'ACTIVE',
             updated_at = $1
         WHERE id = $2`,
        [nowIso, clientId]
      );
      return { ok: true, effectiveStatus: "ACTIVE", restoredAccess: true };
    }

    const bumpSvSql =
      validStatus === "REVOKED" ? "session_version = COALESCE(session_version, 1) + 1," : "";
    await sql.query(
      `UPDATE users
       SET status = $1::text,
           active = 0,
           is_active = 0,
           subscription_status = $2::varchar,
           ${bumpSvSql}
           updated_at = $3::text
       WHERE id = $4::int4`,
      [validStatus, validStatus, nowIso, clientId]
    );
    return { ok: true, effectiveStatus: validStatus, restoredAccess: false };
  } catch (e) {
    console.error("Neon updateNeonClientStatus error:", e);
    return { ok: false, effectiveStatus: newStatus, restoredAccess: false };
  }
}

export async function logAccountAudit(data: {
  adminId?: number;
  adminEmail?: string;
  clientId: number;
  clientEmail?: string;
  action: string;
  workspaceId?: number;
  result?: string;
  details?: any;
}) {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    const actor = data.adminEmail || "admin";
    const detailsStr = typeof data.details === "string" ? data.details : JSON.stringify(data.details || {});
    await sql.query(
      `INSERT INTO account_audit_logs (workspace_id, actor, account_id, action, result, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.workspaceId || 1,
        actor,
        data.clientId,
        data.action,
        data.result || "SUCCESS",
        detailsStr,
        new Date().toISOString(),
      ]
    );
  } catch (err) {
    console.warn("[Audit Log] Failed to record audit log:", err);
  }
}

export async function resetNeonClientPassword(clientId: number, passwordHash: string) {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const res = await sql.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = TRUE,
           session_version = COALESCE(session_version, 1) + 1,
           updated_at = $2
       WHERE id = $3
         AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
         AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
         AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
       RETURNING id`,
      [passwordHash, new Date().toISOString(), clientId]
    );
    return res.length > 0;
  } catch (e) {
    console.error("Neon resetNeonClientPassword error:", e);
    return false;
  }
}

export async function permanentlyDeleteClientAccount(
  clientId: number,
  confirmUsername: string,
  admin: { adminId?: number; adminEmail?: string }
): Promise<{ ok: boolean; error?: string }> {
  const sql = getNeonSql();
  if (!sql) return { ok: false, error: "Database unavailable" };
  try {
    const rows = await sql.query(
      `SELECT id, username, email, full_name, role, account_type, workspace_id, plan, status
       FROM users
       WHERE id = $1
         AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
         AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
         AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
       LIMIT 1`,
      [clientId]
    );
    if (!rows || rows.length === 0) {
      return { ok: false, error: "Client not found or protected Master Owner cannot be deleted." };
    }
    const client = rows[0];
    const expected = String(client.username || client.email || "").trim().toLowerCase();
    if (!confirmUsername || confirmUsername.trim().toLowerCase() !== expected) {
      return { ok: false, error: "Username confirmation mismatch." };
    }

    const wsId = Number(client.workspace_id);
    // Record identity tombstone so deleted usernames can never silently inherit historical records
    await sql
      .query(
        `INSERT INTO deleted_account_tombstones (former_user_id, former_workspace_id, username_lower, account_type, deleted_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          client.id,
          wsId || null,
          String(client.username || client.email || "").trim().toLowerCase(),
          client.account_type || "PAID_CLIENT",
          admin.adminEmail || "master_owner",
        ]
      )
      .catch(() => {});

    // Log anonymous deletion audit before purging workspace data and personal details
    await logAccountAudit({
      adminId: admin.adminId,
      adminEmail: admin.adminEmail || "master_owner",
      clientId: client.id,
      workspaceId: wsId || 1,
      action: "PERMANENT_DELETE_CLIENT",
      details: {
        former_user_id: client.id,
        former_workspace_id: wsId,
        previous_plan: client.plan,
        previous_status: client.status,
      },
    });

    // Scrub unnecessary personal identifiers from historical audit rows tied to the deleted user
    if (client.username || client.email) {
      await sql
        .query(
          `UPDATE account_audit_logs
           SET actor = $1
           WHERE account_id = $2 AND LOWER(actor) IN (LOWER($3), LOWER($4))`,
          [
            `[deleted_user_${client.id}]`,
            client.id,
            String(client.username || ""),
            String(client.email || ""),
          ]
        )
        .catch(() => {});
    }

    // Remove uploaded proof images / payment submissions belonging to the deleted user/workspace
    await sql
      .query(
        `DELETE FROM payment_submissions WHERE user_id = $1 OR ($2 > 0 AND workspace_id = $2)`,
        [clientId, wsId || 0]
      )
      .catch(() => {});

    if (wsId > 0) {
      // Ensure no other non-target user shares this workspace before deleting workspace rows
      const sharedUsers = await sql.query(
        "SELECT id FROM users WHERE workspace_id = $1 AND id != $2 LIMIT 1",
        [wsId, clientId]
      );
      if (!sharedUsers || sharedUsers.length === 0) {
        const cleanupQueries = [
          "DELETE FROM outreach_records WHERE workspace_id = $1",
          "DELETE FROM export_history WHERE workspace_id = $1",
          "DELETE FROM search_record_leads WHERE search_record_id IN (SELECT id FROM search_records WHERE workspace_id = $1)",
          "DELETE FROM search_records WHERE workspace_id = $1",
          "DELETE FROM leads WHERE workspace_id = $1",
          "DELETE FROM email_accounts WHERE workspace_id = $1",
          "DELETE FROM email_suppressions WHERE workspace_id = $1",
          "DELETE FROM email_templates WHERE workspace_id = $1",
          "DELETE FROM active_search_jobs WHERE workspace_id = $1",
          "DELETE FROM whatsapp_activities WHERE workspace_id = $1",
          "DELETE FROM whatsapp_companion_settings WHERE workspace_id = $1",
          "DELETE FROM whatsapp_templates WHERE workspace_id = $1",
          "DELETE FROM whatsapp_suppressions WHERE workspace_id = $1",
          "DELETE FROM workspace_profiles WHERE workspace_id = $1",
          "DELETE FROM chat_messages WHERE workspace_id = $1",
          "DELETE FROM chat_conversations WHERE workspace_id = $1",
          "DELETE FROM crm_deals WHERE workspace_id = $1",
          "DELETE FROM email_campaigns WHERE workspace_id = $1",
          "DELETE FROM campaigns WHERE workspace_id = $1",
          "DELETE FROM system_notifications WHERE workspace_id = $1",
        ];
        for (const q of cleanupQueries) {
          await sql.query(q, [wsId]).catch(() => {});
        }
      }
    }

    await sql.query("DELETE FROM users WHERE id = $1", [clientId]);
    if (wsId > 0) {
      const stillReferenced = await sql.query("SELECT id FROM users WHERE workspace_id = $1 LIMIT 1", [wsId]);
      if (!stillReferenced || stillReferenced.length === 0) {
        await sql.query("DELETE FROM workspaces WHERE id = $1", [wsId]).catch(() => {});
      }
    }
    return { ok: true };
  } catch (e: any) {
    console.error("permanentlyDeleteClientAccount error:", e);
    return { ok: false, error: e?.message || "Permanent deletion error" };
  }
}

/**
 * Full Owner-Only Client Activity & Account Intelligence profile.
 * Returns ONLY real database records and never exposes password hashes or OAuth secrets.
 */
export async function getNeonClientFullProfile(clientId: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const userRows = await sql.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.company, u.role, u.account_type,
              u.workspace_id, u.status, u.plan, u.plan_type, u.plan_label,
              u.custom_duration_value, u.custom_duration_unit, u.custom_price_usd, u.suggested_price_usd,
              u.daily_email_limit, u.google_maps_enabled, u.features_json,
              u.subscription_status, u.subscription_start, u.subscription_expires_at,
              u.subscription_notes, u.must_change_password, u.created_at, u.last_login,
              u.last_activity_at, u.updated_at,
              u.first_google_signin_at, u.last_google_signin_at, u.google_sub, u.auth_provider,
              u.converted_from_preview_at, u.converted_by_admin_id,
              w.name AS workspace_name, w.created_at AS workspace_created_at
       FROM users u
       LEFT JOIN workspaces w ON u.workspace_id = w.id
       WHERE u.id = $1
         AND u.role NOT IN ('ADMIN', 'SUPER_ADMIN')
         AND (u.account_type IS NULL OR u.account_type != 'MASTER_OWNER')
         AND (u.username IS NULL OR LOWER(u.username) != 'master_owner_usman')
       LIMIT 1`,
      [clientId]
    );
    if (!userRows || userRows.length === 0) return null;
    const u = userRows[0];
    const wsId = Number(u.workspace_id) || 0;
    const computed = computeAuthoritativeUserStatus(u);
    const ent = resolveUserEntitlements(u);

    const createdMs = u.created_at ? new Date(u.created_at).getTime() : NaN;
    const daysActiveTotal = !Number.isNaN(createdMs)
      ? Math.max(0, Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24)))
      : 0;

    // 1. Lead Generation Searches (Find Leads & Google Maps)
    const searchRecords = wsId
      ? await sql
          .query(
            `SELECT id, keyword, country, city, sources, requested_quantity, qualified_quantity,
                    leads_with_phone, search_status, search_date, search_time, completion_time, created_at
             FROM search_records
             WHERE workspace_id = $1
             ORDER BY created_at DESC LIMIT 100`,
            [wsId]
          )
          .catch(() => [])
      : [];

    const activeJobs = wsId
      ? await sql
          .query(
            `SELECT id, job_type, status, keyword, country, city, target_count, progress_count,
                    progress_message, error_message, search_record_id, created_at, updated_at
             FROM active_search_jobs
             WHERE workspace_id = $1
             ORDER BY created_at DESC LIMIT 50`,
            [wsId]
          )
          .catch(() => [])
      : [];

    const findLeadsSearches = (searchRecords || []).filter(
      (s: any) => !String(s.id || "").startsWith("SR-MAPS-")
    );
    const googleMapsSearches = (searchRecords || []).filter((s: any) =>
      String(s.id || "").startsWith("SR-MAPS-")
    );

    // 2. Saved Leads summary (never exposes sensitive data, aggregates sources & contact breakdowns)
    const leadAggRows = wsId
      ? await sql
          .query(
            `SELECT
               COUNT(*) AS total_saved_leads,
               COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '' AND email != 'Not Found' AND email LIKE '%@%') AS with_email,
               COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed') AS with_phone,
               COUNT(*) FILTER (
                 WHERE (email IS NOT NULL AND email != '' AND email != 'Not Found' AND email LIKE '%@%')
                   AND (phone IS NOT NULL AND phone != '' AND phone != 'Not Found' AND phone != 'Not Listed')
               ) AS with_both,
               COUNT(*) FILTER (WHERE UPPER(COALESCE(whatsapp_status, 'NOT_CHECKED')) = 'CONFIRMED') AS wa_confirmed,
               MIN(created_at) AS first_lead_saved_at,
               MAX(created_at) AS last_lead_saved_at
             FROM leads
             WHERE workspace_id = $1`,
            [wsId]
          )
          .catch(() => [])
      : [];
    const leadSources = wsId
      ? await sql
          .query(
            `SELECT COALESCE(NULLIF(TRIM(source), ''), 'Unknown Source') AS source, COUNT(*) AS count
             FROM leads WHERE workspace_id = $1
             GROUP BY COALESCE(NULLIF(TRIM(source), ''), 'Unknown Source')
             ORDER BY count DESC`,
            [wsId]
          )
          .catch(() => [])
      : [];

    // 3. Exports History
    const exportLogs = wsId
      ? await sql
          .query(
            `SELECT id, export_target, search_record_id, export_date_filter, format, record_count,
                    export_date, export_time, created_at
             FROM export_history
             WHERE workspace_id = $1
             ORDER BY id DESC LIMIT 50`,
            [wsId]
          )
          .catch(() => [])
      : [];

    // 4. Gmail & Cold Email Activity (NEVER return oauth_token_json or password!)
    const gmailAccounts = wsId
      ? await sql
          .query(
            `SELECT id, sender_email, sender_name, account_name, is_active, health_status, last_error,
                    last_refreshed_at, revoked_at, daily_limit, last_sent_at, created_at, updated_at
             FROM email_accounts
             WHERE workspace_id = $1
             ORDER BY id DESC`,
            [wsId]
          )
          .catch(() => [])
      : [];

    const outreachAggRows = wsId
      ? await sql
          .query(
            `SELECT
               COUNT(*) FILTER (WHERE outreach_status = 'EMAIL SENT') AS total_sent,
               COUNT(*) FILTER (WHERE outreach_status = 'FAILED') AS total_failed,
               COUNT(*) FILTER (
                 WHERE outreach_status = 'EMAIL SENT'
                   AND sent_at::timestamptz >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
               ) AS sent_today_utc,
               MAX(sent_at) AS last_send_attempt_at
             FROM outreach_records
             WHERE workspace_id = $1`,
            [wsId]
          )
          .catch(() => [])
      : [];

    const recentOutreach = wsId
      ? await sql
          .query(
            `SELECT id, recipient_email, recipient_name, sender_email, subject, outreach_status,
                    followup_notes, sent_at, created_at
             FROM outreach_records
             WHERE workspace_id = $1
             ORDER BY id DESC LIMIT 50`,
            [wsId]
          )
          .catch(() => [])
      : [];

    // 5. Audit logs (both account_id match & workspace_id match)
    const auditLogs = await sql
      .query(
        `SELECT id, workspace_id, actor, account_id, action, result, details, timestamp
         FROM account_audit_logs
         WHERE account_id = $1 OR ($2 > 0 AND workspace_id = $2)
         ORDER BY id DESC LIMIT 250`,
        [clientId, wsId]
      )
      .catch(() => []);

    const subAuditLogs = (auditLogs || []).filter((l: any) =>
      String(l.action || "").startsWith("SUBSCRIPTION_") ||
      String(l.action || "").startsWith("STATUS_") ||
      String(l.action || "").includes("CREATE_PAID_CLIENT")
    );

    const lockHistory = (auditLogs || []).filter((l: any) => {
      const a = String(l.action || "").toUpperCase();
      return (
        a.includes("LOCK") ||
        a.includes("SUSPEND") ||
        a.includes("REVOKE") ||
        a.includes("DEACTIVATE") ||
        a === "STATUS_ACTIVE" ||
        a === "SUBSCRIPTION_ACTIVATE"
      );
    });

    const suppressionsRes = wsId
      ? await sql
          .query(`SELECT COUNT(*)::int AS cnt FROM email_suppressions WHERE workspace_id = $1`, [wsId])
          .catch(() => [])
      : [];
    const suppressionsCount = Number(suppressionsRes?.[0]?.cnt || 0);

    const paymentHistory = await sql
      .query(
        `SELECT id, user_id, workspace_id, requested_plan, plan_label, agreed_price_usd, currency,
                payment_method_name, payment_reference, customer_note, screenshot_filename,
                screenshot_mime, screenshot_size, status, admin_notes, reviewed_by, reviewed_at, created_at
         FROM payment_submissions
         WHERE user_id = $1 OR ($2 > 0 AND workspace_id = $2)
         ORDER BY created_at DESC LIMIT 50`,
        [clientId, wsId]
      )
      .catch(() => []);

    const countriesSet = new Set<string>();
    const citiesSet = new Set<string>();
    const keywordsSet = new Set<string>();
    const datesSet = new Set<string>();
    for (const s of searchRecords || []) {
      if (s.keyword) keywordsSet.add(String(s.keyword));
      if (s.search_date) datesSet.add(String(s.search_date));
      if (s.country) {
        for (const c of String(s.country).split(",")) {
          const clean = c.trim();
          if (clean && !/^\d+\s+Countries$/i.test(clean)) countriesSet.add(clean);
        }
      }
      if (s.city) {
        for (const ct of String(s.city).split(",")) {
          const clean = ct.trim();
          if (clean) citiesSet.add(clean);
        }
      }
    }

    const leadAgg = leadAggRows?.[0] || {};
    const outreachAgg = outreachAggRows?.[0] || {};
    const sentTodayUtc = parseInt(outreachAgg.sent_today_utc || "0", 10);

    // Derive authoritative last_activity timestamp across activity tables
    const timestamps = [
      u.last_activity_at,
      u.last_login,
      searchRecords?.[0]?.created_at,
      leadAgg.last_lead_saved_at,
      outreachAgg.last_send_attempt_at,
      exportLogs?.[0]?.created_at,
      auditLogs?.[0]?.timestamp,
    ]
      .filter(Boolean)
      .map((t: any) => new Date(t).getTime())
      .filter((n: number) => !Number.isNaN(n));
    const derivedLastActivity = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;

    return {
      account: {
        id: u.id,
        username: u.username || u.email,
        email: u.email,
        full_name: u.full_name,
        company: u.company,
        account_type: u.account_type || "PAID_CLIENT",
        workspace_id: wsId,
        workspace_name: u.workspace_name || `${u.full_name || u.username}'s Workspace`,
        created_at: u.created_at,
        last_login: u.last_login || null,
        last_activity: derivedLastActivity,
        first_google_signin_at: u.first_google_signin_at || null,
        last_google_signin_at: u.last_google_signin_at || null,
        google_sub: u.google_sub || null,
        auth_provider: u.auth_provider || null,
        converted_from_preview_at: u.converted_from_preview_at || null,
        days_active_total: daysActiveTotal,
        status: computed.status,
        raw_status: u.status,
        is_suspended: ["SUSPENDED", "LOCKED", "REVOKED"].includes(computed.status),
        is_expired: computed.isExpired,
        must_change_password: Boolean(u.must_change_password),
        plan: ent.planType,
        plan_label: ent.planLabel,
        custom_price_usd: u.custom_price_usd != null ? Number(u.custom_price_usd) : (ent.planType === "LIFETIME" ? 100 : ent.planType === "BASIC" ? 25 : null),
        suggested_price_usd: u.suggested_price_usd != null ? Number(u.suggested_price_usd) : null,
        custom_duration_value: u.custom_duration_value,
        custom_duration_unit: u.custom_duration_unit,
        subscription_start: u.subscription_start,
        subscription_expires_at: ent.subscriptionExpiresAt,
        remaining_detailed: computed.remainingDetailed,
        google_maps_enabled: ent.googleMapsEnabled,
        daily_email_limit: ent.dailyEmailLimit,
        features: ent.features,
        subscription_notes: u.subscription_notes || null,
        subscription_history: subAuditLogs,
        lock_history: lockHistory,
        payment_history: paymentHistory || [],
      },
      lead_generation: {
        total_searches: (searchRecords || []).length,
        find_leads_searches_count: findLeadsSearches.length,
        google_maps_searches_count: googleMapsSearches.length,
        total_leads_generated: (searchRecords || []).reduce(
          (sum: number, r: any) => sum + (Number(r.qualified_quantity) || 0),
          0
        ),
        search_keywords: Array.from(keywordsSet),
        search_dates: Array.from(datesSet),
        countries_searched: Array.from(countriesSet),
        cities_searched: Array.from(citiesSet),
        searches: searchRecords || [],
        maps_jobs: activeJobs || [],
      },
      saved_leads: {
        total_saved: parseInt(leadAgg.total_saved_leads || "0", 10),
        with_email: parseInt(leadAgg.with_email || "0", 10),
        with_phone: parseInt(leadAgg.with_phone || "0", 10),
        with_both: parseInt(leadAgg.with_both || "0", 10),
        whatsapp_confirmed_manual: parseInt(leadAgg.wa_confirmed || "0", 10),
        first_saved_at: leadAgg.first_lead_saved_at || null,
        last_saved_at: leadAgg.last_lead_saved_at || null,
        sources: (leadSources || []).map((s: any) => ({
          source: String(s.source),
          count: parseInt(s.count || "0", 10),
        })),
        exports: exportLogs || [],
      },
      gmail_outreach: {
        connected: gmailAccounts.some((a: any) => a.is_active === 1 && a.health_status === "CONNECTED"),
        accounts: gmailAccounts,
        total_emails_sent: parseInt(outreachAgg.total_sent || "0", 10),
        total_failed_emails: parseInt(outreachAgg.total_failed || "0", 10),
        emails_sent_today_utc: sentTodayUtc,
        daily_email_limit: ent.dailyEmailLimit,
        remaining_today_utc: Math.max(0, ent.dailyEmailLimit - sentTodayUtc),
        suppressions_count: suppressionsCount,
        last_send_attempt_at: outreachAgg.last_send_attempt_at || null,
        recent_records: recentOutreach || [],
      },
      audit_logs: auditLogs || [],
      data_notes: {
        audit_note:
          "Audit entries reflect logged actions from database event capture. Historical events before audit instrumentation are noted only where source tables retain records.",
      },
    };
  } catch (e) {
    console.error("getNeonClientFullProfile error:", e);
    return null;
  }
}

/**
 * Genuine Client Dashboard Metrics (Derived strictly from database records)
 */
export async function getNeonClientDashboardMetrics(workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  await ensureOutreachTable();

  try {
    // 1. Saved leads count in this workspace
    const leadsRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM leads WHERE workspace_id = $1",
      [workspaceId]
    );
    const totalSavedLeads = parseInt(leadsRes[0]?.cnt || "0", 10);

    // 2. Leads with valid email address
    const emailsRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM leads WHERE workspace_id = $1 AND email IS NOT NULL AND email != '' AND email != 'Not Found'",
      [workspaceId]
    );
    const availableEmailContacts = parseInt(emailsRes[0]?.cnt || "0", 10);

    // 3. Leads with valid phone number
    const phonesRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM leads WHERE workspace_id = $1 AND phone IS NOT NULL AND phone != '' AND phone != 'Not Listed' AND phone != 'Not Found'",
      [workspaceId]
    );
    const availablePhoneContacts = parseInt(phonesRes[0]?.cnt || "0", 10);

    // 3b. Leads with BOTH email AND phone
    const bothRes = await sql.query(
      `SELECT COUNT(*) as cnt FROM leads
       WHERE workspace_id = $1
         AND email IS NOT NULL AND email != '' AND email != 'Not Found' AND email LIKE '%@%'
         AND phone IS NOT NULL AND phone != '' AND phone != 'Not Listed' AND phone != 'Not Found'`,
      [workspaceId]
    );
    const leadsWithBothContacts = parseInt(bothRes[0]?.cnt || "0", 10);

    // 4. Connected active Gmail accounts (healthy connected accounts only)
    const accRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM email_accounts WHERE workspace_id = $1 AND is_active = 1 AND COALESCE(health_status, 'CONNECTED') = 'CONNECTED'",
      [workspaceId]
    );
    const connectedEmailAccounts = parseInt(accRes[0]?.cnt || "0", 10);

    // 5. Total emails sent successfully
    const sentRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM outreach_records WHERE workspace_id = $1 AND outreach_status = 'EMAIL SENT'",
      [workspaceId]
    );
    const emailsSent = parseInt(sentRes[0]?.cnt || "0", 10);

    // 5b. Successful emails sent today (UTC day)
    const sentTodayRes = await sql.query(
      `SELECT COUNT(*) as cnt FROM outreach_records
       WHERE workspace_id = $1
         AND outreach_status = 'EMAIL SENT'
         AND sent_at::timestamptz >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
      [workspaceId]
    );
    const emailsSentToday = parseInt(sentTodayRes[0]?.cnt || "0", 10);

    // 6. Failed emails
    const failedRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM outreach_records WHERE workspace_id = $1 AND outreach_status = 'FAILED'",
      [workspaceId]
    );
    const failedEmails = parseInt(failedRes[0]?.cnt || "0", 10);

    // 7. Total search leads discovered
    const searchRes = await sql.query(
      "SELECT COALESCE(SUM(qualified_quantity), 0) as total_found FROM search_records WHERE workspace_id = $1",
      [workspaceId]
    );
    const totalLeadsFound = parseInt(searchRes[0]?.total_found || "0", 10);

    // 8. Authoritative workspace owner/client plan entitlements & quota state
    const wsUserRows = await sql.query(
      `SELECT id, role, account_type, status, plan, plan_type, plan_label,
              custom_duration_value, custom_duration_unit, max_leads_quota, daily_email_limit,
              google_maps_enabled, features_json, subscription_start, subscription_expires_at
       FROM users WHERE workspace_id = $1 ORDER BY id ASC LIMIT 1`,
      [workspaceId]
    );
    const wsUser = wsUserRows[0] || null;
    const wsEnt = wsUser ? resolveUserEntitlements(wsUser) : null;
    const maxLeadsQuota = wsUser ? resolvePlanLeadAllowance(wsUser) : 2500;
    const subStart = wsUser?.subscription_start ? new Date(wsUser.subscription_start).toISOString() : null;

    const periodLeadsRes = await sql.query(
      `SELECT COUNT(*)::int AS cnt FROM leads
       WHERE workspace_id = $1
         AND ($2::timestamptz IS NULL OR created_at::timestamptz >= $2::timestamptz)`,
      [workspaceId, subStart]
    );
    const leadsUsedInPeriod = parseInt(periodLeadsRes[0]?.cnt || "0", 10);
    const remainingQuota = maxLeadsQuota === null ? null : Math.max(0, maxLeadsQuota - leadsUsedInPeriod);

    return {
      workspace_id: workspaceId,
      total_leads_found: Math.max(totalLeadsFound, totalSavedLeads),
      saved_leads: totalSavedLeads,
      leads_used_in_period: leadsUsedInPeriod,
      leads_with_email: availableEmailContacts,
      leads_with_phone: availablePhoneContacts,
      leads_with_both_contacts: leadsWithBothContacts,
      available_email_contacts: availableEmailContacts,
      available_phone_contacts: availablePhoneContacts,
      connected_gmail_accounts: connectedEmailAccounts,
      emails_sent: emailsSent,
      emails_sent_today: emailsSentToday,
      daily_email_limit: wsEnt ? wsEnt.dailyEmailLimit : 10,
      failed_emails: failedEmails,
      remaining_quota: remainingQuota === null ? 999999 : remainingQuota,
      max_quota: maxLeadsQuota === null ? 999999 : maxLeadsQuota,
      is_unlimited_quota: maxLeadsQuota === null,
      contact_rate: totalSavedLeads > 0 ? Math.round((availableEmailContacts / totalSavedLeads) * 100) : 0,
      google_maps_enabled: wsEnt ? wsEnt.googleMapsEnabled : false,
      plan_type: wsEnt ? wsEnt.planType : "BASIC",
      plan_label: wsEnt ? wsEnt.planLabel : "Basic Plan",
      subscription_start: subStart,
      subscription_expires_at: wsUser?.subscription_expires_at || null,
    };
  } catch (e) {
    console.error("Neon getNeonClientDashboardMetrics error:", e);
    return null;
  }
}

export async function getWorkspaceLeadQuotaState(
  workspaceId: number,
  userRecord?: any
): Promise<{
  maxLeadsQuota: number | null;
  leadsUsedInPeriod: number;
  remainingLeadsQuota: number | null;
  subscriptionStart: string | null;
}> {
  const sql = getNeonSql();
  if (!sql) {
    return {
      maxLeadsQuota: userRecord ? resolvePlanLeadAllowance(userRecord) : null,
      leadsUsedInPeriod: 0,
      remainingLeadsQuota: userRecord ? resolvePlanLeadAllowance(userRecord) : null,
      subscriptionStart: null,
    };
  }

  let u = userRecord;
  if (!u || (u.max_leads_quota === undefined && u.plan_type === undefined)) {
    const rows = await sql.query(
      `SELECT id, role, account_type, status, plan, plan_type, plan_label,
              custom_duration_value, custom_duration_unit, max_leads_quota,
              subscription_start, subscription_expires_at
       FROM users WHERE workspace_id = $1 ORDER BY id ASC LIMIT 1`,
      [workspaceId]
    );
    u = rows?.[0] || u || {};
  }

  const maxLeadsQuota = resolvePlanLeadAllowance(u);
  if (maxLeadsQuota === null) {
    return {
      maxLeadsQuota: null,
      leadsUsedInPeriod: 0,
      remainingLeadsQuota: null,
      subscriptionStart: u?.subscription_start ? new Date(u.subscription_start).toISOString() : null,
    };
  }

  const subStart = u?.subscription_start ? new Date(u.subscription_start).toISOString() : null;
  const cntRes = await sql.query(
    `SELECT COUNT(*)::int AS cnt FROM leads
     WHERE workspace_id = $1
       AND ($2::timestamptz IS NULL OR created_at::timestamptz >= $2::timestamptz)`,
    [workspaceId, subStart]
  );
  const used = Number(cntRes?.[0]?.cnt || 0);
  return {
    maxLeadsQuota,
    leadsUsedInPeriod: used,
    remainingLeadsQuota: Math.max(0, maxLeadsQuota - used),
    subscriptionStart: subStart,
  };
}

/**
 * -----------------------------------------------------------------------------
 * 1. ACCOUNT-LEVEL PERMANENT LEAD DEDUPLICATION SIGNATURES
 * Fetches all normalized domains, emails, phones, and place IDs previously saved
 * for this workspace so future searches never return the same business twice.
 * -----------------------------------------------------------------------------
 */
export async function getNeonWorkspaceLeadSignatures(workspaceId: number): Promise<{
  domains: Set<string>;
  emails: Set<string>;
  phones: Set<string>;
  placeIds: Set<string>;
}> {
  const result = {
    domains: new Set<string>(),
    emails: new Set<string>(),
    phones: new Set<string>(),
    placeIds: new Set<string>(),
  };

  const sql = getNeonSql();
  if (!sql) return result;

  try {
    const rows = await sql.query(
      `SELECT normalized_domain, normalized_email, normalized_phone, place_id, domain, email, phone
       FROM leads 
       WHERE workspace_id = $1`,
      [workspaceId]
    );

    for (const r of rows) {
      const d = String(r.normalized_domain || r.domain || "").toLowerCase().trim();
      if (d) result.domains.add(d);

      const e = String(r.normalized_email || r.email || "").toLowerCase().trim();
      if (e) result.emails.add(e);

      const p = String(r.normalized_phone || r.phone || "").replace(/[^0-9+]/g, "").trim();
      if (p && p.length >= 7) result.phones.add(p);

      const pl = String(r.place_id || "").trim();
      if (pl) result.placeIds.add(pl);
    }
  } catch (err) {
    console.error("Neon getWorkspaceLeadSignatures error:", err);
  }

  return result;
}

/**
 * -----------------------------------------------------------------------------
 * 2. ONE ACTIVE SEARCH JOB PER ACCOUNT (IDEMPOTENCY & LOCKING)
 * Protects against duplicate concurrent searches, repeated clicks, and ensures
 * page refreshes preserve status.
 * -----------------------------------------------------------------------------
 */
export async function acquireActiveSearchJob(
  workspaceId: number,
  userId: number,
  jobType: string,
  keyword: string,
  country?: string,
  city?: string,
  targetCount: number = 50,
  initialPayload?: any
): Promise<{ allowed: boolean; jobId?: string; message?: string }> {
  const sql = getNeonSql();
  if (!sql) return { allowed: true, jobId: `job_${Date.now()}_fallback` };

  try {
    // Auto-expire abandoned RUNNING jobs older than 2 minutes without heartbeat
    await sql.query(
      `UPDATE active_search_jobs
       SET status = 'TIMED_OUT',
           error_message = 'Job automatically timed out after inactivity',
           updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1 AND status = 'RUNNING'
         AND updated_at <= NOW() - INTERVAL '2 minutes'`,
      [workspaceId]
    ).catch(() => {});

    const runningJobs = await sql.query(
      `SELECT id, keyword, status, updated_at 
       FROM active_search_jobs 
       WHERE workspace_id = $1 AND status = 'RUNNING' 
         AND updated_at > NOW() - INTERVAL '2 minutes'
       LIMIT 1`,
      [workspaceId]
    );

    if (runningJobs.length > 0) {
      return {
        allowed: false,
        jobId: runningJobs[0].id,
        message: `A lead search for "${runningJobs[0].keyword}" is already in progress for your workspace. Cancel or wait for it to finish.`,
      };
    }

    const jobId = `job_${Date.now()}_${workspaceId}`;
    await sql.query(
      `INSERT INTO active_search_jobs (
        id, workspace_id, user_id, job_type, status, keyword, country, city, target_count, progress_message, job_payload
      ) VALUES ($1, $2, $3, $4, 'RUNNING', $5, $6, $7, $8, 'Search job started', $9::jsonb)`,
      [
        jobId,
        workspaceId,
        userId,
        jobType,
        keyword,
        country || "Global",
        city || "",
        targetCount,
        JSON.stringify(initialPayload || {}),
      ]
    );

    return { allowed: true, jobId };
  } catch (err: any) {
    console.error("acquireActiveSearchJob error:", err);
    return { allowed: true, jobId: `job_${Date.now()}_recovery` };
  }
}

export async function updateActiveSearchJobProgress(
  jobId: string,
  workspaceId: number,
  updates: {
    progressCount?: number;
    progressMessage?: string;
    jobPayload?: any;
  }
): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql || !jobId) return false;
  try {
    const rows = await sql.query(
      `UPDATE active_search_jobs
       SET progress_count = COALESCE($1, progress_count),
           progress_message = COALESCE($2, progress_message),
           job_payload = COALESCE($3::jsonb, job_payload),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND workspace_id = $5 AND status = 'RUNNING'
       RETURNING id`,
      [
        updates.progressCount !== undefined ? updates.progressCount : null,
        updates.progressMessage || null,
        updates.jobPayload ? JSON.stringify(updates.jobPayload) : null,
        jobId,
        workspaceId,
      ]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("updateActiveSearchJobProgress error:", err);
    return false;
  }
}

export async function getActiveSearchJobById(jobId: string, workspaceId: number): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql || !jobId) return null;
  try {
    const rows = await sql.query(
      `SELECT * FROM active_search_jobs WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [jobId, workspaceId]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function cancelActiveSearchJob(jobId: string, workspaceId: number): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql || !jobId) return null;
  try {
    const rows = await sql.query(
      `UPDATE active_search_jobs
       SET status = 'CANCELLED',
           progress_message = 'Stopped by user — already discovered leads preserved.',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND workspace_id = $2
       RETURNING *`,
      [jobId, workspaceId]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("cancelActiveSearchJob error:", err);
    return null;
  }
}

export async function completeActiveSearchJob(
  jobId: string,
  status: "COMPLETED" | "FAILED" | "CANCELLED",
  qualifiedCount: number = 0,
  searchRecordId?: string,
  errorMessage?: string,
  finalPayload?: any,
  finalMessage?: string
): Promise<void> {
  const sql = getNeonSql();
  if (!sql || !jobId) return;

  try {
    await sql.query(
      `UPDATE active_search_jobs 
       SET status = $1, 
           progress_count = $2, 
           search_record_id = COALESCE($3, search_record_id), 
           error_message = $4,
           progress_message = COALESCE($5, progress_message),
           job_payload = COALESCE($6::jsonb, job_payload),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        status,
        qualifiedCount,
        searchRecordId || null,
        errorMessage || null,
        finalMessage || null,
        finalPayload ? JSON.stringify(finalPayload) : null,
        jobId,
      ]
    );
  } catch (err) {
    console.error("completeActiveSearchJob error:", err);
  }
}

export async function getNeonActiveSearchJob(workspaceId: number, includeRecentSeconds: number = 0): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql) return null;

  try {
    // Auto-expire stalled jobs first
    await sql.query(
      `UPDATE active_search_jobs
       SET status = 'TIMED_OUT',
           error_message = 'Job automatically timed out after inactivity',
           updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1 AND status = 'RUNNING'
         AND updated_at <= NOW() - INTERVAL '2 minutes'`,
      [workspaceId]
    ).catch(() => {});

    const rows = await sql.query(
      `SELECT * FROM active_search_jobs 
       WHERE workspace_id = $1 AND status = 'RUNNING' 
         AND updated_at > NOW() - INTERVAL '2 minutes'
       ORDER BY updated_at DESC LIMIT 1`,
      [workspaceId]
    );
    if (rows[0]) return rows[0];

    if (includeRecentSeconds > 0) {
      const recent = await sql.query(
        `SELECT * FROM active_search_jobs
         WHERE workspace_id = $1
           AND updated_at > NOW() - ($2 * INTERVAL '1 second')
         ORDER BY updated_at DESC LIMIT 1`,
        [workspaceId, includeRecentSeconds]
      );
      return recent[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * -----------------------------------------------------------------------------
 * 3. COLD EMAIL TEMPLATES MANAGEMENT
 * Stores 10 editable templates and custom templates per workspace.
 * -----------------------------------------------------------------------------
 */
export async function getNeonEmailTemplates(workspaceId: number): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];

  try {
    const rows = await sql.query(
      `SELECT * FROM email_templates 
       WHERE workspace_id = $1 OR workspace_id = 1 
       ORDER BY id ASC`,
      [workspaceId]
    );
    return rows;
  } catch (e) {
    console.error("getNeonEmailTemplates error:", e);
    return [];
  }
}

export async function saveNeonEmailTemplate(
  workspaceId: number,
  template: { id?: number; name: string; subject: string; body: string; category?: string }
): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql) return null;

  try {
    if (template.id) {
      const updated = await sql.query(
        `UPDATE email_templates 
         SET name = $1, subject = $2, body = $3, category = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND workspace_id = $6
         RETURNING *`,
        [template.name, template.subject, template.body, template.category || "OUTREACH", template.id, workspaceId]
      );
      return updated[0] || null;
    } else {
      const inserted = await sql.query(
        `INSERT INTO email_templates (workspace_id, name, subject, body, category)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [workspaceId, template.name, template.subject, template.body, template.category || "CUSTOM"]
      );
      return inserted[0] || null;
    }
  } catch (e) {
    console.error("saveNeonEmailTemplate error:", e);
    return null;
  }
}

export async function deleteNeonEmailTemplate(workspaceId: number, templateId: number): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;

  try {
    await sql.query(
      "DELETE FROM email_templates WHERE id = $1 AND workspace_id = $2",
      [templateId, workspaceId]
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * -----------------------------------------------------------------------------
 * 4. PERSISTENT MULTILINGUAL AI ASSISTANT CHAT CONVERSATIONS & MESSAGES
 * -----------------------------------------------------------------------------
 */
export async function getNeonChatConversations(workspaceId: number): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];

  try {
    const rows = await sql.query(
      `SELECT * FROM chat_conversations 
       WHERE workspace_id = $1 
       ORDER BY updated_at DESC`,
      [workspaceId]
    );
    return rows;
  } catch (e) {
    console.error("getNeonChatConversations error:", e);
    return [];
  }
}

export async function createNeonChatConversation(
  workspaceId: number,
  userId: number,
  title: string,
  language: string = "english",
  context: any = {}
): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql) return null;

  try {
    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rows = await sql.query(
      `INSERT INTO chat_conversations (id, workspace_id, user_id, title, detected_language, business_context)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [convId, workspaceId, userId, title, language, JSON.stringify(context)]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("createNeonChatConversation error:", e);
    return null;
  }
}

export async function getNeonChatMessages(conversationId: string, workspaceId: number): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];

  try {
    const rows = await sql.query(
      `SELECT * FROM chat_messages 
       WHERE conversation_id = $1 AND workspace_id = $2 
       ORDER BY id ASC`,
      [conversationId, workspaceId]
    );
    return rows;
  } catch (e) {
    console.error("getNeonChatMessages error:", e);
    return [];
  }
}

export async function addNeonChatMessage(
  conversationId: string,
  workspaceId: number,
  role: "user" | "assistant" | "system",
  content: string,
  suggestedActions: any[] = []
): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql) return null;

  try {
    const rows = await sql.query(
      `INSERT INTO chat_messages (conversation_id, workspace_id, role, content, suggested_actions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, workspaceId, role, content, JSON.stringify(suggestedActions)]
    );

    // Update conversation updated_at
    await sql.query(
      "UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND workspace_id = $2",
      [conversationId, workspaceId]
    );

    return rows[0] || null;
  } catch (e) {
    console.error("addNeonChatMessage error:", e);
    return null;
  }
}

export async function deleteNeonChatConversation(
  conversationId: string,
  workspaceId: number
): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;

  try {
    await sql.query(
      `DELETE FROM chat_conversations WHERE id = $1 AND workspace_id = $2`,
      [conversationId, workspaceId]
    );
    return true;
  } catch (e) {
    console.error("deleteNeonChatConversation error:", e);
    return false;
  }
}

export async function getNeonCampaigns(workspaceId: number): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const rows = await sql.query(
      `SELECT * FROM campaigns WHERE workspace_id = $1 ORDER BY updated_at DESC`,
      [workspaceId]
    );
    return rows;
  } catch (e) {
    console.error("getNeonCampaigns error:", e);
    return [];
  }
}

export async function getNeonCampaignById(campaignId: string, workspaceId: number): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const rows = await sql.query(
      `SELECT * FROM campaigns WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [campaignId, workspaceId]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("getNeonCampaignById error:", e);
    return null;
  }
}

export async function createNeonCampaign(data: {
  id: string;
  workspace_id: number;
  name: string;
  campaign_type: string;
  keyword: string;
  countries: string[];
  target_quantity: number;
  contact_requirement: string;
  search_mode?: string;
  search_variations?: any[];
}): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const rows = await sql.query(
      `INSERT INTO campaigns (
        id, workspace_id, name, campaign_type, keyword,
        countries, target_quantity, contact_requirement, search_mode,
        search_variations, status, progress_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', 0)
      RETURNING *`,
      [
        data.id,
        data.workspace_id,
        data.name,
        data.campaign_type || 'FIND_LEADS',
        data.keyword,
        JSON.stringify(data.countries || []),
        data.target_quantity || 50,
        data.contact_requirement || 'EMAIL_AND_PHONE',
        data.search_mode || 'STANDARD',
        JSON.stringify(data.search_variations || []),
      ]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("createNeonCampaign error:", e);
    return null;
  }
}

export async function updateNeonCampaignProgress(
  campaignId: string,
  workspaceId: number,
  updates: {
    status?: string;
    current_country?: string;
    candidates_processed?: number;
    eligible_leads_count?: number;
    duplicates_skipped?: number;
    missing_contact_count?: number;
    errors_count?: number;
    progress_percent?: number;
    country_stats?: any;
    search_variations?: any;
    error_message?: string;
    completed_at?: Date | null;
  }
): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const fields: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: any[] = [campaignId, workspaceId];

    if (updates.status !== undefined) {
      params.push(updates.status);
      fields.push(`status = $${params.length}`);
    }
    if (updates.current_country !== undefined) {
      params.push(updates.current_country);
      fields.push(`current_country = $${params.length}`);
    }
    if (updates.candidates_processed !== undefined) {
      params.push(updates.candidates_processed);
      fields.push(`candidates_processed = $${params.length}`);
    }
    if (updates.eligible_leads_count !== undefined) {
      params.push(updates.eligible_leads_count);
      fields.push(`eligible_leads_count = $${params.length}`);
    }
    if (updates.duplicates_skipped !== undefined) {
      params.push(updates.duplicates_skipped);
      fields.push(`duplicates_skipped = $${params.length}`);
    }
    if (updates.missing_contact_count !== undefined) {
      params.push(updates.missing_contact_count);
      fields.push(`missing_contact_count = $${params.length}`);
    }
    if (updates.errors_count !== undefined) {
      params.push(updates.errors_count);
      fields.push(`errors_count = $${params.length}`);
    }
    if (updates.progress_percent !== undefined) {
      params.push(updates.progress_percent);
      fields.push(`progress_percent = $${params.length}`);
    }
    if (updates.country_stats !== undefined) {
      params.push(JSON.stringify(updates.country_stats));
      fields.push(`country_stats = $${params.length}`);
    }
    if (updates.search_variations !== undefined) {
      params.push(JSON.stringify(updates.search_variations));
      fields.push(`search_variations = $${params.length}`);
    }
    if (updates.error_message !== undefined) {
      params.push(updates.error_message);
      fields.push(`error_message = $${params.length}`);
    }
    if (updates.completed_at !== undefined) {
      params.push(updates.completed_at ? updates.completed_at.toISOString() : null);
      fields.push(`completed_at = $${params.length}`);
    }

    const query = `UPDATE campaigns SET ${fields.join(", ")} WHERE id = $1 AND workspace_id = $2`;
    await sql.query(query, params);
    return true;
  } catch (e) {
    console.error("updateNeonCampaignProgress error:", e);
    return false;
  }
}

export async function getNeonEmailSuppressions(workspaceId: number): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    return await sql.query(
      `SELECT id, workspace_id, email, reason, created_at
       FROM email_suppressions
       WHERE workspace_id = $1
       ORDER BY id DESC LIMIT 200`,
      [workspaceId]
    );
  } catch {
    return [];
  }
}

export async function addNeonEmailSuppression(workspaceId: number, email: string, reason?: string) {
  const sql = getNeonSql();
  if (!sql) return null;
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return null;
  try {
    const existing = await sql.query(
      `SELECT id, workspace_id, email, reason, created_at FROM email_suppressions WHERE workspace_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [workspaceId, cleanEmail]
    );
    if (existing?.[0]) return existing[0];
    const rows = await sql.query(
      `INSERT INTO email_suppressions (workspace_id, email, reason, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, workspace_id, email, reason, created_at`,
      [workspaceId, cleanEmail, (reason || "UNSUBSCRIBED").slice(0, 120)]
    );
    return rows?.[0] || null;
  } catch (e) {
    console.error("addNeonEmailSuppression error:", e);
    return null;
  }
}

export async function removeNeonEmailSuppression(workspaceId: number, id: number): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const rows = await sql.query(
      `DELETE FROM email_suppressions WHERE workspace_id = $1 AND id = $2 RETURNING id`,
      [workspaceId, id]
    );
    return Boolean(rows && rows.length > 0);
  } catch {
    return false;
  }
}

export async function deleteNeonCampaign(campaignId: string, workspaceId: number): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    await sql.query(`DELETE FROM campaigns WHERE id = $1 AND workspace_id = $2`, [campaignId, workspaceId]);
    return true;
  } catch (e) {
    console.error("deleteNeonCampaign error:", e);
    return false;
  }
}

