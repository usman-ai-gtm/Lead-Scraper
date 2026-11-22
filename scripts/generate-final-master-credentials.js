/**
 * USMAN AI GTM - Generate Final Master Owner Credentials & Real Live Verification
 * 
 * Rules:
 * - Generates definitive Master Owner credentials
 * - Updates Neon Cloud PostgreSQL DB (Row ID 2)
 * - Writes credentials to external private file: C:/Users/Dell/.config/usman_gtm/admin_credentials.json
 * - NEVER prints raw secrets to terminal stdout or logs
 * - Performs ONE real live login test against production
 * - Verifies protected Owner API with session token
 * - Confirms data integrity
 * - Exits with non-zero code on any failure
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const dbUrlPath = 'C:/Users/Dell/.config/neon/db_url.txt';
if (!fs.existsSync(dbUrlPath)) {
  console.error("FAIL: Database connection file missing at:", dbUrlPath);
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

function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
  if (storedHash.startsWith("pbkdf2_sha256$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 4) return false;
    const [, iterationsStr, saltHex, expectedHashHex] = parts;
    const iterations = parseInt(iterationsStr, 10);
    const salt = Buffer.from(saltHex, "hex");
    const computedHash = crypto.pbkdf2Sync(plainPassword, salt, iterations, 32, "sha256").toString("hex");
    const a = Buffer.from(computedHash, "utf-8");
    const b = Buffer.from(expectedHashHex, "utf-8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  return false;
}

async function runFinalSetup() {
  console.log("=======================================================");
  console.log(" FINAL MASTER OWNER CREDENTIAL GENERATION & VERIFICATION");
  console.log("=======================================================\n");

  let failures = 0;
  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      failures++;
    }
  }

  // 1. Generate fresh secure credentials
  console.log("--- 1. Generating Fresh Cryptographic Credentials ---");
  const randBytes = crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  const finalPassword = 'Usman#O' + randBytes.slice(0, 8) + '!8x' + randBytes.slice(8, 14) + '$' + Date.now().toString().slice(-4);
  const finalRecoveryKey = 'REC-' + crypto.randomBytes(16).toString('hex').toUpperCase();

  assert(finalPassword.length >= 24, `Generated strong password (length: ${finalPassword.length} chars)`);
  assert(finalRecoveryKey.startsWith('REC-') && finalRecoveryKey.length === 36, `Generated Master Recovery Key (length: ${finalRecoveryKey.length} chars)`);

  // 2. Hash both credentials with PBKDF2
  const pwdHash = hashPassword(finalPassword);
  const recoveryHash = hashPassword(finalRecoveryKey);

  // 3. Update Neon Cloud Database (Row ID 2)
  console.log("\n--- 2. Updating Production Neon PostgreSQL Database ---");
  const updateRes = await sql`
    UPDATE users
    SET username = 'master_owner_usman',
        email = 'master_owner@usmanai.internal',
        full_name = 'Muhammad Usman (Master Owner)',
        password_hash = ${pwdHash},
        recovery_key_hash = ${recoveryHash},
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
    RETURNING id, username, email, role, account_type, status, plan, subscription_expires_at, active, is_active
  `;

  assert(updateRes.length > 0, "Master Owner row (ID: 2) successfully updated in Neon DB");
  const updatedUser = updateRes[0];
  assert(updatedUser.role === "SUPER_ADMIN", `Role verified as SUPER_ADMIN (got: ${updatedUser.role})`);
  assert(updatedUser.account_type === "MASTER_OWNER", `Account type verified as MASTER_OWNER (got: ${updatedUser.account_type})`);
  assert(updatedUser.status === "ACTIVE", `Status verified as ACTIVE (got: ${updatedUser.status})`);
  assert(updatedUser.plan === "OWNER_LIFETIME", `Plan verified as OWNER_LIFETIME (got: ${updatedUser.plan})`);
  assert(updatedUser.subscription_expires_at === null, "Subscription expiry strictly NULL (Permanent)");

  // 4. Save to secure external file outside repository
  console.log("\n--- 3. Storing Credentials in Private Local Configuration ---");
  const secureDir = 'C:/Users/Dell/.config/usman_gtm';
  if (!fs.existsSync(secureDir)) fs.mkdirSync(secureDir, { recursive: true });
  const secureFilePath = path.join(secureDir, 'admin_credentials.json');

  const credsPayload = {
    username: updatedUser.username,
    email: updatedUser.email,
    password: finalPassword,
    recoveryKey: finalRecoveryKey,
    loginUrl: "https://lead-scraper-mxs5.vercel.app/admin/login",
    updatedAt: new Date().toISOString(),
    instructions: "These are your Master Owner credentials. Do NOT commit this file to Git."
  };

  fs.writeFileSync(secureFilePath, JSON.stringify(credsPayload, null, 2), { mode: 0o600 });
  assert(fs.existsSync(secureFilePath), `Credentials securely saved to: ${secureFilePath}`);

  // 5. Verify local PBKDF2 match before network test
  assert(verifyPassword(finalPassword, pwdHash) === true, "Password matches stored PBKDF2 hash");
  assert(verifyPassword(finalRecoveryKey, recoveryHash) === true, "Recovery key matches stored PBKDF2 hash");

  // 6. Perform ONE real live login test against production
  console.log("\n--- 4. Performing ONE Real Live Login Test Against Production ---");
  const prodLoginUrl = "https://lead-scraper-mxs5.vercel.app/api/admin/auth/login";
  const loginRes = await fetch(prodLoginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: updatedUser.username,
      password: finalPassword,
      rememberMe: true,
    }),
  });

  assert(loginRes.status === 200, `Live login responded with HTTP 200 OK (got: ${loginRes.status})`);
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(Boolean(token && token.length > 50), `JWT Session token received (length: ${token ? token.length : 0})`);
  assert(loginData.user?.role === "SUPER_ADMIN", `Authenticated user role is SUPER_ADMIN (got: ${loginData.user?.role})`);
  assert(loginData.user?.account_type === "MASTER_OWNER", `Authenticated account_type is MASTER_OWNER (got: ${loginData.user?.account_type})`);
  assert(loginData.redirectUrl === "/app/admin/clients", `Redirect URL is /app/admin/clients (got: ${loginData.redirectUrl})`);

  const setCookie = loginRes.headers.get("set-cookie") || "";
  assert(setCookie.includes("usman_gtm_token"), "Set-Cookie header includes usman_gtm_token");
  assert(setCookie.includes("HttpOnly") || setCookie.includes("httponly"), "Cookie has HttpOnly flag");
  assert(setCookie.includes("SameSite") || setCookie.includes("samesite"), "Cookie has SameSite flag");

  // 7. Test Protected Admin API with issued token
  console.log("\n--- 5. Verifying Protected Owner APIs with Session Token ---");
  const clientsUrl = "https://lead-scraper-mxs5.vercel.app/api/admin/clients";
  const clientsRes = await fetch(clientsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  assert(clientsRes.status === 200, `Protected /api/admin/clients responded with HTTP 200 OK (got: ${clientsRes.status})`);
  const clientsData = await clientsRes.json();
  assert(typeof clientsData.total_clients === "number" && clientsData.total_clients > 0, `Total clients count is positive (got: ${clientsData.total_clients})`);
  
  const ownerInClientList = (clientsData.clients || []).some(c => c.username === updatedUser.username || c.email === updatedUser.email);
  assert(!ownerInClientList, "Master Owner is strictly EXCLUDED from paying client roster");

  // 8. Verify Page Render with Session Cookie
  console.log("\n--- 6. Verifying Dashboard HTML Render with Session Cookie ---");
  const cookieStr = setCookie.split(";")[0];
  const dashboardPageRes = await fetch("https://lead-scraper-mxs5.vercel.app/app/admin/clients", {
    headers: { Cookie: cookieStr },
  });
  assert(dashboardPageRes.status === 200, `Dashboard HTML page responded with HTTP 200 OK (got: ${dashboardPageRes.status})`);
  const htmlText = await dashboardPageRes.text();
  assert(htmlText.includes("<html") && htmlText.includes("</html>"), "Dashboard returned valid complete HTML document");

  // 9. Verify All Customer Records Preserved
  console.log("\n--- 7. Verifying Customer Records Data Integrity ---");
  const countRes = await sql`SELECT COUNT(*)::int as count FROM users`;
  const totalUsers = countRes[0].count;
  assert(totalUsers >= 34, `All customer accounts remain intact in Neon DB (total count: ${totalUsers})`);

  // 10. Summary
  console.log("\n=======================================================");
  if (failures > 0) {
    console.error(` FINAL VERIFICATION FAILED: ${failures} assertions failed!`);
    console.log("=======================================================\n");
    process.exit(1);
  } else {
    console.log(" FINAL MASTER OWNER PRODUCTION LOGIN 100% VERIFIED!");
    console.log(" Credentials saved safely to: C:/Users/Dell/.config/usman_gtm/admin_credentials.json");
    console.log(" NO FURTHER PASSWORD RESET TESTS WERE PERFORMED.");
    console.log("=======================================================\n");
  }
}

runFinalSetup().catch(err => {
  console.error("Execution error:", err);
  process.exit(1);
});
