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
exports.loadEngine = loadEngine;
exports.runBreedCommand = runBreedCommand;
exports.registerTools = registerTools;
/**
 * Shared MCP tool registration for both stdio MCP servers:
 *   - `mcp-server.ts` (Claude Code) — text-only output via ANSI display file.
 *   - `mcp-server-cursor.ts` (Cursor) — HTML MCP Apps via embedded resource.
 */
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const zod_1 = require("zod");
const state_manager_1 = require("./state/state-manager");
const game_engine_1 = require("./engine/game-engine");
const simple_text_1 = require("./renderers/simple-text");
const energy_1 = require("./engine/energy");
const statePath = process.env.COMPI_STATE_PATH ||
    path.join(os.homedir(), ".compi", "state.json");
function loadEngine() {
    const stateManager = new state_manager_1.StateManager(statePath);
    const state = stateManager.load();
    const engine = new game_engine_1.GameEngine(state);
    return { stateManager, engine };
}
const displayPath = path.join(os.tmpdir(), "compi_display.txt");
function makeText(content, options) {
    if (options.writeDisplayFile) {
        fs.writeFileSync(displayPath, content);
    }
    if (options.onOutput) {
        options.onOutput(content);
    }
    // If renderHtml is provided, return HTML for the iframe instead of raw ANSI
    if (options.renderHtml) {
        const html = options.renderHtml(content);
        return { content: [
                { type: "text", text: content },
                { type: "resource", resource: { uri: `ui://compi/result-${Date.now()}.html`, mimeType: "text/html;profile=mcp-app", text: html } },
            ] };
    }
    return { content: [{ type: "text", text: content }] };
}
function addTool(server, name, description, inputSchema, handler, appMeta) {
    if (appMeta) {
        server.registerTool(name, { description, inputSchema, _meta: appMeta }, handler);
    }
    else {
        // server.tool() with schema expects the raw shape object, not ZodObject
        const shape = inputSchema.shape;
        if (Object.keys(shape).length > 0) {
            server.tool(name, description, shape, handler);
        }
        else {
            server.tool(name, description, {}, handler);
        }
    }
}
/**
 * Pure command-layer logic for the `breed` MCP tool. Extracted so the three
 * modes (list / partner / preview / execute) can be unit-tested without
 * constructing a real MCP server.
 *
 * Returns the rendered output and a flag indicating whether state mutated
 * (so the caller can decide whether to persist).
 */
function runBreedCommand(engine, renderer, args) {
    const { indexA, indexB, confirm } = args;
    const collection = engine.getState().collection;
    // List mode: no indexes → show the species-grouped breed table
    if (indexA === undefined && indexB === undefined) {
        return {
            output: renderer.renderBreedTable(engine.buildBreedTable()),
            mutated: false,
        };
    }
    // One-arg mode is no longer supported
    if (indexA !== undefined && indexB === undefined) {
        throw new Error("Pick two creatures to breed. Run /breed to see all breedable creatures, or /breed N M to preview a pair.");
    }
    if (indexA === undefined && indexB !== undefined) {
        throw new Error("indexA is required. Run /breed to see all breedable creatures, or /breed N M to preview a pair.");
    }
    // Preview / execute mode
    if (indexA === undefined || indexB === undefined) {
        throw new Error("Both indexA and indexB are required to preview or confirm a breed.");
    }
    if (indexA < 1 || indexA > collection.length) {
        throw new Error(`No creature at index ${indexA}. You have ${collection.length} creatures.`);
    }
    if (indexB < 1 || indexB > collection.length) {
        throw new Error(`No creature at index ${indexB}. You have ${collection.length} creatures.`);
    }
    const parentAId = collection[indexA - 1].id;
    const parentBId = collection[indexB - 1].id;
    if (confirm) {
        const result = engine.breedExecute(parentAId, parentBId);
        return { output: renderer.renderBreedResult(result), mutated: true };
    }
    const preview = engine.breedPreview(parentAId, parentBId);
    return { output: renderer.renderBreedPreview(preview), mutated: false };
}
function registerTools(server, options = {}) {
    const text = (content) => makeText(content, options);
    const meta = options.appMeta;
    addTool(server, "scan", "Show nearby creatures that can be caught", zod_1.z.object({}), async () => {
        const { stateManager, engine } = loadEngine();
        const renderer = new simple_text_1.SimpleTextRenderer();
        const result = engine.scan();
        stateManager.save(engine.getState());
        return text(renderer.renderScan(result));
    }, meta);
    addTool(server, "catch", "Attempt to catch a nearby creature", zod_1.z.object({
        index: zod_1.z.number().describe("1-indexed creature number from scan list"),
    }), async ({ index }) => {
        const { stateManager, engine } = loadEngine();
        const renderer = new simple_text_1.SimpleTextRenderer();
        const result = engine.catch(index - 1);
        stateManager.save(engine.getState());
        return text(renderer.renderCatch(result));
    }, meta);
    addTool(server, "collection", "Browse caught creatures", zod_1.z.object({}), async () => {
        const { engine } = loadEngine();
        const renderer = new simple_text_1.SimpleTextRenderer();
        return text(renderer.renderCollection(engine.getState().collection));
    }, meta);
    addTool(server, "breed", "Breed two creatures from your collection (uses /collection indexes)", zod_1.z.object({
        indexA: zod_1.z.number().optional().describe("1-indexed position of first parent in /collection"),
        indexB: zod_1.z.number().optional().describe("1-indexed position of second parent in /collection"),
        confirm: zod_1.z.boolean().optional().describe("Set to true to execute the breed after previewing"),
    }), async ({ indexA, indexB, confirm }) => {
        const { stateManager, engine } = loadEngine();
        const renderer = new simple_text_1.SimpleTextRenderer();
        const result = runBreedCommand(engine, renderer, { indexA, indexB, confirm });
        if (result.mutated)
            stateManager.save(engine.getState());
        return text(result.output);
    }, meta);
    addTool(server, "archive", "View archive or archive a creature", zod_1.z.object({
        id: zod_1.z.string().optional().describe("Creature ID to archive (omit to view archive)"),
    }), async ({ id }) => {
        const { stateManager, engine } = loadEngine();
        const renderer = new simple_text_1.SimpleTextRenderer();
        if (id) {
            const result = engine.archive(id);
            stateManager.save(engine.getState());
            return text(`Archived ${result.creature.name}.`);
        }
        else {
            return text(renderer.renderArchive(engine.getState().archive));
        }
    }, meta);
    addTool(server, "release", "Permanently release a creature", zod_1.z.object({
        id: zod_1.z.string().describe("Creature ID to release"),
    }), async ({ id }) => {
        const { stateManager, engine } = loadEngine();
        engine.release(id);
        stateManager.save(engine.getState());
        return text(`Released creature ${id}.`);
    }, meta);
    addTool(server, "energy", "Show current energy level", zod_1.z.object({}), async () => {
        const { engine } = loadEngine();
        const renderer = new simple_text_1.SimpleTextRenderer();
        const state = engine.getState();
        return text(renderer.renderEnergy(state.energy, energy_1.MAX_ENERGY));
    }, meta);
    addTool(server, "status", "View player profile and game stats", zod_1.z.object({}), async () => {
        const { engine } = loadEngine();
        const renderer = new simple_text_1.SimpleTextRenderer();
        const result = engine.status();
        return text(renderer.renderStatus(result));
    }, meta);
    addTool(server, "settings", "View or change game settings", zod_1.z.object({
        key: zod_1.z.string().optional().describe("Setting key: 'notifications'"),
        value: zod_1.z.string().optional().describe("New value for the setting"),
    }), async ({ key, value }) => {
        const { stateManager, engine } = loadEngine();
        const gameState = engine.getState();
        if (key && value) {
            if (key === "notifications") {
                gameState.settings.notificationLevel = value;
            }
            stateManager.save(gameState);
            return text(`Settings updated: ${key} = ${value}`);
        }
        const settings = gameState.settings;
        return text(`SETTINGS\n\nNotifications: ${settings.notificationLevel}`);
    }, meta);
}
//# sourceMappingURL=mcp-tools.js.map