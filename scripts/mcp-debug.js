#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

const logFile = path.join(os.homedir(), ".compi", "mcp-debug.log");
fs.mkdirSync(path.dirname(logFile), { recursive: true });

const log = (msg) => {
  const ts = new Date().toISOString();
  fs.appendFileSync(logFile, `[${ts}] ${msg}\n`);
};

log("MCP debug wrapper starting");
log(`PID: ${process.pid}`);

process.on("uncaughtException", (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}`);
  log(`Stack: ${err.stack}`);
});

process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
  if (reason instanceof Error) log(`Stack: ${reason.stack}`);
});

process.on("exit", (code) => {
  log(`Process exiting with code: ${code}`);
});

const serverPath = path.resolve(__dirname, "..", "dist", "mcp-server.js");
log(`Loading server: ${serverPath}`);

try {
  require(serverPath);
  log("Server module loaded — MCP transport should be active");
} catch (err) {
  log(`FATAL: ${err.message}`);
  log(`Stack: ${err.stack}`);
  process.exit(1);
}
