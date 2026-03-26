/**
 * SIMDASI tools — Statistik Dalam Angka (interoperabilitas).
 */

import { z } from "zod";
import { bpsInteropFetch } from "../helpers/bps-client.js";
import { safeHandler, textResponse } from "../helpers/response.js";

export function register(server) {
  server.tool(
    "bps_simdasi_subjects",
    "Daftar subjek/bab dalam SIMDASI. Kode wilayah 7 digit MFD, mis: '0000000'=Nasional.",
    { wilayah: z.coerce.string().default("0000000").describe("Kode wilayah 7 digit MFD") },
    safeHandler(async ({ wilayah }) => {
      const data = await bpsInteropFetch("simdasi", 22, { wilayah });
      return textResponse(JSON.stringify(data, null, 2));
    })
  );

  server.tool(
    "bps_simdasi_tables",
    "Daftar tabel SIMDASI berdasarkan wilayah.",
    { wilayah: z.coerce.string().default("0000000").describe("Kode wilayah 7 digit MFD") },
    safeHandler(async ({ wilayah }) => {
      const data = await bpsInteropFetch("simdasi", 23, { wilayah });
      return textResponse(JSON.stringify(data, null, 2));
    })
  );

  server.tool(
    "bps_simdasi_get_table",
    "Ambil isi tabel SIMDASI berdasarkan id_tabel dan tahun.",
    {
      wilayah: z.coerce.string().default("0000000"),
      id_tabel: z.coerce.string().describe("ID tabel dari bps_simdasi_tables"),
      tahun: z.coerce.number().int().describe("Tahun referensi"),
    },
    safeHandler(async ({ wilayah, id_tabel, tahun }) => {
      const data = await bpsInteropFetch("simdasi", 25, { wilayah, id_tabel, tahun });
      return textResponse(JSON.stringify(data, null, 2));
    })
  );

  server.tool(
    "bps_simdasi_regions",
    "Daftar kode wilayah 7 digit MFD untuk SIMDASI.",
    {
      level: z.enum(["province", "regency"]).default("province").describe("province/regency"),
      parent: z.coerce.string().optional().describe("Kode MFD 7 digit induk (wajib untuk regency)"),
    },
    safeHandler(async ({ level, parent }) => {
      const id = level === "province" ? 26 : 27;
      const data = await bpsInteropFetch("simdasi", id, parent ? { parent } : {});
      return textResponse(JSON.stringify(data, null, 2));
    })
  );
}
