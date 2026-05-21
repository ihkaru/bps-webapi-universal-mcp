import { bpsFetch } from "../src/helpers/bps-client.js";
import { curateDynamicData } from "../src/helpers/response.js";
import { tryFetchData } from "../src/tools/bps-query.js";

async function run() {
  console.log("🔍 [query-banyuwangi] Starting direct query...");

  // Search Banyuwangi Regency in domain
  const domains = await bpsFetch("/domain", { type: "kab" });
  let banyuwangi = null;
  if (domains?.data?.[1]) {
    banyuwangi = domains.data[1].find(d => d.domain_name.toLowerCase().includes("banyuwangi"));
    console.log("📍 Domain Banyuwangi:", banyuwangi);
  } else {
    console.error("❌ Failed to get domains");
    return;
  }

  if (!banyuwangi) {
    console.error("❌ Kabupaten Banyuwangi not found in BPS domains!");
    return;
  }

  // 1. Direct Banyuwangi (3510) PDRB Query
  console.log("\n--- Option 1: Direct Banyuwangi Regency Domain (3510) ---");
  const directTopic = "PDRB";
  const years = "2023,2024,2025";
  
  // Let's search variables for PDRB in Banyuwangi domain (3510)
  const varRes = await bpsFetch("/list", { model: "var", domain: banyuwangi.domain_id, keyword: "PDRB", lang: "ind" });
  if (varRes?.status === "OK" && Array.isArray(varRes.data?.[1])) {
    console.log("Found variables in 3510:");
    varRes.data[1].slice(0, 10).forEach(v => {
      console.log(`  - [${v.var_id}] ${v.title} (${v.unit})`);
    });
  } else {
    console.log("No variables found for PDRB in 3510 directly.");
  }

  // Let's run tryFetchData directly for Banyuwangi (3510)
  const directWinner = await tryFetchData(banyuwangi.domain_id, banyuwangi.domain_name, "PDRB", years);
  if (directWinner.success) {
    console.log("\n🏆 Direct Query Result:");
    const output = curateDynamicData(directWinner.dynamicData, {
      domainId: directWinner.domainId,
      domainLabel: directWinner.domainLabel,
      topic: "PDRB",
      requestedYear: years,
      varId: directWinner.selectedVar.var_id
    });
    console.log(output);
  } else {
    console.log("❌ Direct Query unsuccessful.");
  }

  // 2. Provincial Jawa Timur (3500) PDRB Query (Pivot architecture)
  // Let's check how the pivot architecture in bps-query.js behaves.
  console.log("\n--- Option 2: Provincial Pivot Domain Jawa Timur (3500) ---");
  const provId = "3500";
  const provName = "Jawa Timur";
  const pivotWinner = await tryFetchData(provId, banyuwangi.domain_name, "PDRB", years, banyuwangi.domain_name, "15", banyuwangi.domain_id);
  if (pivotWinner.success) {
    console.log("\n🏆 Pivot Query Result:");
    const output = curateDynamicData(pivotWinner.dynamicData, {
      domainId: pivotWinner.domainId,
      domainLabel: pivotWinner.domainLabel,
      mfdCode: pivotWinner.mfdCode,
      internalId: pivotWinner.internalId,
      ordinalId: pivotWinner.ordinalId,
      topic: "PDRB",
      requestedYear: years,
      varId: pivotWinner.selectedVar.var_id,
      filterRegion: banyuwangi.domain_name
    });
    console.log(output);
  } else {
    console.log("❌ Pivot Query unsuccessful.");
  }
}

run().catch(console.error);
