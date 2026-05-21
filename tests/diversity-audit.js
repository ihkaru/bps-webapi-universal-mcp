import { bpsFetch } from "../src/helpers/bps-client.js";

async function auditRegion(domainId, domainName) {
  console.log(`\n🔎 [AUDIT] Region: ${domainName} (${domainId})`);
  
  // 1. Keyword Discovery (Probe 'IPM')
  const kwRes = await bpsFetch("/list", { model: "var", domain: domainId, keyword: "IPM", lang: "ind" });
  const kwVars = (kwRes?.status?.toUpperCase() === "OK" && Array.isArray(kwRes.data?.[1])) ? kwRes.data[1] : [];
  console.log(`   - Keyword 'IPM' found ${kwVars.length} variables.`);

  // 2. Subject Discovery (Probe Subject 26)
  const subRes = await bpsFetch("/list", { model: "var", domain: domainId, subject: "26", lang: "ind" });
  const subVars = (subRes?.status?.toUpperCase() === "OK" && Array.isArray(subRes.data?.[1])) ? subRes.data[1] : [];
  console.log(`   - Subject 26 found ${subVars.length} variables.`);

  // 3. Data Structure Probe (Pick best variable)
  const v = kwVars[0] || subVars[0];
  if (v) {
    const dRes = await bpsFetch("/list", { model: "data", domain: domainId, var: v.var_id, lang: "ind" });
    console.log(`   - Data Status: ${dRes?.status}`);
    console.log(`   - Available Metadata Fields: ${Object.keys(dRes || {}).filter(k => k !== 'datacontent').join(", ")}`);
    console.log(`   - Field Variants (JSON check):`);
    if (dRes?.tahun) console.log("     [tahun] found");
    if (dRes?.th) console.log("     [th] found");
    if (dRes?.vervar) console.log("     [vervar] found");
    if (dRes?.vv) console.log("     [vv] found");
    if (Array.isArray(dRes?.data?.[1])) console.log("     [data[1]] array found (Standard Table format)");
  } else {
    console.log(`   - ⚠️ No IPM data found in this domain.`);
  }
}

async function runAudit() {
  await auditRegion("6104", "Mempawah (Kab)");
  await auditRegion("3171", "Jakarta Pusat (Kota)");
  await auditRegion("6172", "Singkawang (Kota)");
  await auditRegion("3400", "Yogyakarta (Prov)");
  await auditRegion("9100", "Papua (Prov)");
}

runAudit();
