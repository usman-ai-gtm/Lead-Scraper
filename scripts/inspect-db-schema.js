const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function getDbUrl() {
  const p = "C:/Users/Dell/.config/neon/db_url.txt";
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, "utf8").trim();
  }
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) return match[1];
  }
  return null;
}

const dbUrl = getDbUrl();
if (!dbUrl) {
  console.error("No database URL found");
  process.exit(1);
}

const sql = neon(dbUrl);

async function inspect() {
  console.log("=== CHECKING DATABASE SCHEMA ===");
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log("Tables found:", tables.map(t => t.table_name));

  const targetTables = [
    'users', 'workspaces', 'leads', 'search_records', 'search_record_leads',
    'workspace_profiles', 'chat_conversations', 
    'chat_messages', 'email_templates', 'campaigns', 'active_search_jobs'
  ];

  for (const t of targetTables) {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${t}
      ORDER BY ordinal_position
    `;
    if (cols.length > 0) {
      console.log(`\nTable [${t}] (${cols.length} cols):`);
      console.log(cols.map(c => `  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`).join('\n'));
    } else {
      console.log(`\nTable [${t}] DOES NOT EXIST yet.`);
    }
  }

  // Check unique constraints and indexes on leads
  const indexes = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'leads'
  `;
  console.log("\nIndexes on leads:", indexes);

  // Check current users in DB
  const users = await sql`SELECT id, username, email, role, plan, status FROM users ORDER BY id ASC`;
  console.log("\nCurrent Users in DB:", users);
}

inspect().catch(err => {
  console.error("Inspect error:", err);
  process.exit(1);
});
