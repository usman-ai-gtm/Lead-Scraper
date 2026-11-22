const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function inspectColumns() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position ASC;
  `;
  console.log("USERS COLUMNS:", JSON.stringify(cols, null, 2));
}

inspectColumns().catch(console.error);
