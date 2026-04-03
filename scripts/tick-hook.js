#!/usr/bin/env node
// scripts/tick-hook.js
//
// Claude Code hook script. Receives JSON on stdin, records a game tick.
// Configured to fire on: PostToolUse, UserPromptSubmit, Stop, SessionStart

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const LOG_DIR = process.env.TERMOMON_LOG_PATH || path.join(os.homedir(), ".termomon");
const LOG_FILE = path.join(LOG_DIR, "termomon.log");
const MAX_LOG_SIZE = 5 * 1024 * 1024;

function log(level, message, extra) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    try {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size >= MAX_LOG_SIZE) {
        fs.renameSync(LOG_FILE, LOG_FILE + ".old");
      }
    } catch {}
    const ts = new Date().toISOString();
    let line = `[${ts}] ${level} ${message}`;
    if (extra) line += " " + JSON.stringify(extra);
    line += "\n";
    fs.appendFileSync(LOG_FILE, line, "utf-8");
  } catch {}
}

log("DEBUG", "tick-hook invoked", { pid: process.pid, argv: process.argv.slice(2) });

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  log("DEBUG", "stdin ended", { inputLength: input.length, input: input.substring(0, 500) });
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id || "";
    const eventType = data.hook_event_name || "";

    const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
    const args = ["tick", `--session=${sessionId}`, `--event=${eventType}`, "--json"];

    execFileSync("node", [cliPath, ...args], {
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    log("ERROR", "tick-hook: tick command failed", {
      error: err.message || String(err),
    });
  }

  // Output notification context for Claude (only works on UserPromptSubmit)
  try {
    const data = JSON.parse(input);
    if (data.hook_event_name === "UserPromptSubmit") {
      const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
      const result = execFileSync("node", [cliPath, "scan", "--json"], {
        timeout: 5000,
        encoding: "utf-8",
      });
      const scan = JSON.parse(result);
      if (scan.nearby && scan.nearby.length > 0) {
        const notification = {
          additionalContext: `[Termomon] ${scan.nearby.length} creature(s) nearby. The user can run /scan to see them.`,
        };
        process.stdout.write(JSON.stringify(notification));
      }
    }
  } catch (err) {
    log("ERROR", "tick-hook: scan notification failed", {
      error: err.message || String(err),
    });
  }
});
