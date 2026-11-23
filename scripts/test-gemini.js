const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
const key = match ? match[1] : '';

async function test(model) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Say Hello USMAN AI in one word' }] }] })
    });
    console.log(model, '-> Status:', res.status);
    if (res.status === 200) {
      const data = await res.json();
      console.log('Result:', data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      return true;
    } else {
      const txt = await res.text();
      console.log('Fail:', txt.slice(0, 150));
      return false;
    }
  } catch (e) {
    console.error(e.message);
    return false;
  }
}

async function run() {
  await test('gemini-2.5-flash-lite');
  await test('gemini-3.5-flash-lite');
  await test('gemini-flash-latest');
}
run();
