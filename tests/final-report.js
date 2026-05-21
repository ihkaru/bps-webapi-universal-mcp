import { bpsFetch } from "../src/helpers/bps-client.js";
import { curateDynamicData } from "../src/helpers/response.js";

async function probe(dom, vId, topic, filter) {
  const pRes = await bpsFetch("/list", { model: "th", domain: dom, var: vId, lang: "ind" });
  if (pRes?.status?.toUpperCase() === "OK") {
    const latest = pRes.data[1][0];
    const d = await bpsFetch("/list", { model: "data", domain: dom, var: vId, th: latest.th_id, lang: "ind" });
    const yearMap = {}; pRes.data[1].forEach(y => yearMap[y.th_id] = y.th);
    return curateDynamicData({ ...d, _tahunMap: yearMap }, { topic, domainLabel: "Kalimantan Barat", filterRegion: filter });
  }
}

async function run() {
  console.log("🏛️  WILAYAH: MEMPAWAH (Audit v10.1)");
  console.log("═".repeat(48));
  
  const pov = await probe("6100", "40", "Kemiskinan", "Mempawah");
  console.log("🔎 Kemiskinan\n" + pov);
  
  console.log("\n" + "─".repeat(48) + "\n");
  
  const gini = await probe("6100", "41", "Gini Ratio", "Mempawah");
  console.log("🔎 Gini Ratio\n" + gini);

  console.log("\n" + "─".repeat(48) + "\n");
  
  const ipm = await probe("6100", "407", "IPM (Indeks Pembangunan Manusia)", "Mempawah");
  console.log("🔎 IPM\n" + ipm);
}
run();
