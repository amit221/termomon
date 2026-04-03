#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { getCreatureMap } from "./config/creatures";
import { getItemMap } from "./config/items";
import { logger } from "./logger";

const statePath =
  process.env.TERMOMON_STATE_PATH ||
  path.join(os.homedir(), ".termomon", "state.json");

const args = process.argv.slice(2);
const command = args[0];
const jsonMode = args.includes("--json");

const stateManager = new StateManager(statePath);
const state = stateManager.load();
const engine = new GameEngine(state);
const renderer = new SimpleTextRenderer();
const creatures = getCreatureMap();
const items = getItemMap();

function output(data: unknown, text: string): void {
  if (jsonMode) {
    console.log(JSON.stringify(data));
  } else {
    console.log(text);
  }
}

function save(): void {
  stateManager.save(engine.getState());
}

try {
  switch (command) {
    case "tick": {
      const sessionId = args.find((a) => a.startsWith("--session="))?.split("=")[1];
      const eventType = args.find((a) => a.startsWith("--event="))?.split("=")[1];
      const result = engine.processTick({
        timestamp: Date.now(),
        sessionId,
        eventType,
      });
      save();
      output(result, result.notifications.map((n) => renderer.renderNotification(n)).join("\n"));
      break;
    }

    case "scan": {
      const result = engine.scan();
      save();
      output(result, renderer.renderScan(result));
      break;
    }

    case "catch": {
      const index = parseInt(args[1], 10) - 1;
      const itemId = args.find((a) => a.startsWith("--item="))?.split("=")[1] || "bytetrap";
      if (isNaN(index)) {
        console.error("Usage: termomon catch [number] --item=bytetrap");
        process.exit(1);
      }
      const result = engine.catch(index, itemId);
      save();
      output(result, renderer.renderCatch(result));
      break;
    }

    case "collection": {
      const collection = engine.getState().collection;
      output(collection, renderer.renderCollection(collection, creatures));
      break;
    }

    case "inventory": {
      const inventory = engine.getState().inventory;
      output(inventory, renderer.renderInventory(inventory, items));
      break;
    }

    case "evolve": {
      const creatureId = args[1];
      if (!creatureId) {
        console.error("Usage: termomon evolve [creature-id]");
        process.exit(1);
      }
      const result = engine.evolve(creatureId);
      save();
      output(result, renderer.renderEvolve(result));
      break;
    }

    case "status": {
      const result = engine.status();
      output(result, renderer.renderStatus(result));
      break;
    }

    case "settings": {
      const setting = args[1];
      const value = args[2];
      if (setting && value) {
        const gameState = engine.getState();
        if (setting === "renderer") {
          gameState.settings.renderer = value as "rich" | "simple" | "browser" | "terminal";
        } else if (setting === "notifications") {
          gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
        }
        save();
        output(gameState.settings, `Settings updated: ${setting} = ${value}`);
      } else {
        const settings = engine.getState().settings;
        output(settings, `SETTINGS\n\nRenderer: ${settings.renderer}\nNotifications: ${settings.notificationLevel}`);
      }
      break;
    }

    default:
      console.log("Termomon — Terminal Creature Collection Game\n");
      console.log("Commands:");
      console.log("  tick                    Record activity tick");
      console.log("  scan                    Show nearby creatures");
      console.log("  catch [n] --item=ID     Catch creature #n");
      console.log("  collection              View your creatures");
      console.log("  inventory               View your items");
      console.log("  evolve [creature-id]    Evolve a creature");
      console.log("  status                  Your profile");
      console.log("  settings [key] [value]  View/change settings");
      console.log("\nAdd --json for machine-readable output.");
      break;
  }
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Command "${command}" failed`, {
    args: args.join(" "),
    error: message,
    stack: err instanceof Error ? err.stack : undefined,
  });
  if (jsonMode) {
    console.log(JSON.stringify({ error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
