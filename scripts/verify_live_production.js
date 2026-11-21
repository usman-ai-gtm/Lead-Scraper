const https = require('https');
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

const BASE_URL = 'https://lead-scraper-mxs5.vercel.app';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(
      url,
      {
        method,
        headers: reqHeaders,
        timeout: 25000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, data, raw });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout on ${method} ${path}`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runLiveVerification() {
  console.log("==================================================================");
  console.log("LIVE PRODUCTION INDEPENDENT VERIFICATION (lead-scraper-mxs5.vercel.app)");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} -> ${details}`);
      failed++;
    }
  }

  // Poll until new deployment is live
  console.log("Checking live deployment status...");
  let isDeployed = false;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const pricingRes = await request('GET', '/pricing');
      if (pricingRes.raw.includes('$25') && pricingRes.raw.includes('Assalamualaikum')) {
        console.log(`✔ New commit c73e161 is LIVE on Vercel production! (detected on attempt ${attempt})`);
        isDeployed = true;
        break;
      }
    } catch {}
    console.log(`Waiting for Vercel build to finish (attempt ${attempt}/12)...`);
    await new Promise((r) => setTimeout(r, 6000));
  }

  // 1. Static Legal & Marketing Pages
  console.log("\n--- TEST SUITE 1: Legal Pages & Public Pricing ---");
  const pricingCheck = await request('GET', '/pricing');
  assert(pricingCheck.status === 200, "GET /pricing returns HTTP 200");
  assert(pricingCheck.raw.includes('$25'), "Pricing includes $25 Monthly Basic");
  assert(pricingCheck.raw.includes('$100'), "Pricing includes $100 Lifetime Deal");
  assert(pricingCheck.raw.includes('923174383702'), "Pricing links to official WhatsApp (+923174383702)");

  const termsCheck = await request('GET', '/terms');
  assert(termsCheck.status === 200, "GET /terms returns HTTP 200");
  assert(termsCheck.raw.includes('Terms of Service'), "Terms page renders valid legal terms");

  const privacyCheck = await request('GET', '/privacy');
  assert(privacyCheck.status === 200, "GET /privacy returns HTTP 200");
  assert(privacyCheck.raw.includes('Privacy Policy'), "Privacy page renders valid privacy policy");

  const aboutCheck = await request('GET', '/about');
  assert(aboutCheck.status === 200, "GET /about returns HTTP 200");

  // 2. Buying Inquiries API
  console.log("\n--- TEST SUITE 2: Buying Inquiry Submission ---");
  const inquiryRes = await request('POST', '/api/inquiries', {
    name: 'Live Verify Customer',
    whatsapp: '+923170000000',
    email: 'livebuyer@example.com',
    plan: 'BASIC',
    message: 'Salam, testing live buying inquiry from verification suite',
  });
  assert(inquiryRes.status === 200 && inquiryRes.data.success, "POST /api/inquiries succeeds with HTTP 200");
  const createdInquiryId = inquiryRes.data?.inquiry?.id;

  // 3. Admin Login & Identification of Real Owner
  console.log("\n--- TEST SUITE 3: Owner & Admin Authorization ---");
  const adminLoginRes = await request('POST', '/api/auth/login', {
    email: 'admin@usmanai.com',
    password: 'UsmanGTM@2026!',
  });
  assert(adminLoginRes.status === 200, "Owner login (admin@usmanai.com) succeeds with HTTP 200");
  const adminToken = adminLoginRes.data?.access_token || adminLoginRes.data?.token;
  assert(Boolean(adminToken), "Admin JWT session token generated successfully");

  // Verify owner identity in database
  const ownerRecord = await sql`
    SELECT id, email, role, status, plan 
    FROM users 
    WHERE email = 'admin@usmanai.com';
  `;
  assert(ownerRecord[0].role === 'ADMIN', "Authoritative DB confirms admin@usmanai.com role is ADMIN");

  const personalOwner = await sql`
    SELECT id, email, role, status, plan 
    FROM users 
    WHERE email = 'mu0602503@gmail.com';
  `;
  assert(personalOwner[0].role === 'ADMIN', "Authoritative DB confirms mu0602503@gmail.com role is ADMIN");

  // 4. Owner Viewing Client Roster with SaaS Fields
  console.log("\n--- TEST SUITE 4: Owner Dashboard Client Roster ---");
  const clientsListRes = await request('GET', '/api/admin/clients', null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert(clientsListRes.status === 200, "GET /api/admin/clients returns HTTP 200 for Owner");
  const clients = clientsListRes.data.clients || [];
  assert(clients.length > 0, `Roster returned ${clients.length} client accounts`);
  const firstClient = clients[0];
  assert('plan' in firstClient && 'remaining_days' in firstClient, "Client record includes plan and remaining_days");

  // 5. Client Default LOCKED Behavior on Protected Endpoints
  console.log("\n--- TEST SUITE 5: Client Locked Access Enforcement ---");
  const testEmail = `test_locked_live_${Date.now()}@example.com`;

  // Provision client via official Google session endpoint
  const sessionRes = await request('POST', '/api/auth/google/session', {
    email: testEmail,
    name: 'Locked Client',
  });
  const clientToken = sessionRes.data?.token || sessionRes.data?.access_token;
  const lockedUserId = sessionRes.data?.user?.id;
  const isolatedWsId = sessionRes.data?.workspace_id;
  assert(Boolean(clientToken), "Client session established successfully");
  assert(sessionRes.data?.user?.status === 'LOCKED', "New Google client defaults strictly to LOCKED status");

  // Verify LOCKED client cannot Search leads (HTTP 403)
  const searchAttempt = await request('POST', '/api/leads/search', {
    keyword: 'Real Estate',
    country: 'United States',
  }, {
    Authorization: `Bearer ${clientToken}`,
  });
  assert(searchAttempt.status === 403, "LOCKED client blocked from search with HTTP 403 Forbidden");

  // Verify LOCKED client cannot Export leads (HTTP 403)
  const exportAttempt = await request('POST', '/api/leads/export', {
    format: 'xlsx',
    leads: [{ business_name: 'Test Corp' }],
  }, {
    Authorization: `Bearer ${clientToken}`,
  });
  assert(exportAttempt.status === 403, "LOCKED client blocked from export with HTTP 403 Forbidden");

  // Verify LOCKED client cannot Send Outreach (HTTP 403)
  const outreachAttempt = await request('POST', '/api/integrations/gmail/send', {
    recipient_email: 'target@example.com',
    subject: 'Hello',
    body: 'Test',
  }, {
    Authorization: `Bearer ${clientToken}`,
  });
  assert(outreachAttempt.status === 403, "LOCKED client blocked from Gmail sending with HTTP 403 Forbidden");

  // 6. Owner Activation to Basic ($25 / 30 Days)
  console.log("\n--- TEST SUITE 6: Owner Activating Basic Plan ($25 / 30 Days) ---");
  const activateBasicRes = await request('POST', `/api/admin/clients/${lockedUserId}/subscription`, {
    action: 'ACTIVATE_BASIC',
    notes: 'Paid $25 via WhatsApp',
  }, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert(activateBasicRes.status === 200, "Owner successfully activated Basic ($25/30 Days) for client");

  // Verify client is now ACTIVE and can perform search
  const postActivateSearch = await request('POST', '/api/leads/search', {
    keyword: 'Software Houses',
    country: 'United States',
    target_count: 5,
  }, {
    Authorization: `Bearer ${clientToken}`,
  });
  assert(postActivateSearch.status === 200, "Active client can now execute lead searches (HTTP 200)");

  // 7. Owner Locking Client Account
  console.log("\n--- TEST SUITE 7: Owner Locking Client Account ---");
  const lockRes = await request('POST', `/api/admin/clients/${lockedUserId}/subscription`, {
    action: 'LOCK',
    notes: 'Locked by owner',
  }, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert(lockRes.status === 200, "Owner successfully locked client account");

  // Verify client is immediately 403 Forbidden without waiting for token expiry
  const immediateLockSearch = await request('POST', '/api/leads/search', {
    keyword: 'Software Houses',
    country: 'United States',
  }, {
    Authorization: `Bearer ${clientToken}`,
  });
  assert(immediateLockSearch.status === 403, "Locked client immediately gets HTTP 403 Forbidden");

  // 8. Owner Activating Lifetime Plan ($100)
  console.log("\n--- TEST SUITE 8: Owner Activating Lifetime Plan ($100) ---");
  const activateLifetimeRes = await request('POST', `/api/admin/clients/${lockedUserId}/subscription`, {
    action: 'ACTIVATE_LIFETIME',
    notes: 'Paid $100 Lifetime Deal via WhatsApp',
  }, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert(activateLifetimeRes.status === 200, "Owner successfully activated Lifetime Plan ($100)");

  const lifetimeUser = await sql`
    SELECT plan, status, subscription_expires_at FROM users WHERE id = ${lockedUserId};
  `;
  assert(lifetimeUser[0].plan === 'LIFETIME', "DB confirms plan is LIFETIME");
  assert(lifetimeUser[0].subscription_expires_at === null, "DB confirms Lifetime has NULL expiry date (never expires)");

  // Clean up test records
  if (createdInquiryId) {
    await sql`DELETE FROM subscription_inquiries WHERE id = ${createdInquiryId};`;
  }
  await sql`DELETE FROM users WHERE id = ${lockedUserId};`;
  await sql`DELETE FROM workspaces WHERE id = ${isolatedWsId};`;

  console.log("\n==================================================================");
  console.log(`LIVE VERIFICATION RESULT: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("==================================================================");
}

runLiveVerification().catch(console.error);
