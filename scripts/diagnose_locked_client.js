const https = require('https');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://lead-scraper-mxs5.vercel.app');
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(url, { method, headers: reqHeaders }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let data = raw;
        try {
          data = JSON.parse(raw);
        } catch {}
        resolve({ status: res.statusCode, data, raw });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function test() {
  const testEmail = `diag_locked_${Date.now()}@example.com`;
  console.log('Testing with email:', testEmail);

  // Call POST /api/auth/google/session
  const sess = await request('POST', '/api/auth/google/session', {
    email: testEmail,
    name: 'Diag Locked Client',
  });
  console.log('SESSION STATUS:', sess.status);
  console.log('SESSION DATA:', sess.data);

  const token = sess.data?.token || sess.data?.access_token;
  console.log('TOKEN:', token ? token.slice(0, 25) + '...' : 'NONE');

  // Call POST /api/leads/search
  const search = await request('POST', '/api/leads/search', {
    keyword: 'Dentists',
    country: 'United States',
  }, {
    Authorization: `Bearer ${token}`,
  });
  console.log('SEARCH STATUS:', search.status);
  console.log('SEARCH DATA:', search.data);

  // Call POST /api/leads/export
  const exp = await request('POST', '/api/leads/export', {
    format: 'xlsx',
    leads: [{ business_name: 'Test' }],
  }, {
    Authorization: `Bearer ${token}`,
  });
  console.log('EXPORT STATUS:', exp.status);
  console.log('EXPORT DATA:', exp.data);
}

test().catch(console.error);
