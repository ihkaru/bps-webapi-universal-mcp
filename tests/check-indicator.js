import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const res = await bpsFetch("/list", { model: "indicators", domain: "3500", lang: "ind" });
  if (res?.status?.toUpperCase() === "OK" && Array.isArray(res.data?.[1])) {
    const list = res.data[1];
    console.log(`Found ${list.length} indicators for Jatim:`);
    list.slice(0, 30).forEach(i => {
      console.log(`  - [ID: ${i.var_id}] name: "${i.title || i.name || i.label || i.indicator_name}"`);
    });
  } else {
    console.error("Failed indicator list:", res);
  }
}

run().catch(console.error);
