import { z } from "zod";
import { bpsFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse, curateDynamicData } from "../helpers/response.js";

const domainCache = { kab: null, prov: null };
function getProvincialDomain(kabId) {
  if (kabId && kabId.length === 4) return kabId.substring(0, 2) + "00";
  return null;
}
async function getDomains(type) {
  if (domainCache[type]) return domainCache[type];
  const d = await bpsFetch("/domain", { type });
  if (d?.status?.toUpperCase() === "OK" && Array.isArray(d.data?.[1])) {
    domainCache[type] = d.data[1];
    return d.data[1];
  }
  return [];
}

const STRATEGIC_MAP = {
  "ipm": { kw: ["IPM", "Indeks Pembangunan Manusia"], sub: "26" },
  "indeks pembangunan manusia": { kw: ["IPM", "Indeks Pembangunan Manusia"], sub: "26" },
  "kemiskinan": { kw: ["Kemiskinan", "Penduduk Miskin"], sub: "23" },
  "penduduk miskin": { kw: ["Kemiskinan", "Penduduk Miskin"], sub: "23" },
  "poverty": { kw: ["Kemiskinan", "Penduduk Miskin"], sub: "23" },
  "pengangguran": { kw: ["TPT", "Pengangguran Terbuka"], sub: "6" },
  "tpt": { kw: ["TPT", "Pengangguran Terbuka"], sub: "6" },
  "gini": { kw: ["Gini Ratio", "Gini Rasio"], sub: "23" },
  "gini ratio": { kw: ["Gini Ratio", "Gini Rasio"], sub: "23" },
  "gini rasio": { kw: ["Gini Ratio", "Gini Rasio"], sub: "23" },
  "pdrb": { kw: ["PDRB", "Gross Regional Domestic Product"], sub: "15" },
  "inflasi": { kw: ["Inflasi", "CPI", "IHK"], sub: "7" },
};

export async function tryFetchData(domainId, domainLabel, topic, year, filterRegion = null, subjectId = null, mfdCode = null) {
  let targetDomain = domainId;
  let targetLabel = domainLabel;
  let pivotLineage = null;

  // v16.0: Strict Keyword Relevance + Freshness Quality Ranking helper
  const lowerTopic = topic.toLowerCase();
  const cfg = STRATEGIC_MAP[lowerTopic];
  const targetKeywords = cfg?.kw || [topic];

  const getRelevanceScore = (title, keywords) => {
    const tLower = (title || "").toLowerCase();
    let score = 0;
    let keywordMatched = false;
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (tLower === kwLower) {
        score += 5000;
        keywordMatched = true;
      } else if (tLower.includes(kwLower)) {
        score += 1000;
        keywordMatched = true;
        if (tLower.indexOf(kwLower) < 5) {
          score += 500;
        }
      }
    }

    if (!keywordMatched) {
      return 0; // If no target keywords matched, the score is strictly 0.
    }

    // Penalize sub-indicator segmentations/details to keep macro indicators at the top
    const PENALTY_KEYWORDS = [
      "usia", "umur", "kb ", "alat kb", "pendidikan", "sekolah", "bekerja", 
      "sektor", "pekerjaan", "lantai", "dinding", "atap", "makanan", 
      "bukan makanan", "non makanan", "golongan", "status", "kelompok", 
      "jenis", "sumber"
    ];
    for (const p of PENALTY_KEYWORDS) {
      if (tLower.includes(p)) {
        if (p === "usia" && !tLower.replace("manusia", "").includes("usia")) {
          continue;
        }
        score -= 2000;
      }
    }
    if (tLower.includes("menurut") && !tLower.includes("kabupaten") && !tLower.includes("provinsi") && !tLower.includes("kota") && !tLower.includes("kab/kota")) {
      score -= 2000;
    }

    // Boost standard macroeconomic terms
    const BOOST_PREFIXES = ["persentase", "jumlah", "indeks", "angka", "laju", "perkembangan"];
    for (const b of BOOST_PREFIXES) {
      if (tLower.startsWith(b)) {
        score += 500;
      }
    }

    // Boost modern data sources/methods
    if (title.includes("SP2020")) score += 100;
    if (title.includes("Metode Baru")) score += 50;
    if (title.includes("Semesteran")) score += 30;
    return score;
  };

  // 1. Discovery (Subject First if available - querying pages 1-3 in parallel to handle BPS pagination limit)
  let variables = [];
  const pagesToFetch = ["1", "2", "3"];

  if (subjectId) {
     const pagesRes = await Promise.all(pagesToFetch.map(p => 
        bpsFetch("/list", { model: "var", domain: targetDomain, subject: subjectId, page: p, lang: "ind" })
     ));
     pagesRes.forEach(r => {
        if (r?.status?.toUpperCase() === "OK" && Array.isArray(r.data?.[1])) {
           variables.push(...r.data[1]);
        }
     });
     
     // Deduplicate variables
     const uniqueVars = [];
     const seenIds = new Set();
     variables.forEach(v => {
       if (v && v.var_id && !seenIds.has(v.var_id)) {
         seenIds.add(v.var_id);
         uniqueVars.push(v);
       }
     });
     
     // Check if we have any relevant variables. If not, clear so that we fall back to keyword search!
     let hasRelevant = false;
     for (const v of uniqueVars) {
       if (getRelevanceScore(v.title, targetKeywords) > 0) {
         hasRelevant = true;
         break;
       }
     }
     
     if (hasRelevant) {
       variables = uniqueVars;
     } else {
       console.error(`[tryFetchData] Subject ID ${subjectId} has no relevant variables for "${topic}" (Highest score <= 0). Falling back to keyword search...`);
       variables = [];
     }
  }

  if (variables.length === 0) {
     const pagesRes = await Promise.all(pagesToFetch.map(p => 
        bpsFetch("/list", { model: "var", domain: targetDomain, keyword: topic, page: p, lang: "ind" })
     ));
     pagesRes.forEach(r => {
        if (r?.status?.toUpperCase() === "OK" && Array.isArray(r.data?.[1])) {
           variables.push(...r.data[1]);
        }
     });
     
     // Deduplicate variables
     const uniqueVars = [];
     const seenIds = new Set();
     variables.forEach(v => {
       if (v && v.var_id && !seenIds.has(v.var_id)) {
         seenIds.add(v.var_id);
         uniqueVars.push(v);
       }
     });
     variables = uniqueVars;
  }

  variables.sort((a, b) => {
    const nameA = a.title || a.name || a.label || "";
    const nameB = b.title || b.name || b.label || "";
    const scoreA = getRelevanceScore(nameA, targetKeywords);
    const scoreB = getRelevanceScore(nameB, targetKeywords);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return parseInt(b.var_id) - parseInt(a.var_id);
  });

  if (variables.length === 0) return { success: false };

  // 2. Data Probe (v10.4: Increased to top 10 for broad Subject coverage)
  const probes = await Promise.all(variables.slice(0, 10).map(async (v) => {
    const score = getRelevanceScore(v.title || v.name || v.label || "", targetKeywords);
    // Resolve Year (Required for Provincial Domains)
    const pRes = await bpsFetch("/list", { model: "th", domain: targetDomain, var: v.var_id, lang: "ind" });
    if (pRes?.status?.toUpperCase() !== "OK" || !Array.isArray(pRes.data?.[1])) return { success: false };

    const allYears = pRes.data[1].sort((a,b) => parseInt(b.th) - parseInt(a.th));
    const localTahunMap = {}; allYears.forEach(y => localTahunMap[String(y.th_id)] = y.th);

    let thParam = undefined;
    if (year) {
       const req = String(year).split(/[:;,]/).map(y => y.trim());
       thParam = allYears.filter(p => req.includes(p.th)).map(p => String(p.th_id)).join(";");
    }
    if (!thParam) thParam = String(allYears[0].th_id);

    // Final Data Fetch (v13.0: Parallel Data and Metadata)
    const [d, vvRes] = await Promise.all([
      bpsFetch("/list", { model: "data", domain: targetDomain, var: v.var_id, th: thParam, lang: "ind" }),
      bpsFetch("/list", { model: "vervar", domain: targetDomain, var: v.var_id, lang: "ind" })
    ]);

    if (d?.status?.toUpperCase() === "OK" && d?.["data-availability"] === "available") {
        // v13.0: Identity resolution (MFD + Internal Item ID)
        const vervars = vvRes.data?.[1] || d.vervar || d.data?.[1] || [];
        const contentKeys = Object.keys(d.datacontent || {});
        let vm = !filterRegion;
        let internalId = null;
        let ordinalId = null;
        
        if (filterRegion && Array.isArray(vervars)) {
           const s = filterRegion.toLowerCase().replace(/kabupaten|kota/g, "").trim();
           // Find the item_ver_id for this regency
           const targetIndex = vervars.findIndex(vv => (vv.label || vv.vervar || vv.vv_name || "").toLowerCase().includes(s));
           const targetVv = targetIndex !== -1 ? vervars[targetIndex] : null;
           
           if (targetVv) {
              internalId = String(targetVv.item_ver_id);
              // v14.1: Ordinal Mapping (1-based, zero-padded e.g. 01, 24)
              ordinalId = String(targetIndex + 1).padStart(2, '0');
           }

           // Match if ANY identity matches
           const labelMatch = !!targetVv;
           const mfdMatch = mfdCode && contentKeys.some(k => k.startsWith(mfdCode));
           const internalMatch = internalId && contentKeys.some(k => k.startsWith(internalId));
           const ordinalMatch = ordinalId && contentKeys.some(k => k.includes(ordinalId));
           
           vm = labelMatch || mfdMatch || internalMatch || ordinalMatch;
        }
        return { success: true, dynamicData: { ...d, _tahunMap: localTahunMap }, selectedVar: v, vervarMatched: vm, domainId: targetDomain, domainLabel: targetLabel, lineage: pivotLineage, mfdCode, internalId, ordinalId, score };
    }
    return { success: false };
  }));

  const winner = probes
    .filter(p => p.success && p.vervarMatched)
    .sort((a, b) => {
       if (b.score !== a.score) return b.score - a.score;
       return parseInt(b.selectedVar.var_id) - parseInt(a.selectedVar.var_id);
    })[0] 
    || probes.find(p => p.success);
  return winner || { success: false };
}

export function register(server) {
  server.tool(
    "bps_query",
    "Orkestrasi data statistik BPS (Kemiskinan, IPM, Gini, dll) — Versi v10.1 (Audit-Driven).",
    {
      topic: z.string().describe("Topik data, misal: 'IPM, Kemiskinan'."),
      region: z.string().default("Nasional").describe("Wilayah, misal: 'Mempawah'."),
      year: z.coerce.string().optional().describe("Tahun, misal: '2023,2024'."),
      audit: z.boolean().default(false).describe("Tampilkan audit trail."),
    },
    safeHandler(async ({ topic, region, year, audit }) => {
      const regions = region.split(/,| dan /i).map(r => r.trim());
      const rawTopics = topic.split(/,| dan /i).map(t => t.trim());
      const finalOutput = [];

      for (const regName of regions) {
        let rootDomainId = "0000";
        let rootDomainLabel = regName;
        
        if (regName.toLowerCase() !== "nasional") {
          const [kab, prov] = await Promise.all([getDomains("kab"), getDomains("prov")]);
          const m = kab.find(d => d.domain_name.toLowerCase().includes(regName.toLowerCase())) ||
                    prov.find(d => d.domain_name.toLowerCase().includes(regName.toLowerCase()));
          if (m) { rootDomainId = m.domain_id; rootDomainLabel = m.domain_name; }
        }

        const topicResults = await Promise.all(rawTopics.map(async (t) => {
          const tLower = t.toLowerCase();
          const cfg = STRATEGIC_MAP[tLower];
          const keywords = cfg?.kw || [t];
          const subject = cfg?.sub || null;
          
          // v15.0: Mandatory Strategic Pivot (Zero-Failure Architecture)
          // Always use provincial domain for 4-digit regency IDs on strategic subjects
          const STRATEGIC_SUBS = ["26", "23", "15", "6", "7"];
          let currentTargetDomain = rootDomainId;
          let currentLineage = null;
          let regMfd = (rootDomainId.length === 4) ? rootDomainId : null;

          if (rootDomainId.length === 4 && (!subject || STRATEGIC_SUBS.includes(String(subject)))) {
            const pId = getProvincialDomain(rootDomainId);
            if (pId) {
              currentTargetDomain = pId;
              currentLineage = `Mandatory Pivot v15: Menggunakan domain provinsi ${pId} untuk menjamin kesegaran data (Freshness Guarantee).`;
            }
          }

          // Discovery Matrix (v16.0: High-Relevance Gating & Cross-Domain Fallback)
          let bestResult = null;

          // Tier 1: Query Target Domain (usually provincial domain due to the pivot)
          for (const kw of keywords) {
             const res = await tryFetchData(currentTargetDomain, rootDomainLabel, kw, year, rootDomainLabel, subject, regMfd);
             if (res.success) {
               if (res.score >= 1000) {
                 return { ...res, topic: t, lineage: res.lineage || currentLineage };
               }
               if (!bestResult || res.score > bestResult.score) {
                 bestResult = { ...res, topic: t, lineage: res.lineage || currentLineage };
               }
             }
          }

          // Tier 2: Fallback to BPS Pusat (0000) for Kabupaten/Kota level indicators if no high-relevance provincial variable was found
          if (currentTargetDomain !== "0000" && regMfd) {
             for (const kw of keywords) {
                const res = await tryFetchData("0000", rootDomainLabel, kw, year, rootDomainLabel, subject, regMfd);
                if (res.success) {
                  if (res.score >= 1000) {
                    return { ...res, topic: t, lineage: `Ditemukan di BPS Pusat via MFD Fallback (v16)`, domainId: "0000" };
                  }
                  if (!bestResult || res.score > bestResult.score) {
                    bestResult = { ...res, topic: t, lineage: `Ditemukan di BPS Pusat via MFD Fallback (v16)`, domainId: "0000" };
                  }
                }
             }
          }
          
          // Tier 3: National Fallback
          if (currentTargetDomain !== "0000") {
             const nRes = await tryFetchData("0000", "Indonesia", t, year, null, subject, null);
             if (nRes.success) {
               if (nRes.score >= 1000) {
                 return { ...nRes, topic: t, fallback: "Nasional" };
               }
               if (!bestResult || nRes.score > bestResult.score) {
                 bestResult = { ...nRes, topic: t, fallback: "Nasional" };
               }
             }
          }

          if (bestResult) return bestResult;
          return { success: false, topic: t };
        }));

        const header = `🏛️ WILAYAH: ${rootDomainLabel.toUpperCase()}\n` + "═".repeat(48);
        const body = topicResults.map(res => {
          if (!res.success) return `⚠️ [${res.topic}] Data tidak ditemukan.`;
          return curateDynamicData(res.dynamicData, {
            domainId: res.domainId, domainLabel: res.domainLabel,
            mfdCode: res.mfdCode,
            internalId: res.internalId,
            ordinalId: res.ordinalId,
            topic: res.topic, requestedYear: year, audit,
            lineage: res.lineage || (res.fallback ? `Ditemukan di domain ${res.fallback}` : null),
            filterRegion: rootDomainLabel
          });
        }).join("\n\n");

        finalOutput.push(`${header}\n${body}`);
      }

      return textResponse(finalOutput.join("\n\n" + "=".repeat(64) + "\n\n"));
    })
  );
}
