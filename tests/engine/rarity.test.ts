// tests/engine/rarity.test.ts
import { calculateTraitRarityScore, calculateColorRarityScore, calculateSlotScore, calculateCreatureScore } from "../../src/engine/rarity";
import { CreatureSlot, SlotId } from "../../src/types";

const mockGetSpeciesById = jest.fn();
const mockLoadConfig = jest.fn();

jest.mock("../../src/config/species", () => ({
  getSpeciesById: (...args: unknown[]) => mockGetSpeciesById(...args),
}));

jest.mock("../../src/config/loader", () => ({
  loadConfig: () => mockLoadConfig(),
}));

function makeSpecies(slotId: string, spawnRates: { id: string; spawnRate: number }[]) {
  return {
    id: "test_species",
    name: "Test",
    traitPools: {
      [slotId]: spawnRates.map((t) => ({ ...t, name: t.id, art: "x" })),
    },
  };
}

const MOCK_COLORS = {
  colors: {
    grey: 0.30,
    white: 0.25,
    cyan: 0.20,
    magenta: 0.13,
    yellow: 0.08,
    red: 0.04,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadConfig.mockReturnValue(MOCK_COLORS);
});

// ---------------------------------------------------------------------------
// calculateTraitRarityScore
// ---------------------------------------------------------------------------

describe("calculateTraitRarityScore", () => {
  test("rarest trait (lowest spawnRate) scores 100", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "mid_eyes",    spawnRate: 0.15 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    expect(calculateTraitRarityScore("test_species", "eyes", "rare_eyes")).toBe(100);
  });

  test("most common trait (highest spawnRate) scores 1", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "mid_eyes",    spawnRate: 0.15 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    expect(calculateTraitRarityScore("test_species", "eyes", "common_eyes")).toBe(1);
  });

  test("middle trait scores 50.5 (with 3 traits)", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "mid_eyes",    spawnRate: 0.15 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    expect(calculateTraitRarityScore("test_species", "eyes", "mid_eyes")).toBe(50.5);
  });

  test("single-trait pool returns 50", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [{ id: "only_eyes", spawnRate: 0.20 }])
    );
    expect(calculateTraitRarityScore("test_species", "eyes", "only_eyes")).toBe(50);
  });

  test("unknown species returns 50", () => {
    mockGetSpeciesById.mockReturnValue(undefined);
    expect(calculateTraitRarityScore("unknown", "eyes", "some_trait")).toBe(50);
  });

  test("unknown slot returns 50", () => {
    mockGetSpeciesById.mockReturnValue(makeSpecies("eyes", [{ id: "a", spawnRate: 0.1 }]));
    expect(calculateTraitRarityScore("test_species", "tail", "a")).toBe(50);
  });

  test("unknown variantId returns 50", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "a", spawnRate: 0.30 },
        { id: "b", spawnRate: 0.05 },
      ])
    );
    expect(calculateTraitRarityScore("test_species", "eyes", "does_not_exist")).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// calculateColorRarityScore
// ---------------------------------------------------------------------------

describe("calculateColorRarityScore", () => {
  // Colors sorted by weight descending: grey(0.30), white(0.25), cyan(0.20), magenta(0.13), yellow(0.08), red(0.04)
  // poolSize = 6, formula: (index / (6-1)) * 99 + 1

  test("grey (most common, index 0) scores 1", () => {
    expect(calculateColorRarityScore("grey")).toBe(1);
  });

  test("red (rarest, index 5) scores 100", () => {
    expect(calculateColorRarityScore("red")).toBe(100);
  });

  test("cyan (index 2 of 6) scores ~40.6", () => {
    // (2/5)*99+1 = 39.6+1 = 40.6
    expect(calculateColorRarityScore("cyan")).toBeCloseTo(40.6, 1);
  });

  test("yellow (index 4 of 6) scores ~80.2", () => {
    // (4/5)*99+1 = 79.2+1 = 80.2
    expect(calculateColorRarityScore("yellow")).toBeCloseTo(80.2, 1);
  });
});

// ---------------------------------------------------------------------------
// calculateSlotScore
// ---------------------------------------------------------------------------

describe("calculateSlotScore", () => {
  test("rare trait + red color = 100 (both max)", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    const slot: CreatureSlot = { slotId: "eyes", variantId: "rare_eyes", color: "red" };
    expect(calculateSlotScore("test_species", slot)).toBe(100);
  });

  test("common trait + grey color = 1 (both min)", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    const slot: CreatureSlot = { slotId: "eyes", variantId: "common_eyes", color: "grey" };
    expect(calculateSlotScore("test_species", slot)).toBe(1);
  });

  test("rare trait + grey color ≈ 80.2 (trait-heavy)", () => {
    // traitScore=100, colorScore=1  =>  0.8*100 + 0.2*1 = 80 + 0.2 = 80.2
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    const slot: CreatureSlot = { slotId: "eyes", variantId: "rare_eyes", color: "grey" };
    expect(calculateSlotScore("test_species", slot)).toBeCloseTo(80.2, 1);
  });
});

// ---------------------------------------------------------------------------
// calculateCreatureScore
// ---------------------------------------------------------------------------

describe("calculateCreatureScore", () => {
  test("empty slots returns 50", () => {
    expect(calculateCreatureScore("test_species", [])).toBe(50);
  });

  test("all rare+red slots → 100", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    const slot: CreatureSlot = { slotId: "eyes", variantId: "rare_eyes", color: "red" };
    expect(calculateCreatureScore("test_species", [slot, slot])).toBe(100);
  });

  test("all common+grey slots → 1", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    const slot: CreatureSlot = { slotId: "eyes", variantId: "common_eyes", color: "grey" };
    expect(calculateCreatureScore("test_species", [slot, slot])).toBe(1);
  });

  test("one 100-score slot + one 1-score slot → rounds to 51", () => {
    mockGetSpeciesById.mockReturnValue(
      makeSpecies("eyes", [
        { id: "common_eyes", spawnRate: 0.30 },
        { id: "rare_eyes",   spawnRate: 0.05 },
      ])
    );
    const rareSlot:   CreatureSlot = { slotId: "eyes", variantId: "rare_eyes",   color: "red" };
    const commonSlot: CreatureSlot = { slotId: "eyes", variantId: "common_eyes", color: "grey" };
    // average(100, 1) = 50.5 → rounds to 51
    expect(calculateCreatureScore("test_species", [rareSlot, commonSlot])).toBe(51);
  });
});
