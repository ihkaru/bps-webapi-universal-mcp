import { tryFetchData } from "../src/tools/bps-query.js";
import { curateDynamicData } from "../src/helpers/response.js";

async function compare() {
  const regions = [
    { id: "3507", name: "Malang", label: "Kabupaten Malang", domainLabel: "Malang" },
    { id: "7317", name: "Luwu", label: "Kabupaten Luwu", domainLabel: "Luwu" }
  ];
  
  const topics = [
    { name: "IPM", sub: "26" },
    { name: "Kemiskinan", sub: "23" },
    { name: "Gini Ratio", sub: "23" }
  ];
  
  const finalResults = {};

  for (const r of regions) {
    console.log(`🔍 Processing ${r.label}...`);
    finalResults[r.name] = {};
    const provId = r.id.substring(0, 2) + "00";

    for (const t of topics) {
      // Use the provincial pivot for accuracy
      const res = await tryFetchData(provId, r.domainLabel, t.name, "2023, 2024", r.domainLabel, t.sub, r.id);
      
      if (res.success) {
        const curated = curateDynamicData(res.dynamicData, {
          domainId: res.domainId,
          domainLabel: res.domainLabel,
          mfdCode: r.id,
          internalId: res.internalId,
          ordinalId: res.ordinalId,
          topic: t.name,
          requestedYear: "2024, 2023",
          filterRegion: r.name
        });
        finalResults[r.name][t.name] = curated;
      } else {
        finalResults[r.name][t.name] = "Not found";
      }
    }
  }

  console.log("\n📊 FINAL COMPARISON (Malang vs Luwu)");
  console.log(JSON.stringify(finalResults, null, 2));
}

compare().catch(console.error);
