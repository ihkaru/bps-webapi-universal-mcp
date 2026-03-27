/**
 * confidence.test.js
 * Verifies the v2.3 Confidence Scoring and Transparency logic.
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
  console.log("🚀 Testing Confidence Scoring (v2.3)...");
  
  // Case: Biaya Hidup in Jakarta Timur for 2026
  // This should trigger Staleness (2024) and Proxy (Garis Kemiskinan)
  const result = await mockServer.handler({
    topic: "Biaya Hidup",
    region: "Jakarta Timur",
    year: "2026"
  });

  const text = result.content[0].text;
  console.log("\n--- RESULT ---");
  console.log(text);
  console.log("--------------\n");

  if (text.includes("Tingkat Keyakinan") && text.includes("Keterbatasan Data")) {
    console.log("✅ SUCCESS: Confidence score and limitations are displayed!");
    if (text.includes("50%")) {
      console.log("✅ SUCCESS: Confidence score is 50% as expected (100 - 30 proxy - 20 staleness).");
    }
  } else {
    console.log("❌ FAILURE: Confidence or limitations missing.");
    process.exit(1);
  }
}

test().catch(err => {
  console.error("💥 Test crashed:", err);
  process.exit(1);
});
