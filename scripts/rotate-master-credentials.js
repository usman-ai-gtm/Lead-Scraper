const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const dbUrlPath = 'C:/Users/Dell/.config/neon/db_url.txt';
if (!fs.existsSync(dbUrlPath)) {
  console.error("Database connection file missing at:", dbUrlPath);
  process.exit(1);
}
const dbUrl = fs.readFileSync(dbUrlPath, 'utf8').trim();
const sql = neon(dbUrl);

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt.toString("hex")}$${hash}`;
}

function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
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
  return false;
}

async function rotateCredentials() {
  console.log("1. Adding recovery_key_hash column to Neon DB if not exists...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_key_hash text`;

  console.log("2. Generating brand new unique Master Owner credentials...");
  const rawBytes = crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  const newPassword = 'Usman#M' + rawBytes.slice(0, 7) + '!9k' + rawBytes.slice(7, 12) + '$' + Date.now().toString().slice(-4);
  const newRecoveryKey = 'REC-' + crypto.randomBytes(16).toString('hex').toUpperCase();

  const newPasswordHash = hashPassword(newPassword);
  const newRecoveryHash = hashPassword(newRecoveryKey);

  console.log("3. Updating Neon PostgreSQL database with PBKDF2 hashed credentials...");
  const res = await sql`
    UPDATE users
    SET password_hash = ${newPasswordHash},
        recovery_key_hash = ${newRecoveryHash},
        updated_at = NOW()
    WHERE id = 2
    RETURNING id, username, email, role, account_type, status, password_hash, recovery_key_hash
  `;

  const updated = res[0];

  // 4. Test that NEW password works
  const newPassWorks = verifyPassword(newPassword, updated.password_hash);
  if (!newPassWorks) {
    console.error("FATAL ERROR: New password failed verification!");
    process.exit(1);
  }
  console.log("✓ Verified: New password successfully verified against PBKDF2 hash.");

  // 5. Test that arbitrary wrong password is rejected
  const wrongPassWorks = verifyPassword("ArbitraryWrongPass123!", updated.password_hash);
  if (wrongPassWorks) {
    console.error("FATAL ERROR: Wrong password was accepted!");
    process.exit(1);
  }
  console.log("✓ Verified: Wrong password strictly rejected.");

  // 6. Test that NEW recovery key works
  const newKeyWorks = verifyPassword(newRecoveryKey, updated.recovery_key_hash);
  if (!newKeyWorks) {
    console.error("FATAL ERROR: New recovery key failed verification!");
    process.exit(1);
  }
  console.log("✓ Verified: New recovery key successfully verified against PBKDF2 hash.");

  // 7. Securely store secrets in local private config outside repository
  const secureDir = 'C:/Users/Dell/.config/usman_gtm';
  if (!fs.existsSync(secureDir)) fs.mkdirSync(secureDir, { recursive: true });
  
  const credsData = {
    username: updated.username,
    email: updated.email,
    password: newPassword,
    recoveryKey: newRecoveryKey,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(secureDir, 'admin_credentials.json'), JSON.stringify(credsData, null, 2), { mode: 0o600 });
  console.log("✓ Secrets saved securely to local private path: C:/Users/Dell/.config/usman_gtm/admin_credentials.json (outside Git repo).");

  console.log("\n=======================================================");
  console.log(" CREDENTIALS ROTATION COMPLETE IN PRODUCTION DATABASE");
  console.log("=======================================================\n");
}

rotateCredentials().catch(err => {
  console.error("Rotation error:", err);
  process.exit(1);
});
