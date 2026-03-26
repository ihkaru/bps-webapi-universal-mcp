/**
 * Foreign Trade tool — ekspor/impor data.
 */

import { z } from "zod";
import { bpsEximFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse } from "../helpers/response.js";

export function register(server) {
  server.tool(
    "bps_foreign_trade",
    "Data ekspor atau impor Indonesia berdasarkan kode HS, negara mitra, dan periode.",
    {
      sumber: z.enum(["1", "2"]).describe("1 = Ekspor, 2 = Impor"),
      periode: z.enum(["1", "2"]).describe("1 = Bulanan, 2 = Tahunan"),
      kodehs: z.string().describe("Kode HS komoditas. Contoh: '09' (kopi/teh), '27' (BBM)"),
      jenishs: z.enum(["1", "2"]).default("1").describe("1 = 2 digit HS, 2 = HS lengkap"),
      tahun: z.coerce.number().int().describe("Tahun data"),
      bulan: z.coerce.number().int().min(1).max(12).optional().describe("Bulan (1-12), wajib jika periode=1"),
      ctry: z.string().optional().describe("Kode negara ISO 2 huruf: 'US', 'CN', 'JP'"),
    },
    safeHandler(async ({ sumber, periode, kodehs, jenishs, tahun, bulan, ctry }) => {
      const data = await bpsEximFetch({ sumber, periode, kodehs, jenishs, tahun, bulan, ctry });

      if (data?.status !== "OK" || !data?.data) {
        return textResponse(`⚠️ Data perdagangan tidak tersedia. Periksa kode HS dan periode.`);
      }

      const tradeType = sumber === "1" ? "Ekspor" : "Impor";
      const items = Array.isArray(data.data) ? data.data : [];
      if (items.length === 0) {
        return textResponse(`Tidak ada data ${tradeType} untuk HS ${kodehs} tahun ${tahun}.`);
      }

      const lines = [`📦 Data ${tradeType} Indonesia — HS ${kodehs} (${tahun}${bulan ? "/" + bulan : ""})`];
      for (const item of items.slice(0, 20)) {
        lines.push(`  ${item.country_name || item.hs_desc || "?"}: ${item.net_weight || "?"} kg, ${item.trade_value || "?"} USD`);
      }
      if (items.length > 20) lines.push(`  ... dan ${items.length - 20} item lainnya.`);
      return textResponse(lines.join("\n"));
    })
  );
}
