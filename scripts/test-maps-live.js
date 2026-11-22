async function testMapsExtraction() {
  const serperKey = '2baa9b7d5907ecc3fe3fceebb8c4b9b7e30e3297';
  const searchQuery = 'Dentists in New York, United States';

  console.log('Testing Maps Search for:', searchQuery);
  const placesRes = await fetch("https://google.serper.dev/places", {
    method: "POST",
    headers: {
      "X-API-KEY": serperKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: searchQuery,
      location: "New York, United States",
      hl: "en",
    }),
  });

  console.log('Places status:', placesRes.status);
  const data = await placesRes.json();
  const places = data.places || [];
  console.log(`Found ${places.length} places on Google Maps.`);

  for (let i = 0; i < Math.min(3, places.length); i++) {
    const p = places[i];
    console.log(`\n[Place ${i+1}] ${p.title}`);
    console.log(`Address: ${p.address}`);
    console.log(`Phone: ${p.phoneNumber}`);
    console.log(`Website: ${p.website}`);
    console.log(`Rating: ${p.rating} (${p.ratingCount} reviews)`);
    console.log(`Category: ${p.category}`);
  }
}

testMapsExtraction().catch(console.error);
