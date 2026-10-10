import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "usman_gtm_enterprise_jwt_secret_2026_super_safe";

export interface ServerlessUser {
  id: number;
  email: string;
  full_name: string;
  company?: string;
  role: string;
  workspace_id: number;
  tenant_id: number;
  password_hash?: string;
  created_at: string;
}

// In-memory store per serverless execution environment
const userStore = new Map<string, ServerlessUser>();

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, "usman_salt_gtm_2026", 100000, 32, "sha256").toString("hex");
}

export function createJwtToken(payload: {
  sub: string;
  email: string;
  full_name?: string;
  role: string;
  workspace_id: number;
  tenant_id?: number;
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
  const pwdHash = hashPassword(pass);
  let user = userStore.get(cleanEmail);

  if (user) {
    if (user.password_hash && user.password_hash !== pwdHash) {
      return null; // Bad password
    }
  } else {
    // If user registered in another lambda instance or direct login
    const userId = Math.floor(Date.now() / 1000);
    const fullName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    user = {
      id: userId,
      email: cleanEmail,
      full_name: fullName,
      company: "Enterprise",
      role: "ADMIN",
      workspace_id: 1,
      tenant_id: 1,
      password_hash: pwdHash,
      created_at: new Date().toISOString(),
    };
    userStore.set(cleanEmail, user);
  }

  const token = createJwtToken({
    sub: String(user.id),
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    workspace_id: user.workspace_id,
    tenant_id: 1,
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
