import { neon } from "@neondatabase/serverless";

export function getNeonSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl || !dbUrl.includes("postgres")) return null;
  return neon(dbUrl);
}

export function isNeonConfigured(): boolean {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
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
      if (!bName || !email || !email.includes("@") || !email.includes(".")) continue;

      const phone = String(lead.phone || "").trim();
      const hasPhone = phone && !["Not Listed", "Not Found", ""].includes(phone);
      if (hasPhone) phoneCount++;
      qualifiedLeads.push(lead);
    }

    const nowIso = new Date().toISOString();

    await sql.query(
      `INSERT INTO search_records (
        id, workspace_id, user_id, keyword, country, city, sources,
        requested_quantity, qualified_quantity, leads_with_phone,
        search_status, search_date, search_time, completion_time, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING`,
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

      const existing = await sql.query(
        "SELECT id FROM leads WHERE workspace_id = $1 AND email = $2 LIMIT 1",
        [workspaceId, email]
      );

      let leadId = existing.length > 0 ? existing[0].id : null;
      if (!leadId) {
        const ins = await sql.query(
          `INSERT INTO leads (
            workspace_id, business_name, email, phone, website,
            source, source_url, search_keyword, search_location,
            lead_score, fit_score, lead_temperature, crm_stage,
            saved_date, saved_time, date_discovered, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING id`,
          [
            workspaceId,
            bName,
            email,
            phone,
            website,
            lead.source || "Google Organic Web Search",
            lead.source_url || website,
            searchMeta.keyword,
            searchMeta.city || searchMeta.country,
            lead.lead_score || 50,
            lead.fit_score || 50,
            "HOT",
            "Lead Discovered",
            pkt.date,
            pkt.time,
            pkt.date,
            nowIso,
            nowIso,
          ]
        );
        leadId = ins[0]?.id;
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
    page?: number;
    page_size?: number;
  }
) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    let whereClause = "WHERE workspace_id = $1";
    const params: any[] = [workspaceId];

    if (options?.keyword) {
      params.push(`%${options.keyword}%`);
      whereClause += ` AND (business_name ILIKE $${params.length} OR email ILIKE $${params.length} OR search_keyword ILIKE $${params.length})`;
    }
    if (options?.country && options.country !== "Any" && options.country !== "ALL" && options.country !== "Global") {
      params.push(`%${options.country}%`);
      whereClause += ` AND country ILIKE $${params.length}`;
    }
    if (options?.city && options.city !== "Any" && options.city !== "ALL") {
      params.push(`%${options.city}%`);
      whereClause += ` AND city ILIKE $${params.length}`;
    }

    const countRes = await sql.query(`SELECT COUNT(*) as cnt FROM leads ${whereClause}`, params);
    const total = parseInt(countRes[0]?.cnt || "0", 10);

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
        crm_stage, saved_date, saved_time, date_discovered, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
        pkt.time,
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
