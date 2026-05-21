import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "0000";
  
  const res = await bpsFetch("/list", { model: "var", domain: targetDomain, keyword: "miskin", lang: "ind" });
  if (res?.status?.toUpperCase() === "OK" && Array.isArray(res.data?.[1])) {
    console.log(`Found ${res.data[1].length} vars for "miskin" in Pusat:`);
    res.data[1].forEach(v => {
      console.log(`  - [ID: ${v.var_id}] subject: ${v.sub_id} | title: "${v.title}"`);
    });
  }

  const res2 = await bpsFetch("/list", { model: "var", domain: targetDomain, keyword: "kemiskinan", lang: "ind" });
  if (res2?.status?.toUpperCase() === "OK" && Array.isArray(res2.data?.[1])) {
    console.log(`Found ${res2.data[1].length} vars for "kemiskinan" in Pusat:`);
    res2.data[1].forEach(v => {
      console.log(`  - [ID: ${v.var_id}] subject: ${v.sub_id} | title: "${v.title}"`);
    });
  }
}

run().catch(console.error);
