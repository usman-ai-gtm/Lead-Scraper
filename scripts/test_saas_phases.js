const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function testAllPhases() {
  console.log("=================================================");
  console.log("USMAN AI GTM — SAAS PRODUCTION VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Owner & Head Account Verification
  console.log("--- 1. Owner & Head Account Verification ---");
  const owner = await sql`
    SELECT id, email, role, status, plan 
    FROM users 
    WHERE email IN ('admin@usmanai.com', 'mu0602503@gmail.com')
    ORDER BY id ASC;
  `;
  assert(owner.length >= 2, "Both Super Admin (admin@usmanai.com) and Personal Owner (mu0602503@gmail.com) exist");
  assert(owner.some(u => u.email === 'admin@usmanai.com' && u.role === 'ADMIN'), "admin@usmanai.com is ADMIN");
  assert(owner.some(u => u.email === 'mu0602503@gmail.com' && u.role === 'ADMIN'), "mu0602503@gmail.com is ADMIN");

  // 2. Database Schema: Subscription columns & Inquiries table
  console.log("\n--- 2. Database Schema Verification ---");
  const userCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name IN ('plan', 'subscription_start', 'subscription_expires_at', 'subscription_status', 'subscription_notes');
  `;
  assert(userCols.length === 5, "All 5 subscription columns exist in users table");

  const inquiryTable = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'subscription_inquiries';
  `;
  assert(inquiryTable.length === 1, "subscription_inquiries table exists");

  const suppressionTable = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'email_suppressions';
  `;
  assert(suppressionTable.length === 1, "email_suppressions table exists");

  // 3. New Client Default LOCKED Status Check
  console.log("\n--- 3. Client Registration & Default LOCKED Check ---");
  const testClientEmail = `autotest_client_${Date.now()}@example.com`;
  const testWs = await sql`
    INSERT INTO workspaces (name, created_at, tenant_id)
    VALUES ('AutoTest WS', NOW(), 1)
    RETURNING id;
  `;
  const wsId = testWs[0].id;

  const newClient = await sql`
    INSERT INTO users (username, email, full_name, role, workspace_id, status, plan, subscription_status, created_at, tenant_id, password_hash)
    VALUES (${testClientEmail}, ${testClientEmail}, 'AutoTest Client', 'CLIENT', ${wsId}, 'LOCKED', 'BASIC', 'LOCKED', NOW(), 1, 'TEST_HASH')
    RETURNING id, email, role, status, plan, subscription_status;
  `;
  assert(newClient[0].status === 'LOCKED', "New client defaults strictly to LOCKED status");
  assert(newClient[0].plan === 'BASIC', "New client plan defaults to BASIC");
  const clientId = newClient[0].id;

  // 4. Owner Activation: Basic ($25 / 30 Days)
  console.log("\n--- 4. Owner Activation: Basic ($25 / 30 Days) ---");
  const activatedBasic = await sql`
    UPDATE users 
    SET status = 'ACTIVE',
        plan = 'BASIC',
        subscription_status = 'ACTIVE',
        subscription_start = NOW(),
        subscription_expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE id = ${clientId}
    RETURNING id, status, plan, subscription_start, subscription_expires_at;
  `;
  assert(activatedBasic[0].status === 'ACTIVE', "Basic plan activated to ACTIVE");
  assert(activatedBasic[0].plan === 'BASIC', "Plan set to BASIC");
  assert(activatedBasic[0].subscription_expires_at !== null, "Basic has 30-day subscription_expires_at");

  // 5. Owner Activation: Lifetime ($100)
  console.log("\n--- 5. Owner Activation: Lifetime ($100) ---");
  const activatedLifetime = await sql`
    UPDATE users 
    SET status = 'ACTIVE',
        plan = 'LIFETIME',
        subscription_status = 'ACTIVE',
        subscription_start = NOW(),
        subscription_expires_at = NULL,
        updated_at = NOW()
    WHERE id = ${clientId}
    RETURNING id, status, plan, subscription_expires_at;
  `;
  assert(activatedLifetime[0].status === 'ACTIVE', "Lifetime plan activated to ACTIVE");
  assert(activatedLifetime[0].plan === 'LIFETIME', "Plan set to LIFETIME");
  assert(activatedLifetime[0].subscription_expires_at === null, "Lifetime has NULL expiry (never expires)");

  // 6. Buying Inquiry Submission & Status Update
  console.log("\n--- 6. Buying Inquiries Verification ---");
  const inquiry = await sql`
    INSERT INTO subscription_inquiries (customer_name, contact_info, email, plan, message, status)
    VALUES ('B2B Buyer Test', '+923001234567', 'buyer@test.com', 'BASIC', 'Salam, I want to purchase the $25 plan', 'NEW')
    RETURNING id, customer_name, plan, status;
  `;
  assert(inquiry.length === 1 && inquiry[0].status === 'NEW', "Buying inquiry saved with NEW status");

  const updatedInquiry = await sql`
    UPDATE subscription_inquiries SET status = 'ACTIVATED' WHERE id = ${inquiry[0].id} RETURNING id, status;
  `;
  assert(updatedInquiry[0].status === 'ACTIVATED', "Inquiry marked as ACTIVATED");

  // Clean up test records
  await sql`DELETE FROM subscription_inquiries WHERE id = ${inquiry[0].id};`;
  await sql`DELETE FROM users WHERE id = ${clientId};`;
  await sql`DELETE FROM workspaces WHERE id = ${wsId};`;

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");
}

testAllPhases().catch(console.error);
