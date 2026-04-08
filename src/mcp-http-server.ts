#!/usr/bin/env node
/**
 * HTTP MCP server for Cursor — supports MCP Apps (HTML iframes).
 * Cursor connects via URL: http://localhost:3456/mcp
 *
 * Usage: node dist/mcp-http-server.js
 */
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { MAX_ENERGY } from "./engine/energy";

const PORT = parseInt(process.env.COMPI_PORT || "3456", 10);

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

// --- ANSI → HTML conversion ---

const ANSI_TO_CSS: Record<string, string> = {
  "30": "#1a1a2e", "31": "#ff1744", "32": "#00e676", "33": "#ffea00",
  "34": "#448aff", "35": "#d500f9", "36": "#00e5ff", "37": "#e0e0e0",
  "90": "#9e9e9e", "91": "#ff1744", "92": "#00e676", "93": "#ffea00",
  "94": "#448aff", "95": "#d500f9", "96": "#00e5ff", "97": "#ffffff",
};

function ansiToHtml(text: string): string {
  let html = "";
  let openSpans = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\x1b" && text[i + 1] === "[") {
      const end = text.indexOf("m", i + 2);
      if (end === -1) { html += text[i]; continue; }
      const codes = text.slice(i + 2, end).split(";");
      i = end;
      const styles: string[] = [];
      for (const code of codes) {
        if (code === "0" || code === "") {
          while (openSpans > 0) { html += "</span>"; openSpans--; }
        } else if (code === "1") styles.push("font-weight:bold");
        else if (code === "2") styles.push("opacity:0.6");
        else if (ANSI_TO_CSS[code]) styles.push("color:" + ANSI_TO_CSS[code]);
      }
      if (styles.length > 0) {
        html += `<span style="${styles.join(";")}">`;
        openSpans++;
      }
    } else if (text[i] === "<") html += "&lt;";
    else if (text[i] === ">") html += "&gt;";
    else if (text[i] === "&") html += "&amp;";
    else html += text[i];
  }
  while (openSpans > 0) { html += "</span>"; openSpans--; }
  return html;
}

function buildAppHtml(ansiContent: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#e0e0e0;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:14px;padding:16px;line-height:1.5}
pre{white-space:pre-wrap;word-wrap:break-word}
</style></head><body><pre>${ansiToHtml(ansiContent)}</pre></body></html>`;
}

// --- Engine helpers ---

function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

function text(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

// --- Server factory ---

const appUri = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";
let latestOutput = "";

function createServer(): McpServer {
  const server = new McpServer({
    name: "compi",
    version: "0.3.0",
  });

  // MCP App resource — serves pre-rendered HTML
  server.registerResource(appUri, appUri, { mimeType: APP_MIME }, async () => ({
    contents: [{ uri: appUri, mimeType: APP_MIME, text: buildAppHtml(latestOutput) }],
  }));

  const appMeta = { ui: { resourceUri: appUri }, "ui/resourceUri": appUri };

  // --- Tools ---

  server.registerTool("scan", {
    description: "Show nearby creatures that can be caught",
    inputSchema: z.object({}),
    _meta: appMeta,
  }, async () => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.scan();
    stateManager.save(engine.getState());
    const rendered = renderer.renderScan(result);
    latestOutput = rendered;
    return text(rendered);
  });

  server.registerTool("catch", {
    description: "Attempt to catch a nearby creature",
    inputSchema: z.object({
      index: z.number().describe("1-indexed creature number from scan list"),
    }),
    _meta: appMeta,
  }, async ({ index }: { index: number }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    const rendered = renderer.renderCatch(result);
    latestOutput = rendered;
    return text(rendered);
  });

  server.registerTool("collection", {
    description: "Browse caught creatures",
    inputSchema: z.object({}),
    _meta: appMeta,
  }, async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const rendered = renderer.renderCollection(engine.getState().collection);
    latestOutput = rendered;
    return text(rendered);
  });

  server.registerTool("merge", {
    description: "Merge two creatures from your collection",
    inputSchema: z.object({
      targetId: z.string().describe("ID of the creature to keep (gains traits)"),
      foodId: z.string().describe("ID of the creature to sacrifice"),
      confirm: z.boolean().optional().describe("Set to true to execute the merge after previewing"),
    }),
    _meta: appMeta,
  }, async ({ targetId, foodId, confirm }: { targetId: string; foodId: string; confirm?: boolean }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    let rendered: string;
    if (confirm) {
      const result = engine.mergeExecute(targetId, foodId);
      stateManager.save(engine.getState());
      rendered = renderer.renderMergeResult(result);
    } else {
      const preview = engine.mergePreview(targetId, foodId);
      rendered = renderer.renderMergePreview(preview);
    }
    latestOutput = rendered;
    return text(rendered);
  });

  server.registerTool("energy", {
    description: "Show current energy level",
    inputSchema: z.object({}),
    _meta: appMeta,
  }, async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const state = engine.getState();
    const rendered = renderer.renderEnergy(state.energy, MAX_ENERGY);
    latestOutput = rendered;
    return text(rendered);
  });

  server.registerTool("status", {
    description: "View player profile and game stats",
    inputSchema: z.object({}),
    _meta: appMeta,
  }, async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.status();
    const rendered = renderer.renderStatus(result);
    latestOutput = rendered;
    return text(rendered);
  });

  server.registerTool("settings", {
    description: "View or change game settings",
    inputSchema: z.object({
      key: z.string().optional().describe("Setting key: 'notifications'"),
      value: z.string().optional().describe("New value for the setting"),
    }),
    _meta: appMeta,
  }, async ({ key, value }: { key?: string; value?: string }) => {
    const { stateManager, engine } = loadEngine();
    const gameState = engine.getState();
    if (key && value) {
      if (key === "notifications") {
        gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
      }
      stateManager.save(gameState);
      return text(`Settings updated: ${key} = ${value}`);
    }
    const settings = gameState.settings;
    return text(`SETTINGS\n\nNotifications: ${settings.notificationLevel}`);
  });

  return server;
}

// --- HTTP transport ---

const app = express();
app.use(cors());
app.use(express.json());

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
