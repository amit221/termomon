import { GameState, NearbyCreature, CollectionCreature, CreatureSlot, Card } from "../../src/types";

// Mock config loader before importing cards module
jest.mock("../../src/config/loader", () => ({
  loadConfig: () => ({
    catching: {
      baseCatchRate: 0.90,
      minCatchRate: 0.15,
      maxCatchRate: 0.90,
      failPenaltyPerMiss: 0.10,
      maxTraitSpawnRate: 0.12,
      difficultyScale: 0.50,
      xpBase: 10,
      xpRarityMultiplier: 5,
    },
    energy: {
      gainIntervalMs: 1800000,
      maxEnergy: 30,
      startingEnergy: 15,
      sessionBonus: 5,
      baseMergeCost: 3,
      maxMergeCost: 8,
      rareThreashold: 0.05,
    },
    breed: {
      baseChance: 0.50,
      rankDiffScale: 0.065,
      maxAdvantage: 0.35,
      synergyBonus: 0.05,
      downgradeChance: 0.30,
      rarityTiers: [
        { name: "common", minSpawnRate: 0.08 },
        { name: "uncommon", minSpawnRate: 0.04 },
        { name: "rare", minSpawnRate: 0.02 },
        { name: "epic", minSpawnRate: 0.01 },
        { name: "legendary", minSpawnRate: 0.0 },
      ],
      baseCost: 3,
      maxBreedCost: 11,
      sameTraitUpgradeChance: 0.35,
      sameTraitHigherParentUpgradeChance: 0.15,
      diffTraitSameSpeciesUpgradeChance: 0.10,
      diffTraitCrossSpeciesUpgradeChance: 0.05,
      maxBreedsPerSession: 3,
      cooldownMs: 3600000,
    },
    leveling: {
      thresholds: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300],
      traitRankCaps: [1, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7, 7],
      rarityBreedCaps: [1, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7, 7],
      xpPerCatch: 10,
      xpPerMerge: 25,
      xpPerHybrid: 50,
      xpDiscoveryBonus: 20,
    },
    progression: {
      xpPerLevel: 100,
      sessionGapMs: 900000,
      tickPruneCount: 500,
    },
    discovery: {
      speciesUnlockLevels: {},
    },
  }),
}));

// Mock species module
jest.mock("../../src/config/species", () => ({
  getTraitDefinition: () => ({ id: "default", name: "Default", art: "?", spawnRate: 0.10 }),
  getSpeciesById: () => ({
    id: "compi",
    name: "Compi",
    traitPools: { eyes: [], mouth: [], body: [], tail: [] },
  }),
}));

jest.mock("../../src/config/traits", () => ({
  loadCreatureName: () => "TestChild",
}));

import { buildPool, drawCards, playCard, skipHand } from "../../src/engine/cards";

function makeSlot(slotId: "eyes" | "mouth" | "body" | "tail", rarity = 0): CreatureSlot {
  return { slotId, variantId: `${slotId}_default`, color: "grey", rarity };
}

function makeSlots(rarity = 0): CreatureSlot[] {
  return [makeSlot("eyes", rarity), makeSlot("mouth", rarity), makeSlot("body", rarity), makeSlot("tail", rarity)];
}

function makeNearby(id: string, speciesId = "compi"): NearbyCreature {
  return { id, speciesId, name: `Test ${id}`, slots: makeSlots(), spawnedAt: Date.now() };
}

function makeCollection(id: string, speciesId = "compi", rarity = 0): CollectionCreature {
  return { id, speciesId, name: `Coll ${id}`, slots: makeSlots(rarity), caughtAt: Date.now(), generation: 0, archived: false };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 7,
    profile: { level: 5, xp: 50, totalCatches: 5, totalMerges: 1, totalTicks: 20, currentStreak: 2, longestStreak: 3, lastActiveDate: "2026-04-17" },
    collection: [],
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    discoveredSpecies: [],
    currentSessionId: "s1",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
    ...overrides,
  } as GameState;
}

describe("buildPool", () => {
  test("returns catch cards for nearby creatures when batch has attemptsRemaining > 0", () => {
    const state = makeState({
      nearby: [makeNearby("n1"), makeNearby("n2")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });

    const pool = buildPool(state);
    const catchCards = pool.filter((c) => c.type === "catch");
    expect(catchCards.length).toBe(2);
    expect(catchCards[0].data).toHaveProperty("nearbyIndex", 0);
    expect(catchCards[1].data).toHaveProperty("nearbyIndex", 1);
    expect(catchCards[0].energyCost).toBeGreaterThanOrEqual(1);
  });

  test("returns breed cards for valid same-species pairs", () => {
    const state = makeState({
      collection: [makeCollection("c1"), makeCollection("c2")],
    });

    const pool = buildPool(state);
    const breedCards = pool.filter((c) => c.type === "breed");
    expect(breedCards.length).toBe(1); // one pair: c1+c2
    expect(breedCards[0].data).toHaveProperty("parentA");
    expect(breedCards[0].data).toHaveProperty("parentB");
  });

  test("returns empty pool when nothing available", () => {
    const state = makeState();
    const pool = buildPool(state);
    expect(pool).toEqual([]);
  });

  test("excludes breed when sessionBreedCount >= maxBreedsPerSession", () => {
    const state = makeState({
      collection: [makeCollection("c1"), makeCollection("c2")],
      sessionBreedCount: 3,
    });

    const pool = buildPool(state);
    const breedCards = pool.filter((c) => c.type === "breed");
    expect(breedCards.length).toBe(0);
  });

  test("does not return catch cards when batch is null", () => {
    const state = makeState({
      nearby: [makeNearby("n1")],
      batch: null,
    });

    const pool = buildPool(state);
    const catchCards = pool.filter((c) => c.type === "catch");
    expect(catchCards.length).toBe(0);
  });

  test("does not return catch cards when attemptsRemaining is 0", () => {
    const state = makeState({
      nearby: [makeNearby("n1")],
      batch: { attemptsRemaining: 0, failPenalty: 0, spawnedAt: Date.now() },
    });

    const pool = buildPool(state);
    const catchCards = pool.filter((c) => c.type === "catch");
    expect(catchCards.length).toBe(0);
  });

  test("excludes breed pairs on cooldown", () => {
    const state = makeState({
      collection: [makeCollection("c1"), makeCollection("c2")],
      breedCooldowns: { "c1:c2": Date.now() + 3600000 },
    });

    const pool = buildPool(state);
    const breedCards = pool.filter((c) => c.type === "breed");
    expect(breedCards.length).toBe(0);
  });

  test("excludes archived creatures from breed pairs", () => {
    const archived = makeCollection("c1");
    archived.archived = true;
    const state = makeState({
      collection: [archived, makeCollection("c2")],
    });

    const pool = buildPool(state);
    const breedCards = pool.filter((c) => c.type === "breed");
    expect(breedCards.length).toBe(0);
  });
});

describe("drawCards", () => {
  test("draws up to 3 cards from pool", () => {
    const state = makeState({
      nearby: [makeNearby("n1"), makeNearby("n2"), makeNearby("n3"), makeNearby("n4")],
      batch: { attemptsRemaining: 5, failPenalty: 0, spawnedAt: Date.now() },
    });

    const result = drawCards(state, () => 0.5);
    expect(result.cards.length).toBeLessThanOrEqual(3);
    expect(result.cards.length).toBeGreaterThan(0);
    expect(result.empty).toBe(false);
    expect(result.noEnergy).toBe(false);
  });

  test("returns noEnergy when energy=0", () => {
    const state = makeState({
      energy: 0,
      nearby: [makeNearby("n1")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });

    const result = drawCards(state);
    expect(result.noEnergy).toBe(true);
    expect(result.cards).toEqual([]);
  });

  test("returns empty when no actions available", () => {
    const state = makeState({ energy: 20 });
    const result = drawCards(state);
    expect(result.empty).toBe(true);
    expect(result.cards).toEqual([]);
  });

  test("deducts 1 energy for the turn", () => {
    const state = makeState({
      energy: 20,
      nearby: [makeNearby("n1")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });

    drawCards(state, () => 0.5);
    expect(state.energy).toBe(19);
  });

  test("max 1 breed card per draw", () => {
    const state = makeState({
      energy: 20,
      collection: [
        makeCollection("c1"), makeCollection("c2"),
        makeCollection("c3"), makeCollection("c4"),
      ],
    });

    // rng always picks breed path
    const result = drawCards(state, () => 0.0);
    const breedCards = result.cards.filter((c) => c.type === "breed");
    expect(breedCards.length).toBeLessThanOrEqual(1);
  });

  test("stores currentHand as CardRefs on state", () => {
    const state = makeState({
      energy: 20,
      nearby: [makeNearby("n1"), makeNearby("n2")],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    });

    const result = drawCards(state, () => 0.99);
    expect(state.currentHand).toBeDefined();
    expect(state.currentHand!.length).toBe(result.cards.length);
    for (const ref of state.currentHand!) {
      expect(ref).toHaveProperty("id");
      expect(ref).toHaveProperty("type");
    }
  });
});

describe("skipHand", () => {
  test("clears currentHand and returns a new draw (free)", () => {
    const state = makeState({
      energy: 5,
      nearby: [makeNearby("n1"), makeNearby("n2")],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    });

    // first draw costs energy
    drawCards(state, () => 0.99);
    expect(state.energy).toBe(4);

    // skip is free
    const result = skipHand(state, () => 0.99);
    expect(state.energy).toBe(4); // no additional energy deducted
    expect(result.cards.length).toBeGreaterThan(0);
  });
});
