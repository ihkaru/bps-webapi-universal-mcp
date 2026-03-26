/**
 * bps_query — PRIMARY high-level orchestration tool.
 * Accepts topic, region, year and internally resolves all IDs.
 *
 * v2.3 Improvements:
 *   - Fuzzy Vervar Matching: handles "Kabupaten Mempawah" vs "Mempawah"
 *   - Better retry logic in candidate loop
 */

import { z } from "zod";
import { bpsFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse, curateDynamicData } from "../helpers/response.js";

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
  // 1. Search variables
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

  // Prioritize nominal/value variables
  variables.sort((a, b) => {
    const aIsNominal = /rupiah|milyar|juta/i.test(a.unit || "");
    const bIsNominal = /rupiah|milyar|juta/i.test(b.unit || "");
    if (aIsNominal && !bIsNominal) return -1;
    if (!aIsNominal && bIsNominal) return 1;
    return 0;
  });

  // 2. Try each variable candidate
  let lastAvailableYears = "";
  for (const candidateVar of variables.slice(0, 10)) {
    let thParam = undefined;
    
    // Resolve years
    if (year) {
      const periodData = await bpsFetch("/list", {
        model: "th", domain: domainId, var: candidateVar.var_id, lang: "ind", page: 1,
      });
      if (periodData?.status === "OK" && Array.isArray(periodData.data?.[1])) {
        const requestedYears = year.split(",").map(y => y.trim());
        const matchedIds = [];
        for (const reqYear of requestedYears) {
          const match = periodData.data[1].find(p => p.th === reqYear);
          if (match) matchedIds.push(String(match.th_id));
        }
        if (matchedIds.length > 0) {
          thParam = matchedIds.join(";");
        } else {
          lastAvailableYears = periodData.data[1].map(p => p.th).join(", ");
          continue; 
        }
      } else {
        continue;
      }
    }

    // Resolve vervar if targetRegionName is provided
    let vervarParam = undefined;
    if (targetRegionName) {
      const vVarData = await bpsFetch("/list", {
        model: "vervar", domain: domainId, var: candidateVar.var_id, lang: "ind",
      });
      if (vVarData?.status === "OK" && Array.isArray(vVarData.data?.[1])) {
        // FUZZY MATCHING: Check if search name contains label or vice-versa
        // region: "Kabupaten Mempawah", label: "Mempawah"
        const cleanSearchName = targetRegionName.toLowerCase().replace(/kabupaten|kota/g, "").trim();
        const match = vVarData.data[1].find(v => {
          const cleanLabel = (v.label || "").toLowerCase().replace(/kabupaten|kota/g, "").trim();
          return cleanLabel.includes(cleanSearchName) || cleanSearchName.includes(cleanLabel);
        });
        if (match) {
          vervarParam = match.val || match.vervar_id;
        }
      }
    }

    // 3. Fetch data
    const dynamicData = await bpsFetch("/list", {
      model: "data", domain: domainId, var: candidateVar.var_id, 
      th: thParam, vervar: vervarParam, lang: "ind",
    });

    if (dynamicData?.status === "OK" && dynamicData?.["data-availability"] === "available") {
      return { 
        success: true, 
        dynamicData, 
        selectedVar: candidateVar, 
        variables, 
        domainId, 
        domainLabel,
        isVervarFiltered: !!vervarParam
      };
    }
  }

  return { success: false, reason: "no_data", variables, lastAvailableYears };
}

export function register(server) {
  server.tool(
    "bps_query",
    "Tool UTAMA untuk mengambil data statistik BPS (Pertanian, Ekonomi, Sosial, dll). " +
    "Cukup sebutkan topik, wilayah, dan tahun. Server otomatis menangani domain, variabel, " +
    "dan resolusi wilayah tingkat provinsi/kabupaten.",
    {
      topic: z.string().describe("Topik data: 'PDRB', 'Padi', 'IPM', 'Kemiskinan', dll."),
      region: z.string().default("Nasional").describe("Mempawah, Jawa Barat, atau Nasional."),
      year: z.coerce.string().optional().describe("Tahun, misal '2023' atau '2021,2022'."),
    },
    safeHandler(async ({ topic, region, year }) => {
      let domainId = "0000";
      let domainLabel = "Nasional";
      let domainType = null;

      if (region.toLowerCase() !== "nasional") {
        for (const type of ["kab", "prov"]) {
          const domainData = await bpsFetch("/domain", { type });
          if (domainData?.status === "OK" && Array.isArray(domainData.data?.[1])) {
            const match = domainData.data[1].find(d => 
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
      }

      let result = await tryFetchData(domainId, domainLabel, topic, year);

      // Fallback
      if (!result.success && domainType === "kab") {
        const provDomainId = getProvincialDomain(domainId);
        if (provDomainId) {
          const provData = await bpsFetch("/domain", { type: "prov" });
          let provLabel = `Provinsi (${provDomainId})`;
          if (provData?.status === "OK" && Array.isArray(provData.data?.[1])) {
            const pm = provData.data[1].find(d => d.domain_id === provDomainId);
            if (pm) provLabel = pm.domain_name;
          }
          const provResult = await tryFetchData(provDomainId, provLabel, topic, year, domainLabel);
          if (provResult.success) {
            result = provResult;
            result.fallbackFrom = domainLabel;
          }
        }
      }

      if (!result.success) {
        return textResponse(`⚠️ Data "${topic}" tidak ditemukan untuk ${domainLabel}. Coba kata kunci lain.`);
      }

      const curated = curateDynamicData(result.dynamicData);
      const header = result.fallbackFrom
        ? `📍 Wilayah: ${result.fallbackFrom} (via ${result.domainLabel})\n`
        : `📍 Wilayah: ${result.domainLabel} (${result.domainId})\n`;

      return textResponse(
        header + 
        `🔎 Variabel: ${result.selectedVar.title}\n\n` + 
        curated + 
        (result.variables.length > 1 ? `\n\n💡 Terkait: ${result.variables.slice(1,4).map(v=>v.title).join(", ")}` : "")
      );
    })
  );
}
