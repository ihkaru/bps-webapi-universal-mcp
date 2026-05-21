import { bpsFetch } from "../src/helpers/bps-client.js";

async function test() {
  const domainId = "6100"; 
  const varId = 41; // Gini Ratio
  const region = "Mempawah";

  console.log(`Fetching vervar for var ${varId} in domain ${domainId}...`);
  const vvars = await bpsFetch("/list", { model: "vervar", domain: domainId, var: varId, lang: "ind" });
  
  if (!vvars.data?.[1]) {
    console.log("RAW RESPONSE:", JSON.stringify(vvars, null, 2));
    return;
  }

  console.log("First 3 elements:", JSON.stringify(vvars.data[1].slice(0, 3), null, 2));

  const match = vvars.data[1].find(vv => {
    const label = vv.label || vv.vervar || "";
    return label.toLowerCase().includes(region.toLowerCase());
  });

  if (match) {
    console.log(`MATCHED:`, match);
  } else {
    console.log("NO MATCH FOUND FOR:", region);
  }
}
test();
