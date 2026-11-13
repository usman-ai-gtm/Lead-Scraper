import crypto from "crypto";

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
seedAdminUser("transaction000001@gmail.com", "UsmanGTM@2026!", "Administrator");

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
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    return verifyJwtToken(token);
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
  email?: string;
  email_status?: string;
  phone?: string;
  phone_status?: string;
  whatsapp_number?: string;
  social_links?: any;
  description?: string;
  services?: string;
  lead_score?: number;
  crm_stage?: string;
  source?: string;
  source_url?: string;
  created_at: string;
}

const serverlessLeadsStore: ServerlessLead[] = [];

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

