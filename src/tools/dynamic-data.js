/**
 * Dynamic Data tools — variable search, period lookup, vertical vars, and data retrieval.
 */

import { z } from "zod";
import { bpsFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse, curateListResponse, curateDynamicData } from "../helpers/response.js";

export function register(server) {
  server.tool(
    "bps_list_variable",
    "Cari daftar variabel/dataset tabel dinamis BPS. " +
    "Hasil berisi var_id untuk bps_get_dynamic_data. " +
    "Biasanya tidak perlu — gunakan bps_query.",
    {
      domain: z.coerce.string().default("0000").describe("Domain ID BPS. '0000' = Nasional"),
      keyword: z.string().optional().describe("Kata kunci pencarian. Contoh: 'PDRB', 'kemiskinan'"),
      subject: z.coerce.string().optional().describe("ID subjek untuk filter. Contoh: '154'"),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, keyword, subject, lang, page }) => {
      const data = await bpsFetch("/list", { model: "var", domain, keyword, subject, lang, page });
      return textResponse(
        curateListResponse(data, v =>
          `• [var_id: ${v.var_id}] ${v.title} — ${v.unit || "N/A"} (subjek: ${v.sub_name || v.sub_id || "-"})`
        )
      );
    })
  );

  server.tool(
    "bps_get_dynamic_data",
    "Ambil data aktual dari tabel dinamis BPS menggunakan var_id. " +
    "Biasanya tidak perlu — gunakan bps_query.",
    {
      domain: z.coerce.string().default("0000").describe("Domain ID BPS"),
      var: z.coerce.number().int().describe("var_id variabel"),
      th: z.coerce.string().optional().describe("ID tahun/periode. Multi: '125;126', range: '125:128'"),
      turvar: z.coerce.string().optional().describe("ID derived variable"),
      vervar: z.coerce.string().optional().describe("ID variabel vertikal/baris"),
      turth: z.coerce.string().optional().describe("ID derived period"),
      lang: z.enum(["ind", "eng"]).default("ind"),
    },
    safeHandler(async ({ domain, var: varId, th, turvar, vervar, turth, lang }) => {
      const data = await bpsFetch("/list", { model: "data", domain, var: varId, th, turvar, vervar, turth, lang });
      return textResponse(curateDynamicData(data));
    })
  );

  server.tool(
    "bps_list_period",
    "Daftar periode/tahun tersedia untuk suatu variabel.",
    {
      domain: z.coerce.string().default("0000"),
      var: z.coerce.number().int().optional().describe("var_id untuk filter"),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, var: varId, lang, page }) => {
      const data = await bpsFetch("/list", { model: "th", domain, var: varId, lang, page });
      return textResponse(curateListResponse(data, p => `• ${p.th} (th_id: ${p.th_id})`));
    })
  );

  server.tool(
    "bps_list_vertical_var",
    "Daftar variabel vertikal (baris/dimensi) suatu dataset dinamis BPS.",
    {
      domain: z.coerce.string().default("0000"),
      var: z.coerce.number().int().optional().describe("var_id untuk filter"),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, var: varId, lang, page }) => {
      const data = await bpsFetch("/list", { model: "vervar", domain, var: varId, lang, page });
      return textResponse(curateListResponse(data, v => `• ${v.label || v.vervar} (id: ${v.val || v.vervar_id})`));
    })
  );
}
