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
import { FIXED_PLAN_SPECS, CUSTOM_UNIT_PRICING, normalizeBuilderUnit } from "@/lib/custom-plans";
import { createSystemNotification } from "@/lib/notifications-db";

export type PaymentSubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";

export interface BankTransferDetails {
  method_type?: "mobile_wallet" | "bank_transfer" | "crypto" | "payoneer" | "custom" | null;
  display_title?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;
  beneficiary_name?: string | null;
  receiving_number?: string | null;
  account_number?: string | null;
  iban?: string | null;
  branch_info?: string | null;
  routing_aba?: string | null;
  swift_bic?: string | null;
  account_type?: string | null;
  supported_currency?: string | null;
  network?: string | null;
  warning_text?: string | null;
  payment_email?: string | null;
}

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
  details_json: BankTransferDetails | null;
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

function hasBankDetailsConfigured(details: any): boolean {
  if (!details || typeof details !== "object") return false;
  return Boolean(
    String(details.bank_name || "").trim() &&
      String(details.beneficiary_name || "").trim() &&
      (String(details.account_number || "").trim() ||
        String(details.iban || "").trim() ||
        String(details.receiving_number || "").trim())
  );
}

export function isPaymentMethodConfigured(m: any): boolean {
  if (!m) return false;
  let parsedDetails = m.details_json;
  if (typeof parsedDetails === "string") {
    try {
      parsedDetails = JSON.parse(parsedDetails);
    } catch {
      parsedDetails = null;
    }
  }
  return Boolean(
    String(m.account_identifier || "").trim() ||
      String(m.wallet_address || "").trim() ||
      String(m.payment_link || "").trim() ||
      String(m.qr_image_data || "").trim() ||
      String(parsedDetails?.payment_email || "").trim() ||
      String(parsedDetails?.receiving_number || "").trim() ||
      hasBankDetailsConfigured(parsedDetails)
  );
}

function mapPaymentMethod(row: any): PaymentMethodRecord {
  let details: BankTransferDetails | null = null;
  if (row.details_json) {
    if (typeof row.details_json === "string") {
      try {
        details = JSON.parse(row.details_json);
      } catch {
        details = null;
      }
    } else if (typeof row.details_json === "object") {
      details = row.details_json;
    }
  }
  const configured = isPaymentMethodConfigured({ ...row, details_json: details });
  return {
    id: Number(row.id),
    name: String(row.name || ""),
    region: String(row.region || "Worldwide"),
    currency: String(row.currency || "USD"),
    account_holder_name: row.account_holder_name || details?.beneficiary_name || null,
    account_identifier: row.account_identifier || details?.account_number || null,
    wallet_address: row.wallet_address || null,
    payment_link: row.payment_link || null,
    qr_image_data: row.qr_image_data || null,
    instructions: row.instructions || null,
    details_json: details,
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
            wallet_address, payment_link, qr_image_data, instructions, details_json, is_active,
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
  details_json?: BankTransferDetails | null;
  is_active?: boolean;
  sort_order?: number;
}): Promise<PaymentMethodRecord> {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable");

  const name = String(input.name || "").trim();
  if (name.length < 2) {
    throw new Error("Payment method name is required.");
  }

  let detailsClean: BankTransferDetails | null = null;
  if (input.details_json && typeof input.details_json === "object") {
    detailsClean = {
      method_type: input.details_json.method_type || null,
      display_title: input.details_json.display_title ? String(input.details_json.display_title).trim() : null,
      bank_name: input.details_json.bank_name ? String(input.details_json.bank_name).trim() : null,
      bank_address: input.details_json.bank_address ? String(input.details_json.bank_address).trim() : null,
      beneficiary_name: input.details_json.beneficiary_name ? String(input.details_json.beneficiary_name).trim() : null,
      receiving_number: input.details_json.receiving_number ? String(input.details_json.receiving_number).trim() : null,
      account_number: input.details_json.account_number ? String(input.details_json.account_number).trim() : null,
      iban: input.details_json.iban ? String(input.details_json.iban).trim() : null,
      branch_info: input.details_json.branch_info ? String(input.details_json.branch_info).trim() : null,
      routing_aba: input.details_json.routing_aba ? String(input.details_json.routing_aba).trim() : null,
      swift_bic: input.details_json.swift_bic ? String(input.details_json.swift_bic).trim() : null,
      account_type: input.details_json.account_type ? String(input.details_json.account_type).trim() : null,
      supported_currency: input.details_json.supported_currency ? String(input.details_json.supported_currency).trim().toUpperCase() : null,
      network: input.details_json.network ? String(input.details_json.network).trim().toUpperCase() : null,
      warning_text: input.details_json.warning_text ? String(input.details_json.warning_text).trim() : null,
      payment_email: input.details_json.payment_email ? String(input.details_json.payment_email).trim() : null,
    };
  }

  const region = String(input.region || "Worldwide").trim() || "Worldwide";
  const currency =
    String(detailsClean?.supported_currency || input.currency || "USD").trim().toUpperCase() || "USD";
  const accountHolder =
    (input.account_holder_name ? String(input.account_holder_name).trim() : null) ||
    detailsClean?.beneficiary_name ||
    null;
  const accountId =
    (input.account_identifier ? String(input.account_identifier).trim() : null) ||
    detailsClean?.payment_email ||
    detailsClean?.account_number ||
    null;
  const wallet = input.wallet_address ? String(input.wallet_address).trim() : null;
  const link = input.payment_link ? String(input.payment_link).trim() : null;
  if (link && !/^https?:\/\//i.test(link)) {
    throw new Error("Payment link must start with https:// or http://");
  }
  const qr = validateQrDataUri(input.qr_image_data);
  const instructions = input.instructions ? String(input.instructions).trim() : null;
  const sortOrder = Math.max(0, Math.floor(Number(input.sort_order ?? 10)));

  const hasDetail = Boolean(
    accountId ||
      wallet ||
      link ||
      qr ||
      detailsClean?.receiving_number ||
      hasBankDetailsConfigured(detailsClean)
  );
  const isActive = Boolean(input.is_active);
  if (isActive && !hasDetail) {
    throw new Error(
      "Cannot mark a payment method Active without configuring at least one real receiving detail (Bank details, Account ID/IBAN, Wallet address, Payment link, or QR image)."
    );
  }

  const detailsStr = detailsClean ? JSON.stringify(detailsClean) : "{}";

  if (input.id && Number(input.id) > 0) {
    const rows = await sql.query(
      `UPDATE payment_methods
       SET name = $1, region = $2, currency = $3, account_holder_name = $4,
           account_identifier = $5, wallet_address = $6, payment_link = $7,
           qr_image_data = $8, instructions = $9, details_json = $10::jsonb, is_active = $11,
           sort_order = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [name, region, currency, accountHolder, accountId, wallet, link, qr, instructions, detailsStr, isActive, sortOrder, Number(input.id)]
    );
    if (!rows || rows.length === 0) throw new Error("Payment method not found.");
    return mapPaymentMethod(rows[0]);
  }

  const rows = await sql.query(
    `INSERT INTO payment_methods (
       name, region, currency, account_holder_name, account_identifier,
       wallet_address, payment_link, qr_image_data, instructions, details_json, is_active, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)
     RETURNING *`,
    [name, region, currency, accountHolder, accountId, wallet, link, qr, instructions, detailsStr, isActive, sortOrder]
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
  exchangeRate?: number;
  convertedAmount?: number;
  leadAllowance?: number | null;
  idempotencyKey?: string | null;
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

  // Duplicate / double-click submission prevention
  if (input.idempotencyKey) {
    const existingKeyRows = await sql.query(
      `SELECT id, user_id, workspace_id, username, email, request_code, requested_plan, plan_label,
              agreed_price_usd, original_price_usd, currency, exchange_rate, converted_amount, lead_allowance,
              payment_method_id, payment_method_name, payment_reference, customer_note,
              screenshot_filename, screenshot_mime, screenshot_size, status, admin_notes, created_at
       FROM payment_submissions
       WHERE user_id = $1 AND idempotency_key = $2
       LIMIT 1`,
      [input.userId, input.idempotencyKey]
    );
    if (existingKeyRows && existingKeyRows.length > 0) {
      const existing = existingKeyRows[0];
  return {
    ...(existing as Record<string, any>),
    agreed_price_usd: Number(existing.agreed_price_usd),
    original_price_usd: existing.original_price_usd != null ? Number(existing.original_price_usd) : Number(existing.agreed_price_usd),
    exchange_rate: Number(existing.exchange_rate || 1),
    converted_amount: existing.converted_amount != null ? Number(existing.converted_amount) : Number(existing.agreed_price_usd),
    duplicate_suppressed: true,
  } as Record<string, any>;
    }
  }

  // Prevent rapid accidental double submit within 15 seconds with identical plan/amount/method
  const rapidDup = await sql.query(
    `SELECT id FROM payment_submissions
     WHERE user_id = $1
       AND requested_plan = $2
       AND agreed_price_usd = $3::numeric
       AND currency = $4
       AND payment_method_name = $5
       AND status = 'PENDING'
       AND created_at > NOW() - INTERVAL '15 seconds'
     LIMIT 1`,
    [
      input.userId,
      input.requestedPlan,
      Number(input.agreedPriceUsd).toFixed(2),
      String(input.currency || "USD").toUpperCase(),
      input.paymentMethodName,
    ]
  );
  if (rapidDup && rapidDup.length > 0) {
    throw new Error(
      `Duplicate submission prevented: payment request #${rapidDup[0].id} was just submitted seconds ago and is already PENDING verification.`
    );
  }

  const requestCode = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const hex = "\\x" + input.buffer.toString("hex");
  const rows = await sql.query(
    `INSERT INTO payment_submissions (
       user_id, workspace_id, username, email, request_code, requested_plan, plan_label,
       agreed_price_usd, original_price_usd, currency, exchange_rate, converted_amount, lead_allowance,
       idempotency_key, payment_method_id, payment_method_name,
       payment_reference, customer_note, custom_duration_value, custom_duration_unit,
       custom_features_json, screenshot_filename, screenshot_mime, screenshot_size,
       screenshot_data, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8::numeric, $9::numeric, $10, $11::numeric, $12::numeric, $13,
       $14, $15, $16,
       $17, $18, $19, $20,
       $21::jsonb, $22, $23, $24,
       $25::bytea, 'PENDING'
     )
     RETURNING id, user_id, workspace_id, username, email, request_code, requested_plan, plan_label,
               agreed_price_usd, original_price_usd, currency, exchange_rate, converted_amount, lead_allowance,
               payment_method_id, payment_method_name,
               payment_reference, customer_note, custom_duration_value, custom_duration_unit,
               screenshot_filename, screenshot_mime,
               screenshot_size, status, admin_notes, created_at`,
    [
      input.userId,
      input.workspaceId,
      input.username,
      input.email,
      requestCode,
      input.requestedPlan,
      input.planLabel || input.requestedPlan,
      Number(input.agreedPriceUsd).toFixed(2),
      Number(input.agreedPriceUsd).toFixed(2),
      String(input.currency || "USD").toUpperCase(),
      Number(input.exchangeRate ?? 1).toFixed(4),
      Number(input.convertedAmount ?? input.agreedPriceUsd).toFixed(2),
      input.leadAllowance ?? null,
      input.idempotencyKey || null,
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
      request_code: sub.request_code,
      requested_plan: sub.requested_plan,
      agreed_price_usd: Number(sub.agreed_price_usd),
      currency: sub.currency,
      converted_amount: Number(sub.converted_amount),
      lead_allowance: sub.lead_allowance,
      payment_method_name: sub.payment_method_name,
      payment_reference: sub.payment_reference,
    },
  });

  // Notify Master Owner in real Neon notifications
  await createSystemNotification({
    workspaceId: 1,
    userId: null,
    isAdminTarget: true,
    title: `New Payment Proof: ${sub.username} (${sub.request_code})`,
    message: `${sub.username} submitted ${sub.plan_label || sub.requested_plan} via ${sub.payment_method_name} — $${Number(sub.agreed_price_usd).toFixed(2)} USD (${Number(sub.converted_amount)} ${sub.currency}). Verify funds before approving.`,
    type: "info",
    category: "new_payment_proof",
    link: "/app/admin/payments",
    refType: "payment_submission",
    refId: String(sub.id),
  }).catch(() => {});

  return {
    ...(sub as Record<string, any>),
    agreed_price_usd: Number(sub.agreed_price_usd),
    original_price_usd: sub.original_price_usd != null ? Number(sub.original_price_usd) : Number(sub.agreed_price_usd),
    exchange_rate: Number(sub.exchange_rate || 1),
    converted_amount: sub.converted_amount != null ? Number(sub.converted_amount) : Number(sub.agreed_price_usd),
  } as Record<string, any>;
}

export async function listCustomerPaymentSubmissions(userId: number, workspaceId: number) {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql.query(
    `SELECT id, user_id, workspace_id, username, email, request_code, requested_plan, plan_label,
            agreed_price_usd, original_price_usd, currency, exchange_rate, converted_amount, lead_allowance,
            custom_duration_value, custom_duration_unit, payment_method_id, payment_method_name,
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
    original_price_usd: r.original_price_usd != null ? Number(r.original_price_usd) : Number(r.agreed_price_usd),
    exchange_rate: Number(r.exchange_rate || 1),
    converted_amount: r.converted_amount != null ? Number(r.converted_amount) : Number(r.agreed_price_usd),
  }));
}

export async function listAdminPaymentSubmissions() {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql.query(
    `SELECT ps.id, ps.user_id, ps.workspace_id, ps.username, ps.email, ps.request_code,
            ps.requested_plan, ps.plan_label, ps.agreed_price_usd, ps.original_price_usd,
            ps.currency, ps.exchange_rate, ps.converted_amount, ps.lead_allowance,
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
    original_price_usd: r.original_price_usd != null ? Number(r.original_price_usd) : Number(r.agreed_price_usd),
    exchange_rate: Number(r.exchange_rate || 1),
    converted_amount: r.converted_amount != null ? Number(r.converted_amount) : Number(r.agreed_price_usd),
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
    lead_allowance?: number | null;
  }
) {
  const sql = getNeonSql();
  if (!sql) throw new Error("Database unavailable");

  const subRows = await sql.query("SELECT * FROM payment_submissions WHERE id = $1 LIMIT 1", [submissionId]);
  if (!subRows || subRows.length === 0) {
    throw new Error("Payment submission not found.");
  }
  const sub = subRows[0];
  const currentSubStatus = String(sub.status || "").toUpperCase();
  if (action === "APPROVE" && currentSubStatus !== "PENDING" && currentSubStatus !== "MORE_INFO_REQUIRED") {
    throw new Error(
      `Cannot approve payment #${submissionId}: current status is already ${currentSubStatus}. Only PENDING or MORE_INFO_REQUIRED requests can be approved.`
    );
  }
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
       RETURNING id, user_id, workspace_id, username, email, request_code, requested_plan, plan_label,
                 agreed_price_usd, currency, converted_amount, lead_allowance, payment_method_name, payment_reference,
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

    await createSystemNotification({
      workspaceId: Number(sub.workspace_id) || 1,
      userId: Number(sub.user_id),
      isAdminTarget: false,
      title: nextStatus === "REJECTED" ? `Payment Request Rejected (${sub.request_code || `#${submissionId}`})` : `More Info Requested (${sub.request_code || `#${submissionId}`})`,
      message:
        nextStatus === "REJECTED"
          ? `Your payment proof (${sub.plan_label || sub.requested_plan}) could not be confirmed. ${adminNotes ? `Note: ${adminNotes}. ` : ""}Your current plan was kept unchanged; you may submit a corrected payment proof anytime.`
          : `The Owner requested additional transfer details for ${sub.request_code || `#${submissionId}`}. ${adminNotes || "Please reply or upload clearer proof."}`,
      type: nextStatus === "REJECTED" ? "error" : "warning",
      category: nextStatus === "REJECTED" ? "payment_rejected" : "payment_more_info",
      link: "/app/subscription",
      refType: "payment_submission",
      refId: String(submissionId),
    }).catch(() => {});

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
            plan_label, google_maps_enabled, daily_email_limit, features_json, max_leads_quota,
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
           max_leads_quota = $7,
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
        FIXED_PLAN_SPECS.LIFETIME.leadAllowance,
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
    const builderUnit = normalizeBuilderUnit(durationUnit);
    const resolvedLeadQuota =
      options?.lead_allowance !== undefined && options.lead_allowance !== null && Number(options.lead_allowance) > 0
        ? Math.floor(Number(options.lead_allowance))
        : sub.lead_allowance != null && Number(sub.lead_allowance) > 0
        ? Number(sub.lead_allowance)
        : builderUnit && durationValue
        ? durationValue * CUSTOM_UNIT_PRICING[builderUnit].leadsPerUnit
        : FIXED_PLAN_SPECS.BASIC.leadAllowance;

    const dailyLimit = features.cold_email
      ? Math.max(
          1,
          Math.min(
            MAX_GMAIL_DAILY_SAFE_CAP,
            Number(options?.daily_email_limit ?? (builderUnit ? CUSTOM_UNIT_PRICING[builderUnit].dailyEmailLimit : currentEnt.dailyEmailLimit)) || BASIC_DAILY_EMAIL_LIMIT
          )
        )
      : 0;
    const calc = calculateSuggestedCustomPrice({ features, durationValue, durationUnit, dailyEmailLimit: dailyLimit });
    const durLabel = formatDurationLabel(durationValue, durationUnit);
    const label = sub.plan_label || `Custom (${durLabel} • $${finalPrice} • ${resolvedLeadQuota.toLocaleString()} Leads)`;
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
           max_leads_quota = $${durationUnit === "lifetime" ? 11 : 12},
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
            resolvedLeadQuota,
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
            resolvedLeadQuota,
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
           max_leads_quota = $7,
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
        FIXED_PLAN_SPECS.BASIC.leadAllowance,
      ]
    );
  }

  // Re-fetch authoritative user post-commit before marking submission APPROVED
  const verifiedUsers = await sql.query(
    `SELECT id, username, email, role, account_type, workspace_id, status, plan, plan_type, plan_label,
            custom_duration_value, custom_duration_unit, custom_price_usd, suggested_price_usd, max_leads_quota,
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
     RETURNING id, user_id, workspace_id, username, email, request_code, requested_plan, plan_label,
               agreed_price_usd, currency, converted_amount, lead_allowance, payment_method_name, payment_reference,
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
      request_code: sub.request_code || null,
      target_plan: reqPlan,
      agreed_price_usd: finalPrice,
      verified_status: authoritative.status,
      verified_plan: authoritative.plan_type,
      max_leads_quota: verifiedUser.max_leads_quota,
      verified_expires_at: verifiedUser.subscription_expires_at,
      session_version: verifiedUser.session_version,
    },
  });

  // Notify customer of Payment Approval & Subscription Activation
  await createSystemNotification({
    workspaceId: Number(client.workspace_id) || 1,
    userId: Number(client.id),
    isAdminTarget: false,
    title: `Payment Approved & Plan Activated (${sub.request_code || `#${submissionId}`})`,
    message: `Your payment of $${finalPrice.toFixed(2)} USD was verified by the Owner. Your ${authoritative.plan_label} is now ACTIVE (${authoritative.remainingDetailed}).`,
    type: "success",
    category: "payment_approved",
    link: "/app/subscription",
    refType: "payment_submission",
    refId: String(submissionId),
  }).catch(() => {});

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
