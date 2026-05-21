import { bpsFetch } from "../src/helpers/bps-client.js";

async function tryFetchData(domainId, domainLabel, topic, year, targetRegionName = null) {
  // ... (copied from bps-query.js v7.2)
  const topicsToTry = [topic];
  const topicWords = topic.split(" ").filter(w => w.length > 3);
  topicWords.forEach(w => { if (!topicsToTry.includes(w)) topicsToTry.push(w); });

  console.log(`[tryFetchData] Domain: ${domainId}, Topic: ${topic}, Region: ${targetRegionName}`);
  
  let variables = [];
  for (const t of topicsToTry) {
    console.log(`  Searching keyword: ${t}`);
    const varData = await bpsFetch("/list", { model: "var", domain: domainId, keyword: t, lang: "ind", page: 1 });
    if (varData?.status === "OK" && Array.isArray(varData.data?.[1])) {
      variables.push(...varData.data[1]);
      console.log(`    Found ${varData.data[1].length} variables`);
      break; 
    }
  }

  if (variables.length === 0) return { success: false, reason: "no_variables" };

  // Just try the first one for this test
  const v = variables[0];
  console.log(`  Selected Var: [${v.var_id}] ${v.title}`);

  const data = await bpsFetch("/list", { model: "data", domain: domainId, var: v.var_id, lang: "ind" });
  if (data?.status === "OK" && data?.["data-availability"] === "available") {
     console.log(`    Data available!`);
     return { success: true, dynamicData: data };
  }
  return { success: false, reason: "no_data" };
}

async function run() {
  const domainId = "6100"; // Kalbar
  const topic = "Gini Ratio";
  const region = "Mempawah";
  
  const result = await tryFetchData(domainId, "Kalimantan Barat", topic, null, region);
  console.log("FINAL RESULT SUCCESS:", result.success);
}
run();
