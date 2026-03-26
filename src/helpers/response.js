/**
 * Response Helpers — Curated, token-efficient response formatting.
 * All functions are pure (no side effects).
 *
 * v2.1: Fixed curateDynamicData to handle provincial-level data
 *       where datacontent keys don't follow the standard vervar format.
 */

/**
 * Curate a BPS list response into compact text with pagination metadata.
 * @param {object} data - Raw BPS API response
 * @param {function} fieldExtractor - (item) => formatted string
 */
export function curateListResponse(data, fieldExtractor) {
  if (data?.status !== "OK" || data?.["data-availability"] !== "available") {
    return `Status: ${data?.status || "unknown"}. Data tidak tersedia untuk parameter yang diberikan.`;
  }

  const rawData = data.data;
  if (!Array.isArray(rawData) || rawData.length < 2) {
    return "Data kosong atau format tidak dikenali.";
  }

  const pagination = rawData[0];
  const items = rawData[1];

  const paginationInfo = `[Halaman ${pagination.page}/${pagination.pages} | Total: ${pagination.total}${pagination.page < pagination.pages ? " | has_more: true" : ""}]`;

  if (!Array.isArray(items) || items.length === 0) {
    return `${paginationInfo}\nTidak ada data di halaman ini.`;
  }

  const formattedItems = items.map(fieldExtractor).join("\n");
  return `${paginationInfo}\n${formattedItems}`;
}

/**
 * Curate dynamic data response into a readable, year-grouped summary.
 *
 * BPS datacontent key format varies:
 *   - Standard:    {vervar_id}{var_id}0{th_id}{turth_id}
 *   - Provincial:  {domain_prefix}{var_id}{th_id}0  (no vervar dimension match)
 *
 * This function first tries the standard approach. If no matches are found,
 * it falls back to a reverse-lookup strategy using known th_ids as substrings.
 */
export function curateDynamicData(data) {
  if (data?.status !== "OK" || data?.["data-availability"] !== "available") {
    return `Status: ${data?.status || "unknown"}. Data tidak tersedia. Coba periksa parameter var, domain, atau th.`;
  }

  const varInfo = data.var?.[0] || {};
  const vervarMap = {};
  (data.vervar || []).forEach(v => { vervarMap[v.val] = v.label; });
  const tahunMap = {};
  (data.tahun || []).forEach(t => { tahunMap[t.val] = t.label; });

  const lines = [`📊 ${varInfo.label || "Data"} (${varInfo.unit || ""})`];
  if (data.last_update) lines.push(`📅 Update terakhir: ${data.last_update}`);
  lines.push("");

  const datacontent = data.datacontent || {};
  const byYear = {};

  // ── Strategy 1: Standard vervar × tahun key matching ──
  if (Object.keys(vervarMap).length > 0 && Object.keys(tahunMap).length > 0) {
    for (const [key, value] of Object.entries(datacontent)) {
      for (const thId of Object.keys(tahunMap)) {
        for (const vvId of Object.keys(vervarMap)) {
          // Try multiple key patterns BPS uses
          const patterns = [
            `${vvId}${varInfo.val}0${thId}${data.turtahun?.[0]?.val || "95"}`,
            `${vvId}${varInfo.val}0${thId}0`,
            `${vvId}${varInfo.val}${thId}0`,
          ];
          if (patterns.includes(key)) {
            const year = tahunMap[thId];
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push({ sector: vervarMap[vvId], value });
            break;
          }
        }
      }
    }
  }

  // ── Strategy 2: Fallback — group by tahun ID suffix matching ──
  // For data where vervar keys are domain codes (e.g. "6104") not in vervarMap
  if (Object.keys(byYear).length === 0 && Object.keys(tahunMap).length > 0) {
    // Build a lookup from vervar labels by trying to match datacontent keys
    // Key pattern: {prefix}{var_id}{th_id}{suffix}
    // We know var_id and th_id, so we can extract the prefix (vervar/domain code)
    const varId = String(varInfo.val);

    for (const [key, value] of Object.entries(datacontent)) {
      // Try to find which tahun this key belongs to
      for (const thId of Object.keys(tahunMap)) {
        // Check if key contains var_id + th_id pattern
        const pattern1 = `${varId}${thId}`;     // e.g. "85125"
        const pattern2 = `${varId}0${thId}`;     // e.g. "850125"

        if (key.includes(pattern1) || key.includes(pattern2)) {
          const year = tahunMap[thId];
          // Extract the prefix as region/vervar identifier
          let prefix = key;
          if (key.includes(pattern2)) {
            prefix = key.split(pattern2)[0];
          } else {
            prefix = key.split(pattern1)[0];
          }

          // Try to find a matching vervar label
          let label = vervarMap[prefix] || prefix;

          // If vervar is empty but we have a 4-digit prefix, it's likely a domain code
          if (Object.keys(vervarMap).length === 0 && /^\d{4}$/.test(prefix)) {
            label = `[${prefix}]`; // Will be shown as domain code
          }

          if (!byYear[year]) byYear[year] = [];
          // Avoid duplicate entries for same year + label
          if (!byYear[year].find(e => e.sector === label)) {
            byYear[year].push({ sector: label, value });
          }
          break;
        }
      }
    }
  }

  // ── Render year-grouped data ──
  for (const [year, items] of Object.entries(byYear).sort()) {
    lines.push(`── ${year} ──`);
    for (const item of items) {
      const formattedValue = typeof item.value === "number"
        ? item.value.toLocaleString("id-ID")
        : item.value;
      lines.push(`  ${item.sector}: ${formattedValue}`);
    }
    lines.push("");
  }

  // ── Strategy 3: Last resort — dump raw keys ──
  if (Object.keys(byYear).length === 0) {
    lines.push("Data (raw key → value):");
    for (const [key, value] of Object.entries(datacontent)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

/**
 * Wrap a tool handler with agent-friendly error handling.
 */
export function safeHandler(fn) {
  return async (args) => {
    try {
      return await fn(args);
    } catch (err) {
      const message = err?.message || String(err);
      let suggestion = "";
      if (message.includes("HTTP 404")) {
        suggestion = " Pastikan domain_id dan parameter lainnya valid.";
      } else if (message.includes("HTTP 5")) {
        suggestion = " Server BPS sedang bermasalah, coba lagi nanti.";
      } else if (message.includes("fetch")) {
        suggestion = " Periksa koneksi internet.";
      }
      return {
        content: [{ type: "text", text: `❌ Error: ${message}.${suggestion}` }],
        isError: true,
      };
    }
  };
}

/** Shorthand for MCP text content response */
export function textResponse(text) {
  return { content: [{ type: "text", text }] };
}
