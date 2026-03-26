/**
 * Press Release tools — list and detail BRS.
 */

import { z } from "zod";
import { bpsFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse, curateListResponse } from "../helpers/response.js";

export function register(server) {
  server.tool(
    "bps_list_press_release",
    "Daftar Berita Resmi Statistik (BRS) BPS terbaru.",
    {
      domain: z.coerce.string().default("0000"),
      keyword: z.string().optional().describe("Kata kunci pencarian"),
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().optional(),
      lang: z.enum(["ind", "eng"]).default("ind"),
      page: z.coerce.number().int().min(1).default(1),
    },
    safeHandler(async ({ domain, keyword, month, year, lang, page }) => {
      const data = await bpsFetch("/list", { model: "pressrelease", domain, keyword, month, year, lang, page });
      return textResponse(
        curateListResponse(data, b =>
          `• [brs_id: ${b.brs_id}] ${b.title} (${b.rl_date || "-"}) — ${b.subj || b.subcsa || "Umum"}`
        )
      );
    })
  );

  server.tool(
    "bps_get_press_release",
    "Detail satu Berita Resmi Statistik BPS termasuk abstrak lengkapnya.",
    {
      domain: z.coerce.string().default("0000"),
      id: z.coerce.string().describe("brs_id dari bps_list_press_release"),
      lang: z.enum(["ind", "eng"]).default("ind"),
    },
    safeHandler(async ({ domain, id, lang }) => {
      const data = await bpsFetch("/view", { model: "pressrelease", domain, id, lang });
      if (data?.status !== "OK") {
        return textResponse(`⚠️ Press release id=${id} tidak ditemukan. Periksa brs_id.`);
      }
      const d = data.data;
      const abstract = (d?.abstract || "").replace(/<[^>]*>/g, "");
      return textResponse(
        `📰 ${d?.title || "Untitled"}\n📅 ${d?.rl_date || "-"}\n\n${abstract}\n\n📎 PDF: ${d?.pdf || "-"}`
      );
    })
  );
}
