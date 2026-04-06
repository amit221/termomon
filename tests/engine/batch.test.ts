import { spawnBatch, generateCreatureSlots, cleanupBatch } from "../../src/engine/batch";
import { GameState, NearbyCreature, SLOT_IDS } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 3,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("generateCreatureSlots", () => {
  test("generates exactly 4 slots", () => {
    const slots = generateCreatureSlots(() => 0.5);
    expect(slots).toHaveLength(4);
  });

  test("slot IDs are eyes, mouth, body, tail in order", () => {
    const slots = generateCreatureSlots(() => 0.5);
    expect(slots.map(s => s.slotId)).toEqual(SLOT_IDS);
  });

  test("each slot has variantId and valid rarity", () => {
    const VALID_RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
    const slots = generateCreatureSlots(() => 0.5);
    for (const s of slots) {
      expect(s.variantId).toBeDefined();
      expect(s.variantId.length).toBeGreaterThan(0);
      expect(VALID_RARITIES).toContain(s.rarity);
    }
  });

  test("low rng produces common slots", () => {
    // rng=0.01 is below the common spawn weight threshold (0.30)
    const slots = generateCreatureSlots(() => 0.01);
    for (const s of slots) {
      expect(s.rarity).toBe("common");
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
      nearby: [{ id: "test", name: "Glorp", slots: [], spawnedAt: Date.now() }],
    });
    const spawned = spawnBatch(state, Date.now(), () => 0.5);
    expect(spawned).toHaveLength(0);
    expect(state.nearby).toHaveLength(1);
  });

  test("each spawned creature has unique id, name, and 4 slots", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    const ids = state.nearby.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of state.nearby) {
      expect(c.name).toBeDefined();
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.slots).toHaveLength(4);
    }
  });
});

describe("cleanupBatch", () => {
  test("removes batch and nearby when timed out", () => {
    const thirtyOneMinAgo = Date.now() - 31 * 60 * 1000;
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: thirtyOneMinAgo },
      nearby: [{ id: "old", name: "Blobby", slots: [], spawnedAt: thirtyOneMinAgo }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
    expect(despawned).toEqual(["old"]);
  });

  test("removes batch when no attempts remaining", () => {
    const state = makeState({
      batch: { attemptsRemaining: 0, failPenalty: 0.2, spawnedAt: Date.now() },
      nearby: [{ id: "a", name: "Zibbit", slots: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
    expect(despawned).toEqual(["a"]);
  });

  test("keeps batch if still active", () => {
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      nearby: [{ id: "a", name: "Glimby", slots: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(1);
    expect(state.batch).not.toBeNull();
    expect(despawned).toHaveLength(0);
  });
});
