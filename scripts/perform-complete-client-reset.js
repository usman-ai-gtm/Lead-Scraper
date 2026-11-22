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

async function performCompleteClientReset() {
  console.log("===============================================================================");
  console.log(" USMAN AI GTM — COMPLETE CLIENT DATABASE RESET & BACKUP EXECUTION");
  console.log("===============================================================================\n");

  // 1. Identify and verify Master Owner using actual identity
  console.log("1. Identifying and verifying Master Owner record by database identity...");
  const masterOwnerRows = await sql`
    SELECT id, username, email, role, account_type, status, plan, workspace_id, password_hash, recovery_key_hash
    FROM users
    WHERE role = 'SUPER_ADMIN' 
      AND account_type = 'MASTER_OWNER' 
      AND LOWER(username) = 'master_owner_usman'
  `;

  if (!masterOwnerRows || masterOwnerRows.length === 0) {
    console.error("FATAL: Master Owner record not found in database! Aborting reset.");
    process.exit(1);
  }

  const masterOwner = masterOwnerRows[0];
  console.log("   ✓ Master Owner successfully identified:");
  console.log(`     - ID: ${masterOwner.id}`);
  console.log(`     - Username: ${masterOwner.username}`);
  console.log(`     - Role: ${masterOwner.role}`);
  console.log(`     - Account Type: ${masterOwner.account_type}`);
  console.log(`     - Status: ${masterOwner.status}`);
  console.log(`     - Plan: ${masterOwner.plan}`);
  console.log(`     - Workspace ID: ${masterOwner.workspace_id}`);
  console.log(`     - Password Hash Present: ${Boolean(masterOwner.password_hash)}`);

  const ownerWorkspaceId = masterOwner.workspace_id;

  // 2. Capture complete database snapshot outside git repo
  console.log("\n2. Creating secure database backup outside public repository...");
  const backupDir = 'C:/Users/Dell/.config/usman_gtm/backups';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `complete_backup_before_client_reset_${timestamp}.json`);

  const [
    allUsers,
    allWorkspaces,
    allLeads,
    allSearchRecords,
    allSearchRecordLeads,
    allExports,
    allOutreach,
    allEmailAccounts,
    allDeals,
    allCompanies,
    allContacts,
    allInquiries
  ] = await Promise.all([
    sql`SELECT * FROM users ORDER BY id ASC`,
    sql`SELECT * FROM workspaces ORDER BY id ASC`,
    sql`SELECT * FROM leads ORDER BY id ASC`,
    sql`SELECT * FROM search_records ORDER BY id ASC`,
    sql`SELECT * FROM search_record_leads ORDER BY id ASC`,
    sql`SELECT * FROM export_history ORDER BY id ASC`,
    sql`SELECT * FROM outreach_records ORDER BY id ASC`,
    sql`SELECT * FROM email_accounts ORDER BY id ASC`,
    sql`SELECT * FROM crm_deals ORDER BY id ASC`,
    sql`SELECT * FROM companies ORDER BY id ASC`,
    sql`SELECT * FROM contacts ORDER BY id ASC`,
    sql`SELECT * FROM subscription_inquiries ORDER BY id ASC`,
  ]);

  const backupData = {
    backup_timestamp: new Date().toISOString(),
    master_owner_id: masterOwner.id,
    stats: {
      users: allUsers.length,
      workspaces: allWorkspaces.length,
      leads: allLeads.length,
      search_records: allSearchRecords.length,
      search_record_leads: allSearchRecordLeads.length,
      exports: allExports.length,
      outreach: allOutreach.length,
      email_accounts: allEmailAccounts.length,
      deals: allDeals.length,
      companies: allCompanies.length,
      contacts: allContacts.length,
      inquiries: allInquiries.length,
    },
    users: allUsers,
    workspaces: allWorkspaces,
    leads: allLeads,
    search_records: allSearchRecords,
    search_record_leads: allSearchRecordLeads,
    export_history: allExports,
    outreach_records: allOutreach,
    email_accounts: allEmailAccounts,
    crm_deals: allDeals,
    companies: allCompanies,
    contacts: allContacts,
    subscription_inquiries: allInquiries,
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

  // Verify backup exists and has content
  if (!fs.existsSync(backupPath)) {
    console.error("FATAL: Backup file could not be created at:", backupPath);
    process.exit(1);
  }
  const stat = fs.statSync(backupPath);
  console.log(`   ✓ Backup verified: ${backupPath}`);
  console.log(`     Size: ${(stat.size / 1024).toFixed(2)} KB`);
  console.log(`     Records backed up: ${allUsers.length} users, ${allWorkspaces.length} workspaces, ${allLeads.length} leads.`);

  // 3. Count records to be deleted
  const clientUsersToDelete = allUsers.filter(u => u.id !== masterOwner.id);
  console.log(`\n3. Deletion Scope:`);
  console.log(`   - Client/test user accounts to delete: ${clientUsersToDelete.length}`);
  console.log(`   - Client workspaces to delete: ${allWorkspaces.filter(w => w.id !== ownerWorkspaceId && w.id !== 1).length}`);
  console.log(`   - Leads to delete: ${allLeads.filter(l => l.workspace_id !== ownerWorkspaceId).length}`);

  // 4. Execute deletion in correct foreign key order
  console.log("\n4. Executing permanent deletion of all existing client-related data...");

  // a. Search record links
  const delSearchLeads = await sql`
    DELETE FROM search_record_leads 
    WHERE workspace_id != ${ownerWorkspaceId}
    RETURNING id
  `;
  console.log(`   ✓ Deleted ${delSearchLeads.length} search record lead links`);

  // b. Search records
  const delSearchRecs = await sql`
    DELETE FROM search_records 
    WHERE workspace_id != ${ownerWorkspaceId}
    RETURNING id
  `;
  console.log(`   ✓ Deleted ${delSearchRecs.length} search records`);

  // c. Leads
  const delLeads = await sql`
    DELETE FROM leads 
    WHERE workspace_id != ${ownerWorkspaceId}
    RETURNING id
  `;
  console.log(`   ✓ Deleted ${delLeads.length} leads`);

  // d. Export history
  const delExports = await sql`
    DELETE FROM export_history 
    WHERE workspace_id != ${ownerWorkspaceId}
    RETURNING id
  `;
  console.log(`   ✓ Deleted ${delExports.length} export history items`);

  // e. Outreach records
  const delOutreach = await sql`
    DELETE FROM outreach_records 
    WHERE workspace_id != ${ownerWorkspaceId}
    RETURNING id
  `;
  console.log(`   ✓ Deleted ${delOutreach.length} outreach records`);

  // f. Email accounts (Gmail tokens)
  const delEmailAccs = await sql`
    DELETE FROM email_accounts 
    WHERE workspace_id != ${ownerWorkspaceId}
    RETURNING id
  `;
  console.log(`   ✓ Deleted ${delEmailAccs.length} client email accounts / Gmail connections`);

  // g. Campaigns
  const delCampaigns = await sql`
    DELETE FROM email_campaigns 
    WHERE workspace_id != ${ownerWorkspaceId}
    RETURNING id
  `;
  console.log(`   ✓ Deleted ${delCampaigns.length} email campaigns`);

  // h. CRM deals, contacts, companies
  const delDeals = await sql`DELETE FROM crm_deals WHERE workspace_id != ${ownerWorkspaceId} RETURNING id`;
  const delContacts = await sql`DELETE FROM contacts WHERE workspace_id != ${ownerWorkspaceId} RETURNING id`;
  const delCompanies = await sql`DELETE FROM companies WHERE workspace_id != ${ownerWorkspaceId} RETURNING id`;
  console.log(`   ✓ Deleted ${delDeals.length} CRM deals, ${delContacts.length} contacts, ${delCompanies.length} companies`);

  // i. Inquiries
  const delInquiries = await sql`DELETE FROM subscription_inquiries RETURNING id`;
  console.log(`   ✓ Deleted ${delInquiries.length} old subscription inquiries`);

  // j. Client users (delete all except Master Owner)
  const delUsers = await sql`
    DELETE FROM users 
    WHERE id != ${masterOwner.id}
      AND (role != 'SUPER_ADMIN' OR account_type != 'MASTER_OWNER' OR LOWER(username) != 'master_owner_usman')
    RETURNING id, username, email
  `;
  console.log(`   ✓ Deleted ${delUsers.length} old client and test user accounts`);

  // k. Client workspaces (delete all except Master Owner's workspace and default workspace 1)
  const delWorkspaces = await sql`
    DELETE FROM workspaces 
    WHERE id != ${ownerWorkspaceId} AND id != 1
    RETURNING id, name
  `;
  console.log(`   ✓ Deleted ${delWorkspaces.length} client workspaces`);

  // 5. Post-reset verification
  console.log("\n5. Verifying database state post-reset...");
  const remainingUsers = await sql`SELECT id, username, email, role, account_type, status, plan FROM users`;
  console.log(`   Total users remaining in DB: ${remainingUsers.length}`);
  remainingUsers.forEach(u => {
    console.log(`   - User: ${u.username} (ID: ${u.id}, Role: ${u.role}, Account Type: ${u.account_type}, Status: ${u.status}, Plan: ${u.plan})`);
  });

  if (remainingUsers.length !== 1 || remainingUsers[0].id !== masterOwner.id) {
    console.error("FATAL: Unexpected users remaining after reset!", remainingUsers);
    process.exit(1);
  }
  console.log("   ✓ CONFIRMED: Exactly ONE Master Owner account remains in the database.");

  const remainingLeads = await sql`SELECT COUNT(*)::int as c FROM leads`;
  const remainingSearches = await sql`SELECT COUNT(*)::int as c FROM search_records`;
  const remainingGmail = await sql`SELECT COUNT(*)::int as c FROM email_accounts`;
  console.log(`   Remaining leads: ${remainingLeads[0].c}`);
  console.log(`   Remaining searches: ${remainingSearches[0].c}`);
  console.log(`   Remaining client Gmail connections: ${remainingGmail[0].c}`);

  console.log("\n===============================================================================");
  console.log(" DATABASE RESET COMPLETE: ALL CLIENT DATA PURGED, MASTER OWNER 100% PRESERVED");
  console.log("===============================================================================\n");
}

performCompleteClientReset().catch(e => {
  console.error("Reset failed:", e);
  process.exit(1);
});
