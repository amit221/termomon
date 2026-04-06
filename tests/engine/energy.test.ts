import { calculateEnergyCost, processEnergyGain, spendEnergy } from "../../src/engine/energy";
import { GameState, CreatureSlot } from "../../src/types";

function makeSlots(rarities: string[]): CreatureSlot[] {
  const slotIds = ["eyes", "mouth", "body", "tail"] as const;
  return rarities.map((r, i) => ({
    slotId: slotIds[i % slotIds.length],
    variantId: `test_${r}_${i}`,
    rarity: r as any,
  }));
}

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

describe("calculateEnergyCost", () => {
  test("all common = 1 energy", () => {
    const slots = makeSlots(["common", "common", "common", "common"]);
    expect(calculateEnergyCost(slots)).toBe(1);
  });

  test("all epic = 3 energy", () => {
    const slots = makeSlots(["epic", "epic", "epic", "epic"]);
    expect(calculateEnergyCost(slots)).toBe(3);
  });

  test("all mythic = 5 energy", () => {
    const slots = makeSlots(["mythic", "mythic", "mythic", "mythic"]);
    expect(calculateEnergyCost(slots)).toBe(5);
  });

  test("all uncommon = 1 energy", () => {
    const slots = makeSlots(["uncommon", "uncommon", "uncommon", "uncommon"]);
    expect(calculateEnergyCost(slots)).toBe(1);
  });

  test("all rare = 2 energy", () => {
    const slots = makeSlots(["rare", "rare", "rare", "rare"]);
    expect(calculateEnergyCost(slots)).toBe(2);
  });

  test("all legendary = 4 energy", () => {
    const slots = makeSlots(["legendary", "legendary", "legendary", "legendary"]);
    expect(calculateEnergyCost(slots)).toBe(4);
  });

  test("empty slots returns 1 energy", () => {
    expect(calculateEnergyCost([])).toBe(1);
  });
});

describe("processEnergyGain", () => {
  test("gains 1 energy when 30 min have passed", () => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: thirtyMinAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(1);
    expect(state.energy).toBe(6);
  });

  test("gains multiple energy for multiple intervals", () => {
    const twoHoursAgo = Date.now() - 120 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: twoHoursAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(4);
    expect(state.energy).toBe(9);
  });

  test("caps at max energy (30)", () => {
    const twoHoursAgo = Date.now() - 120 * 60 * 1000;
    const state = makeState({ energy: 28, lastEnergyGainAt: twoHoursAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(state.energy).toBe(30);
    expect(gained).toBe(2);
  });

  test("no gain if interval not reached", () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: fiveMinAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(0);
    expect(state.energy).toBe(5);
  });
});

describe("spendEnergy", () => {
  test("deducts energy from state", () => {
    const state = makeState({ energy: 10 });
    spendEnergy(state, 3);
    expect(state.energy).toBe(7);
  });

  test("throws if insufficient energy", () => {
    const state = makeState({ energy: 2 });
    expect(() => spendEnergy(state, 5)).toThrow();
  });
});

