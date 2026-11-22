const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function run() {
  const users = await sql`
    SELECT id, email, username, full_name, role, status, plan, is_active, active
    FROM users
    ORDER BY id ASC
  `;
  console.log(`TOTAL USERS: ${users.length}`);
  users.forEach(u => {
    console.log(`[ID ${u.id}] email="${u.email}" | username="${u.username}" | Role: ${u.role} | Status: ${u.status} | Plan: ${u.plan} | active=${u.active} is_active=${u.is_active}`);
  });
}

run().catch(console.error);
