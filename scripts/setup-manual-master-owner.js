const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const dbUrlPath = 'C:/Users/Dell/.config/neon/db_url.txt';
if (!fs.existsSync(dbUrlPath)) {
  console.error("Database connection file missing at:", dbUrlPath);
  process.exit(1);
}
const dbUrl = fs.readFileSync(dbUrlPath, 'utf8').trim();
const sql = neon(dbUrl);

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt.toString("hex")}$${hash}`;
}

// Load secrets exclusively from secure external config or environment variables (never committed to Git)
function loadSecureCredentials() {
  const configPath = 'C:/Users/Dell/.config/usman_gtm/admin_credentials.json';
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {
    username: process.env.MASTER_ADMIN_USERNAME || "master_owner_usman",
    email: process.env.MASTER_ADMIN_EMAIL || "master_owner@usmanai.internal",
    password: process.env.MASTER_ADMIN_PASSWORD || "",
    recoveryKey: process.env.MASTER_RECOVERY_KEY || "",
  };
}

const creds = loadSecureCredentials();
if (!creds.password) {
  console.error("Error: MASTER_ADMIN_PASSWORD must be provided via environment variable or secure config.");
  process.exit(1);
}

async function setupMasterOwner() {
  console.log("Setting up dedicated Master Owner manual credentials in Neon DB...");

  const pwdHash = hashPassword(creds.password);
  const recoveryHash = creds.recoveryKey ? hashPassword(creds.recoveryKey) : null;

  const existingRow2 = await sql`SELECT id, username, email FROM users WHERE id = 2`;
  
  let updatedRow;
  if (existingRow2.length > 0) {
    const res = await sql`
      UPDATE users
      SET username = ${creds.username},
          email = ${creds.email},
          full_name = 'Muhammad Usman (Master Owner)',
          password_hash = ${pwdHash},
          recovery_key_hash = COALESCE(${recoveryHash}, recovery_key_hash),
          role = 'SUPER_ADMIN',
          account_type = 'MASTER_OWNER',
          status = 'ACTIVE',
          plan = 'OWNER_LIFETIME',
          subscription_status = 'PERMANENT',
          subscription_expires_at = NULL,
          active = 1,
          is_active = 1,
          updated_at = NOW()
      WHERE id = 2
      RETURNING id, username, email, full_name, role, account_type, status, plan, active, is_active
    `;
    updatedRow = res[0];
  } else {
    const res = await sql`
      INSERT INTO users (username, email, full_name, password_hash, recovery_key_hash, role, account_type, workspace_id, status, plan, subscription_status, subscription_expires_at, active, is_active, tenant_id, created_at)
      VALUES (${creds.username}, ${creds.email}, 'Muhammad Usman (Master Owner)', ${pwdHash}, ${recoveryHash}, 'SUPER_ADMIN', 'MASTER_OWNER', 1, 'ACTIVE', 'OWNER_LIFETIME', 'PERMANENT', NULL, 1, 1, 1, NOW())
      ON CONFLICT (username) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            recovery_key_hash = COALESCE(EXCLUDED.recovery_key_hash, users.recovery_key_hash),
            role = 'SUPER_ADMIN',
            account_type = 'MASTER_OWNER',
            status = 'ACTIVE',
            plan = 'OWNER_LIFETIME',
            active = 1,
            is_active = 1
      RETURNING id, username, email, full_name, role, account_type, status, plan, active, is_active
    `;
    updatedRow = res[0];
  }

  console.log("\n=======================================================");
  console.log(" MASTER OWNER MANUAL CREDENTIALS CONFIGURED SECURELY");
  console.log("=======================================================");
  console.log("Username:     ", updatedRow.username);
  console.log("Email:        ", updatedRow.email);
  console.log("Role:         ", updatedRow.role);
  console.log("Account Type: ", updatedRow.account_type);
  console.log("Status:       ", updatedRow.status);
  console.log("Plan:         ", updatedRow.plan);
  console.log("Active:       ", updatedRow.active, updatedRow.is_active);
  console.log("=======================================================\n");
}

setupMasterOwner().catch(err => {
  console.error("Setup error:", err);
  process.exit(1);
});
