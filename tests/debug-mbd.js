import { bpsFetch } from "../src/helpers/bps-client.js";

async function debug() {
  const targetDomain = "8100";
  const mfdCode = "8108";
  const filterRegion = "Maluku Barat Daya";
  const subjectId = "23"; // Poverty/Gini
  const year = "2023, 2024, 2025";

  console.log("🔍 Fetching Subject 23 in 8100...");
  const subRes = await bpsFetch("/list", { model: "var", domain: targetDomain, subject: subjectId, lang: "ind" });
  let variables = subRes.data[1];
  variables.sort((a, b) => parseInt(b.var_id) - parseInt(a.var_id));
  
  const req = year.split(/[:;,]/).map(y => y.trim());

  const probes = await Promise.all(variables.slice(0, 10).map(async (v) => {
    const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: v.var_id, lang: "ind" });
    const allYears = pRes.data?.[1] || [];
    if (allYears.length === 0) return { var_id: v.var_id, success: false };

    const matchingYears = allYears.filter(p => req.includes(p.th));
    const thParam = matchingYears.length > 0 ? matchingYears.map(p => p.th_id).join(";") : String(allYears[0].th_id);
    const selectedYear = matchingYears.length > 0 ? matchingYears.map(p => p.th).join(",") : allYears[0].th;

    const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: v.var_id, th: thParam, lang: "ind" });
    const contentKeys = Object.keys(d.datacontent || {});
    const mfdMatch = mfdCode && contentKeys.some(k => k.startsWith(mfdCode));
    
    return { 
      var_id: v.var_id, 
      name: v.name, 
      success: d.status === "OK", 
      mfdMatch, 
      selectedYear,
      val: mfdMatch ? d.datacontent[contentKeys.find(k => k.startsWith(mfdCode))] : "N/A"
    };
  }));
  
  console.table(probes);
}

debug();
