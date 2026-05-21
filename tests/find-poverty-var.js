import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "3500";
  const subRes = await bpsFetch("/list", { model: "var", domain: targetDomain, subject: "23", lang: "ind" });
  if (subRes?.status?.toUpperCase() !== "OK") {
    console.error("Failed:", subRes);
    return;
  }
  
  const variables = subRes.data[1];
  console.log(`Checking ${variables.length} variables for East Java...`);
  
  for (const v of variables) {
    const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: v.var_id, lang: "ind" });
    if (pRes?.status?.toUpperCase() !== "OK" || !Array.isArray(pRes.data?.[1])) continue;
    
    const allYears = pRes.data[1];
    const thParam = String(allYears[0].th_id);
    
    const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: v.var_id, th: thParam, lang: "ind" });
    if (d?.status?.toUpperCase() === "OK" && d?.datacontent) {
      const keysCount = Object.keys(d.datacontent).length;
      if (keysCount > 20) {
        console.log(`[Var ID: ${v.var_id}] title: "${v.title}" | keys: ${keysCount} | years: ${allYears.map(y => y.th).join(",")}`);
      }
    }
  }
}

run().catch(console.error);
