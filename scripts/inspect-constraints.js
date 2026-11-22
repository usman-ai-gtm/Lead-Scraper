const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function run() {
  const constraints = await sql`
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'users'::regclass
  `;
  console.log('Constraints:', JSON.stringify(constraints, null, 2));

  const indexes = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'users'
  `;
  console.log('Indexes:', JSON.stringify(indexes, null, 2));
}

run().catch(console.error);
