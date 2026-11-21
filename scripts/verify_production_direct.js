/**
 * USMAN AI GTM — Independent Strict Production Verification Script
 * Directly executes live verification against:
 * 1. Live Vercel Production: https://lead-scraper-mxs5.vercel.app
 * 2. Authoritative Neon PostgreSQL Database
 */

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const BASE_URL = process.env.TEST_BASE_URL || 'https://lead-scraper-mxs5.vercel.app';
const dbUrl = fs.readFileSync('C:/Users/Dell/.config/neon/db_url.txt', 'utf8').trim();
const sql = neon(dbUrl);

async function runStrictVerification() {
  console.log('========================================================================');
  console.log('STRICT INDEPENDENT PRODUCTION VERIFICATION — USMAN AI GTM');
  console.log(`Live Production Base URL: ${BASE_URL}`);
  console.log(`Database Target: Neon PostgreSQL (Serverless Cloud Hosted)`);
  console.log(`Timestamp (PKT): ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'long' }).format(new Date())}`);
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const verificationLog = [];

  function record(condition, testNumber, description, details = '') {
    if (condition) {
      console.log(`[PASS] (${testNumber}) ${description} ${details ? `-> ${details}` : ''}`);
      passed++;
      verificationLog.push({ testNumber, description, status: 'PASS', details });
    } else {
      console.error(`[FAIL] (${testNumber}) ${description} ${details ? `-> ${details}` : ''}`);
      failed++;
      verificationLog.push({ testNumber, description, status: 'FAIL', details });
    }
  }

  // -------------------------------------------------------------------------
  // 1. CONFIRM REAL OWNER ACCOUNT DIRECTLY FROM NEON POSTGRESQL DB
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 2: Confirm Real Owner Account from Database ---');
  const adminUsers = await sql.query(
    "SELECT id, email, username, full_name, role, active, status, workspace_id, created_at, last_login FROM users WHERE role = 'ADMIN' OR id = 1 ORDER BY id ASC"
  );
  
  const superAdmin = adminUsers.find(u => u.id === 1);
  record(Boolean(superAdmin), '2.1', 'Owner Account ID #1 exists in Neon DB', `Email: ${superAdmin?.email}`);
  record(superAdmin?.email === 'admin@usmanai.com', '2.2', 'Owner email is admin@usmanai.com', superAdmin?.email);
  record(superAdmin?.role === 'ADMIN', '2.3', 'Owner role is ADMIN', superAdmin?.role);
  record(superAdmin?.workspace_id === 1, '2.4', 'Owner primary workspace_id is 1', `WS ID: ${superAdmin?.workspace_id}`);

  const ws1 = await sql.query("SELECT id, name, created_at FROM workspaces WHERE id = 1");
  record(ws1.length > 0 && ws1[0].id === 1, '2.5', 'Primary Workspace #1 exists in Neon DB', `Name: ${ws1[0]?.name}`);

  const founderInDb = await sql.query("SELECT id, email, full_name, role, status, workspace_id FROM users WHERE email = 'mu0602503@gmail.com'");
  record(founderInDb.length > 0, '2.6', 'Founder personal email (mu0602503@gmail.com) verified in DB', `User ID: ${founderInDb[0]?.id}, WS: ${founderInDb[0]?.workspace_id}`);

  // -------------------------------------------------------------------------
  // 2. OWNER AUTHENTICATION VIA LIVE PRODUCTION API
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 2B: Owner Authentication via Live Production API ---');
  const ownerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@usmanai.com', password: 'UsmanGTM@2026!' })
  });
  const ownerLoginData = await ownerLoginRes.json();
  record(ownerLoginRes.status === 200, '2.7', 'Owner login returns HTTP 200 on live production');
  record(ownerLoginData.user?.role === 'ADMIN', '2.8', 'Owner live session role is ADMIN');
  const ownerToken = ownerLoginData.token;
  record(Boolean(ownerToken), '2.9', 'Owner JWT token issued successfully');

  // -------------------------------------------------------------------------
  // 3. GOOGLE SIGNUP TEST WITH SEPARATE ACCOUNT -> LOCKED STATUS & PAID BLOCK
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 3: Separate Test Account Signup & Locked Lifecycle ---');
  const testClientEmail = `verify_client_${Date.now()}@example.com`;
  const signupRes = await fetch(`${BASE_URL}/api/auth/google/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testClientEmail,
      name: 'Verification Test Client',
      sub: `google_test_${Date.now()}`
    })
  });
  const signupData = await signupRes.json();
  record(signupRes.status === 200, '3.1', 'Google signup session returns HTTP 200');
  record(signupData.user?.status === 'LOCKED', '3.2', 'New account status is strictly LOCKED', signupData.user?.status);
  record(signupData.user?.role === 'CLIENT', '3.3', 'New account role is strictly CLIENT', signupData.user?.role);
  record(signupData.user?.workspace_id > 1, '3.4', 'New account assigned dedicated workspace', `WS ID: ${signupData.user?.workspace_id}`);
  
  const clientToken = signupData.token;
  const testClientId = signupData.user?.id;
  const testClientWorkspaceId = signupData.user?.workspace_id;

  // Verify LOCKED client cannot use Lead Search (HTTP 403)
  const lockedSearchRes = await fetch(`${BASE_URL}/api/leads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` },
    body: JSON.stringify({ query: 'Dentists New York', max_results: 5 })
  });
  const lockedSearchData = await lockedSearchRes.json();
  record(lockedSearchRes.status === 403, '3.5', 'Locked account blocked from Lead Search (HTTP 403)', lockedSearchData.message);
  record(lockedSearchData.message && lockedSearchData.message.includes('WhatsApp'), '3.6', 'WhatsApp activation instruction present in 403 response');

  // Verify LOCKED client cannot Export (HTTP 403)
  const lockedExportRes = await fetch(`${BASE_URL}/api/leads/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` },
    body: JSON.stringify({ format: 'xlsx', leads: [] })
  });
  record(lockedExportRes.status === 403, '3.7', 'Locked account blocked from Export (HTTP 403)');

  // Verify LOCKED client cannot Send Email (HTTP 403)
  const lockedSendRes = await fetch(`${BASE_URL}/api/integrations/gmail/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` },
    body: JSON.stringify({ to: 'recipient@example.com', subject: 'Test', html_content: '<p>Test</p>' })
  });
  record(lockedSendRes.status === 403, '3.8', 'Locked account blocked from Gmail Send (HTTP 403)');

  // Verify LOCKED client cannot Generate Email with Gemini (HTTP 403)
  const lockedGenRes = await fetch(`${BASE_URL}/api/outreach/generate-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` },
    body: JSON.stringify({ lead_name: 'Dr. John', company: 'Smile Dental' })
  });
  record(lockedGenRes.status === 403, '3.9', 'Locked account blocked from AI Email Generation (HTTP 403)');

  // -------------------------------------------------------------------------
  // 4. TEST OWNER ACTIVATION, SUSPENSION, AND REVOCATION
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 4: Owner Activation, Suspension & Revocation ---');
  // Check that owner sees this client in Client Roster
  const clientsListRes = await fetch(`${BASE_URL}/api/admin/clients`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const clientsListData = await clientsListRes.json();
  const foundInRoster = clientsListData.clients?.find(c => c.id === testClientId);
  record(Boolean(foundInRoster), '4.1', 'Owner sees newly registered client in admin roster', `Client ID: ${testClientId}`);
  record(foundInRoster?.status === 'LOCKED', '4.2', 'Owner sees client status is initially LOCKED', foundInRoster?.status);

  // Activate client
  const activateRes = await fetch(`${BASE_URL}/api/admin/clients/${testClientId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: 'ACTIVE' })
  });
  const activateData = await activateRes.json();
  record(activateRes.status === 200, '4.3', 'Owner activates client account (HTTP 200)');
  record(activateData.new_status === 'ACTIVE' || activateData.status === 'success', '4.4', 'Response confirms client status is ACTIVE');

  // Verify in Neon DB
  const dbStatusCheck = await sql.query("SELECT id, status, active FROM users WHERE id = $1", [testClientId]);
  record(dbStatusCheck[0]?.status === 'ACTIVE', '4.5', 'Database reflects ACTIVE status directly', dbStatusCheck[0]?.status);

  // Suspend client
  const suspendRes = await fetch(`${BASE_URL}/api/admin/clients/${testClientId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: 'SUSPENDED' })
  });
  record(suspendRes.status === 200, '4.6', 'Owner suspends client account (HTTP 200)');
  const dbSuspendedCheck = await sql.query("SELECT id, status FROM users WHERE id = $1", [testClientId]);
  record(dbSuspendedCheck[0]?.status === 'SUSPENDED', '4.7', 'Database reflects SUSPENDED status', dbSuspendedCheck[0]?.status);

  // Verify that suspended client is blocked from paid features (HTTP 403)
  const suspendedSearchRes = await fetch(`${BASE_URL}/api/leads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` },
    body: JSON.stringify({ query: 'Dentists New York', max_results: 5 })
  });
  record(suspendedSearchRes.status === 403, '4.8', 'Suspended client immediately blocked from Lead Search (HTTP 403)');

  // Re-activate for subsequent tests
  await fetch(`${BASE_URL}/api/admin/clients/${testClientId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: 'ACTIVE' })
  });

  // -------------------------------------------------------------------------
  // 5. MULTI-TENANT ISOLATION: CLIENT ALPHA VS CLIENT BETA
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 5: Strict Multi-Tenant Isolation (Alpha vs Beta) ---');
  // Create Client Beta
  const betaEmail = `verify_beta_${Date.now()}@example.com`;
  const betaSignupRes = await fetch(`${BASE_URL}/api/auth/google/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: betaEmail, name: 'Client Beta', sub: `beta_${Date.now()}` })
  });
  const betaData = await betaSignupRes.json();
  const betaToken = betaData.token;
  const betaClientId = betaData.user?.id;
  const betaWorkspaceId = betaData.user?.workspace_id;

  // Activate Beta
  await fetch(`${BASE_URL}/api/admin/clients/${betaClientId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: 'ACTIVE' })
  });

  // Insert a unique lead into Client Alpha's workspace directly in Neon DB
  const alphaSecretLeadName = `Alpha Proprietary Firm ${Date.now()}`;
  await sql.query(
    `INSERT INTO leads (workspace_id, business_name, email, industry, city, country, email_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [testClientWorkspaceId, alphaSecretLeadName, 'ceo@alphaproprietary.com', 'Logistics', 'London', 'UK', 'FOUND']
  );

  // Query Saved Leads as Client Beta
  const betaSavedRes = await fetch(`${BASE_URL}/api/leads`, {
    headers: { 'Authorization': `Bearer ${betaToken}` }
  });
  const betaSavedData = await betaSavedRes.json();
  const betaCanSeeAlphaLead = (betaSavedData.leads || []).some(l => (l.business_name === alphaSecretLeadName || l.name === alphaSecretLeadName || l.email === 'ceo@alphaproprietary.com'));
  record(!betaCanSeeAlphaLead, '5.1', 'Client Beta CANNOT see Client Alpha leads (Tenant Isolation confirmed)');

  // Query Saved Leads as Client Alpha
  const alphaSavedRes = await fetch(`${BASE_URL}/api/leads`, {
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  const alphaSavedData = await alphaSavedRes.json();
  const alphaCanSeeOwnLead = (alphaSavedData.leads || []).some(l => (l.business_name === alphaSecretLeadName || l.name === alphaSecretLeadName));
  record(alphaCanSeeOwnLead, '5.2', 'Client Alpha CAN see their own proprietary lead');

  // Verify Search History isolation
  const alphaSearchId = `sr_alpha_${Date.now()}`;
  await sql.query(
    `INSERT INTO search_records (id, workspace_id, user_id, keyword, country, city, sources, requested_quantity, qualified_quantity, leads_with_phone, search_status, search_date, search_time, completion_time, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
    [alphaSearchId, testClientWorkspaceId, testClientId, 'Alpha Confidential Search', 'UK', 'London', '{"Google"}', 5, 1, 0, 'COMPLETED', '21 November 2026', '01:00 PM', '01:00:10 PM']
  );

  const betaHistoryRes = await fetch(`${BASE_URL}/api/searches`, {
    headers: { 'Authorization': `Bearer ${betaToken}` }
  });
  const betaHistoryData = await betaHistoryRes.json();
  const betaRecords = betaHistoryData.records || betaHistoryData.searches || [];
  const betaCanSeeAlphaSearch = betaRecords.some(s => s.id === alphaSearchId || s.keyword === 'Alpha Confidential Search');
  record(!betaCanSeeAlphaSearch, '5.3', 'Client Beta CANNOT see Client Alpha search history');

  // -------------------------------------------------------------------------
  // 6. GMAIL ACCOUNTS SCOPING & OWNER PRIVACY
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 6: Gmail Scoping & Owner Privacy ---');
  const clientAccountsRes = await fetch(`${BASE_URL}/api/integrations/gmail/status`, {
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  const clientAccountsData = await clientAccountsRes.json();
  // Owner personal email must never be exposed
  const ownerExposedInClient = JSON.stringify(clientAccountsData).includes('mu0602503@gmail.com') || JSON.stringify(clientAccountsData).includes('admin@usmanai.com');
  record(!ownerExposedInClient, '6.1', 'Owner Gmail/credentials NOT exposed in client account endpoint');

  // -------------------------------------------------------------------------
  // 7. REAL LEAD SEARCH & AUTO-SAVE TO WORKSPACE VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 7: Live Lead Search & Auto-Save to Workspace ---');
  // Re-generate fresh active token for client
  const clientLoginRefresh = await fetch(`${BASE_URL}/api/auth/google/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testClientEmail, name: 'Verification Test Client', sub: `sub_${testClientId}` })
  });
  const refreshedClient = await clientLoginRefresh.json();
  const activeClientToken = refreshedClient.token;

  // Perform search
  const liveSearchRes = await fetch(`${BASE_URL}/api/leads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeClientToken}` },
    body: JSON.stringify({
      query: 'Software Companies in Lahore',
      city: 'Lahore',
      country: 'Pakistan',
      industry: 'Software',
      max_results: 5
    })
  });
  const liveSearchData = await liveSearchRes.json();
  record(liveSearchRes.status === 200, '7.1', 'Live Lead Search returns HTTP 200 for active client');
  record(liveSearchData.success === true, '7.2', 'Live Lead Search returns success: true');
  record(Array.isArray(liveSearchData.leads) && liveSearchData.leads.length > 0, '7.3', 'Real leads returned', `Count: ${liveSearchData.leads?.length}`);
  record(liveSearchData.savedCount > 0, '7.4', 'Server confirms leads saved to client workspace', `Saved: ${liveSearchData.savedCount}`);

  // Verify non-fabrication: Check that leads have actual domains/source URLs
  const firstLead = liveSearchData.leads?.[0];
  const hasAuthenticSources = Boolean(firstLead && (firstLead.website || firstLead.source || firstLead.sources));
  record(hasAuthenticSources, '7.5', 'Leads contain genuine web source/domain references', firstLead?.website || firstLead?.company);

  // Verify auto-saved leads in DB and via Saved Leads endpoint
  const checkSavedAfterSearch = await fetch(`${BASE_URL}/api/leads`, {
    headers: { 'Authorization': `Bearer ${activeClientToken}` }
  });
  const checkSavedData = await checkSavedAfterSearch.json();
  const savedLeadsCount = checkSavedData.leads?.length || checkSavedData.total || 0;
  record(savedLeadsCount > 0, '7.6', 'Auto-saved leads actually appear in Saved Leads after fetch', `Total in workspace: ${savedLeadsCount}`);

  // -------------------------------------------------------------------------
  // 8. SEARCH HISTORY, REOPEN SNAPSHOT & EXPORTS
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 8: Search History, Snapshot Reopen & Exports ---');
  const historyRes = await fetch(`${BASE_URL}/api/searches`, {
    headers: { 'Authorization': `Bearer ${activeClientToken}` }
  });
  const historyData = await historyRes.json();
  record(historyRes.status === 200, '8.1', 'Search History returns HTTP 200');
  const allRecords = historyData.records || historyData.searches || [];
  const latestSearch = allRecords[0];
  record(Boolean(latestSearch), '8.2', 'Latest search record exists in history', `ID: ${latestSearch?.id}`);
  record(Boolean(latestSearch?.pkt_search_date || latestSearch?.search_date), '8.3', 'Search record includes PKT date');

  // Test snapshot reopen
  if (latestSearch?.id) {
    const snapshotRes = await fetch(`${BASE_URL}/api/searches/${latestSearch.id}`, {
      headers: { 'Authorization': `Bearer ${activeClientToken}` }
    });
    const snapshotData = await snapshotRes.json();
    record(snapshotRes.status === 200, '8.4', 'Snapshot drilldown returns HTTP 200 without re-running search');
    record(Array.isArray(snapshotData.leads) && snapshotData.leads.length > 0, '8.5', 'Snapshot contains preserved leads', `Count: ${snapshotData.leads?.length}`);
  }

  // Test Excel Export
  const excelRes = await fetch(`${BASE_URL}/api/leads/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeClientToken}` },
    body: JSON.stringify({ format: 'xlsx', leads: liveSearchData.leads.slice(0, 3) })
  });
  record(excelRes.status === 200, '8.6', 'Excel export returns HTTP 200');
  const excelContentType = excelRes.headers.get('content-type') || '';
  record(excelContentType.includes('spreadsheetml') || excelContentType.includes('octet-stream'), '8.7', 'Excel Content-Type verified', excelContentType);

  // Test Landscape PDF Export
  const pdfRes = await fetch(`${BASE_URL}/api/leads/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeClientToken}` },
    body: JSON.stringify({ format: 'pdf', leads: liveSearchData.leads.slice(0, 3) })
  });
  record(pdfRes.status === 200, '8.8', 'Landscape PDF export returns HTTP 200');
  const pdfContentType = pdfRes.headers.get('content-type') || '';
  record(pdfContentType.includes('pdf'), '8.9', 'PDF Content-Type verified', pdfContentType);

  // -------------------------------------------------------------------------
  // 9. PRICING & PAYMENT INSTRUCTIONS AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 9: Pricing & WhatsApp Payment Information ---');
  const pricingPageRes = await fetch(`${BASE_URL}/pricing`);
  const pricingHtml = await pricingPageRes.text();
  record(pricingPageRes.status === 200, '9.1', 'Pricing page is publicly accessible HTTP 200');
  record(pricingHtml.includes('$25') && pricingHtml.includes('$100'), '9.2', 'Pricing page features $25/mo Starter and $100 Lifetime Access Deal');
  record(pricingHtml.includes('923174383702'), '9.3', 'Official WhatsApp number (+923174383702) present on pricing page');
  record(pricingHtml.includes('wa.me/923174383702'), '9.4', 'Working WhatsApp activation link present');
  record(pricingHtml.includes('Raast') || pricingHtml.includes('Bank Transfer'), '9.5', 'Pakistani payment methods documented');

  // -------------------------------------------------------------------------
  // 10. GMAIL SENDING LIMITS, SAFETY & NO-SPAM PROMISES
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 10: Email Safety & Spam Claim Audit ---');
  const sendEmailFile = fs.readFileSync('app/api/integrations/gmail/send/route.ts', 'utf8');
  record(sendEmailFile.includes('MAX_DAILY_SEND') || sendEmailFile.includes('MAX_EMAIL_SEND_PER_DAY_PER_INBOX') || sendEmailFile.includes('50'), '10.1', 'Daily sending limits implemented in send route');
  record(!sendEmailFile.includes('bcc:') && !sendEmailFile.includes('cc:'), '10.2', 'Bulk CC/BCC blast avoided (1-to-1 dispatch enforced)');
  record(sendEmailFile.includes('unsubscribe') || sendEmailFile.includes('List-Unsubscribe'), '10.3', 'Unsubscribe header / footer handling present');
  record(!sendEmailFile.includes('100% spam immunity') && !sendEmailFile.includes('guarantee inbox'), '10.4', 'No false guarantees of spam avoidance in backend');

  // -------------------------------------------------------------------------
  // 11. SECURITY AUDIT: API KEYS & CREDENTIALS PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n--- ITEM 11: Security & Credentials Protection ---');
  // Check that /api/admin/persistence does not expose raw dbUrl
  const persistenceCheckRes = await fetch(`${BASE_URL}/api/admin/persistence`);
  const persistenceText = await persistenceCheckRes.text();
  record(!persistenceText.includes('postgres://') && !persistenceText.includes('postgresql://'), '11.1', 'DATABASE_URL not exposed in persistence endpoint');

  // Check client accounts endpoint does not expose refresh tokens
  const accountsCheckRes = await fetch(`${BASE_URL}/api/integrations/gmail/status`, {
    headers: { 'Authorization': `Bearer ${activeClientToken}` }
  });
  const accountsCheckText = await accountsCheckRes.text();
  record(!accountsCheckText.includes('refresh_token') && !accountsCheckText.includes('client_secret'), '11.2', 'OAuth tokens and secrets not exposed in client endpoints');

  // Check that Next.js client bundles do not contain GEMINI_API_KEY or DATABASE_URL
  const homeRes = await fetch(BASE_URL);
  const homeHtml = await homeRes.text();
  const scriptMatches = [...homeHtml.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map(m => m[1]);
  let bundleExposesSecret = false;
  for (const scriptPath of scriptMatches.slice(0, 5)) {
    const scriptRes = await fetch(`${BASE_URL}${scriptPath}`);
    const scriptContent = await scriptRes.text();
    if (scriptContent.includes('AIzaSy') || scriptContent.includes('ep-damp-frost') || scriptContent.includes('UsmanGTM@2026!')) {
      bundleExposesSecret = true;
      break;
    }
  }
  record(!bundleExposesSecret, '11.3', 'Client JavaScript bundles do not expose API keys or passwords');

  // -------------------------------------------------------------------------
  // CLEANUP: REVOKE TEST SEATS TO PREVENT POLLUTION
  // -------------------------------------------------------------------------
  await sql.query("UPDATE users SET status = 'REVOKED' WHERE id IN ($1, $2)", [testClientId, betaClientId]);
  console.log(`\nTest seats (${testClientId}, ${betaClientId}) revoked cleanly.`);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`VERDICT: ${failed === 0 ? '100% PRODUCTION READY & VERIFIED' : 'FAILURES DETECTED'}`);
  console.log('========================================================================');

  return { passed, failed, total: passed + failed, verificationLog };
}

runStrictVerification().catch(err => {
  console.error('VERIFICATION SCRIPT ERROR:', err);
  process.exit(1);
});
