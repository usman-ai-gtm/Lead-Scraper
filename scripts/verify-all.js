const fs = require('fs');

const configPath = 'C:/Users/Dell/.config/neon/db_url.txt';
let dbUrl = '';
if (fs.existsSync(configPath)) {
  dbUrl = fs.readFileSync(configPath, 'utf8').trim();
} else {
  const envContent = fs.readFileSync('F:/LUXURY DASHBOARD/LUXURY DASHBOARD/.env', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const { neon } = require('F:/LUXURY DASHBOARD/LUXURY DASHBOARD/node_modules/@neondatabase/serverless');
const sql = neon(dbUrl);

function computeAuthoritativeUserStatus(user) {
  const roleUpper = (user.role || "").toUpperCase();
  if (roleUpper === "ADMIN") {
    return {
      status: "ACTIVE",
      isLocked: false,
      plan: "LIFETIME",
      isExpired: false,
      daysRemaining: "Permanent (Owner)",
    };
  }

  const statusUpper = (user.status || "LOCKED").toUpperCase();

  if (statusUpper === "REVOKED") {
    return {
      status: "REVOKED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
    };
  }
  if (statusUpper === "SUSPENDED") {
    return {
      status: "SUSPENDED",
      isLocked: true,
      plan: (user.plan || "BASIC").toUpperCase() === "LIFETIME" ? "LIFETIME" : "BASIC",
      isExpired: false,
      daysRemaining: 0,
    };
  }
  if (statusUpper === "LOCKED" || statusUpper === "PENDING") {
    return {
      status: "LOCKED",
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

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("USMAN AI GTM — MASTER VERIFICATION TEST SUITE");
  console.log("=================================================");

  // TEST 1: Authoritative Status - Super Admin
  const adminStatus = computeAuthoritativeUserStatus({
    role: "ADMIN",
    status: "ACTIVE",
    plan: "LIFETIME",
  });
  assert(adminStatus.status === "ACTIVE" && !adminStatus.isLocked && adminStatus.plan === "LIFETIME", "Super Admin is always Active Lifetime");

  // TEST 2: Authoritative Status - Newly registered Client is LOCKED
  const newClientStatus = computeAuthoritativeUserStatus({
    role: "CLIENT",
    status: "LOCKED",
    plan: "BASIC",
  });
  assert(newClientStatus.status === "LOCKED" && newClientStatus.isLocked, "New client defaults to LOCKED");

  // TEST 3: Authoritative Status - Active Basic with future expiry
  const futureDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString();
  const activeBasicStatus = computeAuthoritativeUserStatus({
    role: "CLIENT",
    status: "ACTIVE",
    plan: "BASIC",
    subscription_expires_at: futureDate,
  });
  assert(activeBasicStatus.status === "ACTIVE" && !activeBasicStatus.isLocked && activeBasicStatus.daysRemaining > 0, "Active Basic plan with future date is ACTIVE");

  // TEST 4: Authoritative Status - Basic plan with expired date is auto-expired
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const expiredBasicStatus = computeAuthoritativeUserStatus({
    role: "CLIENT",
    status: "ACTIVE",
    plan: "BASIC",
    subscription_expires_at: pastDate,
  });
  assert(expiredBasicStatus.status === "EXPIRED" && expiredBasicStatus.isLocked, "Expired Basic plan evaluates to EXPIRED and isLocked");

  // TEST 5: Authoritative Status - Basic plan with NULL expiry is auto-locked
  const nullExpiryBasic = computeAuthoritativeUserStatus({
    role: "CLIENT",
    status: "ACTIVE",
    plan: "BASIC",
    subscription_expires_at: null,
  });
  assert(nullExpiryBasic.status === "LOCKED" && nullExpiryBasic.isLocked, "Basic plan with NULL expiry evaluates to LOCKED");

  // TEST 6: Authoritative Status - Lifetime Plan is permanently Active
  const lifetimeStatus = computeAuthoritativeUserStatus({
    role: "CLIENT",
    status: "ACTIVE",
    plan: "LIFETIME",
    subscription_expires_at: null,
  });
  assert(lifetimeStatus.status === "ACTIVE" && !lifetimeStatus.isLocked && lifetimeStatus.plan === "LIFETIME", "Lifetime Plan is permanently ACTIVE with zero expiry");

  // TEST 7: Authoritative Status - Explicit Owner Lock overrides Lifetime plan
  const lockedLifetime = computeAuthoritativeUserStatus({
    role: "CLIENT",
    status: "LOCKED",
    plan: "LIFETIME",
  });
  assert(lockedLifetime.status === "LOCKED" && lockedLifetime.isLocked, "Manual Owner Lock strictly overrides Lifetime plan");

  // TEST 8: Authoritative Status - Suspended/Revoked overrides all
  const revokedStatus = computeAuthoritativeUserStatus({
    role: "CLIENT",
    status: "REVOKED",
    plan: "LIFETIME",
  });
  assert(revokedStatus.status === "REVOKED" && revokedStatus.isLocked, "Manual Owner Revocation strictly overrides all plans");

  // TEST 9: Test ON CONFLICT (username) in Neon DB without throwing unique constraint error
  console.log("\n--- Testing Database Google OAuth Upsert Robustness ---");
  const testEmail = `test_probe_${Date.now()}@example.com`;
  try {
    // Cleanup first if exists
    await sql`DELETE FROM users WHERE LOWER(email) = LOWER(${testEmail}) OR LOWER(username) = LOWER(${testEmail})`;

    // First insert
    const insert1 = await sql`
      INSERT INTO users (username, email, full_name, role, workspace_id, status, created_at, tenant_id, password_hash)
      VALUES (${testEmail}, ${testEmail}, 'Probe User', 'CLIENT', 1, 'LOCKED', NOW(), 1, 'GOOGLE_OAUTH_USER')
      ON CONFLICT (username) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(users.full_name, EXCLUDED.full_name)
      RETURNING id, email, full_name, role, status
    `;
    assert(insert1 && insert1.length > 0, "First insert succeeded");

    // Second insert with SAME username - MUST NOT throw duplicate key error
    const insert2 = await sql`
      INSERT INTO users (username, email, full_name, role, workspace_id, status, created_at, tenant_id, password_hash)
      VALUES (${testEmail}, ${testEmail}, 'Probe User Updated', 'CLIENT', 1, 'LOCKED', NOW(), 1, 'GOOGLE_OAUTH_USER')
      ON CONFLICT (username) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(users.full_name, EXCLUDED.full_name)
      RETURNING id, email, full_name, role, status
    `;
    assert(insert2 && insert2[0].id === insert1[0].id, "ON CONFLICT (username) cleanly updated existing user without duplicate key error");

    // Cleanup
    await sql`DELETE FROM users WHERE id = ${insert1[0].id}`;
    assert(true, "Test probe cleanup succeeded");
  } catch (err) {
    console.error("Database upsert test error:", err);
    assert(false, "Database upsert threw an error: " + err.message);
  }

  // TEST 10: Head Account Verification
  console.log("\n--- Verifying Authoritative Head Account ---");
  const owners = await sql`
    SELECT id, username, email, role, status, plan
    FROM users
    WHERE id = 1 OR LOWER(email) = 'admin@usmanai.com' OR LOWER(email) = 'mu0602503@gmail.com'
    ORDER BY id ASC
  `;
  assert(owners.some(o => o.email === "admin@usmanai.com" && o.role === "ADMIN"), "Primary Owner admin@usmanai.com verified in DB");
  assert(owners.some(o => o.email === "mu0602503@gmail.com" && o.role === "ADMIN"), "Owner Google Account mu0602503@gmail.com verified in DB");

  console.log(`\n=================================================`);
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`=================================================`);
  
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Master Test Failure:", err);
  process.exit(1);
});
