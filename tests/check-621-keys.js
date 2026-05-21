import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "0000"; // Pusat
  const varId = "621";
  
  const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: varId, lang: "ind" });
  if (pRes?.status?.toUpperCase() !== "OK") {
    console.error("Failed years:", pRes);
    return;
  }
  
  const allYears = pRes.data[1];
  const thParam = String(allYears[0].th_id);
  const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: varId, th: thParam, lang: "ind" });
  
  if (d?.status?.toUpperCase() === "OK" && d?.datacontent) {
    console.log("Keys starting with 35:");
    const keys = Object.keys(d.datacontent).filter(k => k.startsWith("35"));
    keys.forEach(k => {
      console.log(`Key: ${k} | Value: ${d.datacontent[k]}`);
    });
  }
}

run().catch(console.error);
