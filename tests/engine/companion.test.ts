import { getCompanionOverview } from "../../src/engine/companion";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 6,
    profile: {
      level: 3,
      xp: 20,
      totalCatches: 5,
      totalMerges: 0,
      totalTicks: 50,
      currentStreak: 2,
      longestStreak: 3,
      lastActiveDate: "2026-04-14",
    },
    collection: [],
    archive: [],
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    discoveredSpecies: ["compi"],
    currentSessionId: "s1",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
    ...overrides,
  };
}

describe("getCompanionOverview", () => {
  it("returns overview with empty collection", () => {
    const state = makeState();
    const overview = getCompanionOverview(state);
    expect(overview.progress).toBeDefined();
    expect(overview.progress.level).toBe(3);
    expect(overview.nearbyHighlights).toEqual([]);
    expect(overview.breedablePairs).toEqual([]);
    expect(overview.suggestedActions.length).toBeGreaterThan(0);
  });

  it("highlights nearby creatures with new species flag", () => {
    const state = makeState({
      nearby: [
        {
          id: "n1",
          speciesId: "compi",
          name: "Ziggy",
          slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "grey", rarity: 0 },
            { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "bod_c01", color: "grey", rarity: 0 },
            { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
          ],
          spawnedAt: Date.now(),
        },
        {
          id: "n2",
          speciesId: "flikk",
          name: "Buzzy",
          slots: [
            { slotId: "eyes", variantId: "flk_eye_01", color: "grey", rarity: 0 },
            { slotId: "mouth", variantId: "flk_mth_01", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "flk_bod_01", color: "grey", rarity: 0 },
            { slotId: "tail", variantId: "flk_tal_01", color: "grey", rarity: 0 },
          ],
          spawnedAt: Date.now(),
        },
      ],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      discoveredSpecies: ["compi"],
    });
    const overview = getCompanionOverview(state);
    expect(overview.nearbyHighlights).toHaveLength(2);
    expect(overview.nearbyHighlights[0].isNewSpecies).toBe(false);
    expect(overview.nearbyHighlights[1].isNewSpecies).toBe(true);
  });

  it("detects breedable pairs", () => {
    const state = makeState({
      collection: [
        {
          id: "c1", speciesId: "compi", name: "Alpha", archived: false,
          generation: 0, caughtAt: Date.now(),
          slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "grey", rarity: 0 },
            { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "bod_c01", color: "grey", rarity: 0 },
            { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
          ],
        },
        {
          id: "c2", speciesId: "compi", name: "Beta", archived: false,
          generation: 0, caughtAt: Date.now(),
          slots: [
            { slotId: "eyes", variantId: "eye_c02", color: "grey", rarity: 0 },
            { slotId: "mouth", variantId: "mth_c02", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "bod_c02", color: "grey", rarity: 0 },
            { slotId: "tail", variantId: "tal_c02", color: "grey", rarity: 0 },
          ],
        },
      ],
    });
    const overview = getCompanionOverview(state);
    expect(overview.breedablePairs).toHaveLength(1);
    expect(overview.breedablePairs[0].speciesId).toBe("compi");
  });
});
