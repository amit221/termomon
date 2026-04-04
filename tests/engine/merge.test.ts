// tests/engine/merge.test.ts
import {
  calculateMergeRate,
  findSynergies,
  resolveTraitInheritance,
  attemptMerge,
} from "../../src/engine/merge";
import { GameState, CollectionCreature, CreatureTrait, MergeResult } from "../../src/types";

function makeTrait(slot: string, rarity: string, modType: string, modValue: number): CreatureTrait {
  return {
    slotId: slot as any,
    traitId: `${slot}_${rarity}_test`,
    rarity: rarity as any,
    mergeModifier: { type: modType as any, value: modValue },
  };
}

function makeCreature(id: string, traitSpecs: Array<[string, string, string, number]>): CollectionCreature {
  return {
    id,
    traits: traitSpecs.map(([slot, rarity, modType, modValue]) => makeTrait(slot, rarity, modType, modValue)),
    caughtAt: Date.now(),
    generation: 0,
  };
}

function makeAllStable(id: string): CollectionCreature {
  return makeCreature(id, [
    ["eyes", "common", "stable", 0.08],
    ["mouth", "common", "stable", 0.08],
    ["tail", "common", "stable", 0.08],
    ["gills", "common", "stable", 0.08],
    ["pattern", "common", "stable", 0.08],
    ["aura", "common", "stable", 0.08],
  ]);
}

function makeAllVolatile(id: string): CollectionCreature {
  return makeCreature(id, [
    ["eyes", "rare", "volatile", -0.15],
    ["mouth", "rare", "volatile", -0.15],
    ["tail", "rare", "volatile", -0.15],
    ["gills", "rare", "volatile", -0.15],
    ["pattern", "rare", "volatile", -0.15],
    ["aura", "rare", "volatile", -0.15],
  ]);
}

function makeState(collection: CollectionCreature[]): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection,
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
  };
}

describe("calculateMergeRate", () => {
  test("all stable parents capped at 90%", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const rate = calculateMergeRate(a, b, []);
    expect(rate).toBeCloseTo(0.90);
  });

  test("all volatile parents floored at 5%", () => {
    const a = makeAllVolatile("a");
    const b = makeAllVolatile("b");
    const rate = calculateMergeRate(a, b, []);
    expect(rate).toBe(0.05);
  });

  test("zero-modifier parents = 50%", () => {
    const a = makeCreature("a", [
      ["eyes", "common", "stable", 0], ["mouth", "common", "stable", 0],
      ["tail", "common", "stable", 0], ["gills", "common", "stable", 0],
      ["pattern", "common", "stable", 0], ["aura", "common", "stable", 0],
    ]);
    const b = makeCreature("b", [
      ["eyes", "common", "stable", 0], ["mouth", "common", "stable", 0],
      ["tail", "common", "stable", 0], ["gills", "common", "stable", 0],
      ["pattern", "common", "stable", 0], ["aura", "common", "stable", 0],
    ]);
    expect(calculateMergeRate(a, b, [])).toBeCloseTo(0.50);
  });

  test("synergy bonus adds to rate", () => {
    const a = makeCreature("a", [
      ["eyes", "common", "stable", 0], ["mouth", "common", "stable", 0],
      ["tail", "common", "stable", 0], ["gills", "common", "stable", 0],
      ["pattern", "common", "stable", 0], ["aura", "common", "stable", 0],
    ]);
    const b = makeCreature("b", [
      ["eyes", "common", "stable", 0], ["mouth", "common", "stable", 0],
      ["tail", "common", "stable", 0], ["gills", "common", "stable", 0],
      ["pattern", "common", "stable", 0], ["aura", "common", "stable", 0],
    ]);
    const synergies = [{ traitA: "x", traitB: "y", bonus: 0.20 }];
    expect(calculateMergeRate(a, b, synergies)).toBeCloseTo(0.70);
  });
});

describe("resolveTraitInheritance", () => {
  test("returns 6 traits", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const result = resolveTraitInheritance(a.traits, b.traits, () => 0.5);
    expect(result).toHaveLength(6);
  });

  test("each slot is represented", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const result = resolveTraitInheritance(a.traits, b.traits, () => 0.5);
    const slots = result.map(t => t.slotId);
    expect(slots).toEqual(["eyes", "mouth", "tail", "gills", "pattern", "aura"]);
  });

  test("with rng=0.5 and stable traits, no mutation (stays common)", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const result = resolveTraitInheritance(a.traits, b.traits, () => 0.5);
    for (const t of result) {
      expect(t.rarity).toBe("common");
    }
  });
});

describe("attemptMerge", () => {
  test("success: removes parents, adds child", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const state = makeState([a, b]);
    const result = attemptMerge(state, "a", "b", () => 0.1);
    expect(result.success).toBe(true);
    expect(result.child).not.toBeNull();
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].generation).toBe(1);
    expect(state.collection[0].mergedFrom).toEqual(["a", "b"]);
    expect(state.profile.totalMerges).toBe(1);
  });

  test("failure: removes parents, no child", () => {
    const a = makeAllVolatile("a");
    const b = makeAllVolatile("b");
    const state = makeState([a, b]);
    const result = attemptMerge(state, "a", "b", () => 0.99);
    expect(result.success).toBe(false);
    expect(result.child).toBeNull();
    expect(state.collection).toHaveLength(0);
    expect(state.profile.totalMerges).toBe(1);
  });

  test("throws if parent not found", () => {
    const state = makeState([makeAllStable("a")]);
    expect(() => attemptMerge(state, "a", "missing", () => 0.1)).toThrow();
  });

  test("throws if same creature", () => {
    const state = makeState([makeAllStable("a")]);
    expect(() => attemptMerge(state, "a", "a", () => 0.1)).toThrow();
  });

  test("child generation = max parent generation + 1", () => {
    const a = { ...makeAllStable("a"), generation: 3 };
    const b = { ...makeAllStable("b"), generation: 1 };
    const state = makeState([a, b]);
    const result = attemptMerge(state, "a", "b", () => 0.1);
    expect(result.child!.generation).toBe(4);
  });
});
