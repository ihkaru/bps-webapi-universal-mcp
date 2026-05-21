import { bpsFetch } from "../src/helpers/bps-client.js";
import { curateDynamicData } from "../src/helpers/response.js";

async function test_query() {
  console.log("🚀 Testing BPS Mempawah Direct Logic (v9.0)");
  
  // Directly simulate var 40 (Kemiskinan) for Mempawah via 6100
  const d = await bpsFetch("/list", { model: "data", domain: "6100", var: "40", th: "125", lang: "ind" });
  
  if (d.status?.toUpperCase() === "OK") {
    // Manually pass the thMap since we know the year 2024 is th_id 125
    const res = curateDynamicData({ ...d, _tahunMap: { "125": "2024" } }, {
      topic: "Kemiskinan",
      domainLabel: "Kalimantan Barat",
      filterRegion: "Mempawah"
    });
    console.log(res);
  } else {
    console.log("FAILED:", d);
  }
}
test_query();
