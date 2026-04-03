import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_DIR =
  process.env.TERMOMON_LOG_PATH ||
  path.join(os.homedir(), ".termomon");

const LOG_FILE = path.join(LOG_DIR, "termomon.log");

function rotateIfNeeded(): void {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size >= MAX_LOG_SIZE) {
      const backup = LOG_FILE + ".old";
      // Keep one backup, overwrite previous
      fs.renameSync(LOG_FILE, backup);
    }
  } catch {
    // File doesn't exist yet — nothing to rotate
  }
}

function write(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    rotateIfNeeded();

    const timestamp = new Date().toISOString();
    let line = `[${timestamp}] ${level.toUpperCase()} ${message}`;
    if (extra) {
      line += " " + JSON.stringify(extra);
    }
    line += "\n";

    fs.appendFileSync(LOG_FILE, line, "utf-8");
  } catch {
    // Logging must never throw — silently drop the entry
  }
}

export const logger = {
  debug: (msg: string, extra?: Record<string, unknown>) => write("debug", msg, extra),
  info: (msg: string, extra?: Record<string, unknown>) => write("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => write("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => write("error", msg, extra),
};
