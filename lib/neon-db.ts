import { neon } from "@neondatabase/serverless";
import { encryptToken, decryptToken } from "@/lib/token-crypto";

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
  return dbUrl;
}

export function getNeonSql() {
  const dbUrl = getConnectionString();
  if (!dbUrl) return null;
  return neon(dbUrl);
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
      if (leadId) {
        if (phone) {
          try {
            await sql.query(
              "UPDATE leads SET phone = $1, phone_status = $2, updated_at = $3 WHERE id = $4 AND (phone IS NULL OR phone = '' OR phone = 'Not Listed')",
              [phone, lead.phone_status || "FOUND IN SOURCE EVIDENCE", nowIso, leadId]
            );
          } catch {}
        }
      } else {
        const dom = String(lead.domain || "").trim().toLowerCase();
        const city = String(lead.city || searchMeta.city || "").trim();
        const country = String(lead.country || searchMeta.country || "").trim();
        const address = String(lead.address || "").trim();
        const emailStatus = String(lead.email_status || "FOUND IN SOURCE EVIDENCE").trim();
        const phoneStatus = String(lead.phone_status || (phone ? "FOUND IN SOURCE EVIDENCE" : "NOT LISTED")).trim();

        const ins = await sql.query(
          `INSERT INTO leads (
            workspace_id, business_name, email, phone, website,
            source, source_url, search_keyword, search_location,
            lead_score, fit_score, lead_temperature, crm_stage,
            date_discovered, created_at, updated_at,
            domain, city, country, address, email_status, phone_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          RETURNING id`,
          [
            workspaceId,
            bName,
            email,
            phone,
            website,
            lead.source_platform || lead.source || "Google Organic Web Search",
            lead.original_source_url || lead.source_url || website,
            searchMeta.keyword,
            city || country,
            lead.lead_score || 50,
            lead.fit_score || 50,
            "HOT",
            "Lead Discovered",
            pkt.date,
            nowIso,
            nowIso,
            dom,
            city,
            country,
            address,
            emailStatus,
            phoneStatus,
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
              health_status, spf_status, dkim_status, dmarc_status, mx_status,
              created_at, updated_at
       FROM email_accounts
       WHERE workspace_id = $1 AND is_active = 1
       ORDER BY id DESC LIMIT 1`,
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
export async function getNeonGmailTokens(workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    const rows = await sql.query(
      `SELECT id, sender_email, sender_name, oauth_token_json, daily_limit, sent_today
       FROM email_accounts
       WHERE workspace_id = $1 AND is_active = 1
       ORDER BY id DESC LIMIT 1`,
      [workspaceId]
    );
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
 * Save or connect Gmail OAuth account in workspace
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
    // Deactivate previous accounts in this workspace
    await sql.query(
      "UPDATE email_accounts SET is_active = 0 WHERE workspace_id = $1",
      [workspaceId]
    );

    const tokens = data.tokenData || data.oauthTokens || {};
    const encryptedTokens = encryptToken(tokens);
    const limit = data.dailyLimit || 500;

    const rows = await sql.query(
      `INSERT INTO email_accounts (
        workspace_id, account_name, sender_name, sender_email,
        provider_type, oauth_token_json, daily_limit, sent_today,
        is_active, health_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, workspace_id, account_name, sender_name, sender_email, health_status, daily_limit`,
      [
        workspaceId,
        `Gmail (${data.senderEmail})`,
        data.senderName,
        data.senderEmail.toLowerCase().trim(),
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
 * Disconnect Gmail from workspace
 */
export async function disconnectNeonGmailAccount(workspaceId: number): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    await sql.query(
      "UPDATE email_accounts SET is_active = 0, health_status = 'DISCONNECTED', oauth_token_json = NULL, updated_at = $1 WHERE workspace_id = $2",
      [new Date().toISOString(), workspaceId]
    );
    return true;
  } catch (e) {
    console.error("Neon disconnectGmailAccount error:", e);
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

    // Update lead in leads table
    if (data.leadId) {
      await sql.query(
        `UPDATE leads SET
          crm_stage = $1,
          last_contact = $2,
          next_followup = $3,
          updated_at = $4
        WHERE workspace_id = $5 AND id = $6`,
        [
          data.outreachStatus || "EMAIL SENT",
          nowIso,
          data.followupDate || null,
          nowIso,
          data.workspaceId,
          data.leadId,
        ]
      );
    }

    // Increment sent count in email_accounts
    await sql.query(
      `UPDATE email_accounts SET
        sent_today = sent_today + 1,
        last_sent_at = $1,
        updated_at = $1
      WHERE workspace_id = $2 AND is_active = 1`,
      [nowIso, data.workspaceId]
    );

    return rows[0] || null;
  } catch (e) {
    console.error("Neon saveOutreachRecord error:", e);
    return null;
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
 * USMAN AI GTM - 50-Seat Multi-Tenant Client Management
 */
export async function getNeonClients() {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const clients = await sql.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.workspace_id,
        u.status,
        u.created_at,
        COALESCE(w.name, u.full_name || '''s Workspace') as workspace_name,
        'STARTER' as plan,
        COALESCE((SELECT COUNT(*) FROM leads l WHERE l.workspace_id = u.workspace_id), 0) as total_leads,
        COALESCE((SELECT COUNT(*) FROM email_accounts ea WHERE ea.workspace_id = u.workspace_id AND ea.is_active = 1), 0) as connected_accounts
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      WHERE u.role != 'ADMIN'
      ORDER BY u.id DESC
    `);
    return clients.map((c: any) => ({
      ...c,
      total_leads: parseInt(c.total_leads || "0", 10),
      connected_accounts: parseInt(c.connected_accounts || "0", 10),
    }));
  } catch (e) {
    console.error("Neon getNeonClients error:", e);
    return [];
  }
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
  if (activeCount >= 50) {
    throw new Error("Maximum 50-client seat quota reached. Please upgrade seat license.");
  }

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
      username, email, password_hash, full_name, role, workspace_id, status, created_at, tenant_id, client_notes, max_leads_quota
    ) VALUES ($1, $2, $3, $4, 'CLIENT', $5, 'ACTIVE', $6, 1, $7, $8)
    RETURNING id, email, full_name, role, workspace_id, status, created_at`,
    [
      cleanEmail,
      cleanEmail,
      data.passwordHash,
      data.fullName.trim(),
      workspaceId,
      nowIso,
      data.company ? `Company: ${data.company}` : "",
      data.maxQuota || 5000,
    ]
  );

  return {
    client: userRes[0],
    workspace: { id: workspaceId, name: createdWsName, plan },
    active_seats_used: activeCount + 1,
    seats_remaining: Math.max(0, 50 - (activeCount + 1)),
  };
}

export async function updateNeonClientStatus(clientId: number, newStatus: string) {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const validStatus = ["ACTIVE", "SUSPENDED", "REVOKED"].includes(newStatus.toUpperCase())
      ? newStatus.toUpperCase()
      : "ACTIVE";
    const res = await sql.query(
      "UPDATE users SET status = $1, updated_at = $2 WHERE id = $3 AND role != 'ADMIN' RETURNING id",
      [validStatus, new Date().toISOString(), clientId]
    );
    return res.length > 0;
  } catch (e) {
    console.error("Neon updateNeonClientStatus error:", e);
    return false;
  }
}

export async function resetNeonClientPassword(clientId: number, passwordHash: string) {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const res = await sql.query(
      "UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3 AND role != 'ADMIN' RETURNING id",
      [passwordHash, new Date().toISOString(), clientId]
    );
    return res.length > 0;
  } catch (e) {
    console.error("Neon resetNeonClientPassword error:", e);
    return false;
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

    // 4. Connected active Gmail accounts
    const accRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM email_accounts WHERE workspace_id = $1 AND is_active = 1",
      [workspaceId]
    );
    const connectedEmailAccounts = parseInt(accRes[0]?.cnt || "0", 10);

    // 5. Total emails sent
    const sentRes = await sql.query(
      "SELECT COUNT(*) as cnt FROM outreach_records WHERE workspace_id = $1 AND outreach_status = 'EMAIL SENT'",
      [workspaceId]
    );
    const emailsSent = parseInt(sentRes[0]?.cnt || "0", 10);

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

    // Quota limits
    const maxLeadsQuota = 5000;
    const remainingQuota = Math.max(0, maxLeadsQuota - totalSavedLeads);

    return {
      workspace_id: workspaceId,
      total_leads_found: Math.max(totalLeadsFound, totalSavedLeads),
      saved_leads: totalSavedLeads,
      available_email_contacts: availableEmailContacts,
      available_phone_contacts: availablePhoneContacts,
      connected_gmail_accounts: connectedEmailAccounts,
      emails_sent: emailsSent,
      failed_emails: failedEmails,
      remaining_quota: remainingQuota,
      max_quota: maxLeadsQuota,
      contact_rate: totalSavedLeads > 0 ? Math.round((availableEmailContacts / totalSavedLeads) * 100) : 0,
    };
  } catch (e) {
    console.error("Neon getNeonClientDashboardMetrics error:", e);
    return null;
  }
}
