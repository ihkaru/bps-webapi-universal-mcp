import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "3500"; // Jatim
  const subjectId = "23"; // Kemiskinan
  
  const subRes = await bpsFetch("/list", { model: "var", domain: targetDomain, subject: subjectId, lang: "ind" });
  if (subRes?.status?.toUpperCase() === "OK" && Array.isArray(subRes.data?.[1])) {
    const variables = subRes.data[1];
    console.log("Found variables. Structure of first entry:", variables[0]);
    console.log("\nKeys in first entry:", Object.keys(variables[0]));
    
    console.log("\nSample titles of first 10 variables:");
    variables.slice(0, 10).forEach(v => {
      console.log(`  - [ID: ${v.var_id}] title: "${v.title}", name: "${v.name}", label: "${v.label}"`);
    });
  } else {
    console.error("Failed to fetch:", subRes);
  }
}

run().catch(console.error);
