// tests/engine/breed.test.ts — breeding system tests

import {
  calculateInheritance,
  previewBreed,
  executeBreed,
} from "../../src/engine/breed";
import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
} from "../../src/types";
import * as speciesModule from "../../src/config/species";

// --- Helpers ---

function makeSlot(slotId: SlotId, variantId: string, color: string = "white"): CreatureSlot {
  return { slotId, variantId, color: color as any };
}

function makeCreature(
  id: string,
  speciesId: string,
  variants: [string, string, string, string],
  overrides?: Partial<CollectionCreature>,
  slotColors?: [string, string, string, string]
): CollectionCreature {
  const colors = slotColors ?? ["white", "white", "white", "white"];
  return {
    id,
    speciesId,
    name: `Creature_${id}`,
    slots: SLOT_IDS.map((slotId, i) => makeSlot(slotId, variants[i], colors[i])),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
    ...overrides,
  };
}

function makeState(
  collection: CollectionCreature[],
  energy: number = 20
): GameState {
  return {
    version: 6,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      
      
    },
    collection,
    archive: [],
    energy,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    
    discoveredSpecies: [],
    
    
    currentSessionId: "",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
  };
}

// Common variants (spawnRate 0.12)
const COMMON_EYES = "eye_c01"; // Pebble Gaze, 0.12
const COMMON_MOUTH = "mth_c01"; // Flat Line, 0.12
const COMMON_BODY = "bod_c01"; // Dots, 0.12
const COMMON_TAIL = "tal_c01"; // Curl, 0.12

// Rare variants (spawnRate 0.05)
const RARE_EYES = "eye_r01"; // Ring Gaze, 0.05
const RARE_MOUTH = "mth_r01"; // Omega, 0.05
const RARE_BODY = "bod_r01"; // Crystal, 0.05
const RARE_TAIL = "tal_r01"; // Ripple, 0.05

// Mythic variants (spawnRate 0.003)
const MYTHIC_EYES = "eye_m02"; // Prism Eyes, 0.003
const MYTHIC_MOUTH = "mth_m02"; // Nova, 0.003
const MYTHIC_BODY = "bod_m02"; // Void, 0.003
const MYTHIC_TAIL = "tal_m02"; // Eternal, 0.003

const ALL_COMMON: [string, string, string, string] = [
  COMMON_EYES,
  COMMON_MOUTH,
  COMMON_BODY,
  COMMON_TAIL,
];
const ALL_RARE: [string, string, string, string] = [
  RARE_EYES,
  RARE_MOUTH,
  RARE_BODY,
  RARE_TAIL,
];
const ALL_MYTHIC: [string, string, string, string] = [
  MYTHIC_EYES,
  MYTHIC_MOUTH,
  MYTHIC_BODY,
  MYTHIC_TAIL,
];

// --- calculateInheritance (rank-based) ---

describe("calculateInheritance", () => {
  let getTraitDefinitionSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock trait definitions for rank-encoded variants
    getTraitDefinitionSpy = jest.spyOn(speciesModule, "getTraitDefinition").mockImplementation(
      (_speciesId: string, variantId: string) => {
        // Return a mock trait for any variant id we use in tests
        if (variantId === "nonexistent") return undefined;
        return { id: variantId, name: `Trait ${variantId}`, art: "o", spawnRate: 0.12 };
      }
    );
  });

  afterEach(() => {
    getTraitDefinitionSpy.mockRestore();
  });

  it("returns 50/50 for two traits with equal rank", () => {
    // Both rank 0 → diff = 0 → 50/50
    const result = calculateInheritance("compi", "eye_c01", "eye_c02");
    expect(result.chanceA).toBeCloseTo(0.5, 3);
    expect(result.chanceB).toBeCloseTo(0.5, 3);
    expect(result.chanceA + result.chanceB).toBeCloseTo(1.0, 10);
  });

  it("gives higher-rank trait ~63% chance with rank diff 2", () => {
    // A: rank 3, B: rank 1 → diff = 2 → A gets 0.50 + 2*0.065 = 0.63
    const result = calculateInheritance("compi", "eye_c01_r3", "eye_c01_r1");
    expect(result.chanceA).toBeCloseTo(0.63, 2);
    expect(result.chanceB).toBeCloseTo(0.37, 2);
    expect(result.chanceA + result.chanceB).toBeCloseTo(1.0, 10);
  });

  it("gives higher-rank trait ~76% chance with rank diff 4", () => {
    // A: rank 0, B: rank 4 → diff = 4 → B gets 0.50 + 4*0.065 = 0.76
    const result = calculateInheritance("compi", "eye_c01", "eye_c01_r4");
    expect(result.chanceA).toBeCloseTo(0.24, 2);
    expect(result.chanceB).toBeCloseTo(0.76, 2);
  });

  it("caps advantage at maxAdvantage (0.35) for large rank diffs", () => {
    // A: rank 7, B: rank 0 → diff = 7 → 7*0.065 = 0.455 → capped at 0.35
    // A gets 0.50 + 0.35 = 0.85
    const result = calculateInheritance("compi", "eye_c01_r7", "eye_c01");
    expect(result.chanceA).toBeCloseTo(0.85, 2);
    expect(result.chanceB).toBeCloseTo(0.15, 2);
  });

  it("applies synergy boost on top of rank advantage", () => {
    // Rank diff 1 → base advantage = 0.065, synergy = 1.0 * 0.05 = 0.05
    // A gets 0.50 + 0.065 + 0.05 = 0.615
    const result = calculateInheritance("compi", "eye_c01_r2", "eye_c01_r1", 1.0);
    expect(result.chanceA).toBeCloseTo(0.615, 2);
    expect(result.chanceB).toBeCloseTo(0.385, 2);
  });

  it("synergy on equal ranks gives slight edge to trait A", () => {
    // Same rank → synergy = 0.5 * 0.05 = 0.025
    const result = calculateInheritance("compi", "eye_c01_r2", "eye_c02_r2", 0.5);
    expect(result.chanceA).toBeCloseTo(0.525, 3);
    expect(result.chanceB).toBeCloseTo(0.475, 3);
  });

  it("returns 100% for parent A when both have same variant", () => {
    const result = calculateInheritance("compi", COMMON_EYES, COMMON_EYES);
    expect(result.chanceA).toBe(1);
    expect(result.chanceB).toBe(0);
  });

  it("throws for unknown variant", () => {
    expect(() =>
      calculateInheritance("compi", "nonexistent", COMMON_EYES)
    ).toThrow("Trait not found");
  });
});

// --- previewBreed ---

describe("previewBreed", () => {
  it("returns inheritance odds for all 4 slots", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_RARE);
    const state = makeState([a, b]);

    const preview = previewBreed(state, "a1", "b1");
    expect(preview.slotInheritance).toHaveLength(4);
    expect(preview.parentA.id).toBe("a1");
    expect(preview.parentB.id).toBe("b1");

    for (const si of preview.slotInheritance) {
      expect(si.parentAChance + si.parentBChance).toBeCloseTo(1.0, 10);
      // Both parents have rank-0 traits (no _r suffix), so chances are ~50/50
      // (slight synergy variation possible but both close to 0.5)
    }
  });

  it("calculates energy cost: base cost for all common traits", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_COMMON);
    const state = makeState([a, b]);

    const preview = previewBreed(state, "a1", "b1");
    // No traits below 0.05 threshold → base cost = 3
    expect(preview.energyCost).toBe(3);
  });

  it("increases energy cost for rare traits", () => {
    const a = makeCreature("a1", "compi", ALL_RARE);
    const b = makeCreature("b1", "compi", ALL_RARE);
    const state = makeState([a, b]);

    const preview = previewBreed(state, "a1", "b1");
    // rare = 0.05, threshold is < 0.05 so rare at exactly 0.05 does NOT count
    // All at 0.05 → 0 rare traits → cost = 3
    expect(preview.energyCost).toBe(3);
  });

  it("caps energy cost at maxMergeCost", () => {
    const a = makeCreature("a1", "compi", ALL_MYTHIC);
    const b = makeCreature("b1", "compi", ALL_MYTHIC);
    const state = makeState([a, b]);

    const preview = previewBreed(state, "a1", "b1");
    // 8 mythic traits below threshold → base 3 + 8 = 11 → capped at 8
    expect(preview.energyCost).toBe(8);
  });

  it("throws if same creature used for both parents", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const state = makeState([a]);
    expect(() => previewBreed(state, "a1", "a1")).toThrow(
      "Cannot breed a creature with itself"
    );
  });

  it("throws if creature not found", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const state = makeState([a]);
    expect(() => previewBreed(state, "a1", "missing")).toThrow(
      "Creature not found: missing"
    );
  });

  it("throws if different species", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "other", ALL_COMMON);
    const state = makeState([a, b]);
    expect(() => previewBreed(state, "a1", "b1")).toThrow(
      "Cannot breed different species"
    );
  });

  it("throws if parent is archived", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_COMMON, { archived: true });
    const state = makeState([a, b]);
    expect(() => previewBreed(state, "a1", "b1")).toThrow(
      "Creature is archived"
    );
  });
});

// --- executeBreed ---

describe("executeBreed", () => {
  it("creates a child with inherited traits and removes both parents", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_RARE);
    const state = makeState([a, b], 20);

    // rng always returns 0 → picks parent A for all slots (since roll < chanceA only if chanceA > 0)
    // Actually with common vs rare: chanceA < chanceB, so roll=0 picks A (0 < chanceA)
    const result = executeBreed(state, "a1", "b1", () => 0);

    expect(result.child.speciesId).toBe("compi");
    expect(result.child.generation).toBe(1);
    expect(result.child.mergedFrom).toEqual(["a1", "b1"]);
    expect(result.child.name).toBe("Creature_a1"); // inherits from parent A
    expect(result.child.archived).toBe(false);
    expect(result.child.slots).toHaveLength(4);

    // Both parents removed from collection
    expect(state.collection.find((c) => c.id === "a1")).toBeUndefined();
    expect(state.collection.find((c) => c.id === "b1")).toBeUndefined();
    // Child added
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].id).toBe(result.child.id);
  });

  it("spends energy correctly", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_COMMON);
    const state = makeState([a, b], 10);

    executeBreed(state, "a1", "b1", () => 0);
    // Cost = 3 (base, no rare traits)
    expect(state.energy).toBe(7);
  });

  it("increments totalMerges", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_COMMON);
    const state = makeState([a, b], 10);

    executeBreed(state, "a1", "b1", () => 0);
    expect(state.profile.totalMerges).toBe(1);
  });

  it("throws if insufficient energy", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_COMMON);
    const state = makeState([a, b], 1);

    expect(() => executeBreed(state, "a1", "b1")).toThrow(
      "Not enough energy"
    );
  });

  it("with rng=0 always picks parent A traits", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_RARE);
    const state = makeState([a, b], 20);

    const result = executeBreed(state, "a1", "b1", () => 0);

    // roll=0 is always < chanceA (chanceA > 0), so picks A
    for (const slotId of SLOT_IDS) {
      expect(result.inheritedFrom[slotId]).toBe("A");
    }
    // Child should have parent A's variants
    expect(result.child.slots[0].variantId).toBe(COMMON_EYES);
    expect(result.child.slots[1].variantId).toBe(COMMON_MOUTH);
    expect(result.child.slots[2].variantId).toBe(COMMON_BODY);
    expect(result.child.slots[3].variantId).toBe(COMMON_TAIL);
  });

  it("with rng=0.99 always picks parent B traits", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_RARE);
    const state = makeState([a, b], 20);

    const result = executeBreed(state, "a1", "b1", () => 0.99);

    // roll=0.99 is always >= chanceA (which is ~0.47), so picks B
    for (const slotId of SLOT_IDS) {
      expect(result.inheritedFrom[slotId]).toBe("B");
    }
    expect(result.child.slots[0].variantId).toBe(RARE_EYES);
  });

  it("child generation is max(parentA, parentB) + 1", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON, { generation: 3 });
    const b = makeCreature("b1", "compi", ALL_COMMON, { generation: 5 });
    const state = makeState([a, b], 20);

    const result = executeBreed(state, "a1", "b1", () => 0);
    expect(result.child.generation).toBe(6);
  });

  it("when both parents share same variant in a slot, child always gets it", () => {
    // Both parents have exactly the same common variants
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_COMMON);
    const state = makeState([a, b], 20);

    const result = executeBreed(state, "a1", "b1", () => 0.5);

    // Same variant → chanceA=1, chanceB=0 → always A
    for (const slotId of SLOT_IDS) {
      expect(result.inheritedFrom[slotId]).toBe("A");
    }
    expect(result.child.slots[0].variantId).toBe(COMMON_EYES);
  });

  it("mixed rng produces mixed inheritance", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_RARE);
    const state = makeState([a, b], 20);

    let callCount = 0;
    // Alternate: 0 (pick A), 0.99 (pick B), 0 (pick A), 0.99 (pick B)
    const rng = () => {
      const val = callCount % 2 === 0 ? 0 : 0.99;
      callCount++;
      return val;
    };

    const result = executeBreed(state, "a1", "b1", rng);
    expect(result.inheritedFrom["eyes"]).toBe("A");
    expect(result.inheritedFrom["mouth"]).toBe("B");
    expect(result.inheritedFrom["body"]).toBe("A");
    expect(result.inheritedFrom["tail"]).toBe("B");
  });

  it("does not mutate state on validation failure", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "other", ALL_COMMON);
    const state = makeState([a, b], 20);
    const energyBefore = state.energy;
    const collectionBefore = [...state.collection];

    expect(() => executeBreed(state, "a1", "b1")).toThrow();
    expect(state.energy).toBe(energyBefore);
    expect(state.collection).toEqual(collectionBefore);
  });

  it("child inherits per-slot color from parent A when rng picks A", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON, {}, ["cyan", "magenta", "yellow", "red"]);
    const b = makeCreature("b1", "compi", ALL_RARE, {}, ["white", "white", "white", "white"]);
    const state = makeState([a, b], 20);

    // rng=0 always picks parent A
    const result = executeBreed(state, "a1", "b1", () => 0);
    expect(result.child.slots[0].color).toBe("cyan");
    expect(result.child.slots[1].color).toBe("magenta");
    expect(result.child.slots[2].color).toBe("yellow");
    expect(result.child.slots[3].color).toBe("red");
  });

  it("child inherits per-slot color from parent B when rng picks B", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON, {}, ["white", "white", "white", "white"]);
    const b = makeCreature("b1", "compi", ALL_RARE, {}, ["cyan", "magenta", "yellow", "red"]);
    const state = makeState([a, b], 20);

    // rng=0.99 always picks parent B
    const result = executeBreed(state, "a1", "b1", () => 0.99);
    expect(result.child.slots[0].color).toBe("cyan");
    expect(result.child.slots[1].color).toBe("magenta");
    expect(result.child.slots[2].color).toBe("yellow");
    expect(result.child.slots[3].color).toBe("red");
  });

  it("child does not have creature-level color field", () => {
    const a = makeCreature("a1", "compi", ALL_COMMON);
    const b = makeCreature("b1", "compi", ALL_RARE);
    const state = makeState([a, b], 20);

    const result = executeBreed(state, "a1", "b1", () => 0);
    expect(result.child).not.toHaveProperty("color");
  });
});

// --- Variable slots ---

describe("breed — variable slots", () => {
  test("breed preview works with 3-slot species", () => {
    // Mock whiski species with only 3 slots (no body)
    const whiskerSpecies = {
      id: "whiski",
      name: "Whisker",
      description: "A whiskered creature",
      spawnWeight: 0.15,
      art: ["ASCII art"],
      traitPools: {
        eyes: [
          { id: "eye_c01", name: "Pebble Gaze", art: "O", spawnRate: 0.12 },
          { id: "eye_r01", name: "Ring Gaze", art: "@", spawnRate: 0.05 },
        ],
        mouth: [
          { id: "mth_c01", name: "Flat Line", art: "-", spawnRate: 0.12 },
          { id: "mth_r01", name: "Omega", art: "W", spawnRate: 0.05 },
        ],
        tail: [
          { id: "tal_c01", name: "Curl", art: "~", spawnRate: 0.12 },
          { id: "tal_r01", name: "Ripple", art: "S", spawnRate: 0.05 },
        ],
      },
    };

    // Create a map of all traits from the species
    const allTraits = new Map<string, any>();
    for (const [slotId, traits] of Object.entries(whiskerSpecies.traitPools)) {
      if (traits) {
        for (const trait of traits) {
          allTraits.set(trait.id, trait);
        }
      }
    }

    // Spy on and mock the functions
    const getSpeciesById = jest.spyOn(speciesModule, "getSpeciesById");
    const getTraitDefinition = jest.spyOn(speciesModule, "getTraitDefinition");

    getSpeciesById.mockImplementation((speciesId: string) => {
      if (speciesId === "whiski") {
        return whiskerSpecies as any;
      }
      // Call the real implementation for other species
      return (getSpeciesById as any).getMockImplementation() ? undefined : speciesModule.getSpeciesById(speciesId);
    });

    getTraitDefinition.mockImplementation(
      (speciesId: string, variantId: string) => {
        if (speciesId === "whiski") {
          return allTraits.get(variantId);
        }
        return undefined;
      }
    );

    const parentA = makeCreature("a", "whiski", ALL_COMMON);
    parentA.slots = parentA.slots.filter(s => s.slotId !== "body");

    const parentB = makeCreature("b", "whiski", ALL_RARE);
    parentB.slots = parentB.slots.filter(s => s.slotId !== "body");

    const state = makeState([parentA, parentB]);

    const preview = previewBreed(state, "a", "b");
    expect(preview.slotInheritance).toHaveLength(3);
    expect(preview.slotInheritance.map(s => s.slotId)).toEqual(["eyes", "mouth", "tail"]);

    // Clean up mocks
    getSpeciesById.mockRestore();
    getTraitDefinition.mockRestore();
  });
});

// --- merge gold cost + downgrade ---

/**
 * Helper that creates creatures with rank-encoded variantIds: `trait_<slotId>_r<rank>`.
 * Used for gold cost, upgrade, and downgrade tests where rank parsing matters.
 */
function makeRankedCreature(
  id: string,
  speciesId: string,
  ranks: number[]
): CollectionCreature {
  return {
    id,
    speciesId,
    name: `Test ${id}`,
    slots: SLOT_IDS.map((slotId, i) => ({
      slotId,
      variantId: `trait_${slotId}_r${ranks[i] ?? 0}`,
      color: "white" as any,
    })),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

/**
 * Build a mock species definition whose trait pools contain rank-encoded variants
 * for all 4 slots. Each variant id is `trait_<slotId>_r<rank>` with a spawnRate of 0.12.
 */
function makeMockSpecies(speciesId: string, maxRank: number = 8) {
  const traitPools: Record<string, Array<{ id: string; name: string; art: string; spawnRate: number }>> = {};
  for (const slotId of SLOT_IDS) {
    traitPools[slotId] = [];
    for (let r = 0; r <= maxRank; r++) {
      traitPools[slotId].push({
        id: `trait_${slotId}_r${r}`,
        name: `Trait ${slotId} rank ${r}`,
        art: "o",
        spawnRate: 0.12,
      });
    }
  }
  return {
    id: speciesId,
    name: speciesId,
    description: "Mock species",
    spawnWeight: 0.15,
    art: ["art"],
    traitPools,
  };
}

describe("merge gold cost and downgrade", () => {
  const MOCK_SPECIES_ID = "compi";
  let mockSpecies: ReturnType<typeof makeMockSpecies>;
  let allTraits: Map<string, any>;
  let getSpeciesByIdSpy: jest.SpyInstance;
  let getTraitDefinitionSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSpecies = makeMockSpecies(MOCK_SPECIES_ID);
    allTraits = new Map();
    for (const traits of Object.values(mockSpecies.traitPools)) {
      for (const t of traits) allTraits.set(t.id, t);
    }

    getSpeciesByIdSpy = jest.spyOn(speciesModule, "getSpeciesById").mockImplementation(
      (id) => (id === MOCK_SPECIES_ID ? (mockSpecies as any) : undefined)
    );
    getTraitDefinitionSpy = jest.spyOn(speciesModule, "getTraitDefinition").mockImplementation(
      (_speciesId, variantId) => allTraits.get(variantId) ?? undefined
    );
  });

  afterEach(() => {
    getSpeciesByIdSpy.mockRestore();
    getTraitDefinitionSpy.mockRestore();
  });

  function makeRankedState(
    collection: CollectionCreature[],
    energy: number = 20
  ): GameState {
    return {
      version: 6,
      profile: {
        level: 1,
        xp: 0,
        totalCatches: 0,
        totalMerges: 0,
        totalTicks: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
      },
      collection,
      archive: [],
      energy,
      lastEnergyGainAt: Date.now(),
      nearby: [],
      batch: null,
      lastSpawnAt: 0,
      recentTicks: [],
      claimedMilestones: [],
      settings: { notificationLevel: "moderate" },
      discoveredSpecies: [],
      currentSessionId: "",
      speciesProgress: {},
      personalSpecies: [],
      sessionBreedCount: 0,
      breedCooldowns: {},
    };
  }

  test("executeBreed applies guaranteed +1 upgrade to one random trait", () => {
    // Rank-3 parents — child inherits rank 3, then one slot gets upgraded to rank 4
    const parentA = makeRankedCreature("pA", MOCK_SPECIES_ID, [3, 3, 3, 3]);
    const parentB = makeRankedCreature("pB", MOCK_SPECIES_ID, [3, 3, 3, 3]);
    const state = makeRankedState([parentA, parentB], 20);
    // rng sequence: 4 rolls for slot selection (all pick A), 1 roll for upgradeIndex, 1 for downgrade check
    const result = executeBreed(state, "pA", "pB", () => 0);
    const ranks = result.child.slots.map((s) => {
      const m = s.variantId.match(/_r(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    expect(ranks.some((r) => r === 4)).toBe(true);
  });

  test("executeBreed does not downgrade when rng is above downgradeChance (0.30)", () => {
    // rng() always returns 0.99 — downgrade check (0.99 < 0.30) is false → no downgrade
    const parentA = makeRankedCreature("pA", MOCK_SPECIES_ID, [3, 3, 3, 3]);
    const parentB = makeRankedCreature("pB", MOCK_SPECIES_ID, [3, 3, 3, 3]);
    const state = makeRankedState([parentA, parentB], 20);
    const result = executeBreed(state, "pA", "pB", () => 0.99);
    const ranks = result.child.slots.map((s) => {
      const m = s.variantId.match(/_r(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    // Exactly one upgrade (+1) and no downgrades: ranks should be [3,3,3,4] in some order
    expect(ranks.filter((r) => r === 4)).toHaveLength(1);
    expect(ranks.filter((r) => r === 2)).toHaveLength(0);
  });

  test("executeBreed downgrades a different trait when rng triggers it", () => {
    // Control rng: slots picked, upgradeIndex=0, downgradeCheck passes, downgradeIndex=1
    // rng values: [0,0,0,0] slot picks, [0] upgradeIndex=0, [0.1] downgrade check (< 0.30), [0.3] downgradeIndex
    let call = 0;
    const rngs = [0, 0, 0, 0, 0, 0.1, 0.3];
    const rng = () => rngs[call++] ?? 0.5;

    const parentA = makeRankedCreature("pA", MOCK_SPECIES_ID, [3, 3, 3, 3]);
    const parentB = makeRankedCreature("pB", MOCK_SPECIES_ID, [3, 3, 3, 3]);
    const state = makeRankedState([parentA, parentB], 20);
    const result = executeBreed(state, "pA", "pB", rng);
    const ranks = result.child.slots.map((s) => {
      const m = s.variantId.match(/_r(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    // One upgraded (+1) and one downgraded (-1), all others stay at 3
    expect(ranks.some((r) => r === 4)).toBe(true);
    expect(ranks.some((r) => r === 2)).toBe(true);
  });

  test("executeBreed grants XP after merge", () => {
    const parentA = makeRankedCreature("pA", MOCK_SPECIES_ID, [1, 1, 1, 1]);
    const parentB = makeRankedCreature("pB", MOCK_SPECIES_ID, [1, 1, 1, 1]);
    const state = makeRankedState([parentA, parentB], 20);
    const xpBefore = state.profile.xp;
    executeBreed(state, "pA", "pB", () => 0);
    // xpPerMerge = 25 from balance.json
    expect(state.profile.xp).toBeGreaterThan(xpBefore);
  });
});
