const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function check() {
  const users = await sql`SELECT id, username, email, full_name, role, status, plan, workspace_id FROM users WHERE email ILIKE '%transaction%' OR username ILIKE '%transaction%'`;
  console.log('Transaction users in Neon DB:', JSON.stringify(users, null, 2));

  const admins = await sql`SELECT id, username, email, full_name, role, status, plan, workspace_id FROM users WHERE role = 'ADMIN'`;
  console.log('All ADMINs in Neon DB:', JSON.stringify(admins, null, 2));
}

check().catch(console.error);
