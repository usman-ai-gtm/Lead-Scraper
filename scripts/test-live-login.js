const fetch = require('node-fetch');
const fs = require('fs');

function loadSecureCredentials() {
  const configPath = 'C:/Users/Dell/.config/usman_gtm/admin_credentials.json';
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {
    username: process.env.MASTER_ADMIN_USERNAME || "master_owner_usman",
    password: process.env.MASTER_ADMIN_PASSWORD || "",
  };
}

const creds = loadSecureCredentials();
if (!creds.password) {
  console.error("FAIL: MASTER_ADMIN_PASSWORD must be configured in environment or external config.");
  process.exit(1);
}

async function testLiveFullFlow() {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://lead-scraper-mxs5.vercel.app';
  const loginUrl = `${baseUrl}/api/admin/auth/login`;
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      failures++;
    }
  }

  console.log('--- TEST 1: Reject Invalid Password ---');
  const badLoginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: creds.username,
      password: 'IncorrectPassword999!',
    })
  });
  assert(badLoginRes.status === 401, `Invalid password rejected with HTTP 401 (got: ${badLoginRes.status})`);

  console.log('\n--- TEST 2: Logging in manually with Rotated Master Owner Credentials ---');
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: creds.username,
      password: creds.password,
      rememberMe: true
    })
  });
  
  assert(loginRes.status === 200, `Login endpoint responded with HTTP 200 OK (got: ${loginRes.status})`);
  const authData = await loginRes.json();
  const token = authData.token;
  assert(Boolean(token && token.length > 50), `Valid signed JWT session token received (length: ${token ? token.length : 0})`);
  assert(authData.user?.role === 'SUPER_ADMIN', `User role is SUPER_ADMIN (got: ${authData.user?.role})`);
  assert(authData.user?.account_type === 'MASTER_OWNER', `Account type is MASTER_OWNER (got: ${authData.user?.account_type})`);

  // Verify Set-Cookie header has HttpOnly and SameSite
  const setCookie = loginRes.headers.get('set-cookie') || '';
  assert(setCookie.includes('HttpOnly') || setCookie.includes('httponly'), 'Session cookie includes HttpOnly flag');
  assert(setCookie.includes('SameSite') || setCookie.includes('samesite'), 'Session cookie includes SameSite flag');

  console.log('\n--- TEST 3: Accessing Protected Admin Clients API with Token ---');
  const clientsUrl = `${baseUrl}/api/admin/clients`;
  const clientsRes = await fetch(clientsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  assert(clientsRes.status === 200, `Protected clients API responded with HTTP 200 OK (got: ${clientsRes.status})`);
  const clientsData = await clientsRes.json();
  assert(typeof clientsData.total_clients === 'number' && clientsData.total_clients > 0, `Total clients managed is non-empty (got: ${clientsData.total_clients})`);

  console.log('\n--- TEST 4: Verifying Master Owner Exclusion from Client Roster ---');
  const ownerInList = (clientsData.clients || []).some(c => c.username === creds.username || c.email === creds.email);
  assert(!ownerInList, 'Master Owner is strictly EXCLUDED from paying client list');

  console.log('\n--- TEST 5: Testing Unauthorized Access Rejection (No Token) ---');
  const unauthorizedRes = await fetch(clientsUrl);
  assert(unauthorizedRes.status === 403, `Unauthorized request strictly rejected with HTTP 403 (got: ${unauthorizedRes.status})`);

  console.log('\n======================================================');
  if (failures > 0) {
    console.error(` PRODUCTION FLOW FAILED: ${failures} assertions failed!`);
    console.log('======================================================\n');
    process.exit(1);
  } else {
    console.log(' PRODUCTION MANUAL MASTER OWNER FLOW 100% VERIFIED!');
    console.log('======================================================\n');
  }
}

testLiveFullFlow().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
