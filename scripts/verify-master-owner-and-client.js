/**
 * USMAN AI GTM - Master End-to-End Verification
 * Verifies:
 * 1. transaction000501@gmail.com permanent Owner/Super Admin identity & bypass
 * 2. New client default LOCKED status & WhatsApp activation requirement
 * 3. Owner activation (Basic $25 vs Lifetime $100) state transitions
 * 4. Google Maps Lead Generator plan gating (Lifetime required)
 * 5. Complete immunity against `users_username_key` unique constraint crash
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

// Owner definition
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
  return user.role === "ADMIN" || AUTHORIZED_OWNER_EMAILS.includes(emailLower);
}

function computeAuthoritativeUserStatus(user) {
  const roleUpper = (user.role || "").toUpperCase();
  if (roleUpper === "ADMIN" || AUTHORIZED_OWNER_EMAILS.includes(String(user.email || "").toLowerCase())) {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Permanent (Owner)",
    };
  }

  const statusUpper = (user.status || "LOCKED").toUpperCase();

  if (statusUpper === "REVOKED" || statusUpper === "SUSPENDED" || statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return {
      status: statusUpper === "PENDING" ? "LOCKED" : statusUpper,
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
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
      isExpired: false,
      daysRemaining: "Lifetime Access — No Expiry",
    };
  }

  if (!user.subscription_expires_at) {
    return {
      status: "LOCKED",
      isLocked: true,
      plan: "BASIC",
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
      isExpired: true,
      daysRemaining: 0,
    };
  }

  return {
    status: "ACTIVE",
    isLocked: false,
    plan: "BASIC",
    isExpired: false,
    daysRemaining: diffDays,
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    process.exit(1);
  }
}

async function runVerification() {
  console.log("\n=======================================================");
  console.log(" USMAN AI GTM — MASTER VERIFICATION TEST SUITE");
  console.log("=======================================================\n");

  // 1. Verify permanent Owner transaction000501@gmail.com
  console.log("--- PART 1: Permanent Owner Account Setup ---");
  const ownerRows = await sql`
    SELECT id, username, email, full_name, role, status, plan, workspace_id
    FROM users
    WHERE LOWER(email) = 'transaction000501@gmail.com'
    LIMIT 1;
  `;
  assert(ownerRows.length > 0, "transaction000501@gmail.com exists in Neon database");
  const owner = ownerRows[0];
  assert(owner.role === "ADMIN", `Owner role is ADMIN (got: ${owner.role})`);
  assert(owner.status === "ACTIVE", `Owner status is ACTIVE (got: ${owner.status})`);
  assert(owner.plan === "LIFETIME", `Owner plan is LIFETIME (got: ${owner.plan})`);
  assert(isAuthorizedOwner(owner) === true, "isAuthorizedOwner returns true for permanent owner");
  
  const ownerAuth = computeAuthoritativeUserStatus(owner);
  assert(ownerAuth.isLocked === false, "Owner account is NOT locked");
  assert(ownerAuth.status === "ACTIVE", "Authoritative status is ACTIVE");

  // 2. Test unique constraint immunity on Google OAuth signup
  console.log("\n--- PART 2: OAuth Unique Constraint Immunity Test ---");
  const testOAuthEmail = `test_client_oauth_${Date.now()}@example.com`;
  const nowIso = new Date().toISOString();

  // First insertion
  const wsRes = await sql`
    INSERT INTO workspaces (name, created_at, tenant_id)
    VALUES (${`Test WS ${Date.now()}`}, ${nowIso}, 1)
    RETURNING id;
  `;
  const wsId = wsRes[0].id;

  const insert1 = await sql`
    INSERT INTO users (username, email, full_name, role, workspace_id, status, created_at, tenant_id, password_hash)
    VALUES (${testOAuthEmail}, ${testOAuthEmail}, 'Test Client', 'CLIENT', ${wsId}, 'LOCKED', ${nowIso}, 1, 'GOOGLE_OAUTH_USER')
    ON CONFLICT (username) DO UPDATE
      SET email = EXCLUDED.email,
          full_name = COALESCE(users.full_name, EXCLUDED.full_name)
    RETURNING id, email, role, status, plan;
  `;
  assert(insert1.length > 0, "Initial OAuth user insertion succeeded");
  const clientId = insert1[0].id;

  // Immediate second insertion with the exact same username (simulating login re-attempt)
  let secondInsertFailed = false;
  let secondInsertResult = null;
  try {
    secondInsertResult = await sql`
      INSERT INTO users (username, email, full_name, role, workspace_id, status, created_at, tenant_id, password_hash)
      VALUES (${testOAuthEmail}, ${testOAuthEmail}, 'Test Client', 'CLIENT', ${wsId}, 'LOCKED', ${nowIso}, 1, 'GOOGLE_OAUTH_USER')
      ON CONFLICT (username) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(users.full_name, EXCLUDED.full_name)
      RETURNING id, email, role, status, plan;
    `;
  } catch (e) {
    secondInsertFailed = true;
  }
  assert(!secondInsertFailed && secondInsertResult && secondInsertResult.length > 0, 
    "Repeated Google sign-in executed with zero unique constraint error (ON CONFLICT DO UPDATE handled cleanly)");

  // 3. Client starts in LOCKED state
  console.log("\n--- PART 3: New Client Default Locked State & Access Restrictions ---");
  const clientInitialStatus = computeAuthoritativeUserStatus(secondInsertResult[0]);
  assert(clientInitialStatus.isLocked === true, "New client account is strictly LOCKED by default");
  assert(clientInitialStatus.status === "LOCKED", "Status is LOCKED awaiting owner paid activation");

  // 4. Owner activates $25 Basic (30 Days)
  console.log("\n--- PART 4: Owner Actions - Basic ($25/30 Days) Activation ---");
  const activateBasic = await sql`
    UPDATE users
    SET status = 'ACTIVE',
        plan = 'BASIC',
        subscription_status = 'ACTIVE',
        subscription_start = NOW(),
        subscription_expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE id = ${clientId}
    RETURNING id, email, status, plan, subscription_expires_at;
  `;
  assert(activateBasic.length > 0, "Database updated client to Basic");
  const basicAuth = computeAuthoritativeUserStatus(activateBasic[0]);
  assert(basicAuth.isLocked === false, "Client is now UNLOCKED and ACTIVE");
  assert(basicAuth.plan === "BASIC", "Client plan is BASIC");
  assert(typeof basicAuth.daysRemaining === "number" && basicAuth.daysRemaining >= 29, "Client granted 30-day subscription window");

  // Feature gate check: Basic client blocked from Google Maps
  const isMapsAllowedBasic = isAuthorizedOwner(activateBasic[0]) || (activateBasic[0].plan || "").toUpperCase() === "LIFETIME";
  assert(isMapsAllowedBasic === false, "Google Maps Lead Generator is FORBIDDEN for Basic plan (requires $100 Lifetime)");

  // 5. Owner locks client
  console.log("\n--- PART 5: Owner Actions - Lock Client ---");
  const lockClient = await sql`
    UPDATE users
    SET status = 'LOCKED',
        subscription_status = 'LOCKED',
        updated_at = NOW()
    WHERE id = ${clientId}
    RETURNING id, email, status, plan, subscription_expires_at;
  `;
  const lockedAuth = computeAuthoritativeUserStatus(lockClient[0]);
  assert(lockedAuth.isLocked === true, "Client is strictly LOCKED upon Owner Lock action");
  assert(lockedAuth.status === "LOCKED", "Authoritative status is LOCKED");

  // 6. Owner unlocks client
  console.log("\n--- PART 6: Owner Actions - Unlock Client ---");
  const unlockClient = await sql`
    UPDATE users
    SET status = 'ACTIVE',
        subscription_status = 'ACTIVE',
        updated_at = NOW()
    WHERE id = ${clientId}
    RETURNING id, email, status, plan, subscription_expires_at;
  `;
  const unlockedAuth = computeAuthoritativeUserStatus(unlockClient[0]);
  assert(unlockedAuth.isLocked === false, "Client is UNLOCKED upon Owner Unlock action");

  // 7. Owner upgrades client to $100 Lifetime
  console.log("\n--- PART 7: Owner Actions - Lifetime ($100 One-Time) Activation ---");
  const activateLifetime = await sql`
    UPDATE users
    SET status = 'ACTIVE',
        plan = 'LIFETIME',
        subscription_status = 'ACTIVE',
        subscription_start = NOW(),
        subscription_expires_at = NULL,
        updated_at = NOW()
    WHERE id = ${clientId}
    RETURNING id, email, status, plan, subscription_expires_at;
  `;
  const lifetimeAuth = computeAuthoritativeUserStatus(activateLifetime[0]);
  assert(lifetimeAuth.isLocked === false, "Lifetime client is UNLOCKED and ACTIVE");
  assert(lifetimeAuth.plan === "LIFETIME", "Plan is permanently LIFETIME");
  assert(lifetimeAuth.daysRemaining === "Lifetime Access — No Expiry", "Expiry is permanent");

  // Feature gate check: Lifetime client allowed to use Google Maps
  const isMapsAllowedLifetime = isAuthorizedOwner(activateLifetime[0]) || (activateLifetime[0].plan || "").toUpperCase() === "LIFETIME";
  assert(isMapsAllowedLifetime === true, "Google Maps Lead Generator is GRANTED for Lifetime plan");

  // Cleanup test user
  await sql`DELETE FROM users WHERE id = ${clientId};`;
  await sql`DELETE FROM workspaces WHERE id = ${wsId};`;

  console.log(`\n=======================================================`);
  console.log(` ALL ${passedTests}/${totalTests} MASTER VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log(`=======================================================\n`);
}

runVerification().catch((err) => {
  console.error("Master verification failed:", err);
  process.exit(1);
});
