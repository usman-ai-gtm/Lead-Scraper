import crypto from "crypto";

/**
 * USMAN AI GTM - Server-Side Token Encryption Engine (AES-256-GCM)
 * Strictly encrypts sensitive OAuth tokens at rest before storing in Neon PostgreSQL.
 * Tokens are never stored in plain text.
 */

// Derive a 32-byte key using SHA-256 hash of the master encryption secret
const SECRET =
  process.env.TOKEN_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  process.env.SECRET_KEY ||
  "usman_ai_gtm_token_vault_master_key_2026_aes256_secure";

const MASTER_KEY = crypto.createHash("sha256").update(SECRET).digest();

/**
 * Encrypt a plain token string or JSON object using AES-256-GCM.
 * Output format: enc_v1:<iv_hex>:<auth_tag_hex>:<cipher_hex>
 */
export function encryptToken(plainTextOrObj: string | Record<string, any>): string {
  if (!plainTextOrObj) return "";
  const plainText =
    typeof plainTextOrObj === "string" ? plainTextOrObj : JSON.stringify(plainTextOrObj);

  const iv = crypto.randomBytes(12); // 12-byte IV standard for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", MASTER_KEY, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `enc_v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted token string.
 * Supports backward compatibility with unencrypted legacy JSON tokens.
 */
export function decryptToken(cipherText: string): any {
  if (!cipherText || typeof cipherText !== "string") return null;

  // Check for encrypted prefix
  if (cipherText.startsWith("enc_v1:")) {
    try {
      const parts = cipherText.split(":");
      if (parts.length !== 4) return null;
      const [, ivHex, authTagHex, encryptedHex] = parts;

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      console.error("[TokenCrypto] Decryption failed:", err);
      return null;
    }
  }

  // Backward compatibility fallback for unencrypted tokens
  try {
    return JSON.parse(cipherText);
  } catch {
    return cipherText;
  }
}
