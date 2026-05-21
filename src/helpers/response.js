/**
 * Response Helpers — Curated, token-efficient response formatting.
 * v9.5: Universal BPS Decoder — Final Audit-Driven version.
 */

export function curateListResponse(data, fieldExtractor) {
  if (data?.status?.toUpperCase() !== "OK" || data?.["data-availability"] !== "available") {
    return `Status: ${data?.status || "unknown"}. Data tidak tersedia.`;
  }
  const raw = data.data;
  if (!Array.isArray(raw) || raw.length < 2) return "Data kosong.";
  const [pag, items] = raw;
  return `[Halaman ${pag.page}/${pag.pages} | Total: ${pag.total}]\n` + items.map(fieldExtractor).join("\n");
}

export function curateDynamicData(data, metadata = {}) {
  // 1. Availability validation
  const status = String(data?.status || "").toUpperCase();
  if (status !== "OK" || data?.["data-availability"] !== "available") {
    return `⚠️ Data "${metadata.topic || "Indikator"}" tidak tersedia untuk wilayah ini.`;
  }

  // 2. Metadata Extraction (Multi-Variant Mapping)
  const varInfo = data.var?.[0] || data.variable?.[0] || { label: metadata.topic || "Indikator" };
  const vervarMap = {};
  const rawVervars = data.vervar || data.vv || [];
  (rawVervars || []).forEach(v => { 
    const id = String(v.val || v.vv_id || v.id || "");
    if (id) vervarMap[id] = v.label || v.vervar || v.vv_name || v.name; 
  });

  const tahunMap = data._tahunMap || {};
  if (Object.keys(tahunMap).length === 0) {
    const rawTahun = data.tahun || data.th || [];
    (rawTahun || []).forEach(t => { 
      const id = String(t.val || t.th_id || t.id || "");
      if (id) tahunMap[id] = t.label || t.th || t.th_name; 
    });
  }

  const turvarMap = {};
  const rawTurvars = data.turvar || data.tv || [];
  (rawTurvars || []).forEach(t => { 
    const id = String(t.val || t.turvar_id || t.id || "");
    if (id) turvarMap[id] = t.label || t.turvar || t.tv_name || t.name; 
  });

  const datacontent = data.datacontent || {};
  const byYear = {};
  const filterRegion = (metadata.filterRegion || "").toLowerCase().replace(/kabupaten|kota/g, "").trim();

  // 3. Substring-First Matching Logic
  const varId = String(varInfo.val || "");
  const varIdStr = String(metadata.varId);
  const thIds = Object.keys(tahunMap);
  const vvIds = Object.keys(vervarMap);
  const tvIds = Object.keys(turvarMap).filter(id => id !== "0");

  for (const [key, value] of Object.entries(datacontent)) {
    // v13.1: Strict Path Search (Avoiding Collision with VarID)
    // Identify which year is buried in the key (ignoring the VarID segment)
    const keySearchingTh = key.replace(varIdStr, "____");
    const matchedThId = thIds.find(id => keySearchingTh.includes(id));
    
    if (!matchedThId) continue;

    // Identify which vvId is buried in the key (usually at start or after varId)
    // v10.3: Improved matching (Check if key starts with vervar ID OR if key contains it)
    const matchedVvId = vvIds.find(id => key.startsWith(id)) || vvIds.find(id => key.includes(id));
    
    // Identify Column/Flavor
    const matchedTvId = tvIds.find(id => key.includes(id));

    const yearLabel = tahunMap[matchedThId];
    let regionLabel = matchedVvId ? vervarMap[matchedVvId] : "Total/Indonesia";
    
    // Region Filtering (v14.1: Quad-Identity Identity Resolution)
    if (filterRegion) {
      const clean = regionLabel.toLowerCase().replace(/kabupaten|kota/g, "").trim();
      
      // Match Patterns:
      // 1. Internal ID Match (e.g. 195)
      // 2. Full MFD Match (e.g. 8108)
      // 3. Suffix Match (e.g. 24 for 7324) — Common in 7300 (Sulsel)
      // 4. Ordinal Match (e.g. 24) — Also common in Sulsel legacy keys
      const isInternalMatch = (metadata.internalId && key.startsWith(metadata.internalId));
      const isMfdMatch = (metadata.mfdCode && key.startsWith(metadata.mfdCode));
      
      const mfdSuffix = (metadata.mfdCode && metadata.mfdCode.length === 4) ? metadata.mfdCode.slice(2) : null;
      const isSuffixMatch = mfdSuffix && key.includes(mfdSuffix) && key.indexOf(mfdSuffix) > 4;
      
      const isOrdinalMatch = metadata.ordinalId && key.includes(metadata.ordinalId) && key.indexOf(metadata.ordinalId) > 4;
      
      const isLabelMatch = clean === filterRegion || clean.includes(filterRegion) || filterRegion.includes(clean);
      
      if (!isInternalMatch && !isMfdMatch && !isSuffixMatch && !isOrdinalMatch && !isLabelMatch) continue;
    }

    const colSuffix = matchedTvId ? ` [${turvarMap[matchedTvId]}]` : "";
    if (!byYear[yearLabel]) byYear[yearLabel] = [];
    byYear[yearLabel].push({ sector: regionLabel + colSuffix, value });
  }

  // 4. Group results by year
  const lines = [`📊 ${varInfo.label || metadata.topic}${varInfo.unit ? ` (${varInfo.unit})` : ""}`];
  if (data.last_update) lines.push(`📅 Update: ${data.last_update}`);
  lines.push("");

  const sortedYears = Object.keys(byYear).sort((a,b) => b.localeCompare(a));
  for (const year of sortedYears) {
    lines.push(`── ${year} ──`);
    const seen = new Set();
    for (const item of byYear[year]) {
      if (seen.has(item.sector)) continue;
      seen.add(item.sector);
      const val = (isNaN(item.value) || item.value === "" || item.value === null) 
                  ? item.value 
                  : Number(item.value).toLocaleString("id-ID");
      lines.push(`  • ${item.sector}: ${val}`);
    }
    lines.push("");
  }

  // Fallback for debugging (Should be rare now)
  if (sortedYears.length === 0) {
    if (Object.keys(datacontent).length > 0) {
      lines.push("💡 Format data kompleks, menampilkan sampel:");
      Object.entries(datacontent).slice(0, 3).forEach(([k,v]) => lines.push(`  ${k}: ${v}`));
    } else {
      lines.push("⚠️ Data numerik tidak ditemukan.");
    }
  }

  // 5. Transparency Footer
  const confidence = metadata.lineage ? 85 : 95;
  const footerLines = [
    "─".repeat(32),
    `${confidence >= 80 ? "✅" : "⚠️"} Tingkat Keyakinan: ${confidence}%`,
    metadata.lineage ? `🔗 Silsilah: ${metadata.lineage}` : null,
    `📚 Sumber: BPS ${metadata.domainLabel || "BPS"}` + (varInfo.val ? ` (Variable ID: ${varInfo.val})` : ""),
  ].filter(Boolean);

  return lines.join("\n").trim() + "\n" + footerLines.join("\n");
}

export function safeHandler(fn) {
  return async (args) => {
    try { return await fn(args); }
    catch (e) { return { content: [{ type: "text", text: `❌ Error: ${e.message}` }], isError: true }; }
  };
}

export function textResponse(text) { return { content: [{ type: "text", text }] }; }
export function generateBpsPortalUrl(v, d) { return `https://www.bps.go.id/id/statistics-table/2/${Buffer.from(`${v}#2`).toString("base64")}/`; }
