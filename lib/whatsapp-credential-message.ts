export interface WhatsAppCredentialMessageInput {
  customerName?: string | null;
  username: string;
  password: string;
  planName: string;
  amount: number | string | null | undefined;
  currency?: string | null;
  durationLabel?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  isLifetime?: boolean;
  isPasswordReset?: boolean;
  loginUrl?: string | null;
  supportWhatsapp?: string | null;
  supportEmail?: string | null;
}

function formatReadableDate(raw?: string | null): string {
  if (!raw) return "";
  const str = String(raw).trim();
  if (!str) return "";
  if (/never|permanent|lifetime/i.test(str)) return "Lifetime (No Expiry)";
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }) + " (" + d.toISOString().slice(11, 16) + " UTC)";
}

/**
 * Generates a dynamic WhatsApp-ready customer credential & subscription welcome message.
 * Uses strictly single-asterisk *bold* and _italic_ WhatsApp formatting markers.
 * Never invents missing fields or adds a fake expiry date for lifetime plans.
 */
export function buildWhatsAppWelcomeMessage(input: WhatsAppCredentialMessageInput): string {
  const cleanName = String(input.customerName || "").trim();
  const showName =
    cleanName.length > 0 &&
    cleanName.toLowerCase() !== String(input.username || "").trim().toLowerCase();

  const cur = String(input.currency || "USD").trim().toUpperCase() || "USD";
  const numericAmount = Number(input.amount);
  const amountLine =
    input.amount !== null && input.amount !== undefined && String(input.amount).trim() !== "" && !isNaN(numericAmount)
      ? cur === "USD"
        ? `$${Number.isInteger(numericAmount) ? numericAmount : numericAmount.toFixed(2)} USD`
        : `${numericAmount.toLocaleString()} ${cur}`
      : "";

  const planStr = String(input.planName || "Active Plan").trim();
  const isLifetime =
    Boolean(input.isLifetime) ||
    /\blifetime\b/i.test(planStr) ||
    /\blifetime\b|never|permanent/i.test(String(input.durationLabel || ""));

  const durationLine = String(
    input.durationLabel || (isLifetime ? "Lifetime Access" : "Active")
  ).trim();

  const startFormatted = formatReadableDate(input.startDate || new Date().toISOString());
  const expiryFormatted = isLifetime
    ? "Lifetime (No Expiry)"
    : formatReadableDate(input.expiryDate) || durationLine;

  const loginUrl = String(input.loginUrl || "https://lead-scraper-mxs5.vercel.app/login").trim();
  const supportParts: string[] = [];
  if (input.supportWhatsapp && String(input.supportWhatsapp).trim()) {
    supportParts.push(`WhatsApp: ${String(input.supportWhatsapp).trim()}`);
  }
  if (input.supportEmail && String(input.supportEmail).trim()) {
    supportParts.push(`Email: ${String(input.supportEmail).trim()}`);
  }

  const lines: string[] = [
    showName ? `*Assalamualaikum ${cleanName}! 🌟*` : `*Assalamualaikum! 🌟*`,
    "",
    input.isPasswordReset
      ? `Your password for *USMAN AI GTM* has been reset by our team.`
      : `Thank you for choosing *USMAN AI GTM*. We truly appreciate your trust and are pleased to welcome you!`,
    "",
    `*Your Subscription Details*`,
    `📦 *Plan:* ${planStr}`,
  ];

  if (amountLine && !input.isPasswordReset) {
    lines.push(`💳 *Amount:* ${amountLine}`);
  }
  if (durationLine) {
    lines.push(`⏳ *Duration:* ${durationLine}`);
  }
  if (startFormatted && !input.isPasswordReset) {
    lines.push(`🗓️ *Start Date:* ${startFormatted}`);
  }
  lines.push(`📅 *Expiry:* ${expiryFormatted}`);

  lines.push(
    "",
    `*Your Login Credentials*`,
    `👤 *Username:* ${input.username}`,
    `🔐 *Password:* ${input.password}`,
    "",
    `🌐 *Login Here:*`,
    loginUrl,
    "",
    `_For your security, please keep these credentials private and update your password anytime from Settings._`,
    "",
    `*Thank you for your support. 🤝*`
  );

  if (supportParts.length > 0) {
    lines.push(`For assistance, contact support (${supportParts.join(" | ")}).`);
  } else {
    lines.push(`For assistance, reply to our configured support channel anytime.`);
  }

  return lines.join("\n");
}
