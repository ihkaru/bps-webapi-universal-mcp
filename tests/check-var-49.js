import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "3500";
  const varId = "49";
  
  const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: varId, lang: "ind" });
  if (pRes?.status?.toUpperCase() !== "OK") {
    console.error("Failed:", pRes);
    return;
  }
  
  const allYears = pRes.data[1];
  for (const y of allYears) {
    const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: varId, th: y.th_id, lang: "ind" });
    if (d?.status?.toUpperCase() === "OK" && d?.datacontent) {
      console.log(`Year ${y.th} (th_id: ${y.th_id}) | datacontent keys count: ${Object.keys(d.datacontent).length}`);
    } else {
      console.log(`Year ${y.th} (th_id: ${y.th_id}) | Failed or no datacontent`);
    }
  }
}

run().catch(console.error);
