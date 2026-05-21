import { tryFetchData } from "../src/tools/bps-query.js";

async function run() {
  const result = await tryFetchData("3500", "Jawa Timur", "Kemiskinan", "2024", "Banyuwangi", "23", "3510");
  console.log("Winner is:", result.selectedVar ? {
    var_id: result.selectedVar.var_id,
    title: result.selectedVar.title,
    score: result.score
  } : "None");
}

run().catch(console.error);
