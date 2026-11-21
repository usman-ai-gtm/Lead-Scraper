const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function check() {
  const constraints = await sql`
    SELECT conname, contype, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'users'::regclass;
  `;
  console.log('USERS CONSTRAINTS:');
  console.table(constraints);

  const indexes = await sql`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'users';
  `;
  console.log('USERS INDEXES:');
  console.table(indexes);

  const emailAccConstraints = await sql`
    SELECT conname, contype, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'email_accounts'::regclass;
  `;
  console.log('EMAIL_ACCOUNTS CONSTRAINTS:');
  console.table(emailAccConstraints);
}

check().catch(console.error);
