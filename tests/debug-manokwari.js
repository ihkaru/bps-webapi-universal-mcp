import { bpsFetch } from "../src/helpers/bps-client.js";

async function debug() {
  const targetDomain = "9100";
  const mfdCode = "9102";
  const filterRegion = "Manokwari";
  const subjectId = "23"; // Poverty/Gini

  console.log("🔍 Fetching variables for Subject 23 in 9100...");
  const subRes = await bpsFetch("/list", { model: "var", domain: targetDomain, subject: subjectId, lang: "ind" });
  let variables = subRes.data[1];
  variables.sort((a, b) => parseInt(b.var_id) - parseInt(a.var_id));
  
  console.log("📋 Probing top 10 variables...");
  const probes = await Promise.all(variables.slice(0, 10).map(async (v) => {
    const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: v.var_id, lang: "ind" });
    const allYears = pRes.data[1];
    const thParam = String(allYears[0].th_id);
    
    const d = await bpsFetch("/list", { model: "data", domain: targetDomain, var: v.var_id, th: thParam, lang: "ind" });
    const vervars = d.vervar || d.data?.[1] || [];
    const contentKeys = Object.keys(d.datacontent || {});
    const s = filterRegion.toLowerCase();
    
    const labelMatch = vervars.some(vv => (vv.label || "").toLowerCase().includes(s));
    const mfdMatch = mfdCode && contentKeys.some(k => k.startsWith(mfdCode));
    
    return { 
      var_id: v.var_id, 
      name: v.name, 
      success: d.status === "OK", 
      labelMatch, 
      mfdMatch, 
      val: mfdMatch ? d.datacontent[contentKeys.find(k => k.startsWith(mfdCode))] : "N/A"
    };
  }));
  
  console.table(probes);
}

debug();
