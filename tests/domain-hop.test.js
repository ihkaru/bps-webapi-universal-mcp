/**
 * domain-hop.test.js
 * Verifies that the server automatically falls back to provincial data 
 * when regency data is missing requested years (v2.3 feature).
 */
import { register } from '../src/tools/bps-query.js';

// Mock Server
const mockServer = {
  tool: (name, desc, schema, handler) => {
    mockServer.handler = handler;
  }
};

register(mockServer);

async function test() {
  console.log("🚀 Testing Domain Hopping (v2.3)...");
  
  // Test case: Yogyakarta (3471) TPT for 2025
  // We know local 3471 only has 2024, but 3400 has 2025.
  const result = await mockServer.handler({
    topic: "Tingkat Pengangguran Terbuka",
    region: "Yogyakarta",
    year: "2025"
  });

  const text = result.content[0].text;
  console.log("\n--- RESULT ---");
  console.log(text);
  console.log("--------------\n");

  if (text.includes("5,72") && text.includes("via Di Yogyakarta")) {
    console.log("✅ SUCCESS: Domain hopping worked and retrieved 2025 data!");
  } else {
    console.log("❌ FAILURE: Could not find 2025 data or fallback didn't trigger.");
    process.exit(1);
  }
}

test().catch(err => {
  console.error("💥 Test crashed:", err);
  process.exit(1);
});
