import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const res = await bpsFetch("/list", { model: "subject", domain: "3500", lang: "ind" });
  if (res?.status?.toUpperCase() === "OK" && Array.isArray(res.data?.[1])) {
    res.data[1].forEach(s => {
      console.log(`  - [ID: ${s.sub_id}] "${s.title || s.name || s.label || s.sub_name}"`);
    });
  } else {
    console.error("Failed subjects:", res);
  }
}

run().catch(console.error);
