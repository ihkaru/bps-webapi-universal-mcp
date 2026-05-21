import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const res = await bpsFetch("/list", { model: "strategic", domain: "3500", lang: "ind" });
  if (res?.status?.toUpperCase() === "OK" && Array.isArray(res.data?.[1])) {
    const list = res.data[1];
    console.log(`Found ${list.length} strategic indicators for Jatim:`);
    list.forEach(i => {
      console.log(`  - [ID: ${i.var_id}] subject: ${i.subject_id} | name: "${i.title || i.name || i.label}"`);
    });
  } else {
    console.error("Failed strategic list:", res);
  }
}

run().catch(console.error);
