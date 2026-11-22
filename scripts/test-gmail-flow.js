const { neon } = require("@neondatabase/serverless");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");

const dbUrl = fs.readFileSync("C:/Users/Dell/.config/neon/db_url.txt", "utf8").trim();
const sql = neon(dbUrl);

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt.toString("hex")}$${hash}`;
}

async function testGmailFlow() {
  console.log("=== USMAN AI GTM — TESTING GMAIL OAUTH FLOW ===");

  const testStamp = Date.now();
  const testUser = `test_gmail_${testStamp}`;
  const testPass = "TestGmailPass@2026!";
  const pwdHash = hashPassword(testPass);
  const nowIso = new Date().toISOString();

  // Create workspace
  const ws = await sql.query(
    "INSERT INTO workspaces (name, created_at, tenant_id) VALUES ($1, $2, 1) RETURNING id",
    [`Test Gmail Workspace ${testStamp}`, nowIso]
  );
  const wsId = ws[0].id;

  // Create Lifetime User
  const u = await sql.query(
    `INSERT INTO users (
      username, email, password_hash, full_name, role, account_type,
      workspace_id, status, plan, subscription_status, subscription_start,
      subscription_expires_at, active, is_active, created_at, tenant_id
    ) VALUES (
      $1::text, $2::text, $3::text, $4::text, 'CLIENT', 'PAID_CLIENT',
      $5::int4, 'ACTIVE', 'LIFETIME', 'ACTIVE', $6::timestamptz,
      null, 1, 1, $7::text, 1
    ) RETURNING id`,
    [testUser, `${testUser}@app.client`, pwdHash, "Test Gmail User", wsId, nowIso, nowIso]
  );
  const userId = u[0].id;
  console.log(`Created disposable user ID #${userId} in workspace #${wsId}`);

  try {
    // Perform real login request on live production website
    console.log("Logging in via https://lead-scraper-mxs5.vercel.app/api/auth/login ...");
    const loginData = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({ email: testUser, password: testPass });
      const req = https.request("https://lead-scraper-mxs5.vercel.app/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      }, (res) => {
        let b = "";
        res.on("data", d => b += d);
        res.on("end", () => {
          resolve({ status: res.statusCode, body: JSON.parse(b), cookies: res.headers["set-cookie"] });
        });
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    console.log("Login HTTP Status:", loginData.status);
    const token = loginData.body.token || loginData.body.access_token;
    console.log("Token received successfully:", Boolean(token));

    // Request Gmail OAuth URL
    console.log("\nCalling /api/integrations/gmail/url with authenticated token...");
    const gmailUrlData = await new Promise((resolve, reject) => {
      const req = https.request("https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/url", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Workspace-Id": String(wsId),
        },
      }, (res) => {
        let b = "";
        res.on("data", d => b += d);
        res.on("end", () => {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        });
      });
      req.on("error", reject);
      req.end();
    });

    console.log("Gmail URL HTTP Status:", gmailUrlData.status);
    console.log("Configured:", gmailUrlData.body.configured);
    console.log("Redirect URI:", gmailUrlData.body.redirect_uri);
    console.log("Scopes:", gmailUrlData.body.scopes);
    console.log("\nGenerated Google Auth URL:\n", gmailUrlData.body.auth_url);

    // Call Google Auth URL directly
    if (gmailUrlData.body.auth_url) {
      console.log("\nRequesting Google OAuth Consent endpoint...");
      const googleRes = await new Promise((resolve, reject) => {
        https.get(gmailUrlData.body.auth_url, (res) => {
          let b = "";
          res.on("data", d => b += d);
          res.on("end", () => {
            resolve({ status: res.statusCode, location: res.headers.location, bodySnippet: b.slice(0, 1000) });
          });
        }).on("error", reject);
      });

      console.log("Google HTTP Status:", googleRes.status);
      console.log("Google Location header:", googleRes.location || "None (Page rendered directly)");
      if (googleRes.bodySnippet.includes("Access blocked") || googleRes.bodySnippet.includes("has not completed the Google verification process")) {
        console.log("\n[CONFIRMED GOOGLE ERROR]");
        console.log("Google returned 'Access blocked / verification process incomplete' screen.");
      } else {
        console.log("Google response snippet:\n", googleRes.bodySnippet.slice(0, 300));
      }
    }

  } finally {
    // Cleanup disposable test account
    console.log("\nCleaning up disposable test account...");
    await sql.query("DELETE FROM users WHERE id = $1", [userId]);
    await sql.query("DELETE FROM workspaces WHERE id = $1", [wsId]);
    console.log("Cleanup complete.");
  }
}

testGmailFlow().catch(console.error);
