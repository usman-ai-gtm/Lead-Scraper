const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function testSqlQuery() {
  console.log("Testing sql.query vs sql template...");
  
  // 1. Tagged template
  const resTemplate = await sql`SELECT 1 as num`;
  console.log("sql template result:", resTemplate, "isArray:", Array.isArray(resTemplate));

  // 2. sql.query method
  try {
    const resQuery = await sql.query("SELECT 1 as num");
    console.log("sql.query result:", resQuery, "isArray:", Array.isArray(resQuery), "keys:", Object.keys(resQuery));
  } catch (e) {
    console.log("sql.query error:", e.message);
  }
}

testSqlQuery().catch(console.error);
