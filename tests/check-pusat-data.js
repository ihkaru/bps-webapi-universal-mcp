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
  console.log("Years available for 621:", allYears.map(y => `${y.th} (id: ${y.th_id})`).join(", "));
  
  const thParam = String(allYears[0].th_id);
  const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: varId, th: thParam, lang: "ind" });
  console.log("Data for 621 status:", d?.status, "availability:", d?.["data-availability"]);
  if (d?.status?.toUpperCase() === "OK" && d?.datacontent) {
    console.log("Keys in 621 datacontent:", Object.keys(d.datacontent).slice(0, 10));
    console.log("First content value:", Object.values(d.datacontent)[0]);
  }
  
  const vv = await bpsFetch("/list", { model: "vervar", domain: targetDomain, var: varId, lang: "ind" });
  console.log("Vervar for 621 status:", vv?.status);
  if (vv?.status?.toUpperCase() === "OK" && Array.isArray(vv.data?.[1])) {
    console.log("Vervar list sample:", vv.data[1].slice(0, 10).map(v => `${v.label} (id: ${v.item_ver_id})`));
  }
}

run().catch(console.error);
