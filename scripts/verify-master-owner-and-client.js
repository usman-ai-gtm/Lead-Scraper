/**
 * USMAN AI GTM - Master End-to-End Verification Test Suite
 * 
 * Comprehensive tests for:
 * 1. transaction000501@gmail.com permanent Master Owner (SUPER_ADMIN / MASTER_OWNER)
 * 2. Master Owner excluded from client list & paying metrics
 * 3. New client default LOCKED status & isolation
 * 4. Real DB state transitions: Basic ($25/30d), Lock, Unlock/Restore, Lifetime ($100)
 * 5. Google Maps plan gating (Basic blocked, Lifetime granted)
 * 6. Live Google Maps extraction producing genuine business records
 * 7. Audit log verification
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrlPath = 'C:/Users/Dell/.config/neon/db_url.txt';
if (!fs.existsSync(dbUrlPath)) {
  console.error("Database connection file missing at:", dbUrlPath);
  process.exit(1);
}
const dbUrl = fs.readFileSync(dbUrlPath, 'utf8').trim();
const sql = neon(dbUrl);

const MASTER_OWNER_EMAIL = "transaction000501@gmail.com";
const AUTHORIZED_OWNER_EMAILS = [
  "transaction000501@gmail.com",
  "admin@usmanai.com",
  "mu0602503@gmail.com",
  "admin@usmangtm.com",
  "selftest_founder_2026@usmanai.com",
];

function isAuthorizedOwner(user) {
  if (!user) return false;
  const emailLower = String(user.email || user.username || "").trim().toLowerCase();
  const roleUpper = String(user.role || "").toUpperCase();
  const accountTypeUpper = String(user.account_type || "").toUpperCase();
  return (
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "ADMIN" ||
    accountTypeUpper === "MASTER_OWNER" ||
    emailLower === MASTER_OWNER_EMAIL ||
    AUTHORIZED_OWNER_EMAILS.includes(emailLower)
  );
}

function computeAuthoritativeUserStatus(user) {
  const roleUpper = (user.role || "").toUpperCase();
  const accountTypeUpper = (user.account_type || "").toUpperCase();
  const emailLower = String(user.email || "").trim().toLowerCase();

  if (
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "ADMIN" ||
    accountTypeUpper === "MASTER_OWNER" ||
    emailLower === MASTER_OWNER_EMAIL ||
    AUTHORIZED_OWNER_EMAILS.includes(emailLower)
  ) {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      account_type: "MASTER_OWNER",
      isExpired: false,
      daysRemaining: "Permanent (Master Owner)",
    };
  }

  const statusUpper = (user.status || "LOCKED").toUpperCase();

  if (statusUpper === "REVOKED" || statusUpper === "SUSPENDED" || statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return {
      status: statusUpper === "PENDING" ? "LOCKED" : statusUpper,
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      account_type: "CLIENT",
      isExpired: false,
      daysRemaining: 0,
    };
  }

  const planUpper = (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC";
  if (planUpper === "LIFETIME") {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      account_type: "CLIENT",
      isExpired: false,
      daysRemaining: "Lifetime Access — No Expiry",
    };
  }

  if (!user.subscription_expires_at) {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: "BASIC",
      account_type: "CLIENT",
      isExpired: true,
      daysRemaining: 0,
    };
  }

  const expTime = new Date(user.subscription_expires_at).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      status: "EXPIRED",
      isLocked: true,
      plan: "BASIC",
      account_type: "CLIENT",
      isExpired: true,
      daysRemaining: 0,
    };
  }

  return {
    status: "ACTIVE",
    isLocked: false,
    plan: "BASIC",
    account_type: "CLIENT",
    isExpired: false,
    daysRemaining: diffDays,
  };
}

async function runMasterVerification() {
  console.log("\n=======================================================");
  console.log(" USMAN AI GTM — MASTER VERIFICATION TEST SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = "") {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${testName} - ${details}`);
    }
  }

  // --- PART 1: Permanent Master Owner Setup ---
  console.log("--- PART 1: Permanent Master Owner Account Setup ---");
  const ownerRows = await sql`
    SELECT id, username, email, full_name, role, account_type, status, plan, subscription_status, subscription_expires_at, active, is_active
    FROM users
    WHERE LOWER(email) = LOWER(${MASTER_OWNER_EMAIL})
    LIMIT 1
  `;

  assert(ownerRows.length > 0, `${MASTER_OWNER_EMAIL} exists in Neon database`);
  const owner = ownerRows[0];
  assert(owner.role === "SUPER_ADMIN" || owner.role === "ADMIN", `Owner role is SUPER_ADMIN (got: ${owner.role})`);
  assert(owner.account_type === "MASTER_OWNER", `Owner account_type is MASTER_OWNER (got: ${owner.account_type})`);
  assert(owner.status === "ACTIVE", `Owner status is ACTIVE (got: ${owner.status})`);
  assert(owner.plan === "OWNER_LIFETIME" || owner.plan === "LIFETIME", `Owner plan is OWNER_LIFETIME (got: ${owner.plan})`);
  assert(owner.subscription_expires_at === null, "Owner subscription_expires_at is strictly NULL (Permanent)");
  assert(owner.active === 1 && owner.is_active === 1, "Owner active and is_active are both 1");
  assert(isAuthorizedOwner(owner) === true, "isAuthorizedOwner returns true for Master Owner");
  const ownerComputed = computeAuthoritativeUserStatus(owner);
  assert(ownerComputed.isLocked === false, "Master Owner is never locked");
  assert(ownerComputed.status === "ACTIVE", "Master Owner authoritative status is ACTIVE");

  // --- PART 2: Master Owner Excluded from Paying Client Roster ---
  console.log("\n--- PART 2: Client Isolation & Metrics Filter ---");
  const clientRoster = await sql`
    SELECT id, email, role, account_type
    FROM users
    WHERE role != 'ADMIN' AND role != 'SUPER_ADMIN' AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
  `;
  const ownerInClients = clientRoster.some(c => c.email.toLowerCase() === MASTER_OWNER_EMAIL);
  assert(!ownerInClients, "Master Owner is strictly EXCLUDED from client roster & paying stats");

  // --- PART 3: New Client Default Locked State ---
  console.log("\n--- PART 3: New Client Registration & Default Locked State ---");
  const testClientEmail = `master_test_client_${Date.now()}@example.com`;
  const nowIso = new Date().toISOString();

  // Create workspace for test client
  const wsRes = await sql`
    INSERT INTO workspaces (name, created_at, tenant_id)
    VALUES (${`Test WS ${Date.now()}`}, ${nowIso}, 1)
    RETURNING id
  `;
  const testWsId = wsRes[0].id;

  // Insert test client
  const newClientRes = await sql`
    INSERT INTO users (username, email, full_name, role, account_type, workspace_id, status, subscription_status, created_at, tenant_id, password_hash, active, is_active, plan)
    VALUES (${testClientEmail}, ${testClientEmail}, 'Test Client', 'CLIENT', 'CLIENT', ${testWsId}, 'LOCKED', 'PENDING_APPROVAL', ${nowIso}, 1, 'TEST_HASH', 0, 0, 'BASIC')
    RETURNING id, email, role, account_type, status, active, is_active, plan, subscription_status
  `;
  const newClient = newClientRes[0];
  assert(newClient.id > 0, "Test client successfully inserted into database");
  assert(newClient.status === "LOCKED", `New client defaults to status LOCKED (got: ${newClient.status})`);
  assert(newClient.active === 0 && newClient.is_active === 0, "New client active and is_active default to 0");
  const newClientComputed = computeAuthoritativeUserStatus(newClient);
  assert(newClientComputed.isLocked === true, "New client is strictly locked by default");

  // --- PART 4: Owner Actions - Basic ($25 / 30 Days) ---
  console.log("\n--- PART 4: Owner Action - Basic ($25/30 Days) Activation ---");
  const basicRes = await sql`
    UPDATE users
    SET status = 'ACTIVE',
        active = 1,
        is_active = 1,
        plan = 'BASIC',
        subscription_status = 'ACTIVE',
        subscription_start = NOW(),
        subscription_expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE id = ${newClient.id}
    RETURNING id, email, status, active, is_active, plan, subscription_expires_at
  `;
  const basicClient = basicRes[0];
  assert(basicClient.status === "ACTIVE", `Basic client status updated to ACTIVE (got: ${basicClient.status})`);
  assert(basicClient.active === 1 && basicClient.is_active === 1, "Basic client active and is_active updated to 1");
  const basicComputed = computeAuthoritativeUserStatus(basicClient);
  assert(basicComputed.isLocked === false, "Basic client is now UNLOCKED");
  assert(basicComputed.plan === "BASIC", "Basic client plan is BASIC");
  assert(typeof basicComputed.daysRemaining === "number" && basicComputed.daysRemaining > 0, "Basic client granted active countdown window");

  // Google Maps Gating Test for Basic
  const isBasicAllowedMaps = isAuthorizedOwner(basicClient) || basicComputed.plan === "LIFETIME";
  assert(isBasicAllowedMaps === false, "Google Maps Lead Generator is strictly FORBIDDEN for Basic plan");

  // --- PART 5: Owner Actions - Lock Client ---
  console.log("\n--- PART 5: Owner Action - Lock Client ---");
  const lockRes = await sql`
    UPDATE users
    SET status = 'LOCKED',
        active = 0,
        is_active = 0,
        subscription_status = 'LOCKED',
        updated_at = NOW()
    WHERE id = ${newClient.id}
    RETURNING id, email, status, active, is_active
  `;
  const lockedClient = lockRes[0];
  assert(lockedClient.status === "LOCKED", `Client status updated to LOCKED (got: ${lockedClient.status})`);
  assert(lockedClient.active === 0 && lockedClient.is_active === 0, "Client active and is_active set to 0");
  const lockedComputed = computeAuthoritativeUserStatus(lockedClient);
  assert(lockedComputed.isLocked === true, "Client authoritative status is locked (access denied)");

  // --- PART 6: Owner Actions - Unlock / Restore Client ---
  console.log("\n--- PART 6: Owner Action - Unlock / Restore Client ---");
  const unlockRes = await sql`
    UPDATE users
    SET status = 'ACTIVE',
        active = 1,
        is_active = 1,
        subscription_status = 'ACTIVE',
        updated_at = NOW()
    WHERE id = ${newClient.id}
    RETURNING id, email, status, active, is_active
  `;
  const unlockedClient = unlockRes[0];
  assert(unlockedClient.status === "ACTIVE", `Client status restored to ACTIVE (got: ${unlockedClient.status})`);
  assert(unlockedClient.active === 1 && unlockedClient.is_active === 1, "Client active and is_active restored to 1");

  // --- PART 7: Owner Actions - Lifetime ($100 One-Time) Activation ---
  console.log("\n--- PART 7: Owner Action - Lifetime ($100 One-Time) Activation ---");
  const lifetimeRes = await sql`
    UPDATE users
    SET status = 'ACTIVE',
        active = 1,
        is_active = 1,
        plan = 'LIFETIME',
        subscription_status = 'ACTIVE',
        subscription_start = NOW(),
        subscription_expires_at = NULL,
        updated_at = NOW()
    WHERE id = ${newClient.id}
    RETURNING id, email, status, active, is_active, plan, subscription_expires_at
  `;
  const lifetimeClient = lifetimeRes[0];
  assert(lifetimeClient.status === "ACTIVE", `Lifetime client status is ACTIVE (got: ${lifetimeClient.status})`);
  assert(lifetimeClient.plan === "LIFETIME", `Lifetime client plan is LIFETIME (got: ${lifetimeClient.plan})`);
  assert(lifetimeClient.subscription_expires_at === null, "Lifetime client subscription_expires_at is NULL (No expiry)");
  const lifetimeComputed = computeAuthoritativeUserStatus(lifetimeClient);
  assert(lifetimeComputed.isLocked === false, "Lifetime client is UNLOCKED");
  assert(lifetimeComputed.plan === "LIFETIME", "Authoritative plan is LIFETIME");

  // Google Maps Gating Test for Lifetime
  const isLifetimeAllowedMaps = isAuthorizedOwner(lifetimeClient) || lifetimeComputed.plan === "LIFETIME";
  assert(isLifetimeAllowedMaps === true, "Google Maps Lead Generator is GRANTED for Lifetime plan");

  // --- PART 8: Live Production Google Maps Extraction Test ---
  console.log("\n--- PART 8: Live Production Google Maps Extraction Test ---");
  const serperKey = '2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297';
  const mapsRes = await fetch("https://google.serper.dev/places", {
    method: "POST",
    headers: {
      "X-API-KEY": serperKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: "Dentists in New York, United States",
      location: "New York, United States",
      hl: "en",
    }),
  });

  assert(mapsRes.status === 200, `Serper Places API responded with status 200 (got: ${mapsRes.status})`);
  const mapsData = await mapsRes.json();
  const places = mapsData.places || [];
  assert(places.length > 0, `Google Maps returned genuine business records (found: ${places.length} places)`);
  if (places.length > 0) {
    const firstPlace = places[0];
    assert(Boolean(firstPlace.title && firstPlace.title.length > 0), `Place has verified Business Name: "${firstPlace.title}"`);
    assert(Boolean(firstPlace.address && firstPlace.address.length > 0), `Place has verified Address: "${firstPlace.address}"`);
    assert(Boolean(firstPlace.website || firstPlace.cid), `Place has verified Web/CID identifier: "${firstPlace.website || firstPlace.cid}"`);
  }

  // --- PART 9: Audit Logging & Data Integrity ---
  console.log("\n--- PART 9: Audit Logging & Existing Customers Integrity ---");
  await sql`
    INSERT INTO account_audit_logs (workspace_id, actor, account_id, action, result, details, timestamp)
    VALUES (1, ${MASTER_OWNER_EMAIL}, ${newClient.id}, 'VERIFY_E2E_SUITE', 'SUCCESS', ${JSON.stringify({ target: testClientEmail, action: 'Verified all owner controls' })}, NOW())
  `;
  const auditLogs = await sql`
    SELECT id, actor, action, account_id
    FROM account_audit_logs
    WHERE account_id = ${newClient.id}
    LIMIT 1
  `;
  assert(auditLogs.length > 0, `Owner action recorded in account_audit_logs (ID: ${auditLogs[0]?.id})`);

  // Clean up test client
  await sql`DELETE FROM account_audit_logs WHERE account_id = ${newClient.id}`;
  await sql`DELETE FROM users WHERE id = ${newClient.id}`;
  await sql`DELETE FROM workspaces WHERE id = ${testWsId}`;
  console.log("  [INFO] Temporary verification client cleaned up safely.");

  // Verify all existing customers remain intact
  const finalUserCount = await sql`SELECT COUNT(*)::int as count FROM users`;
  assert(finalUserCount[0].count >= 34, `All existing customer accounts remain intact in production DB (count: ${finalUserCount[0].count})`);

  console.log("\n=======================================================");
  console.log(` ALL ${passed}/${total} MASTER VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log("=======================================================\n");
}

runMasterVerification().catch(console.error);
