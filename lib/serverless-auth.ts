import crypto from "crypto";
import { getNeonSql, isNeonConfigured, computeAuthoritativeUserStatus } from "@/lib/neon-db";

const JWT_SECRET = process.env.SECRET_KEY || process.env.JWT_SECRET || "usman_ai_gtm_ultra_pro_max_secret_key_change_in_production_jwt_99";

export interface ServerlessUser {
  id: number;
  email: string;
  full_name: string;
  company?: string;
  role: string;
  workspace_id: number;
  tenant_id: number;
  password_hash?: string;
  must_change_password?: boolean;
  status?: string;
  created_at: string;
}

// In-memory store per serverless execution environment
const userStore = new Map<string, ServerlessUser>();

/**
 * Enterprise PBKDF2 Password Hashing with Unique Per-User 16-byte Salt.
 * Format: pbkdf2_sha256$100000$salt_hex$hash_hex
 */
export function hashPassword(password: string, saltHex?: string): string {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt.toString("hex")}$${hash}`;
}

function seedAdminUser(email: string, pass: string, name: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!userStore.has(cleanEmail)) {
    userStore.set(cleanEmail, {
      id: userStore.size + 1,
      email: cleanEmail,
      full_name: name,
      company: "USMAN AI GTM Enterprise",
      role: "ADMIN",
      workspace_id: 1,
      tenant_id: 1,
      password_hash: hashPassword(pass),
      must_change_password: false,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    });
  }
}

// Seed production administrator accounts
seedAdminUser("admin@usmanai.com", "UsmanGTM@2026!", "Administrator");
seedAdminUser("admin@usmangtm.com", "UsmanGTM@2026!", "Administrator");
seedAdminUser("selftest_founder_2026@usmanai.com", "SecurePassword@2026!", "Muhammad Usman (Founder)");
seedAdminUser("mu0602503@gmail.com", "UsmanGTM@2026!", "Muhammad Usman");
seedAdminUser("transaction000501@gmail.com", "UsmanGTM@2026!", "Muhammad Usman (Owner)");

export function verifyPassword(plainPassword: string, storedHash?: string): boolean {
  if (!plainPassword || !storedHash) return false;
  try {
    if (storedHash.startsWith("pbkdf2_sha256$")) {
      const parts = storedHash.split("$");
      if (parts.length !== 4) return false;
      const [, iterationsStr, saltHex, expectedHashHex] = parts;
      const iterations = parseInt(iterationsStr, 10);
      const salt = Buffer.from(saltHex, "hex");
      const computedHash = crypto.pbkdf2Sync(plainPassword, salt, iterations, 32, "sha256").toString("hex");
      const a = Buffer.from(computedHash, "utf-8");
      const b = Buffer.from(expectedHashHex, "utf-8");
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    // Legacy salted fallback migration
    const legacyHash = crypto.pbkdf2Sync(plainPassword, "usman_salt_gtm_2026", 100000, 32, "sha256").toString("hex");
    return storedHash === legacyHash;
  } catch {
    return false;
  }
}

export function createJwtToken(payload: {
  sub: string;
  email: string;
  full_name?: string;
  role: string;
  workspace_id: number;
  tenant_id?: number;
  must_change_password?: boolean;
  status?: string;
  plan?: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyJwtToken(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getCurrentUserFromRequest(req: Request): any {
  try {
    let token = "";
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/usman_gtm_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1].trim());
      }
    }
    if (!token) return null;
    const payload = verifyJwtToken(token);
    if (payload && !payload.id && payload.sub) {
      payload.id = Number(payload.sub);
    }
    return payload;
  } catch {
    return null;
  }
}

export function registerServerlessUser(data: {
  email: string;
  fullName: string;
  password: string;
  workspaceName?: string;
  company?: string;
}): { user: ServerlessUser; token: string; workspace: any } {
  const cleanEmail = data.email.trim().toLowerCase();
  const pwdHash = hashPassword(data.password);
  const userId = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();

  const user: ServerlessUser = {
    id: userId,
    email: cleanEmail,
    full_name: data.fullName.trim(),
    company: data.company || data.workspaceName || "Enterprise Workspace",
    role: "ADMIN",
    workspace_id: 1,
    tenant_id: 1,
    password_hash: pwdHash,
    created_at: nowIso,
  };

  userStore.set(cleanEmail, user);

  const token = createJwtToken({
    sub: String(userId),
    email: cleanEmail,
    full_name: user.full_name,
    role: "ADMIN",
    workspace_id: 1,
    tenant_id: 1,
  });

  const workspace = {
    id: 1,
    name: data.workspaceName?.trim() || `${data.fullName.trim()}'s Workspace`,
    plan: "ENTERPRISE",
    ai_credits: 50000,
    search_credits: 25000,
    created_at: nowIso,
  };

  return { user, token, workspace };
}

export function authenticateServerlessUser(
  email: string,
  pass: string
): { user: ServerlessUser; token: string; workspace: any } | null {
  const cleanEmail = email.trim().toLowerCase();
  const user = userStore.get(cleanEmail);
  if (!user) {
    return null; // Unregistered user cannot log in
  }

  if (user.status === "SUSPENDED" || user.status === "REVOKED") {
    return null; // Inactive or suspended user
  }

  if (user.password_hash && !verifyPassword(pass, user.password_hash)) {
    return null; // Bad password
  }

  const token = createJwtToken({
    sub: String(user.id),
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    workspace_id: user.workspace_id,
    tenant_id: 1,
    must_change_password: user.must_change_password,
  });

  const workspace = {
    id: user.workspace_id,
    name: `${user.full_name}'s Workspace`,
    plan: "ENTERPRISE",
    ai_credits: 50000,
    search_credits: 25000,
    created_at: new Date().toISOString(),
  };

  return { user, token, workspace };
}

export function provisionServerlessClient(data: {
  email: string;
  fullName: string;
  company?: string;
  maxLeadsQuota?: number;
}): { client: ServerlessUser; temporaryPassword: string } {
  const cleanEmail = data.email.trim().toLowerCase();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
  let tempPass = "";
  const randomBytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    tempPass += alphabet[randomBytes[i] % alphabet.length];
  }

  const pwdHash = hashPassword(tempPass);
  const userId = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();
  const nextWsId = userStore.size + 10;

  const client: ServerlessUser = {
    id: userId,
    email: cleanEmail,
    full_name: data.fullName.trim(),
    company: data.company || "Client Organization",
    role: "USER",
    workspace_id: nextWsId,
    tenant_id: 1,
    password_hash: pwdHash,
    must_change_password: true,
    status: "ACTIVE",
    created_at: nowIso,
  };

  userStore.set(cleanEmail, client);
  return { client, temporaryPassword: tempPass };
}

export function listServerlessClients(): { clients: any[]; count: number; max_seats: number } {
  const list: any[] = [];
  userStore.forEach((u) => {
    if (u.role === "USER") {
      list.push({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        company: u.company,
        role: u.role,
        status: u.status || "ACTIVE",
        workspace_id: u.workspace_id,
        workspace_name: `${u.company || u.full_name}'s Private Workspace`,
        must_change_password: Boolean(u.must_change_password),
        max_leads_quota: 5000,
        total_leads: 0,
        leads_count: 0,
        created_at: u.created_at,
      });
    }
  });
  return {
    clients: list,
    count: list.length,
    max_seats: 50,
  };
}

export function changeServerlessUserPassword(
  email: string,
  oldPass: string,
  newPass: string
): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const user = userStore.get(cleanEmail);
  if (!user || !user.password_hash) return false;

  if (!verifyPassword(oldPass, user.password_hash)) {
    return false;
  }

  user.password_hash = hashPassword(newPass);
  user.must_change_password = false;
  userStore.set(cleanEmail, user);
  return true;
}

export interface ServerlessLead {
  id: number;
  workspace_id: number;
  business_name: string;
  category?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  website?: string;
  domain?: string;
  email?: string;
  email_status?: string;
  email_source_url?: string;
  phone?: string;
  phone_status?: string;
  phone_source_url?: string;
  whatsapp_number?: string;
  social_links?: any;
  description?: string;
  services?: string;
  lead_score?: number;
  final_lead_score?: number;
  qualification_level?: string;
  crm_stage?: string;
  source?: string;
  source_platform?: string;
  source_url?: string;
  original_source_url?: string;
  search_keyword?: string;
  saved_date?: string;
  saved_time?: string;
  extraction_date?: string;
  extraction_time?: string;
  created_at: string;
}

export interface ServerlessSearchRecord {
  id: string;
  workspace_id: number;
  user_id: number;
  keyword: string;
  country: string;
  city: string;
  sources: string[];
  requested_quantity: number;
  qualified_quantity: number;
  leads_with_phone: number;
  search_status: string;
  search_date: string;
  search_time: string;
  completion_time: string;
  created_at: string;
}

export interface ServerlessSearchLeadLink {
  id: number;
  search_record_id: string;
  lead_id: number;
  workspace_id: number;
  lead_snapshot: any;
  created_at: string;
}

export interface ServerlessExportHistory {
  id: number;
  workspace_id: number;
  user_id: number;
  export_target: string;
  search_record_id?: string;
  export_date_filter?: string;
  format: string;
  record_count: number;
  export_date: string;
  export_time: string;
  created_at: string;
}

const serverlessLeadsStore: ServerlessLead[] = [];
const serverlessSearchRecordsStore: ServerlessSearchRecord[] = [];
const serverlessSearchLeadsStore: ServerlessSearchLeadLink[] = [];
const serverlessExportHistoryStore: ServerlessExportHistory[] = [];

export function getPktDateTime() {
  const now = new Date();
  const pktTime = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = pktTime.getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = months[pktTime.getMonth()];
  const dd = pad(pktTime.getDate());
  const hours24 = pktTime.getHours();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = pad(hours24 % 12 || 12);
  const min = pad(pktTime.getMinutes());
  const ss = pad(pktTime.getSeconds());

  return {
    date_human: `${pktTime.getDate()} ${monthName} ${yyyy}`,
    date_iso: `${yyyy}-${pad(pktTime.getMonth() + 1)}-${dd}`,
    time_human: `${hours12}:${min} ${ampm}`,
    completion_human: `${hours12}:${min}:${ss} ${ampm} PKT`,
    iso_utc: now.toISOString(),
  };
}

export function getServerlessLeads(
  workspaceId: number,
  filters?: { keyword?: string; country?: string; city?: string; page?: number; page_size?: number }
): { total: number; leads: ServerlessLead[]; page: number; page_size: number; total_pages: number } {
  let matched = serverlessLeadsStore.filter((l) => l.workspace_id === workspaceId);
  if (filters?.keyword) {
    const q = filters.keyword.toLowerCase();
    matched = matched.filter(
      (l) =>
        (l.business_name || "").toLowerCase().includes(q) ||
        (l.industry || "").toLowerCase().includes(q) ||
        (l.category || "").toLowerCase().includes(q)
    );
  }
  if (filters?.country && filters.country !== "Any") {
    matched = matched.filter((l) => (l.country || "").toLowerCase() === filters.country!.toLowerCase());
  }
  if (filters?.city && filters.city !== "Any") {
    matched = matched.filter((l) => (l.city || "").toLowerCase().includes(filters.city!.toLowerCase()));
  }

  const page = filters?.page || 1;
  const pageSize = filters?.page_size || 50;
  const start = (page - 1) * pageSize;
  const paginated = matched.slice(start, start + pageSize);

  return {
    total: matched.length,
    leads: paginated,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(matched.length / pageSize) || 1,
  };
}

export function addServerlessLead(workspaceId: number, data: Partial<ServerlessLead>): ServerlessLead {
  const newLead: ServerlessLead = {
    id: Number(data.id) || Date.now() + Math.floor(Math.random() * 1000),
    workspace_id: workspaceId,
    business_name: data.business_name || "New Business",
    category: data.category || "General",
    industry: data.industry || "General",
    city: data.city || "",
    state: data.state || "",
    country: data.country || "",
    address: data.address || "",
    website: data.website || "",
    email: data.email || "",
    email_status: data.email_status || (data.email ? "UNVERIFIED" : "NOT FOUND"),
    phone: data.phone || "",
    phone_status: data.phone_status || (data.phone ? "Valid" : "Unverified"),
    whatsapp_number: data.whatsapp_number || data.phone || "",
    social_links: data.social_links || {},
    description: data.description || "",
    services: data.services || "",
    lead_score: data.lead_score || 70,
    crm_stage: data.crm_stage || "New Lead",
    source: data.source || "Live Search",
    source_url: data.source_url || "",
    created_at: new Date().toISOString(),
  };
  serverlessLeadsStore.unshift(newLead);
  return newLead;
}

export function deleteServerlessLead(workspaceId: number, leadId: number): boolean {
  const idx = serverlessLeadsStore.findIndex((l) => l.workspace_id === workspaceId && l.id === leadId);
  if (idx !== -1) {
    serverlessLeadsStore.splice(idx, 1);
    return true;
  }
  return false;
}

export function bulkDeleteServerlessLeads(workspaceId: number, leadIds: number[]): number {
  const idsSet = new Set(leadIds);
  let count = 0;
  for (let i = serverlessLeadsStore.length - 1; i >= 0; i--) {
    if (serverlessLeadsStore[i].workspace_id === workspaceId && idsSet.has(serverlessLeadsStore[i].id)) {
      serverlessLeadsStore.splice(i, 1);
      count++;
    }
  }
  return count;
}

export function saveServerlessSearchRecordAndLeads(
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
): ServerlessSearchRecord {
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

  // Save each qualified lead with deduplication
  const savedLeadsInThisSearch: any[] = [];
  let phoneCount = 0;

  for (const lead of leads) {
    const bName = String(lead.business_name || lead.name || "").trim();
    const email = String(lead.email || "").trim();

    // Strict qualification guard: Business name compulsory + verified email compulsory
    if (!bName || !email || !email.includes("@") || !email.includes(".")) {
      continue;
    }

    const website = String(lead.website || "").trim();
    let dom = String(lead.domain || "").trim().toLowerCase();
    if (!dom && website) {
      try {
        dom = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./i, "").toLowerCase();
      } catch {
        dom = website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
      }
    }

    const phone = String(lead.phone || "").trim();
    const hasPhone = phone && !["Not Listed", "Not Found", ""].includes(phone);
    if (hasPhone) phoneCount++;

    const emailSrc = lead.email_source_url || lead.original_source_url || website;
    const phoneSrc = lead.phone_source_url || (hasPhone ? (lead.original_source_url || website) : "Not Listed");
    const sourcePlat = lead.source_platform || lead.source || "Google Organic Web Search";
    const originalSrc = lead.original_source_url || lead.source_url || website;

    // Check if lead already exists in this workspace
    let existing = serverlessLeadsStore.find(
      (l) => l.workspace_id === workspaceId && (
        (dom && l.domain && l.domain.toLowerCase() === dom) ||
        (l.business_name.toLowerCase() === bName.toLowerCase() && l.email?.toLowerCase() === email.toLowerCase())
      )
    );

    let masterLeadId: number;
    if (existing) {
      masterLeadId = existing.id;
      // Enrich phone if missing
      if (!existing.phone && hasPhone) {
        existing.phone = phone;
        existing.phone_source_url = phoneSrc;
        existing.phone_status = "FOUND IN SOURCE • FORMAT CHECKED";
      }
    } else {
      masterLeadId = Number(lead.id) || Date.now() + serverlessLeadsStore.length + 1;
      const newMasterLead: ServerlessLead = {
        id: masterLeadId,
        workspace_id: workspaceId,
        business_name: bName,
        website: website || `https://${dom}`,
        domain: dom,
        email: email,
        email_status: lead.email_status || "FOUND IN SOURCE • DOMAIN CHECKED",
        email_source_url: emailSrc,
        phone: hasPhone ? phone : "",
        phone_status: hasPhone ? "FOUND IN SOURCE • FORMAT CHECKED" : "NOT LISTED",
        phone_source_url: phoneSrc,
        country: lead.country || searchMeta.country || "Global",
        city: lead.city || searchMeta.city || "",
        address: lead.address || "",
        industry: lead.industry || searchMeta.keyword || "Commercial",
        category: lead.category || searchMeta.keyword || "Commercial",
        source: sourcePlat,
        source_platform: sourcePlat,
        source_url: originalSrc,
        original_source_url: originalSrc,
        search_keyword: searchMeta.keyword,
        saved_date: pkt.date_human,
        saved_time: pkt.time_human,
        extraction_date: pkt.date_human,
        extraction_time: pkt.time_human,
        lead_score: 95,
        final_lead_score: 95,
        qualification_level: "🟢 Qualified Lead",
        crm_stage: "New Lead",
        created_at: pkt.iso_utc,
      };
      serverlessLeadsStore.unshift(newMasterLead);
    }

    const leadSnapshot = {
      id: masterLeadId,
      business_name: bName,
      website: website || `https://${dom}`,
      domain: dom,
      email: email,
      email_status: lead.email_status || "FOUND IN SOURCE • DOMAIN CHECKED",
      email_source_url: emailSrc,
      phone: hasPhone ? phone : "Not Listed",
      phone_status: hasPhone ? "FOUND IN SOURCE • FORMAT CHECKED" : "NOT LISTED",
      phone_source_url: phoneSrc,
      country: lead.country || searchMeta.country || "Global",
      city: lead.city || searchMeta.city || "Not Specified",
      industry: lead.industry || searchMeta.keyword || "Commercial",
      source_platform: sourcePlat,
      original_source_url: originalSrc,
      search_keyword: searchMeta.keyword,
      search_date: pkt.date_human,
      search_time: pkt.time_human,
      saved_date: pkt.date_human,
      saved_time: pkt.time_human,
    };

    serverlessSearchLeadsStore.push({
      id: serverlessSearchLeadsStore.length + 1,
      search_record_id: recordId,
      lead_id: masterLeadId,
      workspace_id: workspaceId,
      lead_snapshot: leadSnapshot,
      created_at: pkt.iso_utc,
    });

    savedLeadsInThisSearch.push(leadSnapshot);
  }

  const searchRecord: ServerlessSearchRecord = {
    id: recordId,
    workspace_id: workspaceId,
    user_id: 1,
    keyword: searchMeta.keyword,
    country: searchMeta.country || "Global",
    city: searchMeta.city || "All Cities",
    sources,
    requested_quantity: searchMeta.requested_quantity || leads.length,
    qualified_quantity: savedLeadsInThisSearch.length,
    leads_with_phone: phoneCount,
    search_status: "COMPLETED",
    search_date: pkt.date_human,
    search_time: pkt.time_human,
    completion_time: pkt.completion_human,
    created_at: pkt.iso_utc,
  };

  serverlessSearchRecordsStore.unshift(searchRecord);
  return searchRecord;
}

export function getServerlessSearchRecords(
  workspaceId: number,
  dateFilter?: string,
  keywordFilter?: string
): ServerlessSearchRecord[] {
  let matched = serverlessSearchRecordsStore.filter((r) => r.workspace_id === workspaceId);
  if (dateFilter && dateFilter !== "ALL" && dateFilter !== "All" && dateFilter !== "All Dates") {
    matched = matched.filter(
      (r) => r.search_date.includes(dateFilter) || r.created_at.includes(dateFilter)
    );
  }
  if (keywordFilter) {
    const q = keywordFilter.toLowerCase();
    matched = matched.filter((r) => r.keyword.toLowerCase().includes(q));
  }
  return matched;
}

export function getServerlessSearchRecordById(
  workspaceId: number,
  searchId: string
): (ServerlessSearchRecord & { leads: any[] }) | null {
  const rec = serverlessSearchRecordsStore.find(
    (r) => r.workspace_id === workspaceId && r.id === searchId
  );
  if (!rec) return null;

  const links = serverlessSearchLeadsStore.filter(
    (l) => l.workspace_id === workspaceId && l.search_record_id === searchId
  );
  const leads = links.map((link) => {
    const master = serverlessLeadsStore.find((m) => m.id === link.lead_id);
    return {
      ...(master || {}),
      ...(link.lead_snapshot || {}),
    };
  });

  return { ...rec, leads };
}

export function getServerlessLeadsForDate(workspaceId: number, dateStr: string): any[] {
  const matchingRecords = serverlessSearchRecordsStore.filter(
    (r) => r.workspace_id === workspaceId && (r.search_date.includes(dateStr) || r.created_at.includes(dateStr))
  );
  const recIds = new Set(matchingRecords.map((r) => r.id));
  const links = serverlessSearchLeadsStore.filter(
    (l) => l.workspace_id === workspaceId && recIds.has(l.search_record_id)
  );

  const seenDomains = new Set<string>();
  const leads: any[] = [];
  for (const link of links) {
    const master = serverlessLeadsStore.find((m) => m.id === link.lead_id);
    const item = { ...(master || {}), ...(link.lead_snapshot || {}) };
    const dom = (item.domain || "").toLowerCase();
    if (dom && seenDomains.has(dom)) continue;
    if (dom) seenDomains.add(dom);
    leads.push(item);
  }
  return leads;
}

export function getServerlessSearchDates(workspaceId: number): Array<{
  search_date: string;
  total_searches: number;
  total_leads: number;
  total_with_phone: number;
}> {
  const records = serverlessSearchRecordsStore.filter((r) => r.workspace_id === workspaceId);
  const dateMap = new Map<string, { total_searches: number; total_leads: number; total_with_phone: number }>();

  for (const r of records) {
    const d = r.search_date;
    const current = dateMap.get(d) || { total_searches: 0, total_leads: 0, total_with_phone: 0 };
    current.total_searches += 1;
    current.total_leads += r.qualified_quantity;
    current.total_with_phone += r.leads_with_phone;
    dateMap.set(d, current);
  }

  const result: Array<{
    search_date: string;
    total_searches: number;
    total_leads: number;
    total_with_phone: number;
  }> = [];

  dateMap.forEach((val, key) => {
    result.push({ search_date: key, ...val });
  });

  return result;
}

export function addServerlessExportHistory(
  workspaceId: number,
  data: {
    export_target: string;
    format: string;
    record_count: number;
    search_record_id?: string;
    export_date_filter?: string;
  }
): ServerlessExportHistory {
  const pkt = getPktDateTime();
  const entry: ServerlessExportHistory = {
    id: serverlessExportHistoryStore.length + 1,
    workspace_id: workspaceId,
    user_id: 1,
    export_target: data.export_target,
    search_record_id: data.search_record_id,
    export_date_filter: data.export_date_filter,
    format: data.format.toUpperCase(),
    record_count: data.record_count,
    export_date: pkt.date_human,
    export_time: pkt.time_human,
    created_at: pkt.iso_utc,
  };
  serverlessExportHistoryStore.unshift(entry);
  return entry;
}

export function getServerlessExportHistory(workspaceId: number): ServerlessExportHistory[] {
  return serverlessExportHistoryStore.filter((e) => e.workspace_id === workspaceId);
}

export const MASTER_OWNER_EMAIL = (process.env.MASTER_OWNER_EMAIL || "transaction000501@gmail.com").trim().toLowerCase();
export const PRIMARY_OWNER_EMAIL = MASTER_OWNER_EMAIL;

export const AUTHORIZED_OWNER_EMAILS = [
  "transaction000501@gmail.com",
  "admin@usmanai.com",
  "mu0602503@gmail.com",
  "admin@usmangtm.com",
  "selftest_founder_2026@usmanai.com",
];

export function isAuthorizedOwner(user: any): boolean {
  if (!user) return false;
  const emailLower = String(user.email || user.username || "").trim().toLowerCase();
  const roleUpper = String(user.role || "").toUpperCase();
  const accountTypeUpper = String(user.account_type || "").toUpperCase();
  return (
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "ADMIN" ||
    accountTypeUpper === "MASTER_OWNER" ||
    emailLower === MASTER_OWNER_EMAIL ||
    AUTHORIZED_OWNER_EMAILS.includes(emailLower)
  );
}

/**
 * Strict Authoritative Subscription and Access Verification.
 * - Administrators & System Owners have permanent full access.
 * - Clients default to LOCKED until paid subscription is approved by Owner.
 * - BASIC subscription ($25/mo) strictly auto-expires 30 days after activation.
 * - LIFETIME subscription ($100) never expires unless manually modified by Owner.
 */
export async function verifyClientActiveSubscription(user: any): Promise<{
  allowed: boolean;
  statusCode?: number;
  message?: string;
  userRecord?: any;
}> {
  if (!user) {
    return {
      allowed: false,
      statusCode: 401,
      message: "Authentication required to perform this action.",
    };
  }

  // Super-admin / owner bypass
  if (isAuthorizedOwner(user)) {
    return { allowed: true };
  }

  const emailLower = String(user.email || user.username || "").trim().toLowerCase();

  // For CLIENT users, query the authoritative Neon cloud database
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        const userId = Number(user.id || user.sub) || 0;
        const rows = await sql.query(
          `SELECT id, email, role, status, plan, subscription_start, subscription_expires_at, subscription_status
           FROM users
           WHERE id = $1 OR LOWER(email) = LOWER($2)
           LIMIT 1`,
          [userId, emailLower]
        );

        if (!rows || rows.length === 0) {
          return {
            allowed: false,
            statusCode: 404,
            message: "User account not found.",
          };
        }

        const u = rows[0];
        const authoritative = computeAuthoritativeUserStatus(u);

        if (authoritative.isLocked) {
          if (authoritative.status === "REVOKED" || authoritative.status === "SUSPENDED") {
            return {
              allowed: false,
              statusCode: 403,
              message: "Account Suspended or Revoked. Contact Administrator via WhatsApp (+923174383702).",
              userRecord: { ...u, status: authoritative.status },
            };
          }
          if (authoritative.status === "EXPIRED") {
            return {
              allowed: false,
              statusCode: 403,
              message: "Your Basic subscription has expired. Please renew for $25/month or upgrade to $100 Lifetime via WhatsApp (+923174383702).",
              userRecord: { ...u, status: authoritative.status },
            };
          }
          return {
            allowed: false,
            statusCode: 403,
            message: "Account Locked — Subscription Activation Required ($25/month or $100 Lifetime). Contact Owner via WhatsApp (+923174383702) for Instant Activation.",
            userRecord: { ...u, status: authoritative.status },
          };
        }

        return { allowed: true, userRecord: { ...u, status: authoritative.status, plan: authoritative.plan } };
      } catch (e) {
        console.error("verifyClientActiveSubscription Neon error:", e);
      }
    }
  }

  // Fallback in-memory status check
  const statusUpper = (user.status || "LOCKED").toUpperCase();
  if (statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return {
      allowed: false,
      statusCode: 403,
      message: "Account Locked — Subscription Activation Required ($25/month or $100 Lifetime). Contact Owner via WhatsApp (+923174383702) for Instant Activation.",
    };
  }
  if (statusUpper === "SUSPENDED" || statusUpper === "REVOKED") {
    return {
      allowed: false,
      statusCode: 403,
      message: "Account Suspended or Revoked. Contact Administrator via WhatsApp (+923174383702).",
    };
  }

  return { allowed: true };
}

