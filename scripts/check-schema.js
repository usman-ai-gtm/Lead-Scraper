const fs = require('fs');
const { neon } = require('@neondatabase/serverless');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function checkCols() {
  const srCols = await sql.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'search_records'
    ORDER BY ordinal_position
  `);
  console.log('SEARCH_RECORDS COLUMNS:');
  srCols.forEach(c => console.log(' ', c.column_name, c.data_type, c.is_nullable));

  const leadCols = await sql.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'leads'
    ORDER BY ordinal_position
  `);
  console.log('LEADS COLUMNS:');
  leadCols.forEach(c => console.log(' ', c.column_name, c.data_type, c.is_nullable));
}
checkCols().catch(console.error);
