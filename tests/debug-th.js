import { bpsFetch } from "../src/helpers/bps-client.js";

async function test() {
  const domain = "6100";
  const varId = "41";
  const pRes = await bpsFetch("/list", { model: "th", domain, var: varId, lang: "ind" });
  console.log("P_RES STATUS:", pRes.status);
  console.log("P_RES KEYS:", Object.keys(pRes));
  console.log("P_RES DATA[1] (sample):", pRes.data?.[1]?.slice(0, 1));
}
test();
