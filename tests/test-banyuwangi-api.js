import { gotScraping } from "got-scraping";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const url = `https://webapi.bps.go.id/v1/api/list/key/${process.env.BPS_API_KEY}/model/subject/domain/3510/lang/ind/`;
  console.log("Fetching URL:", url);
  try {
    const res = await gotScraping({
      url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log("Response status:", res.statusCode);
    console.log("Response body:", res.body);
  } catch (err) {
    console.error("Got error:", err.message);
    if (err.response) {
      console.error("Err status:", err.response.statusCode);
      console.error("Err body:", err.response.body);
    }
  }
}

run().catch(console.error);
