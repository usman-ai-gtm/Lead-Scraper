const fs = require('fs');

async function testSerperPlaces() {
  const envContent = fs.readFileSync('.env', 'utf8');
  let serperKey = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('SERPER_API_KEY=')) {
      serperKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  }

  console.log('Testing Serper Places with Key length:', serperKey.length);

  try {
    const res = await fetch("https://google.serper.dev/places", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: "Software Houses in Lahore, Pakistan",
        location: "Lahore, Pakistan",
        hl: "en",
      }),
    });

    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Places count:', Array.isArray(data.places) ? data.places.length : 0);
    if (data.places && data.places.length > 0) {
      console.log('Sample place 1:', JSON.stringify(data.places[0], null, 2));
    } else {
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('Serper Places error:', err);
  }
}

testSerperPlaces();
