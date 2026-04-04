import { spawnBatch, generateCreatureTraits, cleanupBatch } from "../../src/engine/batch";
import { GameState, NearbyCreature } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("generateCreatureTraits", () => {
  test("generates 6 traits", () => {
    const traits = generateCreatureTraits(() => 0.5);
    expect(traits).toHaveLength(6);
    const slots = traits.map(t => t.slotId);
    expect(slots).toEqual(["eyes", "mouth", "tail", "gills", "pattern", "aura"]);
  });

  test("each trait has required fields", () => {
    const traits = generateCreatureTraits(() => 0.5);
    for (const t of traits) {
      expect(t.traitId).toBeDefined();
      expect(t.rarity).toBeDefined();
      expect(t.mergeModifier).toBeDefined();
      expect(t.mergeModifier.type).toMatch(/stable|volatile|catalyst/);
    }
  });

  test("low rng produces common traits", () => {
    const traits = generateCreatureTraits(() => 0.1);
    for (const t of traits) {
      expect(t.rarity).toBe("common");
    }
  });
});

describe("spawnBatch", () => {
  test("spawns 2-4 creatures with batch state", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    expect(state.nearby.length).toBeGreaterThanOrEqual(2);
    expect(state.nearby.length).toBeLessThanOrEqual(4);
    expect(state.batch).not.toBeNull();
    expect(state.batch!.attemptsRemaining).toBe(3);
    expect(state.batch!.failPenalty).toBe(0);
  });

  test("does not spawn if batch already active", () => {
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      nearby: [{ id: "test", traits: [], spawnedAt: Date.now() }],
    });
    const spawned = spawnBatch(state, Date.now(), () => 0.5);
    expect(spawned).toHaveLength(0);
    expect(state.nearby).toHaveLength(1);
  });

  test("each spawned creature has unique id and 6 traits", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    const ids = state.nearby.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of state.nearby) {
      expect(c.traits).toHaveLength(6);
    }
  });
});

describe("cleanupBatch", () => {
  test("removes batch and nearby when timed out", () => {
    const thirtyOneMinAgo = Date.now() - 31 * 60 * 1000;
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: thirtyOneMinAgo },
      nearby: [{ id: "old", traits: [], spawnedAt: thirtyOneMinAgo }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
    expect(despawned).toEqual(["old"]);
  });

  test("removes batch when no attempts remaining", () => {
    const state = makeState({
      batch: { attemptsRemaining: 0, failPenalty: 0.2, spawnedAt: Date.now() },
      nearby: [{ id: "a", traits: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
  });

  test("keeps batch if still active", () => {
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      nearby: [{ id: "a", traits: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(1);
    expect(state.batch).not.toBeNull();
    expect(despawned).toHaveLength(0);
  });
});
