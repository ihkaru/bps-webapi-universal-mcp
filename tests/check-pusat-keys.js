import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "0000"; // Pusat
  const vars = ["183", "184", "185", "192"];
  
  for (const varId of vars) {
    const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: varId, lang: "ind" });
    if (pRes?.status?.toUpperCase() !== "OK") continue;
    
    const allYears = pRes.data[1];
    const thParam = String(allYears[0].th_id);
    const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: varId, th: thParam, lang: "ind" });
    if (d?.status?.toUpperCase() === "OK" && d?.datacontent) {
      console.log(`[Var ID: ${varId}] title: "${pRes.data[0]?.title || varId}" | keys: ${Object.keys(d.datacontent).length} | year: ${allYears[0].th}`);
    }
  }
}

run().catch(console.error);
