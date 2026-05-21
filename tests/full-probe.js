import { bpsFetch } from "../src/helpers/bps-client.js";
import { curateDynamicData } from "../src/helpers/response.js";

async function probe(dom, vId, label, topic, filter) {
  const pRes = await bpsFetch("/list", { model: "th", domain: dom, var: vId, lang: "ind" });
  if (pRes?.status?.toUpperCase() === "OK") {
    const latest = pRes.data[1][0];
    const d = await bpsFetch("/list", { model: "data", domain: dom, var: vId, th: latest.th_id, lang: "ind" });
    const yearMap = {}; pRes.data[1].forEach(y => yearMap[y.th_id] = y.th);
    return curateDynamicData({ ...d, _tahunMap: yearMap }, { topic, domainLabel: label, filterRegion: filter });
  }
  return `Failed for ${topic}`;
}

async function run() {
  console.log("--- KEMISKINAN ---");
  console.log(await probe("6100", "40", "KalBar", "Kemiskinan", "Mempawah"));
  console.log("\n--- GINI RASIO ---");
  console.log(await probe("6100", "41", "KalBar", "Gini", "Mempawah"));
  console.log("\n--- IPM ---");
  console.log(await probe("6100", "136", "KalBar", "IPM", "Mempawah")); // Var 136 is common for IPM Kalbar
}
run();
