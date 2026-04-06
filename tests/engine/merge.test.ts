// tests/engine/merge.test.ts — v2 sacrifice merge tests
import {
  calculateSlotChances,
  previewMerge,
  executeMerge,
} from "../../src/engine/merge";
import { GameState, CollectionCreature, CreatureSlot, RARITY_ORDER } from "../../src/types";

function makeSlots(rarities: string[]): CreatureSlot[] {
  const slotIds = ["eyes", "mouth", "body", "tail"] as const;
  return rarities.map((r, i) => ({
    slotId: slotIds[i],
    variantId: `${slotIds[i]}_${r}_test`,
    rarity: r as any,
  }));
}

function makeCreature(id: string, rarities: string[]): CollectionCreature {
  return {
    id,
    name: `Creature_${id}`,
    slots: makeSlots(rarities),
    caughtAt: Date.now(),
    generation: 0,
  };
}

function makeAllCommon(id: string): CollectionCreature {
  return makeCreature(id, ["common", "common", "common", "common"]);
}

function makeAllMythic(id: string): CollectionCreature {
  return makeCreature(id, ["mythic", "mythic", "mythic", "mythic"]);
}

function makeState(collection: CollectionCreature[]): GameState {
  return {
    version: 3,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection,
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

describe("calculateSlotChances", () => {
  test("returns one entry per slot (4 slots)", () => {
    const creature = makeAllCommon("a");
    const chances = calculateSlotChances(creature);
    expect(chances).toHaveLength(4);
  });

  test("all slots present in results", () => {
    const creature = makeAllCommon("a");
    const chances = calculateSlotChances(creature);
    const slotIds = chances.map(c => c.slotId).sort();
    expect(slotIds).toEqual(["body", "eyes", "mouth", "tail"]);
  });

  test("chances sum to approximately 1", () => {
    const creature = makeAllCommon("a");
    const chances = calculateSlotChances(creature);
    const total = chances.reduce((s, c) => s + c.chance, 0);
    expect(total).toBeCloseTo(1.0);
  });

  test("rarer slots have higher weight than common slots", () => {
    const creature = makeCreature("a", ["common", "common", "mythic", "common"]);
    const chances = calculateSlotChances(creature);
    const mythicEntry = chances.find(c => c.currentRarity === "mythic");
    const commonEntry = chances.find(c => c.currentRarity === "common");
    expect(mythicEntry!.chance).toBeGreaterThan(commonEntry!.chance);
  });

  test("result is sorted by chance descending", () => {
    const creature = makeCreature("a", ["common", "rare", "epic", "uncommon"]);
    const chances = calculateSlotChances(creature);
    for (let i = 0; i < chances.length - 1; i++) {
      expect(chances[i].chance).toBeGreaterThanOrEqual(chances[i + 1].chance);
    }
  });

  test("nextRarity is one tier above currentRarity", () => {
    const creature = makeCreature("a", ["common", "uncommon", "rare", "epic"]);
    const chances = calculateSlotChances(creature);
    for (const c of chances) {
      const currentIndex = RARITY_ORDER.indexOf(c.currentRarity);
      const expectedNextIndex = Math.min(currentIndex + 1, RARITY_ORDER.length - 1);
      expect(c.nextRarity).toBe(RARITY_ORDER[expectedNextIndex]);
    }
  });

  test("all common slots have equal chances", () => {
    const creature = makeAllCommon("a");
    const chances = calculateSlotChances(creature);
    const firstChance = chances[0].chance;
    for (const c of chances) {
      expect(c.chance).toBeCloseTo(firstChance);
    }
  });
});

describe("previewMerge", () => {
  test("returns target, food, and slotChances", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    const preview = previewMerge(state, "a", "b");
    expect(preview.target.id).toBe("a");
    expect(preview.food.id).toBe("b");
    expect(preview.slotChances).toHaveLength(4);
  });

  test("throws if same creature id used for both", () => {
    const state = makeState([makeAllCommon("a")]);
    expect(() => previewMerge(state, "a", "a")).toThrow(/itself/i);
  });

  test("throws if target not found", () => {
    const state = makeState([makeAllCommon("b")]);
    expect(() => previewMerge(state, "missing", "b")).toThrow(/not found/i);
  });

  test("throws if food not found", () => {
    const state = makeState([makeAllCommon("a")]);
    expect(() => previewMerge(state, "a", "missing")).toThrow(/not found/i);
  });

  test("does not mutate state", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    previewMerge(state, "a", "b");
    expect(state.collection).toHaveLength(2);
    expect(state.profile.totalMerges).toBe(0);
  });
});

describe("executeMerge", () => {
  test("upgrades exactly one slot on target", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    const result = executeMerge(state, "a", "b", () => 0.0);
    expect(result.success).toBe(true);
    // At least one slot must be uncommon now (upgraded from common)
    const upgraded = result.target.slots.filter(s => s.rarity !== "common");
    expect(upgraded).toHaveLength(1);
    expect(result.newRarity).toBe("uncommon");
    expect(result.previousRarity).toBe("common");
  });

  test("removes food from collection", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    executeMerge(state, "a", "b", () => 0.0);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].id).toBe("a");
  });

  test("target remains in collection", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    executeMerge(state, "a", "b", () => 0.0);
    expect(state.collection.find(c => c.id === "a")).toBeDefined();
  });

  test("increments target generation", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    executeMerge(state, "a", "b", () => 0.0);
    expect(state.collection[0].generation).toBe(1);
  });

  test("sets mergedFrom on target", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    executeMerge(state, "a", "b", () => 0.0);
    expect(state.collection[0].mergedFrom).toEqual(["a", "b"]);
  });

  test("increments totalMerges on profile", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    executeMerge(state, "a", "b", () => 0.0);
    expect(state.profile.totalMerges).toBe(1);
  });

  test("returns graftedVariantName", () => {
    const a = makeAllCommon("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    const result = executeMerge(state, "a", "b", () => 0.0);
    expect(result.graftedVariantName).toBeDefined();
    expect(result.graftedVariantName.length).toBeGreaterThan(0);
  });

  test("cannot merge creature with itself", () => {
    const state = makeState([makeAllCommon("a")]);
    expect(() => executeMerge(state, "a", "a", () => 0.0)).toThrow(/itself/i);
  });

  test("throws if target not found", () => {
    const state = makeState([makeAllCommon("b")]);
    expect(() => executeMerge(state, "missing", "b", () => 0.0)).toThrow(/not found/i);
  });

  test("throws if food not found", () => {
    const state = makeState([makeAllCommon("a")]);
    expect(() => executeMerge(state, "a", "missing", () => 0.0)).toThrow(/not found/i);
  });

  test("mythic slot stays at mythic (max rarity)", () => {
    const a = makeAllMythic("a");
    const b = makeAllCommon("b");
    const state = makeState([a, b]);
    const result = executeMerge(state, "a", "b", () => 0.0);
    // Mythic is already max, so previousRarity === newRarity = mythic
    expect(result.previousRarity).toBe("mythic");
    expect(result.newRarity).toBe("mythic");
  });
});
