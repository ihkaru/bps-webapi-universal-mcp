import { bpsFetch } from "../src/helpers/bps-client.js";
import { tryFetchData } from "../src/tools/bps-query.js";

async function test() {
  console.log("🚀 Testing Gini (41) in 6100...");
  const res = await tryFetchData("6100", "Kalimantan Barat", "Gini Ratio", "2024", "Mempawah", "23");
  console.log("RESULT:", JSON.stringify(res, null, 2));
}
test();
