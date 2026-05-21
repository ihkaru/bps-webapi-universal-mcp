import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "0000"; // Pusat
  const res = await bpsFetch("/list", { model: "var", domain: targetDomain, subject: "23", lang: "ind" });
  if (res?.status?.toUpperCase() === "OK" && Array.isArray(res.data?.[1])) {
    console.log(`Found ${res.data[1].length} variables under subject 23 in BPS Pusat:`);
    res.data[1].slice(0, 40).forEach(v => {
      console.log(`  - [ID: ${v.var_id}] title: "${v.title}"`);
    });
  } else {
    console.log("Failed BPS Pusat subject 23 fetch", res);
  }
}

run().catch(console.error);
