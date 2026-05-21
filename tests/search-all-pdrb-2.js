import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  console.log("🔍 Searching all variables with 'Produk Domestik' keyword in East Java (3500)...");
  const res = await bpsFetch("/list", { model: "var", domain: "3500", keyword: "Produk Domestik", lang: "ind" });
  if (res.status === "OK") {
    const vars = res.data[1];
    console.log(`Found ${vars.length} variables:`);
    vars.forEach(v => {
      console.log(`  - [ID: ${v.var_id}] ${v.title} (${v.unit})`);
    });
  } else {
    console.error("Failed:", res);
  }
}

run().catch(console.error);
