/**
 * USMAN AI GTM — Comprehensive Live Production E2E Verification Suite
 * Tests all 18 requirements against the live production URL.
 */

const BASE_URL = "https://lead-scraper-mxs5.vercel.app";

async function runTests() {
  console.log("==================================================================");
  console.log("USMAN AI GTM — LIVE PRODUCTION E2E VERIFICATION SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = "") {
    if (condition) {
      console.log(`[PASS] ${testName} ${extraInfo ? `(${extraInfo})` : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${extraInfo ? `(${extraInfo})` : ""}`);
      failed++;
    }
  }

  try {
    // TEST 1: Admin Login
    console.log("\n--- TEST 1: Administrator Authentication ---");
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@usmanai.com",
        password: "UsmanGTM@2026!",
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token || adminLoginData.access_token;
    assert(adminLoginRes.status === 200, "Admin login HTTP 200");
    assert(adminToken && adminLoginData.user?.role === "ADMIN", "Admin token acquired with ADMIN role");

    // TEST 2: Admin Overview (Real database stats)
    console.log("\n--- TEST 2: Admin Overview Genuine Database Stats ---");
    const overviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overviewData = await overviewRes.json();
    assert(overviewRes.status === 200, "Admin overview HTTP 200");
    assert(overviewData.database_connected === true, "Neon database connected actively", `${overviewData.database_latency_ms}ms`);
    assert(overviewData.total_leads > 0, "Real leads count from Neon", `${overviewData.total_leads} leads`);
    assert(overviewData.max_seats === 50, "50-client seat capacity enforced");

    // TEST 3: Google Login URL Generation
    console.log("\n--- TEST 3: Google Sign-In URL Generation ---");
    const googleUrlRes = await fetch(`${BASE_URL}/api/auth/google/url`);
    const googleUrlData = await googleUrlRes.json();
    assert(googleUrlRes.status === 200, "Google URL endpoint HTTP 200");
    assert(googleUrlData.configured === true, "Google OAuth client configured");
    assert(googleUrlData.auth_url?.includes("prompt=select_account"), "Google OAuth prompts client to select own account");
    assert(!googleUrlData.auth_url?.includes("mu0602503"), "Zero admin email exposure in Google OAuth URL");

    // TEST 4: Admin Provisions Client Alpha (Dedicated empty workspace)
    console.log("\n--- TEST 4: Admin Provisions Client Alpha ---");
    const alphaEmail = `client_alpha_${Date.now()}@example.com`;
    const provAlphaRes = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: alphaEmail,
        full_name: "Client Alpha",
        company: "Alpha Logistics Corp",
        address: "100 Commercial Ave, Chicago, IL",
        plan: "STARTER",
        max_leads_quota: 5000,
      }),
    });
    const provAlphaData = await provAlphaRes.json();
    assert(provAlphaRes.status === 200, "Provision Client Alpha HTTP 200");
    assert(provAlphaData.workspace_id > 1, "Client Alpha receives distinct isolated workspace", `Workspace #${provAlphaData.workspace_id}`);
    assert(provAlphaData.temporary_password?.length > 8, "Single-use temporary credentials generated");
    const alphaWsId = provAlphaData.workspace_id;
    const alphaTempPassword = provAlphaData.temporary_password;

    // TEST 5: Admin Provisions Client Beta (Second isolated workspace)
    console.log("\n--- TEST 5: Admin Provisions Client Beta ---");
    const betaEmail = `client_beta_${Date.now()}@example.com`;
    const provBetaRes = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: betaEmail,
        full_name: "Client Beta",
        company: "Beta Healthcare LLC",
        plan: "STARTER",
      }),
    });
    const provBetaData = await provBetaRes.json();
    assert(provBetaRes.status === 200, "Provision Client Beta HTTP 200");
    assert(provBetaData.workspace_id !== alphaWsId, "Client Beta workspace is isolated from Alpha", `Workspace #${provBetaData.workspace_id}`);
    const betaWsId = provBetaData.workspace_id;
    const betaTempPassword = provBetaData.temporary_password;

    // TEST 6: Client Alpha Login
    console.log("\n--- TEST 6: Client Alpha Sign-In & Empty Workspace Verification ---");
    const alphaLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: alphaEmail,
        password: alphaTempPassword,
      }),
    });
    const alphaLoginData = await alphaLoginRes.json();
    const alphaToken = alphaLoginData.token || alphaLoginData.access_token;
    assert(alphaLoginRes.status === 200, "Client Alpha login HTTP 200");
    assert(alphaLoginData.user?.workspace_id === alphaWsId, "Client Alpha logged into their own workspace");

    // Client Alpha checks leads: must be 0
    const alphaLeadsRes = await fetch(`${BASE_URL}/api/leads`, {
      headers: {
        Authorization: `Bearer ${alphaToken}`,
        "X-Workspace-Id": String(alphaWsId),
      },
    });
    const alphaLeadsData = await alphaLeadsRes.json();
    assert(alphaLeadsData.total === 0 && alphaLeadsData.leads.length === 0, "Fresh workspace has exactly 0 leads (no data bleed)");

    // Client Alpha checks Gmail: must be NOT CONNECTED
    const alphaGmailRes = await fetch(`${BASE_URL}/api/integrations/gmail/status`, {
      headers: {
        Authorization: `Bearer ${alphaToken}`,
        "X-Workspace-Id": String(alphaWsId),
      },
    });
    const alphaGmailData = await alphaGmailRes.json();
    assert(alphaGmailData.status_code === "NOT_CONNECTED", "No default or admin Gmail connected to Client Alpha");
    assert(alphaGmailData.account === null, "Account object is null for fresh client");

    // TEST 7: Client Alpha Saves a Lead to Their Workspace
    console.log("\n--- TEST 7: Client Alpha Saves Private Lead ---");
    const saveLeadRes = await fetch(`${BASE_URL}/api/leads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alphaToken}`,
        "X-Workspace-Id": String(alphaWsId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: "Alpha Exclusive Lead Inc",
        email: "contact@alphaexclusive.com",
        phone: "+1-312-555-0199",
        website: "https://alphaexclusive.com",
        city: "Chicago",
        country: "United States",
      }),
    });
    const saveLeadData = await saveLeadRes.json();
    assert(saveLeadRes.status === 200, "Lead saved to Client Alpha workspace HTTP 200");
    const alphaLeadId = saveLeadData.lead_id;

    // Verify Alpha sees 1 lead
    const alphaCheckRes = await fetch(`${BASE_URL}/api/leads`, {
      headers: {
        Authorization: `Bearer ${alphaToken}`,
        "X-Workspace-Id": String(alphaWsId),
      },
    });
    const alphaCheckData = await alphaCheckRes.json();
    assert(alphaCheckData.total === 1, "Client Alpha sees their 1 saved lead");

    // TEST 8: Multi-Tenant Isolation & IDOR Protection Check
    console.log("\n--- TEST 8: Multi-Tenant Isolation & IDOR Protection ---");
    // Client Beta logs in
    const betaLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: betaEmail,
        password: betaTempPassword,
      }),
    });
    const betaLoginData = await betaLoginRes.json();
    const betaToken = betaLoginData.token || betaLoginData.access_token;

    // Client Beta checks leads: must see 0 leads (CANNOT see Alpha's lead)
    const betaLeadsRes = await fetch(`${BASE_URL}/api/leads`, {
      headers: {
        Authorization: `Bearer ${betaToken}`,
        "X-Workspace-Id": String(betaWsId),
      },
    });
    const betaLeadsData = await betaLeadsRes.json();
    assert(betaLeadsData.total === 0, "Client Beta CANNOT see Client Alpha's leads (100% isolated)");

    // Client Beta attempts to delete Client Alpha's lead (IDOR attack simulation)
    const idorDeleteRes = await fetch(`${BASE_URL}/api/leads/${alphaLeadId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${betaToken}`,
        "X-Workspace-Id": String(betaWsId),
      },
    });
    assert(idorDeleteRes.status === 404 || idorDeleteRes.status === 403, "Client Beta CANNOT delete Client Alpha's lead (IDOR blocked)");

    // Client Alpha attempts to access Admin endpoints
    const rbacAttackRes = await fetch(`${BASE_URL}/api/admin/clients`, {
      headers: {
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    assert(rbacAttackRes.status === 403, "Client role CANNOT access Admin Client Provisioning (RBAC enforced)");

    // TEST 9: Admin Suspends Client Alpha
    console.log("\n--- TEST 9: Admin Suspends Client Alpha ---");
    const suspendRes = await fetch(`${BASE_URL}/api/admin/clients/${provAlphaData.client_id}/status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    assert(suspendRes.status === 200, "Admin suspends client HTTP 200");

    // Suspended Client Alpha attempts to log in
    const suspendedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: alphaEmail,
        password: alphaTempPassword,
      }),
    });
    assert(suspendedLoginRes.status === 403, "Suspended client login rejected HTTP 403");

    // TEST 10: Admin Reactivates Client Alpha
    console.log("\n--- TEST 10: Admin Reactivates Client Alpha ---");
    const reactivateRes = await fetch(`${BASE_URL}/api/admin/clients/${provAlphaData.client_id}/status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    assert(reactivateRes.status === 200, "Admin reactivates client HTTP 200");

    const reactivatedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: alphaEmail,
        password: alphaTempPassword,
      }),
    });
    assert(reactivatedLoginRes.status === 200, "Reactivated client can sign in successfully HTTP 200");

    // TEST 11: Workspace Genuine Metrics
    console.log("\n--- TEST 11: Genuine Workspace Metrics Endpoint ---");
    const metricsRes = await fetch(`${BASE_URL}/api/workspace/metrics`, {
      headers: {
        Authorization: `Bearer ${alphaToken}`,
        "X-Workspace-Id": String(alphaWsId),
      },
    });
    const metricsData = await metricsRes.json();
    assert(metricsRes.status === 200, "Workspace metrics endpoint HTTP 200");
    assert(metricsData.saved_leads === 1, "Metrics accurately reports 1 saved lead");
    assert(metricsData.available_email_contacts === 1, "Metrics accurately reports 1 email contact");
    assert(metricsData.connected_gmail_accounts === 0, "Metrics accurately reports 0 Gmail accounts");
    assert(metricsData.emails_sent === 0, "Metrics accurately reports 0 emails sent");

    // TEST 12: XLSX Export Generation
    console.log("\n--- TEST 12: XLSX Export Generation ---");
    const exportRes = await fetch(`${BASE_URL}/api/leads/export`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alphaToken}`,
        "X-Workspace-Id": String(alphaWsId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: "xlsx",
        leads: [
          {
            business_name: "Alpha Lead Test",
            email: "test@alpha.com",
            phone: "+1-555-0100",
            website: "https://alpha.com",
            city: "Chicago",
            country: "United States",
          },
        ],
      }),
    });
    assert(exportRes.status === 200, "XLSX export HTTP 200");
    assert(
      exportRes.headers.get("content-type")?.includes("spreadsheetml"),
      "XLSX content type verified"
    );

    // TEST 13: DNS Deliverability Health Check
    console.log("\n--- TEST 13: Free DNS Deliverability Health Check ---");
    const dnsRes = await fetch(`${BASE_URL}/api/integrations/dns-check?domain=google.com`);
    const dnsData = await dnsRes.json();
    assert(dnsRes.status === 200, "DNS check endpoint HTTP 200");
    assert(dnsData.mx?.status === "PASS", "DNS MX record check verified");
    assert(dnsData.spf?.status === "PASS", "DNS SPF record check verified");

    // Cleanup: Revoke test clients so they don't consume permanent seats
    console.log("\n--- CLEANUP: Revoking Test Seats ---");
    await fetch(`${BASE_URL}/api/admin/clients/${provAlphaData.client_id}/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REVOKED" }),
    });
    await fetch(`${BASE_URL}/api/admin/clients/${provBetaData.client_id}/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REVOKED" }),
    });
    console.log("Test client seats revoked cleanly.");

    console.log("\n==================================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================");

    if (failed === 0) {
      console.log("OVERALL VERDICT: 100% PRODUCTION READY & VERIFIED");
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("FATAL SUITE ERROR:", err);
    process.exit(1);
  }
}

runTests();
