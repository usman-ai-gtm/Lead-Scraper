const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const { neon } = require('F:/LUXURY DASHBOARD/LUXURY DASHBOARD/node_modules/@neondatabase/serverless');
const sql = neon(dbUrl);

async function inspectOwner() {
  const users = await sql`
    SELECT id, username, email, full_name, role, workspace_id, status, plan, created_at, subscription_expires_at
    FROM users
    WHERE LOWER(email) = 'transaction000501@gmail.com' OR LOWER(username) = 'transaction000501@gmail.com'
  `;
  console.log('Owner user record in DB:', JSON.stringify(users, null, 2));

  if (users.length > 0) {
    const wsId = users[0].workspace_id;
    const workspaces = await sql`
      SELECT id, name, created_at, description
      FROM workspaces
      WHERE id = ${wsId}
    `;
    console.log('Owner workspace in DB:', JSON.stringify(workspaces, null, 2));
  }
}

inspectOwner().catch(console.error);
