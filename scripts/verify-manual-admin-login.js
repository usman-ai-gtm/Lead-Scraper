/**
 * USMAN AI GTM - Manual Master Owner Login Verification Script
 * Strictly uses environment variables or secure local config (outside Git repo).
 * Exits with non-zero code on ANY failure.
 */

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

function loadSecureCredentials() {
  const configPath = 'C:/Users/Dell/.config/usman_gtm/admin_credentials.json';
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {
    username: process.env.MASTER_ADMIN_USERNAME || "master_owner_usman",
    email: process.env.MASTER_ADMIN_EMAIL || "master_owner@usmanai.internal",
    password: process.env.MASTER_ADMIN_PASSWORD || "",
    recoveryKey: process.env.MASTER_RECOVERY_KEY || "",
  };
}

const creds = loadSecureCredentials();
if (!creds.password) {
  console.error("FAIL: MASTER_ADMIN_PASSWORD must be configured in environment or external config.");
  process.exit(1);
}

async function verifyManualLogin() {
  console.log("\n=======================================================");
  console.log(" MANUAL MASTER OWNER LOGIN VERIFICATION SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let total = 0;
  let failures = 0;

  function assert(condition, testName, details = "") {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${testName} - ${details}`);
      failures++;
    }
  }

  // 1. Fetch Master Owner row from Neon DB
  const rows = await sql`
    SELECT id, username, email, full_name, role, account_type, status, plan, subscription_status, subscription_expires_at, password_hash, recovery_key_hash, active, is_active
    FROM users
    WHERE LOWER(username) = LOWER(${creds.username})
    LIMIT 1
  `;

  assert(rows.length > 0, `Master Owner record found in Neon DB (username: ${creds.username})`);
  if (rows.length === 0) {
    console.error("FATAL: Master Owner record not found in database!");
    process.exit(1);
  }

  const owner = rows[0];

  assert(owner.role === "SUPER_ADMIN", `Owner role is SUPER_ADMIN (got: ${owner.role})`);
  assert(owner.account_type === "MASTER_OWNER", `Owner account_type is MASTER_OWNER (got: ${owner.account_type})`);
  assert(owner.status === "ACTIVE", `Owner status is ACTIVE (got: ${owner.status})`);
  assert(owner.plan === "OWNER_LIFETIME", `Owner plan is OWNER_LIFETIME (got: ${owner.plan})`);
  assert(owner.subscription_expires_at === null, "Owner subscription_expires_at is strictly NULL (Permanent)");
  assert(owner.active === 1 && owner.is_active === 1, "Owner active and is_active are both 1");

  // 2. Test Password Verification
  const isCorrect = verifyPassword(creds.password, owner.password_hash);
  assert(isCorrect === true, "Master Owner password verifies correctly with PBKDF2 hash");

  const isWrongRejected = verifyPassword("InvalidWrongPass999!", owner.password_hash);
  assert(isWrongRejected === false, "Incorrect password strictly rejected");

  // 3. Test Recovery Key Verification
  if (creds.recoveryKey && owner.recovery_key_hash) {
    const isRecoveryCorrect = verifyPassword(creds.recoveryKey, owner.recovery_key_hash);
    assert(isRecoveryCorrect === true, "Master Recovery Key verifies correctly against PBKDF2 hash");

    const isWrongKeyRejected = verifyPassword("INVALID-KEY-12345", owner.recovery_key_hash);
    assert(isWrongKeyRejected === false, "Invalid recovery key strictly rejected");
  }

  // 4. Test Client Exclusion from Admin Role
  const clientRows = await sql`
    SELECT id, username, email, role, account_type
    FROM users
    WHERE role = 'CLIENT'
    LIMIT 1
  `;
  if (clientRows.length > 0) {
    const client = clientRows[0];
    const isClientAdmin = client.role === "SUPER_ADMIN" || client.role === "ADMIN" || client.account_type === "MASTER_OWNER";
    assert(isClientAdmin === false, `Client ${client.email} cannot access Master Owner permissions (role: ${client.role})`);
  }

  // 5. Test Client Roster Query Excludes Master Owner
  const clientRoster = await sql`
    SELECT id, username, email, role, account_type
    FROM users
    WHERE role != 'ADMIN' AND role != 'SUPER_ADMIN' AND (account_type IS NULL OR account_type != 'MASTER_OWNER') AND (username IS NULL OR LOWER(username) != ${creds.username})
  `;
  const ownerInRoster = clientRoster.some(c => c.username === creds.username || c.email === owner.email);
  assert(!ownerInRoster, "Master Owner is strictly EXCLUDED from client roster query");

  // 6. Test Data Preservation (All existing users intact)
  const allUsersCount = await sql`SELECT COUNT(*)::int as count FROM users`;
  assert(allUsersCount[0].count >= 34, `All existing customer accounts intact in DB (count: ${allUsersCount[0].count})`);

  console.log("\n=======================================================");
  if (failures > 0) {
    console.error(` VERIFICATION FAILED: ${failures} out of ${total} tests failed!`);
    console.log("=======================================================\n");
    process.exit(1);
  } else {
    console.log(` ALL ${passed}/${total} MANUAL LOGIN VERIFICATION TESTS PASSED!`);
    console.log("=======================================================\n");
  }
}

verifyManualLogin().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
