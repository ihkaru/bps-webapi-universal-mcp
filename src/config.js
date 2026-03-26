/**
 * BPS MCP Server — Configuration
 * Centralizes environment variables and constants.
 */

import "dotenv/config";

export const BASE_URL = "https://webapi.bps.go.id/v1/api";
export const API_KEY  = process.env.BPS_API_KEY ?? "";

if (!API_KEY) {
  console.error("[BPS-MCP] ⚠️  BPS_API_KEY belum di-set. Set dulu environment variable-nya.");
  process.exit(1);
}
