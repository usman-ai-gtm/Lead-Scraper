const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function check501() {
  const users = await sql`SELECT id, username, email, full_name, role, status, plan, workspace_id FROM users WHERE email ILIKE '%501%' OR username ILIKE '%501%'`;
  console.log('501 users in Neon DB:', JSON.stringify(users, null, 2));
}

check501().catch(console.error);
