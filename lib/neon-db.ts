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
export async function getNeonGmailTokens(workspaceId: number, accountId?: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    let rows: any[] = [];
    if (accountId) {
      rows = await sql.query(
        `SELECT id, sender_email, sender_name, oauth_token_json, daily_limit, sent_today
         FROM email_accounts
         WHERE workspace_id = $1 AND id = $2 AND is_active = 1
         LIMIT 1`,
        [workspaceId, accountId]
      );
    } else {
      rows = await sql.query(
        `SELECT id, sender_email, sender_name, oauth_token_json, daily_limit, sent_today
         FROM email_accounts
         WHERE workspace_id = $1 AND is_active = 1
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
       WHERE workspace_id = $1 AND is_active = 1
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

/**
 * Save or connect Gmail OAuth account in workspace.
 * Supports multiple accounts per workspace without overwriting existing accounts.
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
    const tokens = data.tokenData || data.oauthTokens || {};
    const encryptedTokens = encryptToken(tokens);
    const limit = data.dailyLimit || 500;

    // Check if this senderEmail is already connected in this workspace
    const existing = await sql.query(
      "SELECT id FROM email_accounts WHERE workspace_id = $1 AND LOWER(sender_email) = $2 LIMIT 1",
      [workspaceId, cleanEmail]
    );

    if (existing && existing.length > 0) {
      // Update existing account credentials and reactivate
      const rows = await sql.query(
        `UPDATE email_accounts
         SET oauth_token_json = $1, sender_name = $2, is_active = 1,
             health_status = 'CONNECTED', daily_limit = $3, updated_at = $4
         WHERE id = $5
         RETURNING id, workspace_id, account_name, sender_name, sender_email, health_status, daily_limit`,
        [encryptedTokens, data.senderName, limit, nowIso, existing[0].id]
      );
      return rows[0] || null;
    }

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
  account_type?: string;
  email?: string;
  subscription_expires_at?: string | Date | null;
}): {
  status: "ACTIVE" | "LOCKED" | "SUSPENDED" | "REVOKED" | "EXPIRED";
  isLocked: boolean;
  plan: "BASIC" | "LIFETIME";
  isExpired: boolean;
  daysRemaining: number | string;
} {
  const roleUpper = (user.role || "").toUpperCase();
  const accountTypeUpper = (user.account_type || "").toUpperCase();
  const emailLower = String(user.email || "").trim().toLowerCase();
  const isMasterOwner =
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "ADMIN" ||
    accountTypeUpper === "MASTER_OWNER" ||
    emailLower === "transaction000501@gmail.com" ||
    [
      "transaction000501@gmail.com",
      "admin@usmanai.com",
      "mu0602503@gmail.com",
      "admin@usmangtm.com",
      "selftest_founder_2026@usmanai.com",
    ].includes(emailLower);

  if (isMasterOwner) {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Permanent (Master Owner)",
    };
  }

  const statusUpper = (user.status || "LOCKED").toUpperCase();

  // Explicit manual lock/suspension/revocation STRICTLY overrides everything
  if (statusUpper === "REVOKED") {
    return {
      status: "REVOKED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
    };
  }
  if (statusUpper === "SUSPENDED") {
    return {
      status: "SUSPENDED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
    };
  }
  if (statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
    };
  }

  // Active status: check plan & expiration
  const planUpper = (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC";

  if (planUpper === "LIFETIME") {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Lifetime Access — No Expiry",
    };
  }

  // Basic Plan ($25 / 30 Days)
  if (!user.subscription_expires_at) {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: "BASIC",
      isExpired: true,
      daysRemaining: 0,
    };
  }

  const expTime = new Date(user.subscription_expires_at).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      status: "EXPIRED",
      isLocked: true,
      plan: "BASIC",
      isExpired: true,
      daysRemaining: 0,
    };
  }

  return {
    status: "ACTIVE",
    isLocked: false,
    plan: "BASIC",
    isExpired: false,
    daysRemaining: diffDays,
  };
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
        u.company,
        u.role,
        u.workspace_id,
        u.status,
        COALESCE(u.plan, 'BASIC') as plan,
        u.subscription_start,
        u.subscription_expires_at,
        u.subscription_status,
        u.subscription_notes,
        u.created_at,
        u.last_login,
        COALESCE(w.name, u.full_name || '''s Workspace') as workspace_name,
        COALESCE((SELECT COUNT(*) FROM leads l WHERE l.workspace_id = u.workspace_id), 0) as total_leads,
        COALESCE((SELECT COUNT(*) FROM search_records sr WHERE sr.workspace_id = u.workspace_id), 0) as total_searches,
        COALESCE((SELECT COUNT(*) FROM email_accounts ea WHERE ea.workspace_id = u.workspace_id AND ea.is_active = 1), 0) as connected_accounts
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      WHERE u.role != 'ADMIN' AND u.role != 'SUPER_ADMIN' AND (u.account_type IS NULL OR u.account_type != 'MASTER_OWNER')
      ORDER BY u.id DESC
    `);

    return clients.map((c: any) => {
      const computed = computeAuthoritativeUserStatus(c);

      return {
        ...c,
        raw_plan: computed.plan,
        plan: computed.plan === "LIFETIME" ? "LIFETIME ($100)" : "BASIC ($25/30 Days)",
        status: computed.status,
        payment_status: computed.status === "ACTIVE" ? "PAID" : "PENDING",
        remaining_days: computed.daysRemaining,
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

export async function updateNeonClientStatus(clientId: number, newStatus: string) {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    const validStatus = ["ACTIVE", "LOCKED", "SUSPENDED", "REVOKED"].includes(newStatus.toUpperCase())
      ? newStatus.toUpperCase()
      : "ACTIVE";
    let res: any;
    if (validStatus === "ACTIVE") {
      res = await sql.query(
        `UPDATE users
         SET status = 'ACTIVE',
             active = 1,
             is_active = 1,
             subscription_status = 'ACTIVE',
             subscription_expires_at = CASE
               WHEN plan = 'LIFETIME' THEN NULL
               WHEN subscription_expires_at IS NULL OR subscription_expires_at <= NOW() THEN NOW() + INTERVAL '30 days'
               ELSE subscription_expires_at
             END,
             updated_at = $1
         WHERE id = $2 AND role != 'ADMIN'
         RETURNING id`,
        [new Date().toISOString(), clientId]
      );
    } else {
      res = await sql.query(
        "UPDATE users SET status = $1, active = 0, is_active = 0, subscription_status = $1, updated_at = $2 WHERE id = $3 AND role != 'ADMIN' RETURNING id",
        [validStatus, new Date().toISOString(), clientId]
      );
    }
    return res.length > 0;
  } catch (e) {
    console.error("Neon updateNeonClientStatus error:", e);
    return false;
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
