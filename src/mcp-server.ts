#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { getCreatureMap } from "./config/creatures";
import { getItemMap } from "./config/items";

const statePath =
  process.env.TERMOMON_STATE_PATH ||
  path.join(os.homedir(), ".termomon", "state.json");

function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

function text(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

const server = new McpServer({
  name: "termomon",
  version: "0.1.0",
});

server.tool("scan", "Show nearby creatures that can be caught", {}, () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return text(renderer.renderScan(result));
});

server.tool(
  "catch",
  "Attempt to catch a nearby creature",
  { index: z.number().describe("1-indexed creature number from scan list"), item: z.string().optional().describe("Item to use (default: bytetrap)") },
  ({ index, item }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1, item || "bytetrap");
    stateManager.save(engine.getState());
    return text(renderer.renderCatch(result));
  }
);

server.tool("collection", "Browse caught creatures and evolution progress", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const creatures = getCreatureMap();
  return text(renderer.renderCollection(engine.getState().collection, creatures));
});

server.tool("inventory", "View your items", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const items = getItemMap();
  return text(renderer.renderInventory(engine.getState().inventory, items));
});

server.tool(
  "evolve",
  "Evolve a creature that has enough fragments",
  { creatureId: z.string().describe("Creature ID to evolve (lowercase, e.g. 'mousebyte')") },
  ({ creatureId }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.evolve(creatureId);
    stateManager.save(engine.getState());
    return text(renderer.renderEvolve(result));
  }
);

server.tool("status", "View player profile and game stats", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  return text(renderer.renderStatus(result));
});

server.tool(
  "settings",
  "View or change game settings",
  { key: z.string().optional().describe("Setting key: 'renderer' or 'notifications'"), value: z.string().optional().describe("New value for the setting") },
  ({ key, value }) => {
    const { stateManager, engine } = loadEngine();
    const gameState = engine.getState();
    if (key && value) {
      if (key === "renderer") {
        gameState.settings.renderer = value as "rich" | "simple" | "browser" | "terminal";
      } else if (key === "notifications") {
        gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
      }
      stateManager.save(gameState);
      return text(`Settings updated: ${key} = ${value}`);
    }
    const settings = gameState.settings;
    return text(`SETTINGS\n\nRenderer: ${settings.renderer}\nNotifications: ${settings.notificationLevel}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
