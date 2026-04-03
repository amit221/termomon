import * as fs from "fs";
import * as path from "path";
import { GameState } from "../types";
import { logger } from "../logger";

function defaultState(): GameState {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: 1,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: {
      renderer: "simple",
      notificationLevel: "moderate",
    },
  };
}

export class StateManager {
  constructor(private filePath: string) {}

  load(): GameState {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(data) as GameState;
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown>;
      const isNotFound = errObj && errObj.code === "ENOENT";
      if (isNotFound) {
        logger.info("No state file found, creating default state", { path: this.filePath });
      } else {
        logger.error("Failed to load state, resetting to default", {
          path: this.filePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return defaultState();
    }
  }

  save(state: GameState): void {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filePath + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
      try {
        fs.renameSync(tmp, this.filePath);
      } catch {
        // Rename can fail on Windows due to file locking; fall back to direct write
        fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf-8");
        try { fs.unlinkSync(tmp); } catch { /* ignore cleanup failure */ }
      }
    } catch (err: unknown) {
      logger.error("Failed to save state", {
        path: this.filePath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}
