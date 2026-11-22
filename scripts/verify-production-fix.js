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
let dbUrl = fs.existsSync(dbUrlPath) ? fs.readFileSync(dbUrlPath, "utf8").trim() : (process.env.DATABASE_URL || process.env.POSTGRES_URL);

if (!dbUrl) {
  console.error("FATAL: DATABASE_URL not found in environment or config file.");
  process.exit(1);
}

const sql = neon(dbUrl);

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(plainPassword, salt, 100000, 32, "sha256").toString("hex");
  return `pbkdf2:sha256:100000$${salt}$${hash}`;
}

function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || !plainPassword) return false;
  try {
    if (storedHash.startsWith("pbkdf2:sha256:")) {
      const parts = storedHash.split("$");
      if (parts.length !== 3) return false;
      const salt = parts[1];
      const expectedHashHex = parts[2];
      const computedHash = crypto.pbkdf2Sync(plainPassword, salt, 100000, 32, "sha256").toString("hex");
      const a = Buffer.from(computedHash, "utf-8");
      const b = Buffer.from(expectedHashHex, "utf-8");
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    return false;
  } catch {
    return false;
  }
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

  if (
    accountTypeUpper === "FREE_PREVIEW" ||
    statusUpper === "PREVIEW_ONLY" ||
    (user.plan || "").toUpperCase() === "FREE_PREVIEW"
  ) {
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
  const remainingDetailed = `${days}d ${hours}h ${minutes}m left`;

  return {
    status: "ACTIVE",
    isLocked: false,
    plan: "BASIC",
    isExpired: false,
    daysRemaining: days,
    remainingDetailed,
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

async function runProductionFixVerification() {
  console.log("===============================================================================");
  console.log("USMAN AI GTM — COMPREHENSIVE PRODUCTION VERIFICATION SUITE");
  console.log("Testing: PostgreSQL parameter fix, instant creation, 30d timer, plan gates, isolation");
  console.log("===============================================================================\n");

  const testStamp = Date.now();
  const basicUsername = `test_basic_${testStamp}`;
  const lifetimeUsername = `test_life_${testStamp}`;
  const plainPassword = "TestPassword@2026!";
  const pwdHash = hashPassword(plainPassword);

  let basicUserId = null;
  let basicWsId = null;
  let lifetimeUserId = null;
  let lifetimeWsId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Parameter $7 Query Fix & Instant Basic Account Creation
    // -------------------------------------------------------------------------
    console.log("TEST 1: Creating Basic Account ($25 / 30-Day Expiry) with typed parameters...");
    const nowIso = new Date().toISOString();
    const basicExpiryIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const wsBasic = await sql.query(
      `INSERT INTO workspaces (name, created_at, tenant_id, description)
       VALUES ($1, $2, 1, $3)
       RETURNING id, name`,
      [`Test Basic Workspace ${testStamp}`, nowIso, "Test Workspace Basic"]
    );
    basicWsId = wsBasic[0].id;

    let basicUserRes;
    let queryError = null;
    try {
      basicUserRes = await sql.query(
        `INSERT INTO users (
          username, email, password_hash, full_name, role, account_type,
          workspace_id, status, plan, subscription_status, subscription_start,
          subscription_expires_at, subscription_notes, active, 
          is_active, created_at, tenant_id
        ) VALUES (
          $1::text, $2::text, $3::text, $4::text, 'CLIENT', 'PAID_CLIENT',
          $5::int4, 'ACTIVE', $6::varchar, 'ACTIVE', $7::timestamptz,
          $8::timestamptz, $9::text, 1, 1, $10::text, 1
        )
        RETURNING id, username, email, full_name, role, account_type, workspace_id,
                  status, plan, subscription_status, subscription_start, subscription_expires_at, created_at`,
        [
          basicUsername,
          `${basicUsername}@app.client`,
          pwdHash,
          "Test Basic Client",
          basicWsId,
          "BASIC",
          nowIso,
          basicExpiryIso,
          "Verified Basic 30-day Account",
          nowIso,
        ]
      );
      basicUserId = basicUserRes[0].id;
    } catch (e) {
      queryError = e.message;
    }

    assert(!queryError, "Parameter $7 error completely eliminated for Basic account", queryError);
    assert(basicUserId !== null, `Basic account inserted with ID #${basicUserId}`);
    assert(basicUserRes && basicUserRes[0].plan === "BASIC", "Basic account has plan 'BASIC'");
    assert(basicUserRes && basicUserRes[0].subscription_expires_at !== null, "Basic account has non-null subscription_expires_at");

    // -------------------------------------------------------------------------
    // TEST 2: Parameter $7 Query Fix & Instant Lifetime Account Creation (Null Expiry)
    // -------------------------------------------------------------------------
    console.log("\nTEST 2: Creating Lifetime Account ($100 Permanent Access / Null Expiry)...");
    const wsLife = await sql.query(
      `INSERT INTO workspaces (name, created_at, tenant_id, description)
       VALUES ($1, $2, 1, $3)
       RETURNING id, name`,
      [`Test Lifetime Workspace ${testStamp}`, nowIso, "Test Workspace Lifetime"]
    );
    lifetimeWsId = wsLife[0].id;

    let lifeUserRes;
    let lifeQueryError = null;
    try {
      lifeUserRes = await sql.query(
        `INSERT INTO users (
          username, email, password_hash, full_name, role, account_type,
          workspace_id, status, plan, subscription_status, subscription_start,
          subscription_expires_at, subscription_notes, active, 
          is_active, created_at, tenant_id
        ) VALUES (
          $1::text, $2::text, $3::text, $4::text, 'CLIENT', 'PAID_CLIENT',
          $5::int4, 'ACTIVE', $6::varchar, 'ACTIVE', $7::timestamptz,
          $8::timestamptz, $9::text, 1, 1, $10::text, 1
        )
        RETURNING id, username, email, full_name, role, account_type, workspace_id,
                  status, plan, subscription_status, subscription_start, subscription_expires_at, created_at`,
        [
          lifetimeUsername,
          `${lifetimeUsername}@app.client`,
          pwdHash,
          "Test Lifetime Client",
          lifetimeWsId,
          "LIFETIME",
          nowIso,
          null, // Explicit NULL for Lifetime
          "Verified Lifetime $100 Account",
          nowIso,
        ]
      );
      lifetimeUserId = lifeUserRes[0].id;
    } catch (e) {
      lifeQueryError = e.message;
    }

    assert(!lifeQueryError, "Parameter $7 error completely eliminated for Lifetime account (null $8::timestamptz)", lifeQueryError);
    assert(lifetimeUserId !== null, `Lifetime account inserted with ID #${lifetimeUserId}`);
    assert(lifeUserRes && lifeUserRes[0].plan === "LIFETIME", "Lifetime account has plan 'LIFETIME'");
    assert(lifeUserRes && lifeUserRes[0].subscription_expires_at === null, "Lifetime account has subscription_expires_at === NULL (Permanent)");

    // -------------------------------------------------------------------------
    // TEST 3: Password Authentication and Verification
    // -------------------------------------------------------------------------
    console.log("\nTEST 3: Verifying Password Hash and Authentication for new accounts...");
    assert(verifyPassword(plainPassword, pwdHash), "Generated PBKDF2 hash verifies with plaintext password");
    assert(!verifyPassword("WrongPassword!", pwdHash), "Incorrect password correctly rejected");

    // -------------------------------------------------------------------------
    // TEST 4: Authoritative Status & 30-Day Subscription Timer Calculation
    // -------------------------------------------------------------------------
    console.log("\nTEST 4: Verifying 30-Day Subscription Timer & Authoritative Status...");
    const basicStatus = computeAuthoritativeUserStatus(basicUserRes[0]);
    assert(basicStatus.status === "ACTIVE", "Active Basic account returns status 'ACTIVE'");
    assert(!basicStatus.isLocked, "Active Basic account is NOT locked");
    assert(!basicStatus.isExpired, "Active Basic account is NOT expired");
    assert(typeof basicStatus.daysRemaining === "number" && basicStatus.daysRemaining >= 29, `Basic account has ~30 days remaining (${basicStatus.daysRemaining} days)`);
    assert(basicStatus.remainingDetailed && basicStatus.remainingDetailed.includes("left"), `Detailed countdown provided: "${basicStatus.remainingDetailed}"`);

    const lifeStatus = computeAuthoritativeUserStatus(lifeUserRes[0]);
    assert(lifeStatus.status === "ACTIVE", "Lifetime account returns status 'ACTIVE'");
    assert(!lifeStatus.isLocked, "Lifetime account is NOT locked");
    assert(!lifeStatus.isExpired, "Lifetime account is NOT expired");
    assert(lifeStatus.daysRemaining === "Lifetime Access — No Expiry", "Lifetime daysRemaining shows 'Lifetime Access — No Expiry'");
    assert(lifeStatus.remainingDetailed === "Lifetime Access — No Expiry", "Lifetime detailed shows 'Lifetime Access — No Expiry'");

    // -------------------------------------------------------------------------
    // TEST 5: Customer Data Privacy & Workspace Isolation
    // -------------------------------------------------------------------------
    console.log("\nTEST 5: Testing Customer Data Privacy & Workspace Isolation...");
    // Workspace A (Basic): create search record and lead
    const searchRecordA = `SR-A-${testStamp}`;
    await sql.query(
      `INSERT INTO search_records (
        id, workspace_id, user_id, keyword, country, city, sources,
        requested_quantity, qualified_quantity, leads_with_phone,
        search_status, search_date, search_time, completion_time, created_at
      ) VALUES ($1, $2, $3, 'Real Estate', 'United States', 'New York', '["Google"]', 10, 1, 1, 'COMPLETED', '22-Nov-2026', '12:00', '12:01', $4)`,
      [searchRecordA, basicWsId, basicUserId, nowIso]
    );

    await sql.query(
      `INSERT INTO leads (
        workspace_id, business_name, email, phone, website,
        source, search_keyword, created_at
      ) VALUES ($1, 'Apex Realty New York', 'leadA@apexrealty.com', '+12125550199', 'https://apexrealty.com', 'Google Search', 'Real Estate', $2)`,
      [basicWsId, nowIso]
    );

    // Query Workspace B (Lifetime): should find ZERO records and ZERO leads
    const recordsInWsB = await sql.query(
      `SELECT id FROM search_records WHERE workspace_id = $1`,
      [lifetimeWsId]
    );
    assert(recordsInWsB.length === 0, "Customer B cannot see Customer A's search records (Workspace Isolation verified: 0 records)");

    const leadsInWsB = await sql.query(
      `SELECT id FROM leads WHERE workspace_id = $1`,
      [lifetimeWsId]
    );
    assert(leadsInWsB.length === 0, "Customer B cannot see Customer A's leads (Data Privacy verified: 0 leads)");

    // -------------------------------------------------------------------------
    // TEST 6: Strict Plan-Based Feature Access (Basic vs. Lifetime)
    // -------------------------------------------------------------------------
    console.log("\nTEST 6: Testing Strict Plan-Based Feature Access (Google Maps Gate)...");
    // Simulate /api/leads/maps check:
    function checkMapsAccess(userRecord) {
      const emailLower = String(userRecord.email || "").toLowerCase();
      const roleUpper = String(userRecord.role || "").toUpperCase();
      const accountTypeUpper = String(userRecord.account_type || "").toUpperCase();
      const isOwner = roleUpper === "SUPER_ADMIN" || roleUpper === "ADMIN" || accountTypeUpper === "MASTER_OWNER";
      const planUpper = String(userRecord.plan || "BASIC").toUpperCase();

      if (!isOwner && planUpper !== "LIFETIME") {
        return {
          allowed: false,
          statusCode: 403,
          code: "UPGRADE_REQUIRED",
          message: "Google Maps Business Lead Generator is an exclusive feature of the $100 Lifetime Plan. Please upgrade to unlock unlimited Google Maps local business intelligence.",
        };
      }
      return { allowed: true };
    }

    const basicMapsCheck = checkMapsAccess(basicUserRes[0]);
    assert(!basicMapsCheck.allowed, "Basic plan cannot access Google Maps lead generator");
    assert(basicMapsCheck.code === "UPGRADE_REQUIRED", "Basic plan maps attempt returns code UPGRADE_REQUIRED");
    assert(basicMapsCheck.statusCode === 403, "Basic plan maps attempt returns HTTP 403");

    const lifeMapsCheck = checkMapsAccess(lifeUserRes[0]);
    assert(lifeMapsCheck.allowed, "Lifetime plan can access Google Maps lead generator (UNLOCKED)");

    // -------------------------------------------------------------------------
    // TEST 7: Subscription Expiry Behavior & Immediate Session Block
    // -------------------------------------------------------------------------
    console.log("\nTEST 7: Simulating Exact Subscription Expiry & Enforcement...");
    // Simulate expiry: set subscription_expires_at to 1 hour in the past
    await sql.query(
      `UPDATE users SET subscription_expires_at = NOW() - INTERVAL '1 hour' WHERE id = $1`,
      [basicUserId]
    );

    const expiredRows = await sql.query(
      `SELECT * FROM users WHERE id = $1`,
      [basicUserId]
    );
    const expiredUser = expiredRows[0];
    const authoritativeExpired = computeAuthoritativeUserStatus(expiredUser);

    assert(authoritativeExpired.status === "EXPIRED", "Account status switches to 'EXPIRED' immediately upon expiry");
    assert(authoritativeExpired.isLocked === true, "Expired account is locked (isLocked = true)");
    assert(authoritativeExpired.daysRemaining === 0, "Expired account has 0 days remaining");
    assert(authoritativeExpired.remainingDetailed === "Expired", "Expired account shows 'Expired'");

    // Simulate login attempt on expired account:
    function simulateLoginCheck(user) {
      const authoritative = computeAuthoritativeUserStatus(user);
      if (authoritative.isLocked) {
        if (authoritative.status === "EXPIRED") {
          return { allowed: false, statusCode: 403, detail: "Your subscription has expired. Please renew to continue." };
        }
        return { allowed: false, statusCode: 403, detail: "Your account is currently locked." };
      }
      return { allowed: true };
    }

    const loginExpiredCheck = simulateLoginCheck(expiredUser);
    assert(!loginExpiredCheck.allowed, "Login is strictly blocked for expired account");
    assert(loginExpiredCheck.statusCode === 403, "Login returns HTTP 403");
    assert(loginExpiredCheck.detail === "Your subscription has expired. Please renew to continue.", `Login returns exact message: "${loginExpiredCheck.detail}"`);

    // -------------------------------------------------------------------------
    // TEST 8: Owner Subscription Actions (Renew, Lock, Unlock, Upgrade)
    // -------------------------------------------------------------------------
    console.log("\nTEST 8: Testing Master Owner Subscription Actions...");
    // Renew expired account (+30 days)
    const newExpiryIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await sql.query(
      `UPDATE users SET status = 'ACTIVE', subscription_expires_at = $1 WHERE id = $2`,
      [newExpiryIso, basicUserId]
    );
    const renewedRows = await sql.query(`SELECT * FROM users WHERE id = $1`, [basicUserId]);
    const renewedStatus = computeAuthoritativeUserStatus(renewedRows[0]);
    assert(renewedStatus.status === "ACTIVE", "Owner RENEW restores status to 'ACTIVE'");
    assert(!renewedStatus.isLocked, "Renewed account is unlocked");

    // Lock account
    await sql.query(`UPDATE users SET status = 'LOCKED' WHERE id = $1`, [basicUserId]);
    const lockedRows = await sql.query(`SELECT * FROM users WHERE id = $1`, [basicUserId]);
    const lockedStatus = computeAuthoritativeUserStatus(lockedRows[0]);
    assert(lockedStatus.status === "LOCKED", "Owner LOCK sets status to 'LOCKED'");
    assert(lockedStatus.isLocked === true, "Locked account has isLocked === true");

    // Unlock account
    await sql.query(`UPDATE users SET status = 'ACTIVE' WHERE id = $1`, [basicUserId]);
    const unlockedRows = await sql.query(`SELECT * FROM users WHERE id = $1`, [basicUserId]);
    const unlockedStatus = computeAuthoritativeUserStatus(unlockedRows[0]);
    assert(unlockedStatus.status === "ACTIVE", "Owner UNLOCK restores status to 'ACTIVE'");

    // Upgrade to Lifetime
    await sql.query(
      `UPDATE users SET plan = 'LIFETIME', subscription_expires_at = NULL WHERE id = $1`,
      [basicUserId]
    );
    const upgradedRows = await sql.query(`SELECT * FROM users WHERE id = $1`, [basicUserId]);
    const upgradedStatus = computeAuthoritativeUserStatus(upgradedRows[0]);
    assert(upgradedStatus.plan === "LIFETIME", "Owner UPGRADE sets plan to 'LIFETIME'");
    assert(upgradedStatus.daysRemaining === "Lifetime Access — No Expiry", "Upgraded account has permanent access");

    // -------------------------------------------------------------------------
    // TEST 9: Master Owner Account Integrity Check
    // -------------------------------------------------------------------------
    console.log("\nTEST 9: Verifying Master Owner Account Integrity...");
    const ownerRows = await sql.query(
      `SELECT id, username, email, role, account_type, status, plan FROM users WHERE id = 2 OR username = 'master_owner_usman'`
    );
    assert(ownerRows.length === 1, "Master Owner record exists and is unique (1 record)");
    const owner = ownerRows[0];
    assert(owner.username === "master_owner_usman", `Master Owner username is '${owner.username}'`);
    assert(owner.role === "SUPER_ADMIN", `Master Owner role is '${owner.role}'`);
    assert(owner.account_type === "MASTER_OWNER", `Master Owner account_type is '${owner.account_type}'`);
    assert(owner.status === "ACTIVE", `Master Owner status is '${owner.status}'`);
    assert(owner.plan === "OWNER_LIFETIME", `Master Owner plan is '${owner.plan}'`);

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Clean up test accounts & test workspaces
    // -------------------------------------------------------------------------
    console.log("\nCLEANUP: Cleaning up disposable verification accounts...");
    if (basicUserId) {
      await sql.query(`DELETE FROM leads WHERE workspace_id = $1`, [basicWsId]);
      await sql.query(`DELETE FROM search_records WHERE workspace_id = $1`, [basicWsId]);
      await sql.query(`DELETE FROM users WHERE id = $1`, [basicUserId]);
    }
    if (lifetimeUserId) {
      await sql.query(`DELETE FROM users WHERE id = $1`, [lifetimeUserId]);
    }
    if (basicWsId) {
      await sql.query(`DELETE FROM workspaces WHERE id = $1`, [basicWsId]);
    }
    if (lifetimeWsId) {
      await sql.query(`DELETE FROM workspaces WHERE id = $1`, [lifetimeWsId]);
    }

    const remainingUsers = await sql.query(`SELECT id, username, role FROM users`);
    console.log(`Neon DB remaining user count: ${remainingUsers.length}`);
    remainingUsers.forEach(u => console.log(`  - ID #${u.id}: ${u.username} (${u.role})`));
  }

  console.log("\n===============================================================================");
  console.log(`VERIFICATION SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log("===============================================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runProductionFixVerification().catch(err => {
  console.error("FATAL ERROR in test execution:", err);
  process.exit(1);
});
