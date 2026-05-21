import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "../index.js");

async function run() {
  console.log("🚀 Connecting to local MCP server...");
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: { ...process.env, BPS_API_KEY: process.env.BPS_API_KEY || "f7899a7f09e8352f04ad230dc7ad19fd" }
  });

  const client = new Client({
    name: "bps-tester",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("✅ Connected to MCP Server.");

    console.log("Calling bps_query for Banyuwangi PDRB...");
    const result = await client.callTool({
      name: "bps_query",
      arguments: {
        topic: "PDRB",
        region: "Banyuwangi",
        year: "2023,2024,2025"
      }
    });

    console.log("Result received:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("Error executing tool:", error);
  } finally {
    await transport.close();
  }
}

run();
