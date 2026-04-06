#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { logger } from "./logger";
import { MAX_ENERGY } from "./engine/energy";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

const args = process.argv.slice(2);
const command = args[0];
const jsonMode = args.includes("--json");

const stateManager = new StateManager(statePath);
const state = stateManager.load();
const engine = new GameEngine(state);
const renderer = new SimpleTextRenderer();

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
      if (isNaN(index)) {
        console.error("Usage: compi catch [number]");
        process.exit(1);
      }
      const result = engine.catch(index);
      save();
      output(result, renderer.renderCatch(result));
      break;
    }

    case "collection": {
      const collection = engine.getState().collection;
      output(collection, renderer.renderCollection(collection));
      break;
    }

    case "merge": {
      const targetId = args[1];
      const foodId = args[2];
      const confirm = args.includes("--confirm");
      if (!targetId || !foodId) {
        console.error("Usage: compi merge <targetId> <foodId> [--confirm]");
        process.exit(1);
      }
      if (confirm) {
        const result = engine.mergeExecute(targetId, foodId);
        save();
        output(result, renderer.renderMergeResult(result));
      } else {
        const preview = engine.mergePreview(targetId, foodId);
        output(preview, renderer.renderMergePreview(preview));
      }
      break;
    }

    case "energy": {
      const currentState = engine.getState();
      const energyText = renderer.renderEnergy(currentState.energy, MAX_ENERGY);
      output({ energy: currentState.energy, maxEnergy: MAX_ENERGY }, energyText);
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
        if (setting === "notifications") {
          gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
        }
        save();
        output(gameState.settings, `Settings updated: ${setting} = ${value}`);
      } else {
        const settings = engine.getState().settings;
        output(settings, `SETTINGS\n\nNotifications: ${settings.notificationLevel}`);
      }
      break;
    }

    default:
      console.log("Compi — Terminal Creature Collection Game\n");
      console.log("Commands:");
      console.log("  tick                    Record activity tick");
      console.log("  scan                    Show nearby creatures");
      console.log("  catch [n]               Catch creature #n");
      console.log("  collection              View your creatures");
      console.log("  merge <targetId> <foodId> [--confirm]  Preview or execute merge");
      console.log("  energy                  Show current energy");
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
