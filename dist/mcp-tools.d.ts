import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
export declare function loadEngine(): {
    stateManager: StateManager;
    engine: GameEngine;
};
export interface RegisterToolsOptions {
    /** Write ANSI output to a temp file (Claude Code display mode) */
    writeDisplayFile?: boolean;
    /** If provided, use server.registerTool() with _meta for MCP Apps */
    appMeta?: Record<string, unknown>;
    /** Callback to capture rendered output (used by Cursor server for its persistent UI resource) */
    onOutput?: (content: string) => void;
    /** If provided, render ANSI to HTML and include as embedded resource in result */
    renderHtml?: (ansiContent: string) => string;
}
/**
 * Pure command-layer logic for the `breed` MCP tool. Extracted so the three
 * modes (list / partner / preview / execute) can be unit-tested without
 * constructing a real MCP server.
 *
 * Returns the rendered output and a flag indicating whether state mutated
 * (so the caller can decide whether to persist).
 */
export declare function runBreedCommand(engine: GameEngine, renderer: SimpleTextRenderer, args: {
    indexA?: number;
    indexB?: number;
    confirm?: boolean;
}): {
    output: string;
    mutated: boolean;
};
export declare function registerTools(server: McpServer, options?: RegisterToolsOptions): void;
//# sourceMappingURL=mcp-tools.d.ts.map