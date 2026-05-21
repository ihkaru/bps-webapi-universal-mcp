import { bpsFetch } from "../src/helpers/bps-client.js";

async function test() {
  const domainId = "6100";
  const varId = 40;
  const data = await bpsFetch("/list", { model: "data", domain: domainId, var: varId, lang: "ind" });
  
  console.log("Var Label:", data.var?.[0]?.label);
  console.log("Tahun Map:", JSON.stringify(data.tahun, null, 2));
  console.log("Vervar Map (Sample):", JSON.stringify(data.vervar?.slice(0, 3), null, 2));
  console.log("Datacontent (Sample):", JSON.stringify(Object.keys(data.datacontent || {}).slice(0, 3), null, 2));
}
test();
