import { bpsFetch } from "../src/helpers/bps-client.js";

async function test() {
  const domain = "6100";
  const varId = "41";
  const res = await bpsFetch("/list", { model: "data", domain, var: varId, lang: "ind" });
  console.log("KEYS:", Object.keys(res));
  console.log("VAR:", JSON.stringify(res.var, null, 2));
  console.log("TAHUN (First 1):", JSON.stringify(res.tahun?.slice(0, 1), null, 2));
}
test();
