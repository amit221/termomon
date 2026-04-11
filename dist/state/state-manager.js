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
exports.StateManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../logger");
function defaultState() {
    const today = new Date().toISOString().split("T")[0];
    return {
        version: 4,
        profile: {
            level: 1,
            xp: 0,
            totalCatches: 0,
            totalMerges: 0,
            totalTicks: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: today,
        },
        collection: [],
        archive: [],
        energy: 5,
        lastEnergyGainAt: Date.now(),
        nearby: [],
        batch: null,
        lastSpawnAt: 0,
        recentTicks: [],
        claimedMilestones: [],
        settings: {
            notificationLevel: "moderate",
        },
    };
}
function migrateV3toV4(raw) {
    const state = raw;
    // Add speciesId, archived to collection creatures, remove rarity from slots, add color to slots
    if (Array.isArray(state.collection)) {
        for (const creature of state.collection) {
            if (!creature.speciesId)
                creature.speciesId = "compi";
            if (creature.archived === undefined)
                creature.archived = false;
            delete creature.color;
            if (Array.isArray(creature.slots)) {
                for (const slot of creature.slots) {
                    delete slot.rarity;
                    if (!slot.color)
                        slot.color = "white";
                }
            }
        }
    }
    // Add speciesId to nearby creatures, remove rarity from slots, add color to slots
    if (Array.isArray(state.nearby)) {
        for (const creature of state.nearby) {
            if (!creature.speciesId)
                creature.speciesId = "compi";
            delete creature.color;
            if (Array.isArray(creature.slots)) {
                for (const slot of creature.slots) {
                    delete slot.rarity;
                    if (!slot.color)
                        slot.color = "white";
                }
            }
        }
    }
    // Add archive if missing
    if (!Array.isArray(state.archive)) {
        state.archive = [];
    }
    state.version = 4;
    return state;
}
class StateManager {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    load() {
        try {
            const data = fs.readFileSync(this.filePath, "utf-8");
            const raw = JSON.parse(data);
            const version = raw.version;
            if (version === 3) {
                logger_1.logger.info("Migrating state from v3 to v4", { path: this.filePath });
                return migrateV3toV4(raw);
            }
            if (version !== 4) {
                logger_1.logger.info("Incompatible state version, creating fresh state", { path: this.filePath });
                return defaultState();
            }
            // Backfill lastSpawnAt for existing v4 states
            const state = raw;
            if (state.lastSpawnAt === undefined) {
                state.lastSpawnAt = 0;
            }
            // Backfill color to slots for existing v4 states; remove creature-level color
            for (const list of [state.collection, state.nearby, state.archive]) {
                if (Array.isArray(list)) {
                    for (const c of list) {
                        delete c.color;
                        if (Array.isArray(c.slots)) {
                            for (const slot of c.slots) {
                                if (!slot.color)
                                    slot.color = "white";
                            }
                        }
                    }
                }
            }
            return state;
        }
        catch (err) {
            const errObj = err;
            const isNotFound = errObj && errObj.code === "ENOENT";
            if (isNotFound) {
                logger_1.logger.info("No state file found, creating default state", { path: this.filePath });
            }
            else {
                logger_1.logger.error("Failed to load state, resetting to default", {
                    path: this.filePath,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            return defaultState();
        }
    }
    save(state) {
        try {
            const dir = path.dirname(this.filePath);
            fs.mkdirSync(dir, { recursive: true });
            const tmp = this.filePath + ".tmp";
            fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
            try {
                fs.renameSync(tmp, this.filePath);
            }
            catch {
                fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf-8");
                try {
                    fs.unlinkSync(tmp);
                }
                catch { /* ignore */ }
            }
        }
        catch (err) {
            logger_1.logger.error("Failed to save state", {
                path: this.filePath,
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
}
exports.StateManager = StateManager;
//# sourceMappingURL=state-manager.js.map