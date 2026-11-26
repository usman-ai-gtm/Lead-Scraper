import { getNeonSql, computeAuthoritativeUserStatus, logAccountAudit } from "@/lib/neon-db";
import {
  BASIC_FEATURES,
  ALL_FEATURES_ENABLED,
  BASIC_DAILY_EMAIL_LIMIT,
  LIFETIME_GMAIL_DAILY_SAFE_CAP,
  MAX_GMAIL_DAILY_SAFE_CAP,
  DurationUnit,
  normalizeFeatures,
  resolveUserEntitlements,
  formatDurationLabel,
  calculateSuggestedCustomPrice,
} from "@/lib/entitlements";

export type PaymentSubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";

export interface PaymentMethodRecord {
  id: number;
  name: string;
  region: string;
  currency: string;
  account_holder_name: string | null;
  account_identifier: string | null;
  wallet_address: string | null;
  payment_link: string | null;
  qr_image_data: string | null;
  instructions: string | null;
  is_active: boolean;
  is_configured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export function getOwnerSupportEmail(): string | null {
  const candidate = String(process.env.OWNER_SUPPORT_EMAIL || "").trim();
  if (!candidate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
    return null;
  }
  return candidate;
}

export function getOfficialWhatsAppNumber(): string {
  return String(process.env.OWNER_WHATSAPP_NUMBER || "+923174383702").trim() || "+923174383702";
}

export function isPaymentMethodConfigured(m: any): boolean {
  if (!m) return false;
  return Boolean(
    String(m.account_identifier || "").trim() ||
      String(m.wallet_address || "").trim() ||
      String(m.payment_link || "").trim() ||
      String(m.qr_image_data || "").trim()
  );
}

function mapPaymentMethod(row: any): PaymentMethodRecord {
  const configured = isPaymentMethodConfigured(row);
  return {
    id: Number(row.id),
    name: String(row.name || ""),
    region: String(row.region || "Worldwide"),
    currency: String(row.currency || "USD"),
    account_holder_name: row.account_holder_name || null,
    account_identifier: row.account_identifier || null,
    wallet_address: row.wallet_address || null,
    payment_link: row.payment_link || null,
    qr_image_data: row.qr_image_data || null,
    instructions: row.instructions || null,
    is_active: Boolean(row.is_active) && configured,
    is_configured: configured,
    sort_order: Number(row.sort_order ?? 10),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listPaymentMethods(includeInactive = false): Promise<PaymentMethodRecord[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql.query(
    `SELECT id, name, region, currency, account_holder_name, account_identifier,
            wallet_address, payment_link, qr_image_data, instructions, is_active,
            sort_order, created_at, updated_at
     FROM payment_methods
     ORDER BY sort_order ASC, id ASC`
  );
  const mapped = (rows || []).map(mapPaymentMethod);
  if (includeInactive) return mapped;
  return mapped.filter((m) => m.is_active && m.is_configured);
}

export function validateQrDataUri(raw?: string | null): string | null {
  if (!raw || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/);
  if (!match) {
    throw new Error("QR image must be a valid PNG, JPG, or WebP image.");
  }
  if (trimmed.length > 750_000) {
    throw new Error("QR image exceeds maximum 512KB size.");
  }
  return trimmed;
}

export async function upsertPaymentMethod(input: {
  id?: number;
  name: string;
  region?: string;
  currency?: string;
  account_holder_name?: string | null;
  account_identifier?: string | null;
  wallet_address?: string | null;
  payment_link?: string | null;
  qr_image_data?: string | null;
  instructions?: string | null;
  is_active?: boolean;
  sort_order?: number;
}): Promise<PaymentMethodRecord> {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable");

  const name = String(input.name || "").trim();
  if (name.length < 2) {
    throw new Error("Payment method name is required.");
  }
  const region = String(input.region || "Worldwide").trim() || "Worldwide";
  const currency = String(input.currency || "USD").trim().toUpperCase() || "USD";
  const accountHolder = input.account_holder_name ? String(input.account_holder_name).trim() : null;
  const accountId = input.account_identifier ? String(input.account_identifier).trim() : null;
  const wallet = input.wallet_address ? String(input.wallet_address).trim() : null;
  const link = input.payment_link ? String(input.payment_link).trim() : null;
  if (link && !/^https?:\/\//i.test(link)) {
    throw new Error("Payment link must start with https:// or http://");
  }
  const qr = validateQrDataUri(input.qr_image_data);
  const instructions = input.instructions ? String(input.instructions).trim() : null;
  const sortOrder = Math.max(0, Math.floor(Number(input.sort_order ?? 10)));

  const hasDetail = Boolean(accountId || wallet || link || qr);
  const isActive = Boolean(input.is_active);
  if (isActive && !hasDetail) {
    throw new Error(
      "Cannot mark a payment method Active without configuring at least one real receiving detail (Account ID/IBAN, Wallet address, Payment link, or QR image)."
    );
  }

  if (input.id && Number(input.id) > 0) {
    const rows = await sql.query(
      `UPDATE payment_methods
       SET name = $1, region = $2, currency = $3, account_holder_name = $4,
           account_identifier = $5, wallet_address = $6, payment_link = $7,
           qr_image_data = $8, instructions = $9, is_active = $10,
           sort_order = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [name, region, currency, accountHolder, accountId, wallet, link, qr, instructions, isActive, sortOrder, Number(input.id)]
    );
    if (!rows || rows.length === 0) throw new Error("Payment method not found.");
    return mapPaymentMethod(rows[0]);
  }

  const rows = await sql.query(
    `INSERT INTO payment_methods (
       name, region, currency, account_holder_name, account_identifier,
       wallet_address, payment_link, qr_image_data, instructions, is_active, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [name, region, currency, accountHolder, accountId, wallet, link, qr, instructions, isActive, sortOrder]
  );
  return mapPaymentMethod(rows[0]);
}

export async function deletePaymentMethod(id: number): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  const rows = await sql.query("DELETE FROM payment_methods WHERE id = $1 RETURNING id", [id]);
  return Boolean(rows && rows.length > 0);
}

const ALLOWED_PROOF_EXTS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function validateProofUpload(input: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  userId: number;
  workspaceId: number;
}): { safeFilename: string; verifiedMime: string; size: number } {
  const { filename, mimeType, buffer, userId, workspaceId } = input;
  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  const MAX_BYTES = 5 * 1024 * 1024;
  if (buffer.length > MAX_BYTES) {
    throw new Error("Payment proof file must be 5 MB or smaller.");
  }

  const extLower = (String(filename || "").split(".").pop() || "").toLowerCase();
  if (!["jpg", "jpeg", "png", "webp", "pdf"].includes(extLower)) {
    throw new Error("Only JPG, JPEG, PNG, WebP images or PDF files are allowed.");
  }

  // Validate real file header magic bytes (prevents executable/HTML/SVG spoofing)
  let detectedMime: string | null = null;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedMime = "image/jpeg";
  } else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedMime = "image/png";
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    detectedMime = "image/webp";
  } else if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    detectedMime = "application/pdf";
  }

  if (!detectedMime) {
    throw new Error("File signature verification failed. Upload a genuine JPG, PNG, WebP, or PDF payment screenshot/receipt.");
  }

  const normalizedMime = mimeType?.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType?.toLowerCase();
  if (normalizedMime && ALLOWED_PROOF_EXTS[normalizedMime] && normalizedMime !== detectedMime) {
    throw new Error("Uploaded file content does not match declared file type.");
  }

  const safeExt = ALLOWED_PROOF_EXTS[detectedMime] || "bin";
  const safeFilename = `proof_ws${workspaceId}_u${userId}_${Date.now()}.${safeExt}`;
  return { safeFilename, verifiedMime: detectedMime, size: buffer.length };
}

export async function createPaymentSubmission(input: {
  userId: number;
  workspaceId: number;
  username: string;
  email: string;
  requestedPlan: string;
  planLabel?: string;
  agreedPriceUsd: number;
  currency: string;
  paymentMethodId?: number | null;
  paymentMethodName: string;
  paymentReference?: string;
  customerNote?: string;
  customDurationValue?: number | null;
  customDurationUnit?: string | null;
  customFeaturesJson?: any;
  safeFilename: string;
  verifiedMime: string;
  size: number;
  buffer: Buffer;
}) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable");

  const hex = "\\x" + input.buffer.toString("hex");
  const rows = await sql.query(
    `INSERT INTO payment_submissions (
       user_id, workspace_id, username, email, requested_plan, plan_label,
       agreed_price_usd, currency, payment_method_id, payment_method_name,
       payment_reference, customer_note, custom_duration_value, custom_duration_unit,
       custom_features_json, screenshot_filename, screenshot_mime, screenshot_size,
       screenshot_data, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7::numeric, $8, $9, $10,
       $11, $12, $13, $14,
       $15::jsonb, $16, $17, $18,
       $19::bytea, 'PENDING'
     )
     RETURNING id, user_id, workspace_id, username, email, requested_plan, plan_label,
               agreed_price_usd, currency, payment_method_id, payment_method_name,
               payment_reference, customer_note, screenshot_filename, screenshot_mime,
               screenshot_size, status, admin_notes, created_at`,
    [
      input.userId,
      input.workspaceId,
      input.username,
      input.email,
      input.requestedPlan,
      input.planLabel || input.requestedPlan,
      Number(input.agreedPriceUsd).toFixed(2),
      String(input.currency || "USD").toUpperCase(),
      input.paymentMethodId || null,
      input.paymentMethodName,
      input.paymentReference || null,
      input.customerNote || null,
      input.customDurationValue ?? null,
      input.customDurationUnit || null,
      input.customFeaturesJson ? JSON.stringify(input.customFeaturesJson) : null,
      input.safeFilename,
      input.verifiedMime,
      input.size,
      hex,
    ]
  );

  const sub = rows[0];
  await logAccountAudit({
    adminId: input.userId,
    adminEmail: input.email || input.username,
    clientId: input.userId,
    clientEmail: input.email || input.username,
    workspaceId: input.workspaceId,
    action: "PAYMENT_PROOF_SUBMITTED",
    details: {
      submission_id: sub.id,
      requested_plan: sub.requested_plan,
      agreed_price_usd: Number(sub.agreed_price_usd),
      currency: sub.currency,
      payment_method_name: sub.payment_method_name,
      payment_reference: sub.payment_reference,
    },
  });

  return {
    ...sub,
    agreed_price_usd: Number(sub.agreed_price_usd),
  };
}

export async function listCustomerPaymentSubmissions(userId: number, workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql.query(
    `SELECT id, user_id, workspace_id, username, email, requested_plan, plan_label,
            agreed_price_usd, currency, payment_method_id, payment_method_name,
            payment_reference, customer_note, screenshot_filename, screenshot_mime,
            screenshot_size, status, admin_notes, reviewed_by, reviewed_at, created_at, updated_at
     FROM payment_submissions
     WHERE user_id = $1 AND workspace_id = $2
     ORDER BY id DESC LIMIT 50`,
    [userId, workspaceId]
  );
  return (rows || []).map((r: any) => ({
    ...r,
    agreed_price_usd: Number(r.agreed_price_usd),
  }));
}

export async function listAdminPaymentSubmissions() {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql.query(
    `SELECT ps.id, ps.user_id, ps.workspace_id, ps.username, ps.email,
            ps.requested_plan, ps.plan_label, ps.agreed_price_usd, ps.currency,
            ps.payment_method_id, ps.payment_method_name, ps.payment_reference,
            ps.customer_note, ps.custom_duration_value, ps.custom_duration_unit,
            ps.custom_features_json, ps.screenshot_filename, ps.screenshot_mime,
            ps.screenshot_size, ps.status, ps.admin_notes, ps.reviewed_by,
            ps.reviewed_at, ps.created_at, ps.updated_at,
            u.status AS current_user_status,
            u.plan AS current_user_plan,
            u.plan_type AS current_user_plan_type,
            u.plan_label AS current_user_plan_label,
            u.subscription_expires_at AS current_user_expires_at
     FROM payment_submissions ps
     LEFT JOIN users u ON ps.user_id = u.id
     ORDER BY
       CASE WHEN ps.status = 'PENDING' THEN 0 WHEN ps.status = 'MORE_INFO_REQUIRED' THEN 1 ELSE 2 END,
       ps.id DESC
     LIMIT 150`
  );
  return (rows || []).map((r: any) => ({
    ...r,
    agreed_price_usd: Number(r.agreed_price_usd),
  }));
}

export async function getPaymentSubmissionProof(submissionId: number) {
  const sql = getNeonSql();
  if (!sql) return null;
  const rows = await sql.query(
    `SELECT id, user_id, workspace_id, screenshot_filename, screenshot_mime, screenshot_size, screenshot_data
     FROM payment_submissions
     WHERE id = $1
     LIMIT 1`,
    [submissionId]
  );
  return rows?.[0] || null;
}

export async function reviewPaymentSubmission(
  submissionId: number,
  action: "APPROVE" | "REJECT" | "MORE_INFO_REQUIRED",
  admin: { id: number; email: string; username?: string },
  options?: {
    admin_notes?: string;
    target_plan?: "BASIC" | "LIFETIME" | "CUSTOM";
    duration_value?: number | null;
    duration_unit?: DurationUnit;
    features?: any;
    daily_email_limit?: number;
    agreed_price_usd?: number;
  }
) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable");

  const subRows = await sql.query("SELECT * FROM payment_submissions WHERE id = $1 LIMIT 1", [submissionId]);
  if (!subRows || subRows.length === 0) {
    throw new Error("Payment submission not found.");
  }
  const sub = subRows[0];
  const adminActor = admin.email || admin.username || "master_owner";
  const adminNotes = options?.admin_notes ? String(options.admin_notes).trim() : null;

  if (action === "REJECT" || action === "MORE_INFO_REQUIRED") {
    const nextStatus = action === "REJECT" ? "REJECTED" : "MORE_INFO_REQUIRED";
    const updated = await sql.query(
      `UPDATE payment_submissions
       SET status = $1,
           admin_notes = COALESCE($2, admin_notes),
           reviewed_by = $3,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, user_id, workspace_id, username, email, requested_plan, plan_label,
                 agreed_price_usd, currency, payment_method_name, payment_reference,
                 status, admin_notes, reviewed_by, reviewed_at, created_at`,
      [nextStatus, adminNotes, adminActor, submissionId]
    );

    await logAccountAudit({
      adminId: admin.id,
      adminEmail: adminActor,
      clientId: Number(sub.user_id),
      clientEmail: sub.email || sub.username,
      workspaceId: Number(sub.workspace_id) || 1,
      action: `PAYMENT_SUBMISSION_${nextStatus}`,
      details: { submission_id: submissionId, admin_notes: adminNotes },
    });

    return {
      submission: {
        ...(updated[0] as Record<string, any>),
        agreed_price_usd: Number(updated[0].agreed_price_usd),
      } as Record<string, any>,
      client: null as Record<string, any> | null,
    };
  }

  // APPROVE: Verify exact existing user (never Master Owner, never duplicate user/workspace)
  const userRows = await sql.query(
    `SELECT id, username, email, role, account_type, workspace_id, status, plan, plan_type,
            plan_label, google_maps_enabled, daily_email_limit, features_json,
            custom_duration_value, custom_duration_unit, custom_price_usd, suggested_price_usd,
            subscription_start, subscription_expires_at, subscription_status
     FROM users
     WHERE id = $1
       AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
       AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
       AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
     LIMIT 1`,
    [Number(sub.user_id)]
  );
  if (!userRows || userRows.length === 0) {
    throw new Error("Target client user record no longer exists or cannot be modified.");
  }
  const client = userRows[0];
  const reqPlan = String(options?.target_plan || sub.requested_plan || "BASIC").toUpperCase();
  const finalPrice =
    options?.agreed_price_usd !== undefined && !Number.isNaN(Number(options.agreed_price_usd))
      ? Number(Number(options.agreed_price_usd).toFixed(2))
      : Number(sub.agreed_price_usd);

  if (reqPlan === "LIFETIME") {
    const allFeaturesStr = JSON.stringify(ALL_FEATURES_ENABLED);
    await sql.query(
      `UPDATE users
       SET status = 'ACTIVE',
           active = 1,
           is_active = 1,
           account_type = CASE WHEN account_type = 'FREE_PREVIEW' OR account_type = 'CLIENT' THEN 'PAID_CLIENT' ELSE account_type END,
           plan = 'LIFETIME',
           plan_type = 'LIFETIME',
           plan_label = $1,
           custom_duration_value = NULL,
           custom_duration_unit = 'lifetime',
           custom_price_usd = $2,
           suggested_price_usd = 100,
           daily_email_limit = $3,
           google_maps_enabled = TRUE,
           features_json = $4::jsonb,
           subscription_status = 'ACTIVE',
           subscription_start = NOW(),
           subscription_expires_at = NULL,
           subscription_notes = COALESCE($5, subscription_notes),
           updated_at = NOW()::text
       WHERE id = $6`,
      [
        `Lifetime Plan ($${finalPrice} Verified)`,
        finalPrice,
        LIFETIME_GMAIL_DAILY_SAFE_CAP,
        allFeaturesStr,
        adminNotes || `Approved payment proof #${submissionId}`,
        client.id,
      ]
    );
  } else if (reqPlan === "CUSTOM") {
    const unit = String(options?.duration_unit || sub.custom_duration_unit || "days").toLowerCase() as DurationUnit;
    const validUnits: DurationUnit[] = ["hours", "days", "weeks", "months", "years", "lifetime"];
    const durationUnit: DurationUnit = validUnits.includes(unit) ? unit : "days";
    const durationValue =
      durationUnit === "lifetime"
        ? null
        : Math.max(1, Math.floor(Number(options?.duration_value ?? sub.custom_duration_value) || 30));

    const currentEnt = resolveUserEntitlements(client);
    const features = normalizeFeatures(
      options?.features ?? sub.custom_features_json ?? currentEnt.features ?? BASIC_FEATURES
    );
    if (Object.values(features).filter(Boolean).length === 0) {
      features.find_leads = true;
      features.saved_leads = true;
    }
    const mapsEnabled = Boolean(features.google_maps);
    const dailyLimit = features.cold_email
      ? Math.max(1, Math.min(MAX_GMAIL_DAILY_SAFE_CAP, Number(options?.daily_email_limit ?? currentEnt.dailyEmailLimit) || BASIC_DAILY_EMAIL_LIMIT))
      : 0;
    const calc = calculateSuggestedCustomPrice({ features, durationValue, durationUnit, dailyEmailLimit: dailyLimit });
    const durLabel = formatDurationLabel(durationValue, durationUnit);
    const label = sub.plan_label || `Custom (${durLabel} • $${finalPrice})`;
    const secMap: Record<Exclude<DurationUnit, "lifetime">, number> = {
      hours: 3600,
      days: 86400,
      weeks: 7 * 86400,
      months: 30 * 86400,
      years: 365 * 86400,
    };
    const deltaSec = durationUnit === "lifetime" ? 0 : (durationValue || 1) * (secMap[durationUnit] || 86400);

    await sql.query(
      `UPDATE users
       SET status = 'ACTIVE',
           active = 1,
           is_active = 1,
           account_type = CASE WHEN account_type = 'FREE_PREVIEW' OR account_type = 'CLIENT' THEN 'PAID_CLIENT' ELSE account_type END,
           plan = 'CUSTOM',
           plan_type = 'CUSTOM',
           plan_label = $1,
           custom_duration_value = $2,
           custom_duration_unit = $3,
           custom_price_usd = $4,
           suggested_price_usd = $5,
           daily_email_limit = $6,
           google_maps_enabled = $7,
           features_json = $8::jsonb,
           subscription_status = 'ACTIVE',
           subscription_start = NOW(),
           subscription_expires_at = ${durationUnit === "lifetime" ? "NULL" : `NOW() + ($9::bigint * INTERVAL '1 second')`},
           subscription_notes = COALESCE($${durationUnit === "lifetime" ? 9 : 10}, subscription_notes),
           updated_at = NOW()::text
       WHERE id = $${durationUnit === "lifetime" ? 10 : 11}`,
      durationUnit === "lifetime"
        ? [
            label,
            null,
            durationUnit,
            finalPrice,
            calc.suggestedPriceUsd,
            dailyLimit,
            mapsEnabled,
            JSON.stringify(features),
            adminNotes || `Approved payment proof #${submissionId}`,
            client.id,
          ]
        : [
            label,
            durationValue,
            durationUnit,
            finalPrice,
            calc.suggestedPriceUsd,
            dailyLimit,
            mapsEnabled,
            JSON.stringify(features),
            deltaSec,
            adminNotes || `Approved payment proof #${submissionId}`,
            client.id,
          ]
    );
  } else {
    const basicFeaturesStr = JSON.stringify(BASIC_FEATURES);
    await sql.query(
      `UPDATE users
       SET status = 'ACTIVE',
           active = 1,
           is_active = 1,
           account_type = CASE WHEN account_type = 'FREE_PREVIEW' OR account_type = 'CLIENT' THEN 'PAID_CLIENT' ELSE account_type END,
           plan = 'BASIC',
           plan_type = 'BASIC',
           plan_label = $1,
           custom_duration_value = 30,
           custom_duration_unit = 'days',
           custom_price_usd = $2,
           suggested_price_usd = 25,
           daily_email_limit = $3,
           google_maps_enabled = FALSE,
           features_json = $4::jsonb,
           subscription_status = 'ACTIVE',
           subscription_start = NOW(),
           subscription_expires_at = NOW() + INTERVAL '30 days',
           subscription_notes = COALESCE($5, subscription_notes),
           updated_at = NOW()::text
       WHERE id = $6`,
      [
        `Basic Plan ($${finalPrice} / 30 Days)`,
        finalPrice,
        BASIC_DAILY_EMAIL_LIMIT,
        basicFeaturesStr,
        adminNotes || `Approved payment proof #${submissionId}`,
        client.id,
      ]
    );
  }

  // Re-fetch authoritative user post-commit before marking submission APPROVED
  const verifiedUsers = await sql.query(
    `SELECT id, username, email, role, account_type, workspace_id, status, plan, plan_type, plan_label,
            custom_duration_value, custom_duration_unit, custom_price_usd, suggested_price_usd,
            daily_email_limit, google_maps_enabled, features_json, subscription_start, subscription_expires_at,
            COALESCE(session_version, 1) AS session_version
     FROM users WHERE id = $1 LIMIT 1`,
    [client.id]
  );
  const verifiedUser = verifiedUsers?.[0];
  if (!verifiedUser) {
    throw new Error("Post-approval database verification failed: user missing.");
  }
  const authoritative = computeAuthoritativeUserStatus(verifiedUser);

  const updatedSubRows = await sql.query(
    `UPDATE payment_submissions
     SET status = 'APPROVED',
         admin_notes = COALESCE($1, admin_notes),
         reviewed_by = $2,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, user_id, workspace_id, username, email, requested_plan, plan_label,
               agreed_price_usd, currency, payment_method_name, payment_reference,
               status, admin_notes, reviewed_by, reviewed_at, created_at`,
    [adminNotes, adminActor, submissionId]
  );

  await logAccountAudit({
    adminId: admin.id,
    adminEmail: adminActor,
    clientId: client.id,
    clientEmail: client.email || client.username,
    workspaceId: Number(client.workspace_id) || 1,
    action: "PAYMENT_SUBMISSION_APPROVED",
    details: {
      submission_id: submissionId,
      target_plan: reqPlan,
      agreed_price_usd: finalPrice,
      verified_status: authoritative.status,
      verified_plan: authoritative.plan_type,
      verified_expires_at: verifiedUser.subscription_expires_at,
      session_version: verifiedUser.session_version,
    },
  });

  return {
    submission: {
      ...(updatedSubRows[0] as Record<string, any>),
      agreed_price_usd: Number(updatedSubRows[0].agreed_price_usd),
    } as Record<string, any>,
    client: {
      ...(verifiedUser as Record<string, any>),
      ...authoritative,
    } as Record<string, any>,
  };
}
