import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "3510"; // Banyuwangi
  const res = await bpsFetch("/list", { model: "var", domain: targetDomain, keyword: "miskin", lang: "ind" });
  if (res?.status?.toUpperCase() !== "OK") {
    console.error("Failed miskin:", res);
  } else {
    console.log(`Found ${res.data[1].length} variables for 'miskin' in Banyuwangi:`);
    res.data[1].forEach(v => console.log(`  - [ID: ${v.var_id}] title: "${v.title}"`));
  }

  const res2 = await bpsFetch("/list", { model: "var", domain: targetDomain, keyword: "kemiskinan", lang: "ind" });
  if (res2?.status?.toUpperCase() !== "OK") {
    console.error("Failed kemiskinan:", res2);
  } else {
    console.log(`Found ${res2.data[1].length} variables for 'kemiskinan' in Banyuwangi:`);
    res2.data[1].forEach(v => console.log(`  - [ID: ${v.var_id}] title: "${v.title}"`));
  }
}

run().catch(console.error);
