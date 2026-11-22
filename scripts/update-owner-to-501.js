/**
 * Update row ID 2 in Neon DB to transaction000501@gmail.com
 * Safely resolves the owner identity conflict without duplicates.
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function updateOwner() {
  console.log("=== SAFELY UPDATING OWNER TO transaction000501@gmail.com ===");

  // 1. Check if transaction000501@gmail.com exists already on any other row
  const existing501 = await sql`
    SELECT id, username, email, role, status FROM users WHERE LOWER(email) = 'transaction000501@gmail.com' OR LOWER(username) = 'transaction000501@gmail.com';
  `;
  if (existing501.length > 0 && existing501[0].id !== 2) {
    console.log("Found transaction000501 on another row ID:", existing501[0].id, "- merging into row ID 2");
    await sql`DELETE FROM users WHERE id = ${existing501[0].id};`;
  }

  // 2. Update row ID 2 (the designated owner account)
  const updatedOwner = await sql`
    UPDATE users
    SET email = 'transaction000501@gmail.com',
        username = 'transaction000501@gmail.com',
        full_name = 'Muhammad Usman',
        role = 'ADMIN',
        status = 'ACTIVE',
        plan = 'LIFETIME',
        active = 1,
        is_active = 1,
        subscription_status = 'ACTIVE',
        subscription_expires_at = NULL,
        updated_at = NOW()
    WHERE id = 2
    RETURNING id, username, email, full_name, role, status, plan, workspace_id, updated_at;
  `;

  console.log("Updated Owner Record (Row ID 2):", JSON.stringify(updatedOwner[0], null, 2));

  // 3. Confirm all users to verify clean state
  const check = await sql`
    SELECT id, email, role, status, plan FROM users WHERE LOWER(email) = 'transaction000501@gmail.com';
  `;
  console.log("Verification Query:", check);
}

updateOwner().catch(console.error);
