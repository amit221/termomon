/**
 * Shared MCP tool registration for both stdio (Claude Code) and HTTP (Cursor) servers.
 */
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { MAX_ENERGY } from "./engine/energy";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

export function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

export interface RegisterToolsOptions {
  /** Write ANSI output to a temp file (Claude Code display mode) */
  writeDisplayFile?: boolean;
  /** If provided, use server.registerTool() with _meta for MCP Apps */
  appMeta?: Record<string, unknown>;
  /** Callback to capture rendered output (used by HTTP server for resource) */
  onOutput?: (content: string) => void;
}

const displayPath = path.join(os.tmpdir(), "compi_display.txt");

function makeText(content: string, options: RegisterToolsOptions) {
  if (options.writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }
  if (options.onOutput) {
    options.onOutput(content);
  }
  return { content: [{ type: "text" as const, text: content }] };
}

type ToolHandler<T> = (args: T) => Promise<{ content: { type: "text"; text: string }[] }>;

function addTool<T>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: z.ZodType<T>,
  handler: ToolHandler<T>,
  appMeta?: Record<string, unknown>,
) {
  if (appMeta) {
    server.registerTool(name, { description, inputSchema, _meta: appMeta }, handler as any);
  } else {
    server.tool(name, description, inputSchema as any, handler as any);
  }
}

export function registerTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  const text = (content: string) => makeText(content, options);
  const meta = options.appMeta;

  addTool(server, "scan", "Show nearby creatures that can be caught", z.object({}), async () => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.scan();
    stateManager.save(engine.getState());
    return text(renderer.renderScan(result));
  }, meta);

  addTool(server, "catch", "Attempt to catch a nearby creature", z.object({
    index: z.number().describe("1-indexed creature number from scan list"),
  }), async ({ index }: { index: number }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    return text(renderer.renderCatch(result));
  }, meta);

  addTool(server, "collection", "Browse caught creatures", z.object({}), async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    return text(renderer.renderCollection(engine.getState().collection));
  }, meta);

  addTool(server, "merge", "Merge two creatures from your collection", z.object({
    targetId: z.string().describe("ID of the creature to keep (gains traits)"),
    foodId: z.string().describe("ID of the creature to sacrifice"),
    confirm: z.boolean().optional().describe("Set to true to execute the merge after previewing"),
  }), async ({ targetId, foodId, confirm }: { targetId: string; foodId: string; confirm?: boolean }) => {
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
  }, meta);

  addTool(server, "energy", "Show current energy level", z.object({}), async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const state = engine.getState();
    return text(renderer.renderEnergy(state.energy, MAX_ENERGY));
  }, meta);

  addTool(server, "status", "View player profile and game stats", z.object({}), async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.status();
    return text(renderer.renderStatus(result));
  }, meta);

  addTool(server, "settings", "View or change game settings", z.object({
    key: z.string().optional().describe("Setting key: 'notifications'"),
    value: z.string().optional().describe("New value for the setting"),
  }), async ({ key, value }: { key?: string; value?: string }) => {
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
  }, meta);
}
