const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim());

async function run() {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log('Tables in Neon DB:', tables.map(t => t.table_name));

  // Check if any table stores API keys or provider configs
  for (const t of ['api_providers', 'providers', 'settings', 'system_settings']) {
    if (tables.some(row => row.table_name === t)) {
      const data = await sql`SELECT * FROM ${sql(t)}`;
      console.log(`Data in ${t}:`, data);
    }
  }
}

run().catch(console.error);
