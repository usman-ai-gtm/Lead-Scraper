const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

const dbUrlPath = "C:/Users/Dell/.config/neon/db_url.txt";
const dbUrl = fs.readFileSync(dbUrlPath, "utf8").trim();
const sql = neon(dbUrl);

async function clean() {
  await sql.query("DELETE FROM users WHERE id != 2");
  await sql.query("DELETE FROM workspaces WHERE id NOT IN (SELECT workspace_id FROM users WHERE id = 2)");
  const users = await sql.query("SELECT id, username, email, role, account_type, status, plan FROM users");
  console.log("Sole users in DB:", users);
}
clean();
