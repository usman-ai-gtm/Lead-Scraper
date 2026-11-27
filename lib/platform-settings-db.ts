import { getNeonSql, isNeonConfigured, computeAuthoritativeUserStatus, logAccountAudit } from "@/lib/neon-db";
import { encryptToken, decryptToken } from "@/lib/token-crypto";
import { createSystemNotification } from "@/lib/notifications-db";

export type OAuthAudienceStatus =
  | "TESTING"
  | "IN_PRODUCTION_UNVERIFIED"
  | "VERIFIED_PRODUCTION";

export interface OwnerPlatformSettingsView {
  whatsappNumber: string | null;
  whatsappConfigured: boolean;
  supportEmail: string | null;
  oauthMode: "SHARED" | "SHARED_PLUS_CUSTOMER_CUSTOM";
  oauthAudienceStatus: OAuthAudienceStatus;
  oauthProjectId: string;
  clientId: string | null;
  clientSecretConfigured: boolean;
  clientSecretMasked: string | null;
  redirectUri: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export async function ensurePlatformAndGmailSupportSchema() {
  if (!isNeonConfigured()) return;
  const sql = getNeonSql();
  if (!sql) return;

  await sql.query(`
    CREATE TABLE IF NOT EXISTS owner_platform_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      whatsapp_number TEXT,
      support_email TEXT,
      oauth_mode TEXT NOT NULL DEFAULT 'SHARED_PLUS_CUSTOMER_CUSTOM',
      oauth_audience_status TEXT NOT NULL DEFAULT 'IN_PRODUCTION_UNVERIFIED',
      oauth_project_id TEXT DEFAULT 'usman-ai-gtm-516005',
      custom_shared_client_id TEXT,
      custom_shared_client_secret_enc TEXT,
      updated_by TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS customer_oauth_configs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      workspace_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      email TEXT,
      google_project_id TEXT,
      client_id TEXT NOT NULL,
      client_secret_enc TEXT NOT NULL,
      client_secret_last4 TEXT,
      redirect_uris_json JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'ACTIVE_PENDING_OWNER_REVIEW',
      admin_note TEXT,
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS gmail_bonus_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      workspace_id INTEGER NOT NULL,
      username TEXT,
      email TEXT,
      plan_label TEXT,
      requested_minutes INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      approved_minutes INTEGER,
      admin_note TEXT,
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed default row id=1 idempotently without overwriting existing values
  const defaultWa = String(process.env.OWNER_WHATSAPP_NUMBER || "+923174383702").trim() || "+923174383702";
  const defaultEmail = String(process.env.OWNER_SUPPORT_EMAIL || "").trim() || null;
  await sql.query(
    `INSERT INTO owner_platform_settings (id, whatsapp_number, support_email, oauth_mode, oauth_audience_status, oauth_project_id)
     VALUES (1, $1, $2, 'SHARED_PLUS_CUSTOMER_CUSTOM', 'IN_PRODUCTION_UNVERIFIED', 'usman-ai-gtm-516005')
     ON CONFLICT (id) DO NOTHING`,
    [defaultWa, defaultEmail]
  );
}

function maskSecret(rawSecret?: string | null): string | null {
  const s = String(rawSecret || "").trim();
  if (!s) return null;
  const tail = s.length >= 4 ? s.slice(-4) : "****";
  return `GOCSPX-••••••••${tail}`;
}

export function getProductionRedirectUri(): string {
  if (process.env.GOOGLE_GMAIL_REDIRECT_URI && process.env.GOOGLE_GMAIL_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_GMAIL_REDIRECT_URI.trim();
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    "https://lead-scraper-mxs5.vercel.app";
  return `${base}/api/integrations/gmail/callback`;
}

export async function getOwnerPlatformSettings(): Promise<OwnerPlatformSettingsView> {
  const envClientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const envClientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const envWhatsapp = String(process.env.OWNER_WHATSAPP_NUMBER || "+923174383702").trim() || "+923174383702";
  const envSupportEmail = String(process.env.OWNER_SUPPORT_EMAIL || "").trim() || null;

  if (!isNeonConfigured()) {
    return {
      whatsappNumber: envWhatsapp,
      whatsappConfigured: Boolean(envWhatsapp),
      supportEmail: envSupportEmail,
      oauthMode: "SHARED_PLUS_CUSTOMER_CUSTOM",
      oauthAudienceStatus: "IN_PRODUCTION_UNVERIFIED",
      oauthProjectId: "usman-ai-gtm-516005",
      clientId: envClientId || null,
      clientSecretConfigured: Boolean(envClientSecret),
      clientSecretMasked: maskSecret(envClientSecret),
      redirectUri: getProductionRedirectUri(),
    };
  }

  await ensurePlatformAndGmailSupportSchema();
  const sql = getNeonSql();
  const rows = sql
    ? await sql.query("SELECT * FROM owner_platform_settings WHERE id = 1 LIMIT 1").catch(() => [])
    : [];
  const row = rows?.[0];

  const dbWhatsapp = row ? (row.whatsapp_number != null ? String(row.whatsapp_number).trim() : "") : envWhatsapp;
  const dbSupportEmail = row?.support_email ? String(row.support_email).trim() : envSupportEmail;
  const dbClientId = row?.custom_shared_client_id ? String(row.custom_shared_client_id).trim() : "";
  let dbSecret = "";
  if (row?.custom_shared_client_secret_enc) {
    const dec = decryptToken(String(row.custom_shared_client_secret_enc));
    if (typeof dec === "string") dbSecret = dec.trim();
  }

  const activeClientId = dbClientId || envClientId || null;
  const activeSecret = dbSecret || envClientSecret || "";
  const rawMode = String(row?.oauth_mode || "SHARED_PLUS_CUSTOMER_CUSTOM").toUpperCase();
  const oauthMode = rawMode === "SHARED" ? "SHARED" : "SHARED_PLUS_CUSTOMER_CUSTOM";
  const rawAud = String(row?.oauth_audience_status || "IN_PRODUCTION_UNVERIFIED").toUpperCase();
  const oauthAudienceStatus: OAuthAudienceStatus =
    rawAud === "TESTING"
      ? "TESTING"
      : rawAud === "VERIFIED_PRODUCTION"
      ? "VERIFIED_PRODUCTION"
      : "IN_PRODUCTION_UNVERIFIED";

  return {
    whatsappNumber: dbWhatsapp || null,
    whatsappConfigured: Boolean(dbWhatsapp),
    supportEmail: dbSupportEmail,
    oauthMode,
    oauthAudienceStatus,
    oauthProjectId: String(row?.oauth_project_id || "usman-ai-gtm-516005").trim() || "usman-ai-gtm-516005",
    clientId: activeClientId,
    clientSecretConfigured: Boolean(activeSecret),
    clientSecretMasked: maskSecret(activeSecret),
    redirectUri: getProductionRedirectUri(),
    updatedBy: row?.updated_by || null,
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
  };
}

export async function updateOwnerPlatformSettings(
  input: {
    whatsapp_number?: string | null;
    support_email?: string | null;
    oauth_mode?: "SHARED" | "SHARED_PLUS_CUSTOMER_CUSTOM";
    oauth_audience_status?: OAuthAudienceStatus;
    oauth_project_id?: string;
    custom_shared_client_id?: string | null;
    custom_shared_client_secret?: string | null;
    clear_custom_shared_oauth?: boolean;
  },
  actorEmail: string
): Promise<OwnerPlatformSettingsView> {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable.");
  await ensurePlatformAndGmailSupportSchema();

  const currentRows = await sql.query("SELECT * FROM owner_platform_settings WHERE id = 1 LIMIT 1");
  const cur = currentRows?.[0] || {};

  const nextWa =
    input.whatsapp_number !== undefined
      ? String(input.whatsapp_number || "").trim() || null
      : cur.whatsapp_number ?? null;

  let nextEmail = cur.support_email ?? null;
  if (input.support_email !== undefined) {
    const trimmed = String(input.support_email || "").trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error("Support email format is invalid.");
    }
    nextEmail = trimmed || null;
  }

  const nextMode =
    input.oauth_mode === "SHARED"
      ? "SHARED"
      : input.oauth_mode === "SHARED_PLUS_CUSTOMER_CUSTOM"
      ? "SHARED_PLUS_CUSTOMER_CUSTOM"
      : cur.oauth_mode || "SHARED_PLUS_CUSTOMER_CUSTOM";

  const validAud: OAuthAudienceStatus[] = ["TESTING", "IN_PRODUCTION_UNVERIFIED", "VERIFIED_PRODUCTION"];
  const nextAud =
    input.oauth_audience_status && validAud.includes(input.oauth_audience_status)
      ? input.oauth_audience_status
      : (cur.oauth_audience_status as OAuthAudienceStatus) || "IN_PRODUCTION_UNVERIFIED";

  const nextProjectId =
    input.oauth_project_id !== undefined
      ? String(input.oauth_project_id || "").trim() || "usman-ai-gtm-516005"
      : cur.oauth_project_id || "usman-ai-gtm-516005";

  let nextClientId = cur.custom_shared_client_id ?? null;
  let nextSecretEnc = cur.custom_shared_client_secret_enc ?? null;

  if (input.clear_custom_shared_oauth) {
    nextClientId = null;
    nextSecretEnc = null;
  } else {
    if (input.custom_shared_client_id !== undefined) {
      const cid = String(input.custom_shared_client_id || "").trim();
      if (cid && !cid.includes(".apps.googleusercontent.com")) {
        throw new Error("Google OAuth Client ID should look like ...apps.googleusercontent.com.");
      }
      nextClientId = cid || null;
    }
    if (input.custom_shared_client_secret && String(input.custom_shared_client_secret).trim()) {
      const sec = String(input.custom_shared_client_secret).trim();
      if (sec.includes("••••") || sec.includes("***")) {
        throw new Error("Do not submit a masked placeholder as the Google Client Secret.");
      }
      nextSecretEnc = encryptToken(sec);
    }
  }

  await sql.query(
    `UPDATE owner_platform_settings
     SET whatsapp_number = $1,
         support_email = $2,
         oauth_mode = $3,
         oauth_audience_status = $4,
         oauth_project_id = $5,
         custom_shared_client_id = $6,
         custom_shared_client_secret_enc = $7,
         updated_by = $8,
         updated_at = NOW()
     WHERE id = 1`,
    [nextWa, nextEmail, nextMode, nextAud, nextProjectId, nextClientId, nextSecretEnc, actorEmail]
  );

  return getOwnerPlatformSettings();
}

export async function resolveWorkspaceGmailOAuthCredentials(
  workspaceId: number,
  forceSource?: "shared" | "customer"
): Promise<{
  clientId: string;
  clientSecret: string;
  source: "shared" | "customer";
  projectId?: string | null;
}> {
  const envClientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const envClientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

  if (isNeonConfigured()) {
    await ensurePlatformAndGmailSupportSchema();
    const sql = getNeonSql();
    if (sql) {
      if (forceSource !== "shared" && workspaceId > 0) {
        const custRows = await sql
          .query(
            `SELECT client_id, client_secret_enc, google_project_id, status
             FROM customer_oauth_configs
             WHERE workspace_id = $1 AND status IN ('ACTIVE_PENDING_OWNER_REVIEW', 'APPROVED', 'ACTIVE')
             LIMIT 1`,
            [workspaceId]
          )
          .catch(() => []);
        if (custRows && custRows.length > 0 && custRows[0].client_id && custRows[0].client_secret_enc) {
          const dec = decryptToken(String(custRows[0].client_secret_enc));
          if (typeof dec === "string" && dec.trim()) {
            return {
              clientId: String(custRows[0].client_id).trim(),
              clientSecret: dec.trim(),
              source: "customer",
              projectId: custRows[0].google_project_id || null,
            };
          }
        }
      }

      if (forceSource !== "customer") {
        const rows = await sql
          .query(
            "SELECT custom_shared_client_id, custom_shared_client_secret_enc, oauth_project_id FROM owner_platform_settings WHERE id = 1 LIMIT 1"
          )
          .catch(() => []);
        const r = rows?.[0];
        if (r?.custom_shared_client_id && r?.custom_shared_client_secret_enc) {
          const dec = decryptToken(String(r.custom_shared_client_secret_enc));
          if (typeof dec === "string" && dec.trim()) {
            return {
              clientId: String(r.custom_shared_client_id).trim(),
              clientSecret: dec.trim(),
              source: "shared",
              projectId: r.oauth_project_id || "usman-ai-gtm-516005",
            };
          }
        }
      }
    }
  }

  return {
    clientId: envClientId,
    clientSecret: envClientSecret,
    source: "shared",
    projectId: "usman-ai-gtm-516005",
  };
}

export async function validateAndSaveCustomerOAuthConfig(input: {
  userId: number;
  workspaceId: number;
  username: string;
  email: string;
  rawJsonText?: string;
  clientId?: string;
  clientSecret?: string;
  projectId?: string;
}) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable.");
  await ensurePlatformAndGmailSupportSchema();

  let clientId = String(input.clientId || "").trim();
  let clientSecret = String(input.clientSecret || "").trim();
  let projectId = String(input.projectId || "").trim() || null;
  let redirectUris: string[] = [];

  if (input.rawJsonText && input.rawJsonText.trim()) {
    if (input.rawJsonText.length > 65536) {
      throw new Error("OAuth JSON configuration exceeds 64KB limit.");
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(input.rawJsonText);
    } catch {
      throw new Error("Invalid JSON syntax. Upload the untouched Google Web Application client_secret_*.json file.");
    }
    const web = parsed?.web;
    if (!web || typeof web !== "object") {
      throw new Error(
        'Missing "web" section in Google JSON. Download a "Web application" OAuth client JSON (not Desktop/Installed).'
      );
    }
    clientId = String(web.client_id || "").trim();
    clientSecret = String(web.client_secret || "").trim();
    projectId = String(web.project_id || projectId || "").trim() || null;
    redirectUris = Array.isArray(web.redirect_uris) ? web.redirect_uris.map((u: any) => String(u).trim()) : [];

    const expectedUri = getProductionRedirectUri();
    if (redirectUris.length > 0 && !redirectUris.includes(expectedUri) && !redirectUris.some((u) => u.endsWith("/api/integrations/gmail/callback"))) {
      throw new Error(
        `Uploaded JSON does not list the required Authorized Redirect URI (${expectedUri}). Add it in Google Cloud Console before exporting.`
      );
    }
  }

  if (!clientId || !clientId.includes(".apps.googleusercontent.com")) {
    throw new Error("A valid Google OAuth Client ID (...apps.googleusercontent.com) is required.");
  }
  if (!clientSecret || clientSecret.length < 8) {
    throw new Error("A valid Google OAuth Client Secret is required.");
  }

  const encryptedSecret = encryptToken(clientSecret);
  const last4 = clientSecret.slice(-4);
  const redirectStr = JSON.stringify(redirectUris);

  const rows = await sql.query(
    `INSERT INTO customer_oauth_configs (
       user_id, workspace_id, username, email, google_project_id,
       client_id, client_secret_enc, client_secret_last4, redirect_uris_json,
       status, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'ACTIVE_PENDING_OWNER_REVIEW', NOW())
     ON CONFLICT (workspace_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       username = EXCLUDED.username,
       email = EXCLUDED.email,
       google_project_id = EXCLUDED.google_project_id,
       client_id = EXCLUDED.client_id,
       client_secret_enc = EXCLUDED.client_secret_enc,
       client_secret_last4 = EXCLUDED.client_secret_last4,
       redirect_uris_json = EXCLUDED.redirect_uris_json,
       status = 'ACTIVE_PENDING_OWNER_REVIEW',
       updated_at = NOW()
     RETURNING id, user_id, workspace_id, username, email, google_project_id, client_id, client_secret_last4, redirect_uris_json, status, created_at, updated_at`,
    [input.userId, input.workspaceId, input.username, input.email, projectId, clientId, encryptedSecret, last4, redirectStr]
  );

  await logAccountAudit({
    adminId: input.userId,
    adminEmail: input.email || input.username,
    clientId: input.userId,
    clientEmail: input.email || input.username,
    workspaceId: input.workspaceId,
    action: "CUSTOMER_CUSTOM_OAUTH_SAVED",
    details: { google_project_id: projectId, client_id_prefix: clientId.slice(0, 18) + "..." },
  }).catch(() => {});

  await createSystemNotification({
    workspaceId: 1,
    userId: null,
    isAdminTarget: true,
    title: `Customer Custom OAuth Uploaded: @${input.username}`,
    message: `@${input.username} (Workspace #${input.workspaceId}) uploaded an encrypted Google Web OAuth config (Project: ${projectId || "N/A"}). Review in Google OAuth Governance.`,
    type: "info",
    category: "customer_oauth_config",
    link: "/app/admin/integrations/google",
    refType: "customer_oauth_config",
    refId: String(rows[0].id),
  }).catch(() => {});

  const rec = rows[0];
  return {
    id: Number(rec.id),
    workspace_id: Number(rec.workspace_id),
    google_project_id: rec.google_project_id,
    client_id: rec.client_id,
    client_secret_masked: `••••••••${rec.client_secret_last4 || "****"}`,
    redirect_uris: rec.redirect_uris_json || [],
    status: rec.status,
    updated_at: rec.updated_at,
  };
}

export async function getWorkspaceCustomerOAuthStatus(workspaceId: number) {
  if (!isNeonConfigured()) return null;
  await ensurePlatformAndGmailSupportSchema();
  const sql = getNeonSql();
  if (!sql) return null;
  const rows = await sql.query(
    `SELECT id, workspace_id, google_project_id, client_id, client_secret_last4, redirect_uris_json, status, admin_note, created_at, updated_at
     FROM customer_oauth_configs WHERE workspace_id = $1 LIMIT 1`,
    [workspaceId]
  );
  const r = rows?.[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    workspace_id: Number(r.workspace_id),
    google_project_id: r.google_project_id,
    client_id: r.client_id,
    client_secret_masked: `••••••••${r.client_secret_last4 || "****"}`,
    redirect_uris: r.redirect_uris_json || [],
    status: r.status,
    admin_note: r.admin_note,
    updated_at: r.updated_at,
  };
}

export async function deleteWorkspaceCustomerOAuth(workspaceId: number, userId: number, actor: string) {
  const sql = getNeonSql();
  if (!sql) return false;
  await ensurePlatformAndGmailSupportSchema();
  const res = await sql.query("DELETE FROM customer_oauth_configs WHERE workspace_id = $1 RETURNING id", [workspaceId]);
  if (res && res.length > 0) {
    await logAccountAudit({
      adminId: userId,
      adminEmail: actor,
      clientId: userId,
      workspaceId,
      action: "CUSTOMER_CUSTOM_OAUTH_REMOVED",
      details: { workspace_id: workspaceId },
    }).catch(() => {});
    return true;
  }
  return false;
}

export async function listAdminCustomerOAuthRequests() {
  if (!isNeonConfigured()) return [];
  await ensurePlatformAndGmailSupportSchema();
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql.query(
    `SELECT id, user_id, workspace_id, username, email, google_project_id, client_id,
            client_secret_last4, redirect_uris_json, status, admin_note, reviewed_by, reviewed_at, created_at, updated_at
     FROM customer_oauth_configs
     ORDER BY updated_at DESC LIMIT 100`
  );
  return (rows || []).map((r: any) => ({
    ...r,
    client_secret_masked: `••••••••${r.client_secret_last4 || "****"}`,
  }));
}

export async function reviewCustomerOAuthConfig(
  configId: number,
  action: "APPROVE" | "DISABLE",
  adminActor: { id: number; email: string },
  adminNote?: string
) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable.");
  await ensurePlatformAndGmailSupportSchema();
  const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const rows = await sql.query(
    `UPDATE customer_oauth_configs
     SET status = $1,
         admin_note = COALESCE($2, admin_note),
         reviewed_by = $3,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, user_id, workspace_id, username, email, google_project_id, client_id, client_secret_last4, status, admin_note`,
    [nextStatus, adminNote ? adminNote.trim() : null, adminActor.email, configId]
  );
  if (!rows || rows.length === 0) throw new Error("Customer OAuth configuration not found.");
  const rec = rows[0];
  await logAccountAudit({
    adminId: adminActor.id,
    adminEmail: adminActor.email,
    clientId: Number(rec.user_id),
    clientEmail: rec.email || rec.username,
    workspaceId: Number(rec.workspace_id),
    action: `CUSTOMER_OAUTH_${nextStatus}`,
    details: { config_id: configId, admin_note: adminNote || null },
  }).catch(() => {});

  await createSystemNotification({
    workspaceId: Number(rec.workspace_id) || 1,
    userId: Number(rec.user_id),
    isAdminTarget: false,
    title: action === "APPROVE" ? "Custom Gmail OAuth Approved" : "Custom Gmail OAuth Disabled",
    message:
      action === "APPROVE"
        ? "Your workspace's custom Google OAuth config was reviewed and approved by the Owner."
        : `Your custom Google OAuth config was disabled by the Owner (${adminNote || "Reverted to shared Owner OAuth"}).`,
    type: action === "APPROVE" ? "success" : "warning",
    category: "customer_oauth_review",
    link: "/app/accounts",
    refType: "customer_oauth_config",
    refId: String(configId),
  }).catch(() => {});

  return { ...rec, client_secret_masked: `••••••••${rec.client_secret_last4 || "****"}` };
}

// =========================================================================
// GMAIL SETUP TIME COMPENSATION (PART 10)
// =========================================================================

export async function createGmailBonusRequest(input: {
  userId: number;
  workspaceId: number;
  username: string;
  email: string;
  planLabel: string;
  requestedMinutes: number;
  reason: string;
}) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable.");
  await ensurePlatformAndGmailSupportSchema();

  const mins = Math.floor(Number(input.requestedMinutes) || 0);
  if (mins < 5 || mins > 1440) {
    throw new Error("Requested setup compensation must be between 5 minutes and 24 hours (1440 minutes).");
  }
  const cleanReason = String(input.reason || "").trim();
  if (cleanReason.length < 6) {
    throw new Error("Please briefly describe the Gmail setup time spent (at least 6 characters).");
  }

  const existingPending = await sql.query(
    `SELECT id FROM gmail_bonus_requests WHERE user_id = $1 AND status = 'PENDING' LIMIT 1`,
    [input.userId]
  );
  if (existingPending && existingPending.length > 0) {
    throw new Error(
      `You already have a PENDING Gmail setup bonus request (#${existingPending[0].id}). Wait for Owner review before submitting another.`
    );
  }

  const rows = await sql.query(
    `INSERT INTO gmail_bonus_requests (
       user_id, workspace_id, username, email, plan_label, requested_minutes, reason, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
     RETURNING *`,
    [input.userId, input.workspaceId, input.username, input.email, input.planLabel, mins, cleanReason.slice(0, 500)]
  );
  const rec = rows[0];

  await logAccountAudit({
    adminId: input.userId,
    adminEmail: input.email || input.username,
    clientId: input.userId,
    clientEmail: input.email || input.username,
    workspaceId: input.workspaceId,
    action: "GMAIL_BONUS_REQUESTED",
    details: { request_id: rec.id, requested_minutes: mins },
  }).catch(() => {});

  await createSystemNotification({
    workspaceId: 1,
    userId: null,
    isAdminTarget: true,
    title: `Gmail Setup Bonus Request: @${input.username}`,
    message: `@${input.username} requested +${mins} min Gmail setup time compensation (${input.planLabel}). Reason: "${cleanReason.slice(0, 120)}"`,
    type: "info",
    category: "gmail_bonus_request",
    link: "/app/admin/integrations/google",
    refType: "gmail_bonus_request",
    refId: String(rec.id),
  }).catch(() => {});

  return rec;
}

export async function listWorkspaceBonusRequests(userId: number) {
  if (!isNeonConfigured()) return [];
  await ensurePlatformAndGmailSupportSchema();
  const sql = getNeonSql();
  if (!sql) return [];
  return sql.query(
    `SELECT id, user_id, workspace_id, plan_label, requested_minutes, reason, status,
            approved_minutes, admin_note, reviewed_by, reviewed_at, created_at
     FROM gmail_bonus_requests
     WHERE user_id = $1
     ORDER BY id DESC LIMIT 20`,
    [userId]
  );
}

export async function listAdminBonusRequests() {
  if (!isNeonConfigured()) return [];
  await ensurePlatformAndGmailSupportSchema();
  const sql = getNeonSql();
  if (!sql) return [];
  return sql.query(
    `SELECT b.*, u.status AS user_status, u.plan_type AS user_plan_type,
            u.plan_label AS user_plan_label, u.subscription_expires_at AS user_expires_at
     FROM gmail_bonus_requests b
     LEFT JOIN users u ON b.user_id = u.id
     ORDER BY CASE WHEN b.status = 'PENDING' THEN 0 ELSE 1 END, b.id DESC
     LIMIT 100`
  );
}

export async function reviewGmailBonusRequest(
  requestId: number,
  action: "APPROVE" | "REJECT",
  admin: { id: number; email: string; username?: string },
  options?: { approved_minutes?: number; admin_note?: string }
) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable.");
  await ensurePlatformAndGmailSupportSchema();

  const reqRows = await sql.query("SELECT * FROM gmail_bonus_requests WHERE id = $1 LIMIT 1", [requestId]);
  const reqRec = reqRows?.[0];
  if (!reqRec) throw new Error("Gmail bonus request not found.");
  if (String(reqRec.status || "").toUpperCase() !== "PENDING") {
    throw new Error(`Bonus request #${requestId} is already ${reqRec.status}.`);
  }

  const adminActor = admin.email || admin.username || "master_owner";
  const adminNote = options?.admin_note ? String(options.admin_note).trim() : null;

  if (action === "REJECT") {
    const upd = await sql.query(
      `UPDATE gmail_bonus_requests
       SET status = 'REJECTED', admin_note = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [adminNote || "Request declined by Owner.", adminActor, requestId]
    );
    await logAccountAudit({
      adminId: admin.id,
      adminEmail: adminActor,
      clientId: Number(reqRec.user_id),
      clientEmail: reqRec.email || reqRec.username,
      workspaceId: Number(reqRec.workspace_id) || 1,
      action: "GMAIL_BONUS_REJECTED",
      details: { request_id: requestId, admin_note: adminNote },
    }).catch(() => {});
    await createSystemNotification({
      workspaceId: Number(reqRec.workspace_id) || 1,
      userId: Number(reqRec.user_id),
      isAdminTarget: false,
      title: `Gmail Setup Bonus Request #${requestId} Declined`,
      message: adminNote || "The Owner reviewed and declined your Gmail setup bonus time request.",
      type: "warning",
      category: "gmail_bonus_review",
      link: "/app/subscription",
      refType: "gmail_bonus_request",
      refId: String(requestId),
    }).catch(() => {});
    return { request: upd[0], client: null };
  }

  // APPROVE: strict bounds (1 min to 1440 min = 24h max per request, Owner-controlled)
  const approvedMins = Math.min(
    1440,
    Math.max(1, Math.floor(Number(options?.approved_minutes ?? reqRec.requested_minutes) || 60))
  );

  const clientRows = await sql.query(
    `SELECT id, username, email, role, account_type, workspace_id, status, plan, plan_type, plan_label,
            subscription_expires_at, subscription_status
     FROM users
     WHERE id = $1
       AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
       AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
     LIMIT 1`,
    [Number(reqRec.user_id)]
  );
  const client = clientRows?.[0];
  if (!client) throw new Error("Target client user record not found.");

  const planUpper = String(client.plan_type || client.plan || "").toUpperCase();
  if (
    planUpper === "LIFETIME" ||
    planUpper === "OWNER_LIFETIME" ||
    (planUpper === "CUSTOM" && String(client.custom_duration_unit || "").toLowerCase() === "lifetime")
  ) {
    throw new Error("Lifetime accounts already have no expiry; bonus extension is not applicable.");
  }

  if (planUpper === "FREE_PREVIEW" || String(client.account_type || "").toUpperCase() === "FREE_PREVIEW") {
    throw new Error("Cannot apply bonus time extension to an unpurchased Free Preview account.");
  }

  // Extend existing expiry cleanly using PostgreSQL interval arithmetic; never create duplicate users
  await sql.query(
    `UPDATE users
     SET status = 'ACTIVE',
         active = 1,
         is_active = 1,
         subscription_status = 'ACTIVE',
         subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()) + ($1::bigint * INTERVAL '1 minute'),
         subscription_notes = COALESCE($2, subscription_notes),
         updated_at = NOW()::text
     WHERE id = $3`,
    [approvedMins, adminNote || `Added +${approvedMins}m Gmail setup bonus (#${requestId})`, client.id]
  );

  const verifiedClients = await sql.query(
    `SELECT id, username, email, role, account_type, workspace_id, status, plan, plan_type, plan_label,
            custom_duration_value, custom_duration_unit, subscription_start, subscription_expires_at,
            COALESCE(session_version, 1) AS session_version
     FROM users WHERE id = $1 LIMIT 1`,
    [client.id]
  );
  const verifiedClient = verifiedClients[0];
  const authSummary = computeAuthoritativeUserStatus(verifiedClient);

  const updReq = await sql.query(
    `UPDATE gmail_bonus_requests
     SET status = 'APPROVED',
         approved_minutes = $1,
         admin_note = $2,
         reviewed_by = $3,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [approvedMins, adminNote || `Approved +${approvedMins} minutes bonus compensation.`, adminActor, requestId]
  );

  await logAccountAudit({
    adminId: admin.id,
    adminEmail: adminActor,
    clientId: client.id,
    clientEmail: client.email || client.username,
    workspaceId: Number(client.workspace_id) || 1,
    action: "GMAIL_BONUS_APPROVED",
    details: {
      request_id: requestId,
      approved_minutes: approvedMins,
      new_expires_at: verifiedClient.subscription_expires_at,
    },
  }).catch(() => {});

  await createSystemNotification({
    workspaceId: Number(client.workspace_id) || 1,
    userId: client.id,
    isAdminTarget: false,
    title: `Gmail Setup Time Bonus Added (+${approvedMins} min)`,
    message: `The Owner compensated +${approvedMins} minute(s) onto your ${authSummary.plan_label}. Updated time remaining: ${authSummary.remainingDetailed}.`,
    type: "success",
    category: "gmail_bonus_approved",
    link: "/app/subscription",
    refType: "gmail_bonus_request",
    refId: String(requestId),
  }).catch(() => {});

  return {
    request: updReq[0],
    client: { ...verifiedClient, ...authSummary },
  };
}
