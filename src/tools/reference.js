/**
 * Reference tools — domain list, subjects, indicators, glosarium, infographic, news, publication.
 */

import { z } from "zod";
import { bpsFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse, curateListResponse } from "../helpers/response.js";

export function register(server) {
  server.tool(
    "bps_domain_list",
    "Daftar domain BPS (pusat, provinsi, kabupaten/kota). Biasanya tidak perlu — gunakan bps_query.",
    {
      type: z.enum(["all", "prov", "kab", "kabbyprov"]).default("all")
        .describe("Tipe domain: all/prov/kab/kabbyprov"),
      prov: z.coerce.string().optional().describe("ID provinsi (4 digit), wajib jika type=kabbyprov"),
    },
    safeHandler(async ({ type, prov }) => {
      const data = await bpsFetch("/domain", { type, prov });
      return textResponse(
        curateListResponse(data, d => `• ${d.domain_name} (id: ${d.domain_id})`)
      );
    })
  );

  server.tool(
    "bps_list_subjects",
    "Daftar subjek/topik statistik BPS. Gunakan sub_id untuk filter di bps_list_variable.",
    {
      domain: z.coerce.string().default("0000"),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, lang, page }) => {
      const data = await bpsFetch("/list", { model: "subject", domain, lang, page });
      return textResponse(
        curateListResponse(data, s =>
          `• [sub_id: ${s.sub_id}] ${s.title} — ${s.subcat || "-"} (${s.ntabel || 0} tabel)`
        )
      );
    })
  );

  server.tool(
    "bps_strategic_indicators",
    "Indikator strategis BPS (kemiskinan, IPM, Gini, dll). Hanya pusat dan provinsi.",
    {
      domain: z.coerce.string().default("0000"),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, lang, page }) => {
      const data = await bpsFetch("/list", { model: "indicators", domain, lang, page });
      return textResponse(
        curateListResponse(data, i =>
          `• ${i.title}: ${i.data_value || "?"} (${i.unit || "-"}) — ${i.data_year || "-"}`
        )
      );
    })
  );

  server.tool(
    "bps_list_publication",
    "Daftar publikasi/buku statistik resmi BPS.",
    {
      domain: z.coerce.string().default("0000"),
      keyword: z.string().optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().optional(),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, keyword, month, year, lang, page }) => {
      const data = await bpsFetch("/list", { model: "publication", domain, keyword, month, year, lang, page });
      return textResponse(
        curateListResponse(data, p =>
          `• [pub_id: ${p.pub_id}] ${p.title} (${p.rl_date || "-"}) — ${p.size || "?"}`
        )
      );
    })
  );

  server.tool(
    "bps_list_infographic",
    "Daftar infografis statistik BPS.",
    {
      domain: z.coerce.string().default("0000"),
      keyword: z.string().optional(),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, keyword, lang, page }) => {
      const data = await bpsFetch("/list", { model: "infographic", domain, keyword, lang, page });
      return textResponse(curateListResponse(data, ig => `• ${ig.title} — ${ig.img || "-"}`));
    })
  );

  server.tool(
    "bps_glosarium",
    "Glosarium/kamus istilah statistik resmi BPS.",
    {
      prefix: z.string().optional().describe("Huruf awal istilah, mis: 'A', 'G'"),
      page: z.coerce.number().int().min(1).default(1),
      perpage: z.coerce.number().int().min(1).max(50).default(20),
    },
    safeHandler(async ({ prefix, page, perpage }) => {
      const data = await bpsFetch("/list", { model: "glosarium", prefix, page, perpage });
      return textResponse(curateListResponse(data, g => `• ${g.istilah}: ${g.definisi || "-"}`));
    })
  );

  server.tool(
    "bps_list_news",
    "Daftar berita/artikel terbaru dari website BPS.",
    {
      domain: z.coerce.string().default("0000"),
      keyword: z.string().optional(),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, keyword, lang, page }) => {
      const data = await bpsFetch("/list", { model: "news", domain, keyword, lang, page });
      return textResponse(curateListResponse(data, n => `• ${n.title} (${n.rl_date || "-"})`));
    })
  );
}
