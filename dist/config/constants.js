"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TICK_PRUNE_COUNT = exports.TIME_OF_DAY_RANGES = exports.SHARED_ATTEMPTS = exports.BATCH_LINGER_MS = exports.SPAWN_INTERVAL_MS = void 0;
const loader_1 = require("./loader");
const config = (0, loader_1.loadConfig)();
// Batch / Spawning
exports.SPAWN_INTERVAL_MS = config.batch.spawnIntervalMs;
exports.BATCH_LINGER_MS = config.batch.batchLingerMs;
exports.SHARED_ATTEMPTS = config.batch.sharedAttempts;
exports.TIME_OF_DAY_RANGES = config.batch.timeOfDay;
// Progression
exports.TICK_PRUNE_COUNT = config.progression.tickPruneCount;
//# sourceMappingURL=constants.js.map