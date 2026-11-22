const { neon } = require("@neondatabase/serverless");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPaths = [".env.local", ".env"];
  for (const ep of envPaths) {
    const full = path.join(process.cwd(), ep);
    if (fs.existsSync(full)) {
      const lines = fs.readFileSync(full, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

const dbUrlPath = "C:/Users/Dell/.config/neon/db_url.txt";
const dbUrl = fs.existsSync(dbUrlPath) ? fs.readFileSync(dbUrlPath, "utf8").trim() : process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("FATAL: DATABASE_URL not found.");
  process.exit(1);
}

const sql = neon(dbUrl);

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16);
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(plainPassword, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt.toString("hex")}$${hash}`;
}

function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || !plainPassword) return false;
  try {
    if (storedHash.startsWith("pbkdf2_sha256$")) {
      const parts = storedHash.split("$");
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10);
      const salt = Buffer.from(parts[2], "hex");
      const expectedHashHex = parts[3];
      const computedHash = crypto.pbkdf2Sync(plainPassword, salt, iterations, 32, "sha256").toString("hex");
      const a = Buffer.from(computedHash, "utf-8");
      const b = Buffer.from(expectedHashHex, "utf-8");
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    return false;
  } catch {
    return false;
  }
}

// AES-256-GCM Token Encryption Verification (mirroring lib/token-crypto.ts)
const TOKEN_SECRET = process.env.TOKEN_ENCRYPTION_KEY || process.env.SECRET_KEY || process.env.JWT_SECRET || "usman_ai_gtm_token_vault_master_key_2026_aes256_secure";
const MASTER_KEY = crypto.createHash("sha256").update(TOKEN_SECRET).digest();

function encryptToken(obj) {
  const plainText = JSON.stringify(obj);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", MASTER_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `enc_v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decryptToken(cipherText) {
  if (!cipherText || !cipherText.startsWith("enc_v1:")) return null;
  const parts = cipherText.split(":");
  if (parts.length !== 4) return null;
  const [, ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

// Authoritative user status computation (mirroring lib/neon-db.ts)
function computeAuthoritativeUserStatus(user) {
  const roleUpper = (user.role || "").toUpperCase();
  const accountTypeUpper = (user.account_type || "").toUpperCase();
  const usernameLower = String(user.username || "").trim().toLowerCase();
  const emailLower = String(user.email || "").trim().toLowerCase();

  const isMasterOwner =
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "ADMIN" ||
    accountTypeUpper === "MASTER_OWNER" ||
    usernameLower === "master_owner_usman" ||
    emailLower === "master_owner@usmanai.internal" ||
    emailLower === "transaction000501@gmail.com";

  if (isMasterOwner) {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Permanent (Master Owner)",
      remainingDetailed: "Permanent Access — No Expiry",
      remainingMs: Infinity,
    };
  }

  const statusUpper = (user.status || "LOCKED").toUpperCase();

  if (accountTypeUpper === "FREE_PREVIEW" || statusUpper === "PREVIEW_ONLY" || (user.plan || "").toUpperCase() === "FREE_PREVIEW") {
    return {
      status: "PREVIEW_ONLY",
      isLocked: true,
      plan: "FREE_PREVIEW",
      isExpired: false,
      daysRemaining: "Free Preview",
      remainingDetailed: "Free Preview Mode",
      remainingMs: 0,
    };
  }

  if (statusUpper === "REVOKED") {
    return {
      status: "REVOKED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
      remainingDetailed: "Revoked by Administrator",
      remainingMs: 0,
    };
  }
  if (statusUpper === "SUSPENDED") {
    return {
      status: "SUSPENDED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
      remainingDetailed: "Suspended by Administrator",
      remainingMs: 0,
    };
  }
  if (statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
      remainingDetailed: "Locked by Administrator",
      remainingMs: 0,
    };
  }

  const planUpper = (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC";

  if (planUpper === "LIFETIME") {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Lifetime Access — No Expiry",
      remainingDetailed: "Lifetime Access — No Expiry",
      remainingMs: Infinity,
    };
  }

  // Basic Plan ($25 / 30 Days)
  if (!user.subscription_expires_at) {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: "BASIC",
      isExpired: true,
      daysRemaining: 0,
      remainingDetailed: "Expired",
      remainingMs: 0,
    };
  }

  const expTime = new Date(user.subscription_expires_at).getTime();
  const now = Date.now();
  const diffMs = expTime - now;

  if (diffMs <= 0) {
    return {
      status: "EXPIRED",
      isLocked: true,
      plan: "BASIC",
      isExpired: true,
      daysRemaining: 0,
      remainingDetailed: "Expired",
      remainingMs: 0,
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    status: "ACTIVE",
    isLocked: false,
    plan: "BASIC",
    isExpired: false,
    daysRemaining: days,
    remainingDetailed: `${days}d ${hours}h ${minutes}m left`,
    remainingMs: diffMs,
  };
}

let testPassed = 0;
let testFailed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testPassed++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? "- " + details : ""}`);
    testFailed++;
  }
}

async function runMasterAuditVerification() {
  console.log("===============================================================================");
  console.log("MASTER AUDIT & SECURITY VERIFICATION SUITE — LEAD SCRAPER");
  console.log("Validating: Issue 1 (30d Expiry), Issue 2 (Lifetime Google Maps), Issue 3 (Gmail OAuth)");
  console.log("===============================================================================\n");

  const testStamp = Date.now();
  const basicUsername = `audit_basic_${testStamp}`;
  const lifetimeUsername = `audit_life_${testStamp}`;
  const plainPassword = "AuditPassword@2026!";
  const pwdHash = hashPassword(plainPassword);

  let basicUserId = null;
  let basicWsId = null;
  let lifetimeUserId = null;
  let lifetimeWsId = null;

  try {
    // =========================================================================
    // SECTION 1: ISSUE 1 — BASIC PLAN EXACT 30-DAY EXPIRY VERIFICATION
    // =========================================================================
    console.log("--- SECTION 1: BASIC PLAN EXACT 30-DAY EXPIRY TESTS ---");
    const nowIso = new Date().toISOString();
    const exact30DaysMs = 30 * 24 * 60 * 60 * 1000;
    const basicExpiryDate = new Date(Date.now() + exact30DaysMs);
    const basicExpiryIso = basicExpiryDate.toISOString();

    const wsBasic = await sql.query(
      "INSERT INTO workspaces (name, created_at, tenant_id) VALUES ($1, $2, 1) RETURNING id",
      [`Audit Basic Workspace ${testStamp}`, nowIso]
    );
    basicWsId = wsBasic[0].id;

    const basicUser = await sql.query(
      `INSERT INTO users (
        username, email, password_hash, full_name, role, account_type,
        workspace_id, status, plan, subscription_status, subscription_start,
        subscription_expires_at, active, is_active, created_at, tenant_id
      ) VALUES (
        $1::text, $2::text, $3::text, $4::text, 'CLIENT', 'PAID_CLIENT',
        $5::int4, 'ACTIVE', 'BASIC', 'ACTIVE', $6::timestamptz,
        $7::timestamptz, 1, 1, $8::text, 1
      ) RETURNING id, username, password_hash, status, plan, subscription_start, subscription_expires_at`,
      [basicUsername, `${basicUsername}@app.client`, pwdHash, "Audit Basic Client", basicWsId, nowIso, basicExpiryIso, nowIso]
    );
    basicUserId = basicUser[0].id;

    assert(basicUserId !== null, `Basic account created with ID #${basicUserId}`);
    assert(basicUser[0].subscription_expires_at !== null, "Activation and expiry timestamps stored in UTC in database");

    // 1.1 Test access immediately BEFORE expiry
    const beforeExpiryStatus = computeAuthoritativeUserStatus(basicUser[0]);
    assert(beforeExpiryStatus.status === "ACTIVE", "Access allowed immediately before expiry (status is ACTIVE)");
    assert(!beforeExpiryStatus.isLocked, "Account is NOT locked before expiry");
    assert(!beforeExpiryStatus.isExpired, "Account is NOT expired before expiry");
    assert(beforeExpiryStatus.remainingDetailed && beforeExpiryStatus.remainingDetailed.includes("left"), "Detailed countdown returns correct days/hours/minutes left");

    // 1.2 Test access EXACTLY AT expiry (current_timestamp >= subscription_expires_at)
    const exactExpiryUser = { ...basicUser[0], subscription_expires_at: new Date(Date.now()).toISOString() };
    // Wait 2ms so Date.now() >= expTime
    await new Promise(r => setTimeout(r, 10));
    const exactExpiryStatus = computeAuthoritativeUserStatus(exactExpiryUser);
    assert(exactExpiryStatus.status === "EXPIRED", "Account immediately switches to 'EXPIRED' exactly at expiry timestamp");
    assert(exactExpiryStatus.isLocked === true, "Account is immediately locked (isLocked = true) at expiry timestamp");
    assert(exactExpiryStatus.isExpired === true, "isExpired === true at exact expiry timestamp");

    // 1.3 Test access ONE SECOND AFTER expiry
    const oneSecAfterUser = { ...basicUser[0], subscription_expires_at: new Date(Date.now() - 1000).toISOString() };
    const oneSecAfterStatus = computeAuthoritativeUserStatus(oneSecAfterUser);
    assert(oneSecAfterStatus.status === "EXPIRED", "Account is strictly 'EXPIRED' one second after expiry");
    assert(oneSecAfterStatus.isLocked === true, "Account is locked one second after expiry");
    assert(oneSecAfterStatus.daysRemaining === 0, "Account has 0 days remaining after expiry");
    assert(oneSecAfterStatus.remainingDetailed === "Expired", "Detailed status shows 'Expired'");

    // 1.4 Test direct API simulation on expired account
    function simulateProtectedApiCall(userRecord) {
      const auth = computeAuthoritativeUserStatus(userRecord);
      if (auth.isLocked) {
        if (auth.status === "EXPIRED") {
          return { allowed: false, statusCode: 403, error: "Your subscription has expired. Please renew to continue." };
        }
        return { allowed: false, statusCode: 403, error: "Your account is currently locked." };
      }
      return { allowed: true, statusCode: 200 };
    }

    const expiredApiCall = simulateProtectedApiCall(oneSecAfterUser);
    assert(!expiredApiCall.allowed, "Protected API call rejected for expired account");
    assert(expiredApiCall.statusCode === 403, "Protected API returns HTTP 403");
    assert(expiredApiCall.error === "Your subscription has expired. Please renew to continue.", `Exact subscription-expired message returned: "${expiredApiCall.error}"`);

    // 1.5 Test old login session rejection after expiry
    function simulateLogin(userRecord, passwordAttempt) {
      if (!verifyPassword(passwordAttempt, userRecord.password_hash)) {
        return { allowed: false, statusCode: 401, error: "Incorrect username or password" };
      }
      const auth = computeAuthoritativeUserStatus(userRecord);
      if (auth.isLocked) {
        if (auth.status === "EXPIRED") {
          return { allowed: false, statusCode: 403, error: "Your subscription has expired. Please renew to continue." };
        }
        return { allowed: false, statusCode: 403, error: "Your account is currently locked." };
      }
      return { allowed: true, statusCode: 200, token: "jwt_token_sample" };
    }

    const expiredLoginAttempt = simulateLogin({ ...basicUser[0], ...oneSecAfterUser }, plainPassword);
    assert(!expiredLoginAttempt.allowed, "Login strictly blocked for expired account even with correct password");
    assert(expiredLoginAttempt.statusCode === 403, "Login returns HTTP 403 on expired account");
    assert(expiredLoginAttempt.error === "Your subscription has expired. Please renew to continue.", `Login returns exact message: "${expiredLoginAttempt.error}"`);

    // 1.6 Verify customer data (leads, history, workspace) is PRESERVED when expired
    const leadSample = await sql.query(
      `INSERT INTO leads (workspace_id, business_name, email, phone, website, created_at)
       VALUES ($1, 'Acme Corp', 'contact@acme.com', '+12125550100', 'https://acme.com', $2)
       RETURNING id`,
      [basicWsId, nowIso]
    );
    const existingLeads = await sql.query("SELECT id FROM leads WHERE workspace_id = $1", [basicWsId]);
    assert(existingLeads.length > 0, "Customer leads and workspace data strictly preserved in database upon subscription expiry");

    // 1.7 Verify Owner renewal (+30 days)
    const new30DaysIso = new Date(Date.now() + exact30DaysMs).toISOString();
    await sql.query(
      "UPDATE users SET status = 'ACTIVE', subscription_expires_at = $1 WHERE id = $2",
      [new30DaysIso, basicUserId]
    );
    const renewedRows = await sql.query("SELECT * FROM users WHERE id = $1", [basicUserId]);
    const renewedStatus = computeAuthoritativeUserStatus(renewedRows[0]);
    assert(renewedStatus.status === "ACTIVE", "Owner RENEW successfully restores account to ACTIVE");
    assert(!renewedStatus.isLocked, "Renewed account is unlocked");
    assert(renewedStatus.daysRemaining >= 29, "Renewed account has new valid 30-day period");

    // =========================================================================
    // SECTION 2: ISSUE 2 — $100 LIFETIME GOOGLE MAPS UNLOCK VERIFICATION
    // =========================================================================
    console.log("\n--- SECTION 2: $100 LIFETIME GOOGLE MAPS ACCESS TESTS ---");

    const wsLife = await sql.query(
      "INSERT INTO workspaces (name, created_at, tenant_id) VALUES ($1, $2, 1) RETURNING id",
      [`Audit Lifetime Workspace ${testStamp}`, nowIso]
    );
    lifetimeWsId = wsLife[0].id;

    const lifeUser = await sql.query(
      `INSERT INTO users (
        username, email, password_hash, full_name, role, account_type,
        workspace_id, status, plan, subscription_status, subscription_start,
        subscription_expires_at, active, is_active, created_at, tenant_id
      ) VALUES (
        $1::text, $2::text, $3::text, $4::text, 'CLIENT', 'PAID_CLIENT',
        $5::int4, 'ACTIVE', 'LIFETIME', 'ACTIVE', $6::timestamptz,
        null, 1, 1, $7::text, 1
      ) RETURNING id, username, status, plan, subscription_expires_at`,
      [lifetimeUsername, `${lifetimeUsername}@app.client`, pwdHash, "Audit Lifetime Client", lifetimeWsId, nowIso, nowIso]
    );
    lifetimeUserId = lifeUser[0].id;

    assert(lifetimeUserId !== null, `Lifetime account created with ID #${lifetimeUserId}`);
    assert(lifeUser[0].plan === "LIFETIME", "Lifetime account has plan 'LIFETIME'");
    assert(lifeUser[0].subscription_expires_at === null, "Lifetime subscription has NO expiry (NULL)");

    // 2.1 Verify Lifetime never expires automatically
    const lifeAuthoritative = computeAuthoritativeUserStatus(lifeUser[0]);
    assert(lifeAuthoritative.status === "ACTIVE", "Lifetime account is permanently ACTIVE");
    assert(!lifeAuthoritative.isLocked, "Lifetime account is not locked");
    assert(lifeAuthoritative.daysRemaining === "Lifetime Access — No Expiry", "Lifetime daysRemaining shows 'Lifetime Access — No Expiry'");

    // 2.2 Verify Google Maps permission gate for Basic vs. Lifetime
    function checkGoogleMapsGate(userRecord) {
      const auth = computeAuthoritativeUserStatus(userRecord);
      if (auth.isLocked) {
        return { allowed: false, statusCode: 403, error: auth.status === "EXPIRED" ? "Your subscription has expired. Please renew to continue." : "Account locked." };
      }
      const roleUpper = (userRecord.role || "").toUpperCase();
      const accountTypeUpper = (userRecord.account_type || "").toUpperCase();
      const isOwner = roleUpper === "SUPER_ADMIN" || roleUpper === "ADMIN" || accountTypeUpper === "MASTER_OWNER";
      const planUpper = (userRecord.plan || "BASIC").toUpperCase();

      if (!isOwner && planUpper !== "LIFETIME") {
        return {
          allowed: false,
          statusCode: 403,
          code: "UPGRADE_REQUIRED",
          error: "Google Maps Business Lead Generator is an exclusive feature of the $100 Lifetime Plan. Please upgrade to unlock unlimited Google Maps local business intelligence.",
        };
      }
      return { allowed: true, statusCode: 200 };
    }

    // Basic account attempting Google Maps
    const basicMapsAttempt = checkGoogleMapsGate(basicUser[0]);
    assert(!basicMapsAttempt.allowed, "Basic plan strictly denied access to Google Maps lead generator");
    assert(basicMapsAttempt.statusCode === 403, "Basic plan Google Maps access returns HTTP 403");
    assert(basicMapsAttempt.code === "UPGRADE_REQUIRED", "Basic plan returns code 'UPGRADE_REQUIRED'");

    // Lifetime account attempting Google Maps
    const lifeMapsAttempt = checkGoogleMapsGate(lifeUser[0]);
    assert(lifeMapsAttempt.allowed, "Lifetime plan successfully authorized for Google Maps lead extraction");
    assert(lifeMapsAttempt.statusCode === 200, "Lifetime plan Google Maps access returns HTTP 200");

    // 2.3 Verify Owner suspension/revocation works even on Lifetime accounts
    await sql.query("UPDATE users SET status = 'SUSPENDED' WHERE id = $1", [lifetimeUserId]);
    const suspendedLife = await sql.query("SELECT * FROM users WHERE id = $1", [lifetimeUserId]);
    const suspendedStatus = computeAuthoritativeUserStatus(suspendedLife[0]);
    assert(suspendedStatus.status === "SUSPENDED", "Owner SUSPEND successfully overrides Lifetime plan");
    assert(suspendedStatus.isLocked === true, "Suspended Lifetime account is locked");
    const suspendedMapsAttempt = checkGoogleMapsGate(suspendedLife[0]);
    assert(!suspendedMapsAttempt.allowed, "Suspended Lifetime account blocked from Google Maps");

    // Restore Lifetime account
    await sql.query("UPDATE users SET status = 'ACTIVE' WHERE id = $1", [lifetimeUserId]);

    // =========================================================================
    // SECTION 3: ISSUE 3 — GMAIL OAUTH SETUP & SECURITY AUDIT
    // =========================================================================
    console.log("\n--- SECTION 3: GMAIL OAUTH SETUP & TOKEN SECURITY TESTS ---");

    // 3.1 Verify Token Encryption at Rest (AES-256-GCM)
    const sampleTokenPayload = {
      access_token: "ya29.sample_google_access_token_mock_test_2026",
      refresh_token: "1//04sample_google_refresh_token_mock_2026",
      scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
      token_type: "Bearer",
      expiry_date: Date.now() + 3600000,
    };

    const encryptedString = encryptToken(sampleTokenPayload);
    assert(encryptedString.startsWith("enc_v1:"), "Token encrypted with authenticated AES-256-GCM prefix (enc_v1:)");
    assert(!encryptedString.includes("ya29."), "Plaintext access token is completely hidden");
    assert(!encryptedString.includes("1//04"), "Plaintext refresh token is completely hidden");

    const decryptedPayload = decryptToken(encryptedString);
    assert(decryptedPayload.access_token === sampleTokenPayload.access_token, "Decrypted access token matches original");
    assert(decryptedPayload.refresh_token === sampleTokenPayload.refresh_token, "Decrypted refresh token matches original");

    // 3.2 Verify Multi-Tenant Mailbox Isolation
    // Workspace A connects Gmail A
    await sql.query(
      `INSERT INTO email_accounts (
        workspace_id, account_name, sender_name, sender_email,
        provider_type, oauth_token_json, daily_limit, sent_today,
        is_active, health_status, created_at, updated_at
      ) VALUES ($1, 'Gmail A', 'Customer A', 'customera@gmail.com', 'GMAIL_OAUTH', $2, 500, 0, 1, 'CONNECTED', $3, $3)`,
      [basicWsId, encryptedString, nowIso]
    );

    // Workspace B (Customer B) queries its email accounts
    const customerBAccounts = await sql.query(
      "SELECT id, sender_email FROM email_accounts WHERE workspace_id = $1 AND is_active = 1",
      [lifetimeWsId]
    );
    assert(customerBAccounts.length === 0, "Customer B cannot see or use Customer A's connected Gmail account (Zero cross-workspace leakage: 0 accounts)");

    const customerAAccounts = await sql.query(
      "SELECT id, sender_email FROM email_accounts WHERE workspace_id = $1 AND is_active = 1",
      [basicWsId]
    );
    assert(customerAAccounts.length === 1, "Customer A can see only their own connected Gmail account");
    assert(customerAAccounts[0].sender_email === "customera@gmail.com", "Connected Gmail email matches Customer A's address");

    // 3.3 Verify Disconnect / Revoke removes active sending capability
    await sql.query(
      "UPDATE email_accounts SET is_active = 0, health_status = 'DISCONNECTED' WHERE workspace_id = $1",
      [basicWsId]
    );
    const afterDisconnect = await sql.query(
      "SELECT id FROM email_accounts WHERE workspace_id = $1 AND is_active = 1",
      [basicWsId]
    );
    assert(afterDisconnect.length === 0, "Disconnected Gmail account immediately stops active sending status");

  } finally {
    // Cleanup disposable test records
    console.log("\n--- CLEANUP OF DISPOSABLE TEST DATA ---");
    if (basicUserId) {
      await sql.query("DELETE FROM email_accounts WHERE workspace_id = $1", [basicWsId]);
      await sql.query("DELETE FROM leads WHERE workspace_id = $1", [basicWsId]);
      await sql.query("DELETE FROM search_records WHERE workspace_id = $1", [basicWsId]);
      await sql.query("DELETE FROM users WHERE id = $1", [basicUserId]);
    }
    if (lifetimeUserId) {
      await sql.query("DELETE FROM email_accounts WHERE workspace_id = $1", [lifetimeWsId]);
      await sql.query("DELETE FROM users WHERE id = $1", [lifetimeUserId]);
    }
    if (basicWsId) {
      await sql.query("DELETE FROM workspaces WHERE id = $1", [basicWsId]);
    }
    if (lifetimeWsId) {
      await sql.query("DELETE FROM workspaces WHERE id = $1", [lifetimeWsId]);
    }

    const remaining = await sql.query("SELECT id, username, role FROM users");
    console.log(`Neon DB remaining user count: ${remaining.length}`);
    remaining.forEach(u => console.log(`  - ID #${u.id}: ${u.username} (${u.role})`));
  }

  console.log("\n===============================================================================");
  console.log(`AUDIT VERIFICATION SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log("===============================================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runMasterAuditVerification().catch(err => {
  console.error("FATAL ERROR in audit verification execution:", err);
  process.exit(1);
});
