const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function testSubscriptionFlow() {
  console.log("=== TESTING SUBSCRIPTION UPDATE FLOW ===");

  // 1. Pick a client user from the DB
  const clients = await sql`
    SELECT id, email, full_name, role, status, plan, subscription_expires_at, workspace_id
    FROM users
    WHERE role != 'ADMIN'
    ORDER BY id DESC
    LIMIT 1;
  `;

  if (clients.length === 0) {
    console.log("No client found!");
    return;
  }

  const target = clients[0];
  console.log("Target client BEFORE:", target);

  // 2. Simulate ACTIVATE_BASIC on this client
  const basicRes = await sql`
    UPDATE users
    SET status = 'ACTIVE',
        plan = 'BASIC',
        subscription_status = 'ACTIVE',
        subscription_start = NOW(),
        subscription_expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE id = ${target.id}
    RETURNING id, email, full_name, status, plan, subscription_start, subscription_expires_at, subscription_status;
  `;
  console.log("DB Return for ACTIVATE_BASIC:", basicRes[0]);

  // 3. Query back from DB as /api/auth/me would do
  const meQuery = await sql`
    SELECT id, email, full_name, role, workspace_id, status, plan, subscription_start, subscription_expires_at, subscription_status
    FROM users
    WHERE id = ${target.id}
    LIMIT 1;
  `;
  console.log("Me query for client:", meQuery[0]);

  // 4. Check what computeAuthoritativeUserStatus returns
  const { computeAuthoritativeUserStatus } = require('../lib/neon-db');
  const authStatus = computeAuthoritativeUserStatus(meQuery[0]);
  console.log("computeAuthoritativeUserStatus:", authStatus);
}

testSubscriptionFlow().catch(console.error);
