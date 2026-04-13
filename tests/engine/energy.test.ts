import { processEnergyGain, spendEnergy, processSessionEnergyBonus } from "../../src/engine/energy";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 5,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "", totalUpgrades: 0, totalQuests: 0 },
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
    gold: 10,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "",
    ...overrides,
  };
}

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

describe("processSessionEnergyBonus", () => {
  test("grants session bonus energy", () => {
    const state = makeState({ energy: 10 });
    const gained = processSessionEnergyBonus(state, "session-new");
    expect(gained).toBe(3);
    expect(state.energy).toBe(13);
  });

  test("does not exceed max energy", () => {
    const state = makeState({ energy: 29 });
    const gained = processSessionEnergyBonus(state, "session-new");
    expect(state.energy).toBe(30); // capped at max
    expect(gained).toBe(1);
  });

  test("no bonus if same session", () => {
    const state = makeState({ energy: 10, currentSessionId: "session-1" });
    const gained = processSessionEnergyBonus(state, "session-1");
    expect(gained).toBe(0);
    expect(state.energy).toBe(10);
  });

  test("resets session upgrade count on new session", () => {
    const state = makeState({ energy: 10, sessionUpgradeCount: 5, currentSessionId: "session-1" });
    processSessionEnergyBonus(state, "session-2");
    expect(state.sessionUpgradeCount).toBe(0);
    expect(state.currentSessionId).toBe("session-2");
  });

  test("updates currentSessionId on new session", () => {
    const state = makeState({ energy: 10, currentSessionId: "session-old" });
    processSessionEnergyBonus(state, "session-new");
    expect(state.currentSessionId).toBe("session-new");
  });
});
