import { processSpawns } from "../../src/engine/spawn";
import { GameState } from "../../src/types";

describe("spawn multi-creatures", () => {
  it("should spawn up to 3 creatures when conditions allow", () => {
    const state: GameState = {
      version: 1,
      profile: { level: 1, xp: 0, totalCatches: 0, totalTicks: 100, currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-03" },
      collection: [],
      inventory: {},
      nearby: [],
      recentTicks: [],
      claimedMilestones: [],
      settings: { renderer: "simple", notificationLevel: "moderate" },
    };

    // Mock RNG to always spawn
    const mockRng = () => 0.1; // Always passes spawn check

    const spawned = processSpawns(state, Date.now(), mockRng);
    expect(spawned.length).toBeLessThanOrEqual(3);
    expect(spawned.length).toBeGreaterThan(0);
  });

  it("should not exceed MAX_NEARBY even with multi-spawn", () => {
    const state: GameState = {
      version: 1,
      profile: { level: 1, xp: 0, totalCatches: 0, totalTicks: 100, currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-03" },
      collection: [],
      inventory: {},
      nearby: [
        { creatureId: "mousebyte", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "buglet", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "sparkit", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "cryptbug", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "datamoth", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "glitchling", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "pixelwing", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "codesnake", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "hackrat", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "bitspin", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
      ],
      recentTicks: [],
      claimedMilestones: [],
      settings: { renderer: "simple", notificationLevel: "moderate" },
    };

    const spawned = processSpawns(state, Date.now(), () => 0.1);
    expect(state.nearby.length).toBeLessThanOrEqual(10);
  });
});
