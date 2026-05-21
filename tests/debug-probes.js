import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "3500";
  const vars = ["49", "131", "296"];
  
  for (const varId of vars) {
    const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: varId, lang: "ind" });
    console.log(`\n--- Var ID: ${varId} ---`);
    if (pRes?.status?.toUpperCase() !== "OK") {
      console.log(`  Failed to fetch years:`, pRes);
      continue;
    }
    
    const allYears = pRes.data[1];
    console.log(`  Available years:`, allYears.map(y => `${y.th} (id: ${y.th_id})`).join(", "));
    
    const thParam = String(allYears[0].th_id);
    const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: varId, th: thParam, lang: "ind" });
    console.log(`  Data status:`, d?.status, `Availability:`, d?.["data-availability"]);
    if (d?.status?.toUpperCase() === "OK" && d?.datacontent) {
      console.log(`  Number of datacontent keys:`, Object.keys(d.datacontent).length);
    }
  }
}

run().catch(console.error);
