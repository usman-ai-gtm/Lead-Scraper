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

async function performSafeLockMigration() {
  console.log("=======================================================");
  console.log(" SAFE PRODUCTION MIGRATION: LOCK ALL EXISTING CLIENTS");
  console.log("=======================================================\n");

  // 1. Take Snapshot of all users, workspaces, leads before migration
  console.log("1. Taking database snapshot before migration...");
  const allUsersBefore = await sql`SELECT * FROM users ORDER BY id ASC`;
  const allWorkspacesBefore = await sql`SELECT * FROM workspaces ORDER BY id ASC`;
  
  const snapshotData = {
    timestamp: new Date().toISOString(),
    total_users_before: allUsersBefore.length,
    users: allUsersBefore,
    workspaces: allWorkspacesBefore,
  };

  const snapshotPath = path.join(__dirname, 'db_snapshot_before_lock.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2));
  console.log(`   ✓ Snapshot saved to ${snapshotPath} (${allUsersBefore.length} users backed up)`);

  // 2. Identify Master Owner to exclude
  console.log("\n2. Identifying Master Owner to guarantee exclusion...");
  const masterOwnerRows = await sql`
    SELECT id, username, email, role, account_type, status, plan, subscription_status
    FROM users
    WHERE id = 2 OR LOWER(username) = 'master_owner_usman' OR account_type = 'MASTER_OWNER'
  `;
  console.log(`   Found Master Owner row(s):`, masterOwnerRows.map(u => ({ id: u.id, username: u.username, role: u.role, account_type: u.account_type })));

  // 3. Count clients to be locked
  const clientsBefore = await sql`
    SELECT id, email, username, role, account_type, status, plan
    FROM users
    WHERE (role != 'SUPER_ADMIN' AND role != 'ADMIN')
      AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
      AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
      AND id != 2
  `;
  console.log(`\n3. Found ${clientsBefore.length} existing client accounts to lock.`);

  // 4. Execute atomic safe update on all client accounts
  console.log("4. Executing safe migration update...");
  const updatedClients = await sql`
    UPDATE users
    SET status = 'LOCKED',
        subscription_status = 'PENDING_APPROVAL',
        active = 0,
        is_active = 0,
        updated_at = NOW()
    WHERE (role != 'SUPER_ADMIN' AND role != 'ADMIN')
      AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
      AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
      AND id != 2
    RETURNING id, email, username, role, status, subscription_status, active, is_active, plan
  `;
  console.log(`   ✓ Successfully updated ${updatedClients.length} client accounts to LOCKED.`);

  // 5. Verify Master Owner remained untouched
  console.log("\n5. Verifying Master Owner remained untouched and active...");
  const ownerAfter = await sql`
    SELECT id, username, email, role, account_type, status, plan, subscription_status, active, is_active
    FROM users
    WHERE id = 2
  `;
  const owner = ownerAfter[0];
  console.log(`   Master Owner ID: ${owner.id}`);
  console.log(`   Role: ${owner.role}`);
  console.log(`   Account Type: ${owner.account_type}`);
  console.log(`   Status: ${owner.status} (active: ${owner.active}, is_active: ${owner.is_active})`);
  console.log(`   Plan: ${owner.plan}`);

  if (owner.status !== 'ACTIVE' || owner.role !== 'SUPER_ADMIN' || owner.account_type !== 'MASTER_OWNER') {
    console.error("FATAL: Master Owner was altered! Restoring Master Owner immediately...");
    await sql`
      UPDATE users
      SET role = 'SUPER_ADMIN', account_type = 'MASTER_OWNER', status = 'ACTIVE', plan = 'OWNER_LIFETIME', subscription_status = 'PERMANENT', subscription_expires_at = NULL, active = 1, is_active = 1
      WHERE id = 2
    `;
    process.exit(1);
  }
  console.log("   ✓ Master Owner is 100% ACTIVE and permanent.");

  // 6. Verify ALL client accounts are strictly LOCKED
  console.log("\n6. Verifying all client accounts are strictly locked...");
  const activeClientsRemaining = await sql`
    SELECT id, email, role, status
    FROM users
    WHERE status = 'ACTIVE'
      AND (role != 'SUPER_ADMIN' AND role != 'ADMIN')
      AND (account_type IS NULL OR account_type != 'MASTER_OWNER')
      AND (username IS NULL OR LOWER(username) != 'master_owner_usman')
      AND id != 2
  `;

  if (activeClientsRemaining.length > 0) {
    console.error(`FATAL: Found ${activeClientsRemaining.length} client accounts still ACTIVE:`, activeClientsRemaining);
    process.exit(1);
  }
  console.log("   ✓ Verified: 0 active client accounts remaining. All existing clients are strictly LOCKED.");

  // 7. Verify all original customer accounts are preserved
  const totalUsersAfter = await sql`SELECT COUNT(*)::int as count FROM users`;
  console.log(`\n7. Data Integrity Check: Total users before = ${allUsersBefore.length}, Total users after = ${totalUsersAfter[0].count}`);
  if (totalUsersAfter[0].count !== allUsersBefore.length) {
    console.error("FATAL: User count mismatch! Data loss detected!");
    process.exit(1);
  }
  console.log("   ✓ 100% of user records preserved. No customer accounts were deleted or lost.");

  console.log("\n=======================================================");
  console.log(` MIGRATION COMPLETE: ${updatedClients.length} CLIENTS LOCKED SAFELY`);
  console.log("=======================================================\n");
}

performSafeLockMigration().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
