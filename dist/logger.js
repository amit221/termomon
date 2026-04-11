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
exports.logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB
const LOG_DIR = process.env.COMPI_LOG_PATH ||
    path.join(os.homedir(), ".compi");
const LOG_FILE = path.join(LOG_DIR, "compi.log");
function rotateIfNeeded() {
    try {
        const stat = fs.statSync(LOG_FILE);
        if (stat.size >= MAX_LOG_SIZE) {
            const backup = LOG_FILE + ".old";
            // Keep one backup, overwrite previous
            fs.renameSync(LOG_FILE, backup);
        }
    }
    catch {
        // File doesn't exist yet — nothing to rotate
    }
}
function write(level, message, extra) {
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
    }
    catch {
        // Logging must never throw — silently drop the entry
    }
}
exports.logger = {
    debug: (msg, extra) => write("debug", msg, extra),
    info: (msg, extra) => write("info", msg, extra),
    warn: (msg, extra) => write("warn", msg, extra),
    error: (msg, extra) => write("error", msg, extra),
};
//# sourceMappingURL=logger.js.map