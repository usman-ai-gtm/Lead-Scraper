const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const dbUrlPath = 'C:/Users/Dell/.config/neon/db_url.txt';
if (!fs.existsSync(dbUrlPath)) {
  console.error('db_url.txt not found');
  process.exit(1);
}
const dbUrl = fs.readFileSync(dbUrlPath, 'utf8').trim();
const sql = neon(dbUrl);

async function inspect() {
  try {
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      JOIN pg_namespace n ON n.oid = c.connamespace 
      WHERE conrelid = 'users'::regclass;
    `;
    console.log('=== CONSTRAINTS ON USERS ===');
    console.log(JSON.stringify(constraints, null, 2));

    const users = await sql`
      SELECT id, username, email, full_name, role, status, plan, subscription_expires_at, workspace_id, created_at 
      FROM users 
      ORDER BY id ASC;
    `;
    console.log('=== USERS IN DB (' + users.length + ') ===');
    for (const u of users) {
      console.log(`ID: ${u.id} | username: "${u.username}" | email: "${u.email}" | role: ${u.role} | status: ${u.status} | plan: ${u.plan} | ws: ${u.workspace_id}`);
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  }
}

inspect();
