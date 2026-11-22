const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function run() {
  console.log("Applying Master Owner Schema & Record Updates...");

  // 1. Add account_type column if not exists
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'CLIENT'
  `;
  console.log("account_type column verified.");

  // 2. Identify the Master Owner (transaction000501@gmail.com)
  const masterEmail = "transaction000501@gmail.com";

  // Check if row exists
  const existingOwner = await sql`
    SELECT id, username, email, role, status, plan, workspace_id, account_type
    FROM users
    WHERE LOWER(email) = LOWER(${masterEmail}) OR LOWER(username) = LOWER(${masterEmail})
    LIMIT 1
  `;

  if (existingOwner && existingOwner.length > 0) {
    const ownerId = existingOwner[0].id;
    console.log(`Updating existing row ID ${ownerId} to MASTER_OWNER...`);
    await sql`
      UPDATE users
      SET role = 'SUPER_ADMIN',
          account_type = 'MASTER_OWNER',
          status = 'ACTIVE',
          plan = 'OWNER_LIFETIME',
          subscription_status = 'PERMANENT',
          subscription_expires_at = NULL,
          active = 1,
          is_active = 1,
          updated_at = NOW()
      WHERE id = ${ownerId}
    `;
  } else {
    console.log("Creating brand new MASTER_OWNER record...");
    await sql`
      INSERT INTO users (
        username, email, full_name, role, account_type, status, plan,
        subscription_status, subscription_expires_at, active, is_active,
        created_at, tenant_id, workspace_id, password_hash
      ) VALUES (
        ${masterEmail}, ${masterEmail}, 'Muhammad Usman (Master Owner)', 'SUPER_ADMIN', 'MASTER_OWNER', 'ACTIVE', 'OWNER_LIFETIME',
        'PERMANENT', NULL, 1, 1,
        NOW(), 1, 5, 'MASTER_OWNER_OAUTH'
      )
    `;
  }

  // 3. Ensure any legacy admin test records are not marked as MASTER_OWNER
  await sql`
    UPDATE users
    SET account_type = 'SYSTEM_TEST'
    WHERE role = 'ADMIN' AND LOWER(email) != LOWER(${masterEmail}) AND LOWER(email) NOT IN ('admin@usmanai.com', 'mu0602503@gmail.com')
  `;

  // 4. Verify updated Master Owner record
  const verified = await sql`
    SELECT id, username, email, full_name, role, account_type, status, plan, subscription_status, subscription_expires_at, active, is_active
    FROM users
    WHERE LOWER(email) = LOWER(${masterEmail})
  `;
  console.log("Verified Master Owner Record in Neon DB:", JSON.stringify(verified, null, 2));
}

run().catch(console.error);
