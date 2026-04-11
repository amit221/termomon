#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const mcp_tools_1 = require("./mcp-tools");
// Tell the display helper to write ANSI to a temp file
process.env.COMPI_DISPLAY_FILE = "1";
const server = new mcp_js_1.McpServer({
    name: "compi",
    version: "0.3.0",
});
(0, mcp_tools_1.registerTools)(server, { writeDisplayFile: true });
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
//# sourceMappingURL=mcp-server.js.map