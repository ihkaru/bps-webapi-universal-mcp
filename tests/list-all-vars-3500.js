import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "3500";
  // Fetch ALL subjects first
  const sRes = await bpsFetch("/list", { model: "subject", domain: targetDomain, lang: "ind" });
  if (sRes?.status?.toUpperCase() !== "OK") {
    console.error("Failed subjects", sRes);
    return;
  }
  
  const subjects = sRes.data[1];
  console.log(`Checking variables for Jatim across ${subjects.length} subjects...`);
  
  for (const s of subjects) {
    const vRes = await bpsFetch("/list", { model: "var", domain: targetDomain, subject: s.sub_id, lang: "ind" });
    if (vRes?.status?.toUpperCase() === "OK" && Array.isArray(vRes.data?.[1])) {
      vRes.data[1].forEach(v => {
        const title = (v.title || "").toLowerCase();
        if (title.includes("miskin") || title.includes("kemiskinan") || title.includes("kemisikinan")) {
          console.log(`  - [Sub: ${s.sub_id} - ${s.sub_name}] Var ID: ${v.var_id} | Title: "${v.title}"`);
        }
      });
    }
  }
}

run().catch(console.error);
