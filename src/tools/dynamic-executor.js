import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import * as BpsClient from "../helpers/bps-client.js";

const execAsync = promisify(exec);

/**
 * Dynamic Executor Tool — Implementation of Code-as-a-Tool (2026 Trend)
 * Allows executing arbitrary shell commands and JavaScript logic.
 */
export function register(server) {
  
  // 1. run_shell: The "Universal" CLI tool
  server.tool(
    "run_shell",
    {
      command: z.string().describe("Shell command to execute (e.g., 'ls -la', 'grep -r pattern .', 'curl ...')"),
    },
    async ({ command }) => {
      // Basic security baseline
      if (command.includes(".env") || command.includes("mcp_config.json")) {
        return {
          content: [{ type: "text", text: "Error: Access to sensitive configuration files (.env, mcp_config.json) is blocked." }],
          isError: true
        };
      }

      try {
        // Execute with a 30s timeout
        const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
        
        const responseText = [
          stdout ? stdout : "",
          stderr ? `\n--- STDERR ---\n${stderr}` : ""
        ].join("").trim();

        return {
          content: [{ 
            type: "text", 
            text: responseText || "Command executed successfully (no output)." 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Execution Failed:\n${error.message}` }],
          isError: true
        };
      }
    }
  );

  // 2. execute_js: The "Logic Orchestrator"
  server.tool(
    "execute_js",
    {
      code: z.string().describe("JavaScript code to run. Available helpers in 'bps' object: bpsFetch, bpsEximFetch, bpsInteropFetch. Use 'return' to send data back."),
    },
    async ({ code }) => {
      try {
        // Define an async wrapper for the code
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        
        // Expose BPS client and a simple console logger
        let logs = [];
        const customConsole = {
          log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")),
          error: (...args) => logs.push("ERROR: " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "))
        };

        const execute = new AsyncFunction("bps", "console", code);
        const result = await execute(BpsClient, customConsole);

        let finalOutput = "";
        if (logs.length > 0) finalOutput += `Logs:\n${logs.join("\n")}\n\n`;
        finalOutput += `Result:\n${JSON.stringify(result, null, 2)}`;

        return {
          content: [{ type: "text", text: finalOutput }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `JS Error: ${error.message}\nStack: ${error.stack}` }],
          isError: true
        };
      }
    }
  );
}
