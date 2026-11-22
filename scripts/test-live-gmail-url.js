const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

function loadEnv() {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}
loadEnv();

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "usman_ai_gtm_enterprise_jwt_secret_key_2026";

function createJwtToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 7 * 24 * 60 * 60,
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

const ownerToken = createJwtToken({
  sub: "2",
  email: "master_owner@usmanai.internal",
  username: "master_owner_usman",
  role: "SUPER_ADMIN",
  account_type: "MASTER_OWNER",
  workspace_id: 5,
  status: "ACTIVE",
  plan: "OWNER_LIFETIME",
});

console.log("Testing /api/integrations/gmail/url on live production...");

const req = https.request('https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/url', {
  headers: {
    'Authorization': `Bearer ${ownerToken}`
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Raw body:", body);
    try {
      const data = JSON.parse(body);
      console.log("Configured:", data.configured);
      console.log("Redirect URI:", data.redirect_uri);
      console.log("Scopes:", data.scopes);
      console.log("Auth URL:\n", data.auth_url);
    } catch {}

    // Now test making a request to the auth_url to see Google's response!
    if (data.auth_url) {
      https.get(data.auth_url, (googleRes) => {
        console.log("\nGoogle Auth Page Status:", googleRes.statusCode);
        console.log("Google Headers location:", googleRes.headers.location);
        let gBody = '';
        googleRes.on('data', gd => gBody += gd);
        googleRes.on('end', () => {
          if (googleRes.statusCode === 200) {
            console.log("Google OAuth Consent Screen loaded successfully!");
          } else {
            console.log("Google response snippet:", gBody.slice(0, 500));
          }
        });
      });
    }
  });
});
req.on('error', console.error);
req.end();
