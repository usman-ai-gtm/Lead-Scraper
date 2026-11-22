const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function checkAuditLogs() {
  try {
    const logs = await sql`
      SELECT * FROM account_audit_logs 
      ORDER BY id DESC 
      LIMIT 10;
    `;
    console.log("RECENT AUDIT LOGS:", JSON.stringify(logs, null, 2));
  } catch (e) {
    console.log("account_audit_logs table error:", e.message);
  }
}

checkAuditLogs().catch(console.error);
