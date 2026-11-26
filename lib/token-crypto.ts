import crypto from "crypto";

/**
 * USMAN AI GTM - Server-Side Token Encryption Engine (AES-256-GCM)
 * Strictly encrypts sensitive OAuth tokens at rest before storing in Neon PostgreSQL.
 * Tokens are never stored in plain text.
 */

function getMasterKey(): Buffer {
  const raw = (
    process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.SECRET_KEY ||
    process.env.JWT_SECRET ||
    ""
  ).trim();

  if (!raw) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      throw new Error(
        "Server misconfiguration: TOKEN_ENCRYPTION_KEY environment variable is required in production."
      );
    }
    return crypto.createHash("sha256").update(`dev-vault:${process.cwd()}`).digest();
  }

  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Encrypt a plain token string or JSON object using AES-256-GCM.
 * Output format: enc_v1:<iv_hex>:<auth_tag_hex>:<cipher_hex>
 */
export function encryptToken(plainTextOrObj: string | Record<string, any>): string {
  if (!plainTextOrObj) return "";
  const plainText =
    typeof plainTextOrObj === "string" ? plainTextOrObj : JSON.stringify(plainTextOrObj);

  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // 12-byte IV standard for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

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

  if (cipherText.startsWith("enc_v1:")) {
    try {
      const parts = cipherText.split(":");
      if (parts.length !== 4) return null;
      const [, ivHex, authTagHex, encryptedHex] = parts;

      const masterKey = getMasterKey();
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
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
