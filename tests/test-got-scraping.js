import { gotScraping } from "got-scraping";
import { BASE_URL, API_KEY } from "../src/config.js";

async function run() {
  console.log("🚀 Testing got-scraping against BPS Web API...");
  const url = `${BASE_URL}/domain/type/all/key/${API_KEY}/`;
  console.log(`📡 Querying: ${url}`);
  
  try {
    const response = await gotScraping({
      url: url,
      method: "GET",
      responseType: "json"
    });
    
    console.log("✅ Success! Response Status:", response.statusCode);
    console.log("Response Body (first few lines):");
    const bodyStr = JSON.stringify(response.body, null, 2);
    console.log(bodyStr.substring(0, 1000) + "\n...");
  } catch (error) {
    console.error("❌ Failed with got-scraping:", error.message);
    if (error.response) {
      console.error("Status:", error.response.statusCode);
      console.error("Body:", error.response.body);
    }
  }
}

run();
