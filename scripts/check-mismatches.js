const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim());

async function run() {
  const mismatched = await sql`SELECT id, username, email FROM users WHERE LOWER(TRIM(username)) != LOWER(TRIM(email)) OR email IS NULL`;
  console.log('Mismatched or null count:', mismatched.length);
  console.log(mismatched);

  const duplicateUsernames = await sql`
    SELECT username, count(*)
    FROM users
    GROUP BY username
    HAVING count(*) > 1
  `;
  console.log('Duplicate usernames:', duplicateUsernames);

  const duplicateEmails = await sql`
    SELECT email, count(*)
    FROM users
    GROUP BY email
    HAVING count(*) > 1
  `;
  console.log('Duplicate emails:', duplicateEmails);
}

run().catch(console.error);
