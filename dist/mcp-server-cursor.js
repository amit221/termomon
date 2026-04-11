#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Stdio MCP server for Cursor.
 *
 * Cursor renders MCP Apps iframes from a combination of three signals, all of
 * which are required:
 *   1. A registered persistent UI resource (`ui://compi/display.html`).
 *   2. `_meta.ui.resourceUri` on each tool registration (injected via
 *      `registerTools`'s `appMeta` option).
 *   3. An embedded HTML resource in each tool response's content array
 *      (injected via `registerTools`'s `renderHtml` option).
 *
 * Cursor caches resource URI responses, so the persistent resource must be
 * non-empty on first fetch and must serve fresh content on subsequent reads.
 * We handle both concerns by:
 *   - Warming up `latestOutput` at startup by running a synthetic scan, so
 *     the very first resource fetch has content.
 *   - Awaiting an `outputVersion` bump inside the resource handler, so if the
 *     resource fetch races with a tool call (which it typically does — Cursor
 *     issues `resources/read` concurrent with `tools/call`), the handler
 *     returns the NEW tool output instead of the previous cached value.
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const mcp_tools_1 = require("./mcp-tools");
const ansi_to_html_1 = require("./renderers/ansi-to-html");
const simple_text_1 = require("./renderers/simple-text");
const APP_URI = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";
let latestOutput = "";
let outputVersion = 0;
// Resolves with the latest output, waiting briefly if a tool call is in
// flight and hasn't yet called onOutput.
function createOutputWaiter() {
    const startVersion = outputVersion;
    return new Promise((resolve) => {
        const deadline = Date.now() + 3000;
        const check = () => {
            if (outputVersion > startVersion) {
                resolve(latestOutput);
            }
            else if (Date.now() >= deadline) {
                resolve(latestOutput);
            }
            else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}
const server = new mcp_js_1.McpServer({
    name: "compi",
    version: "0.3.0",
});
server.registerResource(APP_URI, APP_URI, { mimeType: APP_MIME }, async () => {
    // Always wait for the next output bump (up to 3s). This handles the race
    // where Cursor issues `resources/read` concurrent with `tools/call` — we
    // don't want to return the PREVIOUS tool's output while the new one is
    // still in flight. If no new output arrives within the timeout, we fall
    // back to whatever `latestOutput` currently holds.
    const content = await createOutputWaiter();
    return {
        contents: [{ uri: APP_URI, mimeType: APP_MIME, text: (0, ansi_to_html_1.buildAppHtml)(content) }],
    };
});
const appMeta = {
    ui: { resourceUri: APP_URI },
    "ui/resourceUri": APP_URI,
};
(0, mcp_tools_1.registerTools)(server, {
    appMeta,
    renderHtml: ansi_to_html_1.buildAppHtml,
    onOutput: (content) => {
        latestOutput = content;
        outputVersion++;
    },
});
// Warm up latestOutput so the very first resource fetch has content.
(() => {
    try {
        const { engine } = (0, mcp_tools_1.loadEngine)();
        const renderer = new simple_text_1.SimpleTextRenderer();
        latestOutput = renderer.renderScan(engine.scan());
        outputVersion++;
    }
    catch (err) {
        // If warm-up fails (e.g. corrupt state), start empty rather than crash.
    }
})();
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
//# sourceMappingURL=mcp-server-cursor.js.map