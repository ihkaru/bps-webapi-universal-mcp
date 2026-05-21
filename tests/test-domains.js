import { bpsFetch } from "../src/helpers/bps-client.js";

async function test() {
  console.log("Fetching Kab Domains...");
  const data = await bpsFetch("/domain", { type: "kab" });
  console.log("Status:", data?.status);
  if (data?.data?.[1]) {
    console.log("Count:", data.data[1].length);
    const m = data.data[1].find(d => d.domain_name.includes("Mempawah"));
    console.log("Mempawah found:", m);
  } else {
    console.log("RAW DATA:", JSON.stringify(data, null, 2));
  }
}
test();
