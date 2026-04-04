import {
  loadTraits,
  getTraitsBySlot,
  getTraitById,
  getTraitsByRarity,
  getSynergies,
  getRaritySpawnWeight,
  RARITY_CATCH_PENALTY,
  RARITY_ENERGY_VALUE,
} from "../../src/config/traits";

describe("loadTraits", () => {
  test("loads all 300 traits across 6 slots", () => {
    const traits = loadTraits();
    expect(traits.length).toBe(300);
  });

  test("each slot has 50 traits", () => {
    const slots = ["eyes", "mouth", "tail", "gills", "pattern", "aura"] as const;
    for (const slot of slots) {
      const slotTraits = getTraitsBySlot(slot);
      expect(slotTraits.length).toBe(50);
    }
  });

  test("pyramid distribution per slot: 16/10/8/5/4/3/2/2", () => {
    const expected: Record<string, number> = {
      common: 16, uncommon: 10, rare: 8, epic: 5,
      legendary: 4, mythic: 3, ancient: 2, void: 2,
    };
    const slotTraits = getTraitsBySlot("eyes");
    for (const [rarity, count] of Object.entries(expected)) {
      const filtered = slotTraits.filter(t => t.rarity === rarity);
      expect(filtered.length).toBe(count);
    }
  });

  test("getTraitById returns correct trait", () => {
    const trait = getTraitById("eye_c01");
    expect(trait).toBeDefined();
    expect(trait!.name).toBe("Pebble Gaze");
    expect(trait!.rarity).toBe("common");
  });

  test("getTraitById returns undefined for unknown id", () => {
    expect(getTraitById("nonexistent")).toBeUndefined();
  });

  test("getTraitsByRarity returns traits of that rarity for a slot", () => {
    const rareEyes = getTraitsByRarity("eyes", "rare");
    expect(rareEyes.length).toBe(8);
    for (const t of rareEyes) {
      expect(t.rarity).toBe("rare");
    }
  });

  test("synergies are loaded", () => {
    const synergies = getSynergies();
    expect(synergies.length).toBeGreaterThan(20);
    for (const s of synergies) {
      expect(s.traitA).toBeDefined();
      expect(s.traitB).toBeDefined();
      expect(s.bonus).toBeGreaterThan(0);
    }
  });

  test("rarity spawn weights sum to 1", () => {
    const rarities = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "ancient", "void"] as const;
    const sum = rarities.reduce((s, r) => s + getRaritySpawnWeight(r), 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  test("RARITY_CATCH_PENALTY has correct values", () => {
    expect(RARITY_CATCH_PENALTY.common).toBe(0.00);
    expect(RARITY_CATCH_PENALTY.uncommon).toBe(0.02);
    expect(RARITY_CATCH_PENALTY.rare).toBe(0.04);
    expect(RARITY_CATCH_PENALTY.void).toBe(0.14);
  });

  test("RARITY_ENERGY_VALUE has correct values", () => {
    expect(RARITY_ENERGY_VALUE.common).toBe(0);
    expect(RARITY_ENERGY_VALUE.uncommon).toBe(1);
    expect(RARITY_ENERGY_VALUE.void).toBe(7);
  });
});
