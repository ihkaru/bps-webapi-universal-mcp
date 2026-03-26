/**
 * Logger Helper — Ensures all logs go to stderr to avoid corrupting STDOUT (JSON-RPC).
 * This is a 2026 MCP best practice for production-grade servers.
 */

export const logger = {
  info: (msg) => process.stderr.write(`[BPS-INFO] ${msg}\n`),
  warn: (msg) => process.stderr.write(`[BPS-WARN] ${msg}\n`),
  error: (msg) => process.stderr.write(`[BPS-ERROR] ${msg}\n`),
  debug: (msg) => {
    if (process.env.DEBUG) {
      process.stderr.write(`[BPS-DEBUG] ${msg}\n`);
    }
  }
};
