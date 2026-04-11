#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const state_manager_1 = require("./state/state-manager");
const game_engine_1 = require("./engine/game-engine");
const simple_text_1 = require("./renderers/simple-text");
const logger_1 = require("./logger");
const energy_1 = require("./engine/energy");
const statePath = process.env.COMPI_STATE_PATH ||
    path.join(os.homedir(), ".compi", "state.json");
const args = process.argv.slice(2);
const command = args[0];
const jsonMode = args.includes("--json");
const stateManager = new state_manager_1.StateManager(statePath);
const state = stateManager.load();
const engine = new game_engine_1.GameEngine(state);
const renderer = new simple_text_1.SimpleTextRenderer();
function output(data, text) {
    if (jsonMode) {
        console.log(JSON.stringify(data));
    }
    else {
        console.log(text);
    }
}
function save() {
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
        case "breed":
        case "merge": {
            const parentAId = args[1];
            const parentBId = args[2];
            const confirm = args.includes("--confirm");
            if (!parentAId || !parentBId) {
                console.error("Usage: compi breed <parentAId> <parentBId> [--confirm]");
                process.exit(1);
            }
            if (confirm) {
                const result = engine.breedExecute(parentAId, parentBId);
                save();
                output(result, renderer.renderBreedResult(result));
            }
            else {
                const preview = engine.breedPreview(parentAId, parentBId);
                output(preview, renderer.renderBreedPreview(preview));
            }
            break;
        }
        case "archive": {
            const creatureId = args[1];
            if (creatureId) {
                const result = engine.archive(creatureId);
                save();
                output(result, `Archived ${result.creature.name}.`);
            }
            else {
                const archive = engine.getState().archive;
                output(archive, renderer.renderArchive(archive));
            }
            break;
        }
        case "release": {
            const creatureId = args[1];
            if (!creatureId) {
                console.error("Usage: compi release <id>");
                process.exit(1);
            }
            engine.release(creatureId);
            save();
            output({ released: creatureId }, `Released creature ${creatureId}.`);
            break;
        }
        case "energy": {
            const currentState = engine.getState();
            const energyText = renderer.renderEnergy(currentState.energy, energy_1.MAX_ENERGY);
            output({ energy: currentState.energy, maxEnergy: energy_1.MAX_ENERGY }, energyText);
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
                    gameState.settings.notificationLevel = value;
                }
                save();
                output(gameState.settings, `Settings updated: ${setting} = ${value}`);
            }
            else {
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
            console.log("  breed <aId> <bId> [--confirm]  Preview or execute breed");
            console.log("  archive [id]            View archive or archive a creature");
            console.log("  release <id>            Permanently release a creature");
            console.log("  energy                  Show current energy");
            console.log("  status                  Your profile");
            console.log("  settings [key] [value]  View/change settings");
            console.log("\nAdd --json for machine-readable output.");
            break;
    }
}
catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger_1.logger.error(`Command "${command}" failed`, {
        args: args.join(" "),
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
    });
    if (jsonMode) {
        console.log(JSON.stringify({ error: message }));
    }
    else {
        console.error(`Error: ${message}`);
    }
    process.exit(1);
}
//# sourceMappingURL=cli.js.map