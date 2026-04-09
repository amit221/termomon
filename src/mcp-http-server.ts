#!/usr/bin/env node
/**
 * HTTP MCP server for Cursor -- supports MCP Apps (HTML iframes).
 * Cursor connects via URL: http://localhost:3456/mcp
 *
 * Usage: node dist/mcp-http-server.js
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import { registerTools } from "./mcp-tools";

const PORT = parseInt(process.env.COMPI_PORT || "3456", 10);

const appUri = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";
let latestOutput = "";

// Load the polling HTML template (has client-side ANSI→HTML + fetch from /api/latest-output)
let appHtml = "";
try {
  appHtml = fs.readFileSync(path.resolve(__dirname, "mcp-app.html"), "utf-8");
} catch {
  try {
    appHtml = fs.readFileSync(path.resolve(__dirname, "..", "src", "mcp-app.html"), "utf-8");
  } catch {}
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "compi",
    version: "0.3.0",
  });

  // MCP App resource — serves HTML with polling JS that fetches colored output
  server.registerResource(appUri, appUri, { mimeType: APP_MIME }, async () => ({
    contents: [{ uri: appUri, mimeType: APP_MIME, text: appHtml }],
  }));

  const appMeta = { ui: { resourceUri: appUri }, "ui/resourceUri": appUri };

  registerTools(server, {
    appMeta: {
      ...appMeta,
      ui: { ...appMeta.ui, csp: { connectDomains: [`http://localhost:${PORT}`] } },
    },
    onOutput: (content) => { latestOutput = content; },
  });

  return server;
}

// --- HTTP transport ---

const app = express();
app.use(cors());
app.use(express.json());

// API endpoint for the MCP App iframe to fetch latest output
app.get("/api/latest-output", (_req: express.Request, res: express.Response) => {
  res.json({ text: latestOutput });
});

app.all("/mcp", async (req: express.Request, res: express.Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Compi MCP server listening on http://localhost:${PORT}/mcp`);
});
