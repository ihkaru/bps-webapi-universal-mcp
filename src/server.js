/**
 * BPS WebAPI MCP Server v2.0 (Agent-First, Modular)
 *
 * Design Philosophy:
 *   - Outcomes over Operations: `bps_query` handles full orchestration
 *   - Curated Responses: compact, token-efficient output
 *   - Agent-Friendly Errors: actionable suggestions, never raw throws
 *   - Type Resilient: z.coerce prevents LLM type confusion
 *   - Modular: each tool group in its own file
 *
 * Dokumentasi API: https://webapi.bps.go.id/documentation/
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";
import { logger } from "./helpers/logger.js";

// Import config to trigger API_KEY validation
import "./config.js";

// ─── Create MCP Server ───────────────────────────────────────────────────────
const server = new McpServer({
  name: "bps-webapi",
  version: "2.3.0",
  description:
    "Akses data statistik resmi BPS Indonesia — Spek 2026 (Agent-First) dengan fitur orkestrasi bps_query.",
});

// ─── Register all tools ──────────────────────────────────────────────────────
registerAllTools(server);

// ─── Resource: Usage Guide ───────────────────────────────────────────────────
server.resource(
  "bps-mcp-guide",
  "bps://guide",
  { mimeType: "text/markdown" },
  async () => ({
    contents: [
      {
        uri: "bps://guide",
        mimeType: "text/markdown",
        text: `# Panduan BPS MCP Server v2.3 (Agent-First)

## Tool Utama
| Tool | Fungsi |
|------|--------|
| \`bps_query\` | **PRIMARY** — Cukup sebutkan topik, wilayah, dan tahun. Server otomatis mengorkestrasikan semua langkah. |

### Contoh Penggunaan
\`\`\`
bps_query(topic="PDRB", region="Mempawah", year="2025")
bps_query(topic="kemiskinan", region="Jawa Barat")
bps_query(topic="inflasi", region="Nasional", year="2026")
\`\`\`

## Tools Lanjutan (Fallback)
Gunakan hanya jika \`bps_query\` tidak mencukupi.

| Tool | Fungsi |
|------|--------|
| \`bps_get_dynamic_data\` | Ambil data dengan var_id spesifik |
| \`bps_foreign_trade\` | Data ekspor/impor berdasarkan kode HS |
| \`bps_strategic_indicators\` | Indikator strategis (IPM, Gini, dll) |
| \`bps_list_variable\` | Cari var_id variabel |
| \`bps_list_period\` | Cari th_id periode/tahun |
| \`bps_list_vertical_var\` | Cari vervar_id baris |
| \`bps_domain_list\` | Cari domain_id wilayah |
| \`bps_list_subjects\` | Daftar topik statistik |

## Catatan
- Domain nasional: \`"0000"\`
- Semua response sudah dikurasi (compact, token-efficient)
- Errors berisi saran tindakan (actionable)
- Parameter ID otomatis di-coerce (angka/string accepted)
`,
      },
    ],
  })
);

// ─── Start server ────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
logger.info("✅ Server BPS v2.3 (MCP 2026 Standard) berjalan via Stdio.");
