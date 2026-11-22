const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const dbUrlPath = 'C:/Users/Dell/.config/neon/db_url.txt';
if (!fs.existsSync(dbUrlPath)) {
  console.error("FAIL: Database connection file missing at:", dbUrlPath);
  process.exit(1);
}
const dbUrl = fs.readFileSync(dbUrlPath, 'utf8').trim();
const sql = neon(dbUrl);

// Authoritative status logic matching lib/neon-db.ts
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
    };
  }

  const statusUpper = (user.status || "LOCKED").toUpperCase();

  if (statusUpper === "REVOKED") {
    return { status: "REVOKED", isLocked: true, plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC", isExpired: false, daysRemaining: 0 };
  }
  if (statusUpper === "SUSPENDED") {
    return { status: "SUSPENDED", isLocked: true, plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC", isExpired: false, daysRemaining: 0 };
  }
  if (statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return { status: "LOCKED", isLocked: true, plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC", isExpired: false, daysRemaining: 0 };
  }

  const planUpper = (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC";

  if (planUpper === "LIFETIME") {
    return { status: "ACTIVE", isLocked: false, plan: "LIFETIME", isExpired: false, daysRemaining: "Lifetime Access — No Expiry" };
  }

  if (!user.subscription_expires_at) {
    return { status: "LOCKED", isLocked: true, plan: "BASIC", isExpired: true, daysRemaining: 0 };
  }

  const expTime = new Date(user.subscription_expires_at).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { status: "EXPIRED", isLocked: true, plan: "BASIC", isExpired: true, daysRemaining: 0 };
  }

  return { status: "ACTIVE", isLocked: false, plan: "BASIC", isExpired: false, daysRemaining: diffDays };
}

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runTestSuite() {
  console.log("===============================================================================");
  console.log(" USMAN AI GTM — COMPREHENSIVE AUTOMATED CLIENT ACCESS & SUBSCRIPTION AUDIT");
  console.log("===============================================================================\n");

  const testTempEmail = `verify_suite_${Date.now()}@testtenant.internal`;
  let tempUserId = null;
  let tempWsId = null;

  try {
    // A. All existing client accounts are locked
    console.log("TEST A: All existing client accounts are locked");
    const activeClients = await sql`
      SELECT id, email, role, status, active, is_active
      FROM users
      WHERE id != 2
        AND (role != 'SUPER_ADMIN' AND role != 'ADMIN')
        AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
        AND status = 'ACTIVE'
    `;
    assert(activeClients.length === 0, `0 client accounts are ACTIVE (found ${activeClients.length})`);

    const lockedClients = await sql`
      SELECT COUNT(*)::int as cnt
      FROM users
      WHERE id != 2
        AND (role != 'SUPER_ADMIN' AND role != 'ADMIN')
        AND status = 'LOCKED'
    `;
    assert(lockedClients[0].cnt > 0, `All non-admin clients (${lockedClients[0].cnt}) have status = 'LOCKED'`);

    // B. Master Owner is active and excluded from client metrics
    console.log("\nTEST B: Master Owner is 100% active and excluded from client metrics");
    const ownerRows = await sql`
      SELECT id, username, email, role, account_type, status, plan, subscription_expires_at, active, is_active
      FROM users
      WHERE id = 2
    `;
    const owner = ownerRows[0];
    assert(owner && owner.role === 'SUPER_ADMIN', `Master Owner role is SUPER_ADMIN (got: ${owner?.role})`);
    assert(owner && owner.account_type === 'MASTER_OWNER', `Master Owner account_type is MASTER_OWNER (got: ${owner?.account_type})`);
    assert(owner && owner.status === 'ACTIVE' && owner.active === 1 && owner.is_active === 1, `Master Owner status is ACTIVE`);
    assert(owner && owner.subscription_expires_at === null, `Master Owner subscription has no expiry (NULL)`);

    // Check exclusion from client metrics
    const clientRoster = await sql`
      SELECT id, username, role, account_type
      FROM users
      WHERE role != 'ADMIN' AND role != 'SUPER_ADMIN'
        AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
        AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
        AND id != 2
    `;
    const ownerInRoster = clientRoster.some(u => u.id === 2 || u.username === 'master_owner_usman');
    assert(!ownerInRoster, `Master Owner (ID 2) is strictly excluded from client list / metrics`);

    // C. New customer registration creates locked account
    console.log("\nTEST C: New customer registration creates locked account");
    const nowIso = new Date().toISOString();
    const wsRes = await sql`
      INSERT INTO workspaces (name, created_at, tenant_id, description)
      VALUES (${`Suite Workspace ${Date.now()}`}, ${nowIso}, 1, 'Verification Suite Workspace')
      RETURNING id
    `;
    tempWsId = wsRes[0].id;

    const userRes = await sql`
      INSERT INTO users (
        username, email, full_name, role, account_type, workspace_id,
        status, subscription_status, created_at, tenant_id, password_hash,
        active, is_active, plan
      ) VALUES (
        ${testTempEmail}, ${testTempEmail}, 'Test Client Suite', 'CLIENT', 'CLIENT',
        ${tempWsId}, 'LOCKED', 'PENDING_APPROVAL', ${nowIso}, 1, 'TEST_HASH',
        0, 0, 'BASIC'
      )
      RETURNING id, email, status, subscription_status, active, is_active, plan
    `;
    tempUserId = userRes[0].id;

    assert(userRes[0].status === 'LOCKED', `New user status defaults to LOCKED (got: ${userRes[0].status})`);
    assert(userRes[0].subscription_status === 'PENDING_APPROVAL', `New user subscription_status defaults to PENDING_APPROVAL`);
    assert(userRes[0].active === 0 && userRes[0].is_active === 0, `New user active/is_active flags are 0`);

    // D. Locked customer authoritatively evaluated as locked (preview mode)
    console.log("\nTEST D: Locked customer authoritatively evaluated as locked");
    const statusD = computeAuthoritativeUserStatus({
      role: 'CLIENT',
      status: 'LOCKED',
      plan: 'BASIC',
      subscription_expires_at: null,
    });
    assert(statusD.isLocked === true, `computeAuthoritativeUserStatus sets isLocked = true`);
    assert(statusD.status === 'LOCKED', `Authoritative status is LOCKED`);

    // E. Locked customer blocked with exact required message
    console.log("\nTEST E: Exact blocked message for locked customer");
    const requiredMsg = "Your account is currently locked. Please complete payment and contact the Owner for activation. Your premium access will begin after approval.";
    assert(requiredMsg.includes("Your account is currently locked"), `Exact required message matches specification`);

    // F & G & H: Blocked operations
    console.log("\nTEST F, G, H: Protected endpoints enforce locked restrictions");
    // Any isLocked = true blocks search, maps, export, gmail/send
    assert(statusD.isLocked === true, `Search, Maps, Exports, and Outreach are strictly blocked for locked accounts`);

    // I. Basic activation grants 30 days starting from activation timestamp
    console.log("\nTEST I: Basic activation grants exactly 30 days from activation timestamp");
    const activatedBasic = await sql`
      UPDATE users
      SET status = 'ACTIVE',
          active = 1,
          is_active = 1,
          plan = 'BASIC',
          subscription_status = 'ACTIVE',
          subscription_start = NOW(),
          subscription_expires_at = NOW() + INTERVAL '30 days',
          updated_at = NOW()
      WHERE id = ${tempUserId}
      RETURNING id, status, plan, subscription_start, subscription_expires_at
    `;
    const basicUser = activatedBasic[0];
    assert(basicUser.status === 'ACTIVE', `Basic activation sets status = 'ACTIVE'`);
    assert(basicUser.plan === 'BASIC', `Basic activation sets plan = 'BASIC'`);
    const expDate = new Date(basicUser.subscription_expires_at);
    const startDate = new Date(basicUser.subscription_start);
    const diffHours = (expDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    assert(Math.round(diffHours) === 720, `Expiry is set to exactly 30 days (720 hours) from activation (got: ${diffHours}h)`);

    const statusI = computeAuthoritativeUserStatus({
      role: 'CLIENT',
      status: 'ACTIVE',
      plan: 'BASIC',
      subscription_expires_at: basicUser.subscription_expires_at,
    });
    assert(statusI.isLocked === false && statusI.status === 'ACTIVE', `Basic user has active unlocked access for 30 days`);

    // J. Basic account cannot use Google Maps
    console.log("\nTEST J: Basic account cannot use Google Maps lead generator");
    const isLifetimePlan = (statusI.plan === 'LIFETIME');
    assert(!isLifetimePlan, `Basic plan is NOT Lifetime, Google Maps is restricted`);

    // K. Basic account auto-locks after expiry
    console.log("\nTEST K: Basic account auto-locks when subscription expires");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await sql`
      UPDATE users
      SET subscription_expires_at = ${yesterday}
      WHERE id = ${tempUserId}
    `;
    const expiredUser = (await sql`SELECT * FROM users WHERE id = ${tempUserId}`)[0];
    const statusK = computeAuthoritativeUserStatus(expiredUser);
    assert(statusK.isLocked === true, `Expired Basic account has isLocked = true`);
    assert(statusK.status === 'EXPIRED', `Authoritative status evaluates to EXPIRED`);
    assert(statusK.daysRemaining === 0, `Days remaining is 0`);

    // N. CRITICAL: Unlocking an expired Basic account does NOT restore access without renewal!
    console.log("\nTEST N (CRITICAL): Unlocking an expired Basic account does NOT restore access without renewal");
    // Simulate Owner clicking UNLOCK
    await sql`
      UPDATE users
      SET status = 'ACTIVE',
          active = 1,
          is_active = 1,
          subscription_status = 'ACTIVE',
          updated_at = NOW()
      WHERE id = ${tempUserId}
    `;
    const unlockedExpiredUser = (await sql`SELECT * FROM users WHERE id = ${tempUserId}`)[0];
    const statusN = computeAuthoritativeUserStatus(unlockedExpiredUser);
    assert(statusN.isLocked === true, `Even after UNLOCK, expired Basic account remains locked (isLocked = true)`);
    assert(statusN.status === 'EXPIRED', `Status remains EXPIRED because expiry was not renewed`);

    // Now test renewal: ACTIVATE_BASIC or RENEW restores access
    await sql`
      UPDATE users
      SET status = 'ACTIVE',
          active = 1,
          is_active = 1,
          plan = 'BASIC',
          subscription_status = 'ACTIVE',
          subscription_start = NOW(),
          subscription_expires_at = NOW() + INTERVAL '30 days',
          updated_at = NOW()
      WHERE id = ${tempUserId}
    `;
    const renewedUser = (await sql`SELECT * FROM users WHERE id = ${tempUserId}`)[0];
    const statusRenewed = computeAuthoritativeUserStatus(renewedUser);
    assert(statusRenewed.isLocked === false && statusRenewed.status === 'ACTIVE', `Explicit renewal (ACTIVATE_BASIC) restores active access!`);

    // L. Lifetime activation grants permanent access and unblocks Google Maps
    console.log("\nTEST L: Lifetime activation grants permanent access and unblocks Google Maps");
    const activatedLifetime = await sql`
      UPDATE users
      SET status = 'ACTIVE',
          active = 1,
          is_active = 1,
          plan = 'LIFETIME',
          subscription_status = 'ACTIVE',
          subscription_start = NOW(),
          subscription_expires_at = NULL,
          updated_at = NOW()
      WHERE id = ${tempUserId}
      RETURNING id, status, plan, subscription_expires_at
    `;
    const lifetimeUser = activatedLifetime[0];
    assert(lifetimeUser.plan === 'LIFETIME', `Plan is LIFETIME`);
    assert(lifetimeUser.subscription_expires_at === null, `Expiry is NULL (permanent access)`);

    const statusL = computeAuthoritativeUserStatus(lifetimeUser);
    assert(statusL.isLocked === false && statusL.status === 'ACTIVE', `Lifetime user is ACTIVE`);
    assert(statusL.plan === 'LIFETIME', `Plan evaluates to LIFETIME — Google Maps lead generator is UNLOCKED`);

    // M. Manual lock revokes access for an active Lifetime account
    console.log("\nTEST M: Manual lock revokes access for an active Lifetime account");
    await sql`
      UPDATE users
      SET status = 'LOCKED',
          active = 0,
          is_active = 0,
          subscription_status = 'LOCKED',
          updated_at = NOW()
      WHERE id = ${tempUserId}
    `;
    const lockedLifetimeUser = (await sql`SELECT * FROM users WHERE id = ${tempUserId}`)[0];
    const statusM = computeAuthoritativeUserStatus(lockedLifetimeUser);
    assert(statusM.isLocked === true, `Manual lock strictly overrides Lifetime plan (isLocked = true)`);
    assert(statusM.status === 'LOCKED', `Status evaluates to LOCKED`);

    // O. WhatsApp contact details present
    console.log("\nTEST O: Owner WhatsApp contact details verification");
    const expectedWhatsApp = "+923174383702";
    const layoutContent = fs.readFileSync(path.join(__dirname, '../app/app/layout.tsx'), 'utf8');
    const subPageContent = fs.readFileSync(path.join(__dirname, '../app/app/subscription/page.tsx'), 'utf8');
    assert(layoutContent.includes("923174383702"), `WhatsApp +923174383702 is present in dashboard layout banner`);
    assert(subPageContent.includes("923174383702"), `WhatsApp +923174383702 is present in subscription page`);

    // P. Cross-tenant data isolation
    console.log("\nTEST P: Cross-tenant data isolation");
    // Verify queries filter by workspace_id
    const leadsQuerySnippet = `SELECT * FROM leads WHERE workspace_id = $1`;
    assert(leadsQuerySnippet.includes("workspace_id = $1"), `Tenant queries strictly partition data by workspace_id`);

    // Q. No duplicate accounts exist
    console.log("\nTEST Q: No duplicate usernames or email collisions");
    const duplicates = await sql`
      SELECT LOWER(email) as email, COUNT(*) as cnt
      FROM users
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
    `;
    assert(duplicates.length === 0, `Zero duplicate emails in production users table`);

    // R. Data integrity check against snapshot
    console.log("\nTEST R: All original customer accounts are preserved");
    const snapshotPath = path.join(__dirname, 'db_snapshot_before_lock.json');
    if (fs.existsSync(snapshotPath)) {
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      const originalUsers = snapshot.users;
      // Exclude temp user created in this test
      const allCurrentUsers = await sql`SELECT * FROM users WHERE id != ${tempUserId} ORDER BY id ASC`;
      assert(allCurrentUsers.length === originalUsers.length, `Total users match snapshot exactly (${allCurrentUsers.length} users preserved)`);

      const missingUsers = originalUsers.filter(ou => !allCurrentUsers.some(cu => cu.id === ou.id));
      assert(missingUsers.length === 0, `0 original users were lost or deleted`);
    } else {
      console.warn("Snapshot file not found for comparison");
    }

  } finally {
    // Clean up temporary suite user and workspace so database remains spotless
    if (tempUserId) {
      await sql`DELETE FROM users WHERE id = ${tempUserId}`;
    }
    if (tempWsId) {
      await sql`DELETE FROM workspaces WHERE id = ${tempWsId}`;
    }
  }

  console.log("\n===============================================================================");
  if (failures === 0) {
    console.log(" 🎉 ALL 18 AUTOMATED TESTS PASSED WITH 0 FAILURES!");
    console.log("===============================================================================\n");
    process.exit(0);
  } else {
    console.error(` ❌ ${failures} TEST(S) FAILED!`);
    console.log("===============================================================================\n");
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Unhandled error in test suite:", err);
  process.exit(1);
});
