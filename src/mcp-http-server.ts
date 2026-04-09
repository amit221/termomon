#!/usr/bin/env node
/**
 * HTTP MCP server for Cursor -- supports MCP Apps (HTML iframes).
 * Cursor connects via URL: http://localhost:3456/mcp
 *
 * Usage: node dist/mcp-http-server.js
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { registerTools } from "./mcp-tools";
import { ansiToHtml } from "./renderers/ansi-to-html";

const PORT = parseInt(process.env.COMPI_PORT || "3456", 10);

const appUri = "ui://compi/display.html";
const APP_MIME = "text/html;profile=mcp-app";
let latestOutput = "";

const ANSI_COLORS_JS = "{'30':'#000','31':'#ff1744','32':'#00e676','33':'#ffea00','34':'#448aff','35':'#d500f9','36':'#00e5ff','37':'#e0e0e0','90':'#9e9e9e','91':'#ff1744','92':'#00e676','93':'#ffea00','94':'#448aff','95':'#d500f9','96':'#00e5ff','97':'#ffffff'}";

function buildHtml(ansiContent: string): string {
  const body = ansiContent ? ansiToHtml(ansiContent) : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#e0e0e0;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:14px;padding:16px;line-height:1.5}
pre{white-space:pre-wrap;word-wrap:break-word}
</style></head><body><pre id="o">${body || "Loading..."}</pre><script>
var C=${ANSI_COLORS_JS};
function a2h(t){var re=/(?:\\x1b|\\u001b)?\\[([0-9;]*)m/g,h='',o=0,last=0,m;while((m=re.exec(t))!==null){var b=t.slice(last,m.index);for(var k=0;k<b.length;k++){if(b[k]==='<')h+='&lt;';else if(b[k]==='>')h+='&gt;';else if(b[k]==='&')h+='&amp;';else h+=b[k]}last=re.lastIndex;var c=m[1].split(';'),s=[];for(var j=0;j<c.length;j++){if(c[j]==='0'||c[j]===''){while(o>0){h+='</span>';o--}}else if(c[j]==='1')s.push('font-weight:bold');else if(c[j]==='2')s.push('opacity:0.6');else if(C[c[j]])s.push('color:'+C[c[j]])}if(s.length>0){h+='<span style="'+s.join(';')+'">';o++}}var tail=t.slice(last);for(var k=0;k<tail.length;k++){if(tail[k]==='<')h+='&lt;';else if(tail[k]==='>')h+='&gt;';else if(tail[k]==='&')h+='&amp;';else h+=tail[k]}while(o>0){h+='</span>';o--}return h}
window.addEventListener('message',function(ev){var m=ev.data;if(!m||!m.jsonrpc)return;
if(m.method==='ui/initialize'){window.parent.postMessage({jsonrpc:'2.0',id:m.id,result:{protocolVersion:'2026-06-17',capabilities:{}}},'*');return}
if(m.method==='ui/notifications/tool-result'||m.method==='ui/toolResult'){var c=m.params&&(m.params.content||(m.params.result&&m.params.result.content));if(c){for(var i=0;i<c.length;i++){if(c[i].type==='text'){document.getElementById('o').innerHTML=a2h(c[i].text);break}}}if(m.id)window.parent.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*');return}
if(m.id)window.parent.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*')});
</script></body></html>`;
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "compi",
    version: "0.3.0",
  });

  server.registerResource(appUri, appUri, { mimeType: APP_MIME }, async () => ({
    contents: [{ uri: appUri, mimeType: APP_MIME, text: buildHtml(latestOutput) }],
  }));

  const appMeta = { ui: { resourceUri: appUri }, "ui/resourceUri": appUri };

  registerTools(server, {
    appMeta: {
      ...appMeta,
      ui: { ...appMeta.ui, csp: { connectDomains: [`http://localhost:${PORT}`] } },
    },
    onOutput: (content) => { latestOutput = content; },
  });

  return server;
}

// --- HTTP transport ---

const app = express();
app.use(cors());
app.use(express.json());

// API endpoint for the MCP App iframe to fetch latest output
app.get("/api/latest-output", (_req: express.Request, res: express.Response) => {
  res.json({ text: latestOutput });
});

app.all("/mcp", async (req: express.Request, res: express.Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Compi MCP server listening on http://localhost:${PORT}/mcp`);
});
