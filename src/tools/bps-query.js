/**
 * bps_query — PRIMARY high-level orchestration tool.
 * Accepts topic, region, year and internally resolves all IDs.
 *
 * v2.3 Improvements:
 *   - Parallel Execution: fetches year/vervar metadata in parallel
 *   - Intelligent Multi-Topic: splits "IPM and Poverty" into sub-tasks
 *   - Local Domain Caching: eliminates redundant /domain API calls
 *   - Smart Fallback (v3.2) & Smart Proxy (v4.0)
 */

import { z } from "zod";
import { bpsFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse, curateDynamicData } from "../helpers/response.js";

// ─── Simple In-Memory Domain Cache ──────────────────────────────────────────
const domainCache = { kab: null, prov: null };

async function getDomains(type) {
  if (domainCache[type]) return domainCache[type];
  const domainData = await bpsFetch("/domain", { type });
  if (domainData?.status === "OK" && Array.isArray(domainData.data?.[1])) {
    domainCache[type] = domainData.data[1];
    return domainCache[type];
  }
  return [];
}

function getProvincialDomain(kabDomainId) {
  if (kabDomainId.length === 4 && kabDomainId !== "0000") {
    return kabDomainId.slice(0, 2) + "00";
  }
  return null;
}

/**
 * Core search-and-fetch logic for a given domain.
 */
async function tryFetchData(domainId, domainLabel, topic, year, targetRegionName = null) {
  // 1. Search variables (keep sequential as it's the first step)
  let variables = [];
  for (let page = 1; page <= 2; page++) {
    const varData = await bpsFetch("/list", {
      model: "var", domain: domainId, keyword: topic, lang: "ind", page,
    });
    if (varData?.status === "OK" && Array.isArray(varData.data?.[1])) {
      variables.push(...varData.data[1]);
    }
    if (varData?.data?.[0]?.pages <= 1) break;
  }

  if (variables.length === 0) {
    return { success: false, reason: "no_variables", variables: [] };
  }

  // Prioritize breakdown tables if targetRegionName is set
  variables.sort((a, b) => {
    if (targetRegionName) {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      
      const aIsExplicitBreakdown = /menurut|by/i.test(aTitle);
      const bIsExplicitBreakdown = /menurut|by/i.test(bTitle);
      if (aIsExplicitBreakdown && !bIsExplicitBreakdown) return -1;
      if (!aIsExplicitBreakdown && bIsExplicitBreakdown) return 1;

      const aIsBreakdown = /kabupaten|kota/i.test(aTitle);
      const bIsBreakdown = /kabupaten|kota/i.test(bTitle);
      if (aIsBreakdown && !bIsBreakdown) return -1;
      if (!aIsBreakdown && bIsBreakdown) return 1;
    }
    const aIsNominal = /rupiah|milyar|juta/i.test(a.unit || "");
    const bIsNominal = /rupiah|milyar|juta/i.test(b.unit || "");
    if (aIsNominal && !bIsNominal) return -1;
    if (!aIsNominal && bIsNominal) return 1;
    return 0;
  });

  // 2. Process variable candidates IN PARALLEL
  const candidates = variables.slice(0, 5);
  const results = await Promise.all(candidates.map(async (candidateVar) => {
    let thParam = undefined;
    let vervarParam = undefined;

    const [periodData, vVarData] = await Promise.all([
      year ? bpsFetch("/list", { model: "th", domain: domainId, var: candidateVar.var_id, lang: "ind" }) : Promise.resolve(null),
      targetRegionName ? bpsFetch("/list", { model: "vervar", domain: domainId, var: candidateVar.var_id, lang: "ind" }) : Promise.resolve(null)
    ]);

    // Year Resolution
    let finalThParam = undefined;
    if (year && periodData?.status === "OK" && Array.isArray(periodData.data?.[1])) {
      const requestedYears = year.split(",").map(y => y.trim());
      const matchedIds = [];
      for (const reqYear of requestedYears) {
        const match = periodData.data[1].find(p => p.th === reqYear);
        if (match) matchedIds.push(String(match.th_id));
      }
      
      if (matchedIds.length > 0) {
        finalThParam = matchedIds.join(";");
      } else {
        const latest = [...periodData.data[1]].sort((a,b) => parseInt(b.th) - parseInt(a.th))[0];
        if (latest) finalThParam = String(latest.th_id);
      }
    }

    // Resolve vervar (Strict/Fuzzy Matching)
    if (targetRegionName && vVarData?.status === "OK" && Array.isArray(vVarData.data?.[1])) {
      const cleanSearchName = targetRegionName.toLowerCase().replace(/kabupaten|kota/g, "").trim();
      const match = vVarData.data[1].find(v => {
        const label = (v.label || v.vervar || "").toLowerCase();
        const cleanLabel = label.replace(/kabupaten|kota/g, "").trim();
        return cleanLabel === cleanSearchName;
      });
      if (match) {
        vervarParam = match.kode_ver_id || match.item_ver_id || match.val || match.vervar_id;
      }
    }

    // Final data fetch
    const dynamicData = await bpsFetch("/list", {
      model: "data", domain: domainId, var: candidateVar.var_id, 
      th: finalThParam, vervar: vervarParam, lang: "ind",
    });

    if (dynamicData?.status === "OK" && dynamicData?.["data-availability"] === "available") {
      return { 
        success: true, 
        dynamicData, 
        selectedVar: candidateVar,
        vervarMatched: !!vervarParam
      };
    }
    return { success: false };
  }));

  const successfulResult = results.find(r => r.success && r.vervarMatched) || results.find(r => r.success);
  
  if (successfulResult) {
    return { 
      ...successfulResult,
      variables, 
      domainId, 
      domainLabel,
    };
  }

  return { success: false, reason: "no_data", variables };
}

// ─── Proxy Map for Intent Expansion (v4.0) ──────────────────────────────────
const PROXY_MAP = {
  "biaya hidup": ["Garis Kemiskinan", "Pengeluaran Per Kapita", "Indeks Harga Konsumen"],
  "kesejahteraan": ["IPM", "Tingkat Kemiskinan", "PDRB Per Kapita"],
  "ekonomi": ["PDRB", "Pertumbuhan Ekonomi", "Inflasi"],
  "pengangguran": ["Tingkat Pengangguran Terbuka"],
};

export function register(server) {
  server.tool(
    "bps_query",
    "Tool UTAMA untuk mengambil data statistik BPS (Pertanian, Ekonomi, Sosial, dll). " +
    "Cukup sebutkan topik, wilayah, dan tahun. Server otomatis menangani domain, variabel, " +
    "dan resolusi wilayah tingkat provinsi/kabupaten.",
    {
      topic: z.string().describe("Topik data: 'PDRB', 'Padi', 'IPM', 'Kemiskinan', dll. Bisa dipisah koma untuk kueri majemuk."),
      region: z.string().default("Nasional").describe("Mempawah, Jawa Barat, atau Nasional."),
      year: z.coerce.string().optional().describe("Tahun, misal '2023' atau '2021,2022'."),
    },
    safeHandler(async ({ topic, region, year }) => {
      const topics = topic.split(/,| dan | and /i).map(t => t.trim()).filter(t => t.length > 0);
      let domainId = "0000";
      let domainLabel = "Nasional";
      let domainType = null;

      if (region.toLowerCase() !== "nasional") {
        for (const type of ["kab", "prov"]) {
          const domains = await getDomains(type);
          const match = domains.find(d => 
            d.domain_name?.toLowerCase().includes(region.toLowerCase())
          );
          if (match) {
            domainId = match.domain_id;
            domainLabel = match.domain_name;
            domainType = type;
            break;
          }
        }
      }

      const requestedYears = year ? year.split(",").map(y => y.trim()) : [];

      const topicResults = await Promise.all(topics.map(async (t) => {
        let result = await tryFetchData(domainId, domainLabel, t, year);

        // Smart Fallback Kab -> Prov (v3.2)
        const yearsFound = result.success ? (result.dynamicData.tahun || []).map(t => t.label) : [];
        const isMissingYears = requestedYears.some(ry => !yearsFound.includes(ry));

        if (domainType === "kab" && (!result.success || isMissingYears)) {
          const provDomainId = getProvincialDomain(domainId);
          if (provDomainId) {
            const provs = await getDomains("prov");
            const pm = provs.find(d => d.domain_id === provDomainId);
            const provLabel = pm ? pm.domain_name : `Provinsi (${provDomainId})`;
            
            const provResult = await tryFetchData(provDomainId, provLabel, t, year, domainLabel);
            if (provResult.success) {
              const provYearsFound = (provResult.dynamicData.tahun || []).map(t => t.label);
              if (!result.success || requestedYears.some(ry => provYearsFound.includes(ry) && !yearsFound.includes(ry))) {
                result = provResult;
                result.fallbackFrom = domainLabel;
              }
            }
          }
        }

        // Smart Proxy Fallback (v4.0)
        if (!result.success) {
          const proxies = PROXY_MAP[t.toLowerCase()] || [];
          for (const proxyTopic of proxies) {
            const proxyResult = await tryFetchData(domainId, domainLabel, proxyTopic, year);
            if (proxyResult.success) {
              result = { ...proxyResult, isProxy: true, originalTopic: t };
              break;
            }
          }
        }

        return { topic: t, ...result };
      }));

      const output = topicResults.map(res => {
        if (!res.success) {
          let msg = `⚠️ Data "${res.topic}" tidak ditemukan untuk ${domainLabel}.`;
          if (res.variables?.length > 0) {
            msg += `\n💡 Saran kueri: ${res.variables.slice(0, 5).map(v => `"${v.title}"`).join(", ")}`;
          }
          return msg;
        }

        const curated = curateDynamicData(res.dynamicData, {
          domainId: res.domainId,
          domainLabel: res.domainLabel,
          topic: res.originalTopic || res.topic,
          requestedYear: year,
          lineage: res.fallbackFrom ? `Pencarian dari wilayah ${res.fallbackFrom} melompat ke domain ${res.domainLabel}` : null
        });

        const header = res.fallbackFrom
          ? `📍 Wilayah: ${res.fallbackFrom} (via ${res.domainLabel})\n`
          : `📍 Wilayah: ${res.domainLabel} (${res.domainId})\n`;
        
        return `${header}🔎 Variabel: ${res.selectedVar.title}\n\n${curated}` +
               (res.variables.length > 1 ? `\n💡 Terkait: ${res.variables.slice(1,4).map(v=>v.title).join(", ")}` : "");
      });

      return textResponse(output.join("\n\n" + "─".repeat(40) + "\n\n"));
    })
  );
}
