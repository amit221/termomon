import { performUpgrade, getUpgradeCost } from "../../src/engine/upgrade";
import { GameState, CollectionCreature, CreatureSlot, SlotId, SLOT_IDS } from "../../src/types";

jest.mock("../../src/config/loader", () => ({
  loadConfig: () => ({
    upgrade: {
      costs: [3, 5, 9, 15, 24, 38, 55],
      maxRank: 7,
      sessionCap: 2,
    },
    leveling: {
      thresholds: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
      traitRankCaps: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8],
      xpPerCatch: 10,
      xpPerUpgrade: 8,
      xpPerMerge: 25,
      xpPerQuest: 15,
      xpDiscoveryBonus: 20,
    },
  }),
}));

function makeSlot(slotId: SlotId, rank: number): CreatureSlot {
  return { slotId, variantId: `trait_${slotId}_r${rank}`, color: "white" };
}

function makeCreature(id: string, ranks: number[]): CollectionCreature {
  return {
    id,
    speciesId: "compi",
    name: "TestCreature",
    slots: SLOT_IDS.map((slotId, i) => makeSlot(slotId, ranks[i] ?? 0)),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 5,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalUpgrades: 0,
      totalQuests: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0,
      lastActiveDate: "",
    },
    collection: [],
    archive: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    gold: 100,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "",
    ...overrides,
  };
}

describe("getUpgradeCost", () => {
  test("rank 0->1 costs 3g", () => {
    expect(getUpgradeCost(0)).toBe(3);
  });

  test("rank 3->4 costs 15g", () => {
    expect(getUpgradeCost(3)).toBe(15);
  });

  test("rank 6->7 costs 55g", () => {
    expect(getUpgradeCost(6)).toBe(55);
  });

  test("rank 7 throws (at max)", () => {
    expect(() => getUpgradeCost(7)).toThrow(/max/i);
  });
});

describe("performUpgrade", () => {
  test("upgrades a trait and deducts gold", () => {
    const creature = makeCreature("c1", [2, 0, 0, 0]);
    const state = makeState({ collection: [creature], gold: 50 });
    const result = performUpgrade(state, "c1", "eyes");
    expect(result.fromRank).toBe(2);
    expect(result.toRank).toBe(3);
    expect(result.goldCost).toBe(9);
    expect(state.gold).toBe(41);
    expect(state.sessionUpgradeCount).toBe(1);
    expect(state.profile.totalUpgrades).toBe(1);
  });

  test("throws if creature not found", () => {
    const state = makeState();
    expect(() => performUpgrade(state, "nonexistent", "eyes")).toThrow(/not found/i);
  });

  test("throws if creature is archived", () => {
    const creature = makeCreature("c1", [0, 0, 0, 0]);
    creature.archived = true;
    const state = makeState({ collection: [creature] });
    expect(() => performUpgrade(state, "c1", "eyes")).toThrow(/archived/i);
  });

  test("throws if trait already at max rank", () => {
    const creature = makeCreature("c1", [7, 0, 0, 0]);
    const state = makeState({ collection: [creature] });
    expect(() => performUpgrade(state, "c1", "eyes")).toThrow(/max/i);
  });

  test("throws if not enough gold", () => {
    const creature = makeCreature("c1", [0, 0, 0, 0]);
    const state = makeState({ collection: [creature], gold: 1 });
    expect(() => performUpgrade(state, "c1", "eyes")).toThrow(/gold/i);
  });

  test("throws if session cap reached", () => {
    const creature = makeCreature("c1", [0, 0, 0, 0]);
    const state = makeState({ collection: [creature], sessionUpgradeCount: 2 });
    expect(() => performUpgrade(state, "c1", "eyes")).toThrow(/session/i);
  });

  test("throws if slot not found on creature", () => {
    const creature = makeCreature("c1", [0, 0, 0, 0]);
    const state = makeState({ collection: [creature] });
    expect(() => performUpgrade(state, "c1", "invalid_slot" as any)).toThrow(/slot/i);
  });
});
