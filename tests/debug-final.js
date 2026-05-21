import { bpsFetch } from "../src/helpers/bps-client.js";

async function test() {
  const domain = "6100";
  const varId = "41";
  const res = await bpsFetch("/list", { model: "data", domain, var: varId, lang: "ind" });
  console.log("ALL KEYS:", Object.keys(res));
  if (res.status === "OK") {
    console.log("--- METADATA ---");
    console.log("var:", res.var?.[0]);
    console.log("vervar (sample):", res.vervar?.[0]);
    console.log("tahun (sample):", res.tahun?.[0]);
    console.log("datacontent keys (sample):", Object.keys(res.datacontent || {}).slice(0, 3));
  } else {
    console.log("RESPONSE:", JSON.stringify(res, null, 2));
  }
}
test();
