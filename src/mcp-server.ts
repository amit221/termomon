#!/usr/bin/env node
/**
 * Stdio MCP server for Claude Code.
 * Writes ANSI output to a temp file for display via `cat`.
 */
import * as os from "os";
import * as path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./mcp-tools";

// Tell the display helper to write ANSI to a temp file
process.env.COMPI_DISPLAY_FILE = "1";

const server = new McpServer({
  name: "compi",
  version: "0.3.0",
});

registerTools(server, { writeDisplayFile: true });

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
