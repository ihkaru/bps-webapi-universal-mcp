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
export function curateDynamicData(data, metadata = {}) {
  if (data?.status !== "OK" || data?.["data-availability"] !== "available") {
    if (data?.status === "ERROR") {
      return `❌ BPS API Error: ${data.message}${data.details ? ` (${data.details})` : ""}`;
    }
    return `Status: ${data?.status || "unknown"}. Data tidak tersedia. Coba periksa parameter var, domain, atau th.`;
  }

  const varInfo = data.var?.[0] || {};
  const vervarMap = {};
  (data.vervar || []).forEach(v => { vervarMap[v.val] = v.label; });
  const tahunMap = {};
  (data.tahun || []).forEach(t => { tahunMap[t.val] = t.label; });

  const unit = varInfo.unit || "";
  const lines = [`📊 ${varInfo.label || "Data"}${unit ? ` (${unit})` : ""}`];
  if (data.last_update) lines.push(`📅 Update terakhir: ${data.last_update}`);
  lines.push("");

  const datacontent = data.datacontent || {};
  const byYear = {};

  // ── Strategy 1: Standard vervar × tahun key matching ──
  if (Object.keys(vervarMap).length > 0 && Object.keys(tahunMap).length > 0) {
    for (const [key, value] of Object.entries(datacontent)) {
      for (const thId of Object.keys(tahunMap)) {
        for (const vvId of Object.keys(vervarMap)) {
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
  if (Object.keys(byYear).length === 0 && Object.keys(tahunMap).length > 0) {
    const varId = String(varInfo.val);
    for (const [key, value] of Object.entries(datacontent)) {
      for (const thId of Object.keys(tahunMap)) {
        const pattern1 = `${varId}${thId}`;
        const pattern2 = `${varId}0${thId}`;

        if (key.includes(pattern1) || key.includes(pattern2)) {
          const year = tahunMap[thId];
          let prefix = key.includes(pattern2) ? key.split(pattern2)[0] : key.split(pattern1)[0];
          let label = vervarMap[prefix] || prefix;

          if (Object.keys(vervarMap).length === 0 && /^\d{4}$/.test(prefix)) {
            label = `Wilayah [${prefix}]`;
          }

          if (!byYear[year]) byYear[year] = [];
          if (!byYear[year].find(e => e.sector === label)) {
            byYear[year].push({ sector: label, value });
          }
          break;
        }
      }
    }
  }

  // ── Render year-grouped data ──
  for (const [year, items] of Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0]))) {
    lines.push(`── ${year} ──`);
    for (const item of items) {
      let valDisplay = item.value;
      if (typeof item.value === "number" || (!isNaN(item.value) && item.value !== "")) {
        valDisplay = Number(item.value).toLocaleString("id-ID");
      }
      lines.push(`  ${item.sector}: ${valDisplay}`);
    }
    lines.push("");
  }

  if (Object.keys(byYear).length === 0) {
    lines.push("Data (raw key → value):");
    for (const [key, value] of Object.entries(datacontent)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  // ── Confidence & Limitations Logic (v4.0) ──
  let confidence = 100;
  const limitations = [];
  const requestedYear = metadata.requestedYear ? parseInt(metadata.requestedYear.split(",").pop()) : new Date().getFullYear();
  const yearsFound = Object.keys(byYear).map(y => parseInt(y)).sort((a,b) => b-a);
  const latestYearFound = yearsFound[0] || 0;

  // 1. Staleness Penalty
  if (latestYearFound > 0 && requestedYear > latestYearFound) {
    const diff = requestedYear - latestYearFound;
    confidence -= (diff * 10);
    limitations.push(`Data mutakhir yang ditemukan adalah tahun ${latestYearFound}, bukan ${requestedYear}.`);
  }

  // 2. Lineage Penalty (Domain Hopping)
  if (metadata.lineage) {
    confidence -= 15;
    limitations.push("Data diambil dari domain induk (Provinsi) karena keterbatasan data di level Kabupaten/Kota.");
  }

  // 3. Proxy Detection
  if (metadata.topic && varInfo.label) {
    const topicKeywords = metadata.topic.toLowerCase().split(/\s+/);
    const varLabelLower = varInfo.label.toLowerCase();
    const hasOverlap = topicKeywords.some(kw => kw.length > 3 && varLabelLower.includes(kw));
    
    if (!hasOverlap) {
      confidence -= 30;
      limitations.push(`Variabel "${varInfo.label}" digunakan sebagai proksi untuk topik "${metadata.topic}". Hasil mungkin tidak mencerminkan indikator secara langsung.`);
    }
  }

  // ── Source Citation & Transparency Footer (v4.0) ──
  const footerLines = ["", "─".repeat(24)];
  
  // Confidence Score Display
  const confidenceColor = confidence >= 80 ? "✅" : (confidence >= 50 ? "⚠️" : "❌");
  footerLines.push(`${confidenceColor} Tingkat Keyakinan: ${Math.max(confidence, 0)}%`);

  if (limitations.length > 0) {
    footerLines.push("❗ Keterbatasan Data:");
    limitations.forEach(l => footerLines.push(`   • ${l}`));
  }

  if (metadata.lineage) footerLines.push(`🔗 Silsilah: ${metadata.lineage}`);
  if (varInfo.source) footerLines.push(`📚 Sumber: ${varInfo.source}`);
  footerLines.push(`📝 Referensi: BPS ${metadata.domainLabel || "Nasional"} (Variable ID: ${varInfo.val})`);
  
  // portalUrl logic removed per user feedback for 2026 context
  return lines.join("\n").trim() + "\n" + footerLines.join("\n");
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
