import { bpsFetch } from "../src/helpers/bps-client.js";

async function fetchDataForPeriods(domainId, varId, thIds) {
  const dataRes = await bpsFetch("/list", { model: "data", domain: domainId, var: varId, th: thIds, lang: "ind" });
  if (dataRes.status !== "OK") {
    throw new Error(`Failed to fetch data: ${JSON.stringify(dataRes)}`);
  }
  return dataRes;
}

async function run() {
  const domainId = "3500"; // Jawa Timur
  const varId = "625"; // PDRB Berlaku Kabupaten/Kota
  
  const thRes = await bpsFetch("/list", { model: "th", domain: domainId, var: varId, lang: "ind" });
  const periods = thRes.data[1];
  
  const th2023 = periods.find(p => p.th === "2023")?.th_id;
  const th2024 = periods.find(p => p.th === "2024")?.th_id;
  const th2025 = periods.find(p => p.th === "2025")?.th_id;
  
  // Fetch Part 1 and Part 2 to respect BPS max 2 years limitation
  const part1 = await fetchDataForPeriods(domainId, varId, `${th2023};${th2024}`);
  const part2 = await fetchDataForPeriods(domainId, varId, `${th2025}`);
  
  const combinedData = { ...part1.datacontent, ...part2.datacontent };
  
  const banyuwangiVervarId = "10"; // Banyuwangi (ID: 10)
  
  const years = [
    { label: "2023", id: th2023 },
    { label: "2024", id: th2024 },
    { label: "2025", id: th2025 }
  ];
  
  const quarters = [
    { code: "31", label: "Kuartal I" },
    { code: "32", label: "Kuartal II" },
    { code: "33", label: "Kuartal III" },
    { code: "34", label: "Kuartal IV" },
    { code: "35", label: "Tahunan (Total)" }
  ];
  
  console.log("\n### 📊 DATA PDRB KABUPATEN BANYUWANGI (Seri 2010 - Harga Berlaku)\n");
  console.log("| Tahun | Periode | Nilai PDRB (Miliar Rupiah) |");
  console.log("|---|---|---|");
  
  for (const year of years) {
    if (!year.id) continue;
    for (const q of quarters) {
      // Key format: 10 (vervar) + 625 (varId) + 0 (turvar) + th_id + q.code (derived/unit code)
      const dataKey = `${banyuwangiVervarId}${varId}0${year.id}${q.code}`;
      const value = combinedData[dataKey];
      if (value !== undefined) {
        console.log(`| ${year.label} | ${q.label} | ${Number(value).toLocaleString("id-ID")} Miliar Rp |`);
      }
    }
  }
}

run().catch(console.error);
