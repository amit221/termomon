import { GameState, Tick, TickResult, ScanResult, ScanEntry, CatchResult, MergePreview, MergeResult, StatusResult, Notification } from "../types";
import { processNewTick } from "./ticks";
import { spawnBatch, cleanupBatch } from "./batch";
import { attemptCatch, calculateCatchRate } from "./catch";
import { calculateEnergyCost, processEnergyGain } from "./energy";
import { previewMerge, executeMerge } from "./merge";
import { TICKS_PER_SPAWN_CHECK, SPAWN_PROBABILITY } from "../config/constants";

export class GameEngine {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  processTick(tick: Tick, rng: () => number = Math.random): TickResult {
    const notifications: Notification[] = [];

    processNewTick(this.state, tick);

    const energyGained = processEnergyGain(this.state, tick.timestamp);

    const despawned = cleanupBatch(this.state, tick.timestamp);

    let spawned = false;
    if (!this.state.batch && this.state.profile.totalTicks % TICKS_PER_SPAWN_CHECK === 0) {
      if (rng() < SPAWN_PROBABILITY) {
        const creatures = spawnBatch(this.state, tick.timestamp, rng);
        if (creatures.length > 0) {
          spawned = true;
          notifications.push({ message: `${creatures.length} creatures appeared nearby!`, level: "moderate" });
        }
      }
    }

    return { notifications, spawned, energyGained, despawned };
  }

  scan(): ScanResult {
    const nearby: ScanEntry[] = this.state.nearby.map((creature, index) => ({
      index,
      creature,
      catchRate: calculateCatchRate(creature.slots, this.state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.slots),
    }));
    return { nearby, energy: this.state.energy, batch: this.state.batch };
  }

  catch(nearbyIndex: number, rng: () => number = Math.random): CatchResult {
    return attemptCatch(this.state, nearbyIndex, rng);
  }

  mergePreview(targetId: string, foodId: string): MergePreview {
    return previewMerge(this.state, targetId, foodId);
  }

  mergeExecute(targetId: string, foodId: string, rng: () => number = Math.random): MergeResult {
    return executeMerge(this.state, targetId, foodId, rng);
  }

  status(): StatusResult {
    return {
      profile: this.state.profile,
      collectionCount: this.state.collection.length,
      energy: this.state.energy,
      nearbyCount: this.state.nearby.length,
      batchAttemptsRemaining: this.state.batch?.attemptsRemaining ?? 0,
    };
  }

  getState(): GameState {
    return this.state;
  }
}
