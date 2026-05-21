import { bpsFetch } from "../src/helpers/bps-client.js";

async function run() {
  const targetDomain = "0000"; // Pusat
  const subjectId = "26"; // IPM
  const targetKeywords = ["IPM", "Indeks Pembangunan Manusia"];
  
  const getRelevanceScore = (title, keywords) => {
    const tLower = (title || "").toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (tLower === kwLower) {
        score += 5000;
      } else if (tLower.includes(kwLower)) {
        score += 1000;
        if (tLower.indexOf(kwLower) < 5) {
          score += 500;
        }
      }
    }

    const PENALTY_KEYWORDS = [
      "usia", "umur", "kb ", "alat kb", "pendidikan", "sekolah", "bekerja", 
      "sektor", "pekerjaan", "lantai", "dinding", "atap", "makanan", 
      "bukan makanan", "non makanan", "golongan", "status", "kelompok", 
      "jenis", "sumber"
    ];
    for (const p of PENALTY_KEYWORDS) {
      if (tLower.includes(p)) {
        score -= 2000;
      }
    }
    if (tLower.includes("menurut") && !tLower.includes("kabupaten") && !tLower.includes("provinsi") && !tLower.includes("kota") && !tLower.includes("kab/kota")) {
      score -= 2000;
    }

    const BOOST_PREFIXES = ["persentase", "jumlah", "indeks", "angka", "laju", "perkembangan"];
    for (const b of BOOST_PREFIXES) {
      if (tLower.startsWith(b)) {
        score += 500;
      }
    }

    if (title.includes("SP2020")) score += 100;
    if (title.includes("Metode Baru")) score += 50;
    if (title.includes("Semesteran")) score += 30;
    return score;
  };

  const res = await bpsFetch("/list", { model: "var", domain: targetDomain, subject: subjectId, lang: "ind" });
  if (res?.status?.toUpperCase() === "OK" && Array.isArray(res.data?.[1])) {
    const list = res.data[1];
    console.log(`Found ${list.length} variables:`);
    list.forEach(v => {
      const score = getRelevanceScore(v.title, targetKeywords);
      console.log(`  - [ID: ${v.var_id}] score: ${score} | title: "${v.title}"`);
    });
  } else {
    console.error("Failed", res);
  }
}

run().catch(console.error);
