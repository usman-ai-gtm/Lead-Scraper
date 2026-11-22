const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function testFix() {
  console.log("Testing Basic creation with explicit types and separate parameters...");
  const cleanUsername = `test_basic_fix_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const resBasic = await sql.query(
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
        cleanUsername,
        `${cleanUsername}@app.client`,
        'pwd_hash',
        'Test Customer',
        1,
        'BASIC',
        nowIso,
        expiresAt,
        'Paid BASIC account',
        nowIso
      ]
    );
    console.log("✓ Basic Creation Succeeded! ID:", resBasic[0].id);

    console.log("\nTesting Lifetime creation with NULL expiry...");
    const lifeUsername = `test_life_fix_${Date.now()}`;
    const resLife = await sql.query(
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
        lifeUsername,
        `${lifeUsername}@app.client`,
        'pwd_hash',
        'Lifetime Customer',
        1,
        'LIFETIME',
        nowIso,
        null,
        'Paid LIFETIME account',
        nowIso
      ]
    );
    console.log("✓ Lifetime Creation Succeeded! ID:", resLife[0].id);

    // Clean up test users
    await sql`DELETE FROM users WHERE id IN (${resBasic[0].id}, ${resLife[0].id})`;
    console.log("✓ Cleaned up test records.");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testFix();
