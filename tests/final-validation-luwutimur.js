import { tryFetchData } from "../src/tools/bps-query.js";
import { curateDynamicData } from "../src/helpers/response.js";

async function validate() {
  console.log("🏁 Final Validation: Luwu Timur (v14.1 Ordinal Calibration)");
  
  // Topic: Gini Ratio (vId 468 in 7300)
  const result = await tryFetchData("7300", "Luwu Timur", "Gini Ratio", "2024", "Luwu Timur", "23", "7324");
  
  if (result.success) {
    const curated = curateDynamicData(result.dynamicData, {
      domainId: result.domainId,
      domainLabel: result.domainLabel,
      mfdCode: result.mfdCode,
      internalId: result.internalId,
      ordinalId: result.ordinalId,
      topic: "Gini Ratio",
      requestedYear: "2024",
      filterRegion: "Luwu Timur"
    });
    
    console.log("✅ Success!");
    console.log("📊 Results for Luwu Timur:");
    console.log(curated);
  } else {
    console.log("❌ Failed to find data.");
  }
}

validate().catch(console.error);
