import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "0000"; // Pusat
  const vars = ["620", "621", "622", "623", "624"];
  
  // Search with keyword miskin
  const res = await bpsFetch("/list", { model: "var", domain: targetDomain, keyword: "miskin", lang: "ind" });
  if (res?.status?.toUpperCase() === "OK" && Array.isArray(res.data?.[1])) {
    const list = res.data[1];
    list.forEach(v => {
      if (vars.includes(String(v.var_id))) {
        console.log(`[Var ID: ${v.var_id}] Title: "${v.title}" | Subject: ${v.sub_id}`);
      }
    });
  }
}

run().catch(console.error);
