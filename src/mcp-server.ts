#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { MAX_ENERGY } from "./engine/energy";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

// COMPI_DISPLAY_FILE=1: Claude Code mode — write ANSI to temp file for cat display
const writeDisplayFile = process.env.COMPI_DISPLAY_FILE === "1";
const displayPath = path.join(os.tmpdir(), "compi_display.txt");

// When not in Claude Code, use MCP Apps for HTML rendering
const useMcpApps = !writeDisplayFile;

// Load the MCP App HTML template from file
let APP_HTML = "";
try {
  APP_HTML = fs.readFileSync(path.resolve(__dirname, "mcp-app.html"), "utf-8");
} catch {
  try {
    APP_HTML = fs.readFileSync(path.resolve(__dirname, "..", "src", "mcp-app.html"), "utf-8");
  } catch {}
}

function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

function text(content: string) {
  if (writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }
  return { content: [{ type: "text" as const, text: content }] };
}

const server = new McpServer({
  name: "compi",
  version: "0.3.0",
});

// MCP App resource — shared HTML template for all tools
const appUri = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";

if (useMcpApps) {
  server.registerResource(appUri, appUri, { mimeType: APP_MIME }, async () => ({
    contents: [{ uri: appUri, mimeType: APP_MIME, text: APP_HTML }],
  }));
}

// Tool metadata for MCP Apps — links each tool to the shared UI resource
const appMeta = useMcpApps
  ? { ui: { resourceUri: appUri }, "ui/resourceUri": appUri }
  : undefined;

// --- Tools ---
// Use registerTool (not server.tool) so we can pass _meta for MCP Apps

server.registerTool("scan", {
  description: "Show nearby creatures that can be caught",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return text(renderer.renderScan(result));
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
  return text(renderer.renderCatch(result));
});

server.registerTool("collection", {
  description: "Browse caught creatures",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  return text(renderer.renderCollection(engine.getState().collection));
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
  if (confirm) {
    const result = engine.mergeExecute(targetId, foodId);
    stateManager.save(engine.getState());
    return text(renderer.renderMergeResult(result));
  } else {
    const preview = engine.mergePreview(targetId, foodId);
    return text(renderer.renderMergePreview(preview));
  }
});

server.registerTool("energy", {
  description: "Show current energy level",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const state = engine.getState();
  return text(renderer.renderEnergy(state.energy, MAX_ENERGY));
});

server.registerTool("status", {
  description: "View player profile and game stats",
  inputSchema: z.object({}),
  _meta: appMeta,
}, async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  return text(renderer.renderStatus(result));
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
