const fs = require('fs');
const path = require('path');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const { neon } = require('@neondatabase/serverless');
const sql = neon(dbUrl);

async function runAudit() {
  console.log('====================================================');
  console.log('SYSTEM AUDIT — USMAN AI GTM');
  console.log('====================================================');

  // 1. Tables in Neon DB
  const tables = await sql.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('\n[1] TABLES IN DATABASE:');
  console.log(tables.map(t => t.table_name).join(', '));

  // 2. Schema of relevant tables
  const targetTables = ['users', 'workspaces', 'leads', 'email_accounts', 'outreach_records', 'search_records', 'workspace_profiles', 'subscription_inquiries'];
  for (const t of targetTables) {
    const exists = tables.some(x => x.table_name === t);
    if (exists) {
      const cols = await sql.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t]);
      console.log(`\n--- SCHEMA: ${t} ---`);
      cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (null: ${c.is_nullable})`));
    } else {
      console.log(`\n--- TABLE ${t} DOES NOT EXIST YET ---`);
    }
  }

  // 3. Existing User Count and Roles
  const userStats = await sql.query("SELECT role, status, count(*) as count FROM users GROUP BY role, status");
  console.log('\n[2] USERS BREAKDOWN:');
  userStats.forEach(s => console.log(`  Role: ${s.role} | Status: ${s.status} | Count: ${s.count}`));

  const adminUsers = await sql.query("SELECT id, email, username, role, status, workspace_id, created_at, last_login FROM users WHERE role = 'ADMIN' OR id = 1 ORDER BY id ASC");
  console.log('\n[3] OWNER / ADMIN ACCOUNTS:');
  adminUsers.forEach(u => console.log(`  ID #${u.id} | Email: ${u.email} | Role: ${u.role} | Status: ${u.status} | WS: #${u.workspace_id}`));

  // 4. Email Accounts in DB
  const emailAccs = await sql.query("SELECT id, workspace_id, user_id, sender_name, sender_email, is_active, daily_limit, sent_today, created_at FROM email_accounts");
  console.log(`\n[4] EMAIL ACCOUNTS (Total: ${emailAccs.length}):`);
  emailAccs.forEach(e => console.log(`  ID #${e.id} | WS #${e.workspace_id} | Email: ${e.sender_email} | Active: ${e.is_active}`));

  // 5. Existing routes / pages audit
  console.log('\n[5] FRONTEND PAGES AUDIT:');
  const pagesToCheck = [
    'app/page.tsx',
    'app/about/page.tsx',
    'app/pricing/page.tsx',
    'app/terms/page.tsx',
    'app/privacy/page.tsx',
    'app/contact/page.tsx',
    'app/app/accounts/page.tsx',
    'app/app/outreach/page.tsx',
    'app/app/admin/clients/page.tsx',
    'app/app/admin/payments/page.tsx',
    'app/app/subscription/page.tsx',
  ];
  pagesToCheck.forEach(p => {
    const exists = fs.existsSync(p);
    console.log(`  ${p}: ${exists ? 'EXISTS' : 'MISSING'}`);
  });
}

runAudit().catch(console.error);
