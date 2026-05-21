import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const domainId = "3500"; // Jawa Timur
  const varId = "625"; // PDRB Berlaku Kabupaten/Kota
  
  const thRes = await bpsFetch("/list", { model: "th", domain: domainId, var: varId, lang: "ind" });
  const periods = thRes.data[1];
  const th2023 = periods.find(p => p.th === "2023")?.th_id;
  
  console.log("Fetching data for 2023...");
  const dataRes = await bpsFetch("/list", { model: "data", domain: domainId, var: varId, th: String(th2023), lang: "ind" });
  
  console.log("All keys starting with '10625' (Banyuwangi):");
  const keys = Object.keys(dataRes.datacontent);
  const matchingKeys = keys.filter(k => k.startsWith("10625"));
  matchingKeys.forEach(k => {
    console.log(`  - ${k}: ${dataRes.datacontent[k]}`);
  });
  
  console.log("\nSample mapping entry:");
  console.log("Region name for val 10:", dataRes.vervar.find(v => v.val === 10));
}

run().catch(console.error);
