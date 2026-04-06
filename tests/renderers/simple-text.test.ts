import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import {
  ScanResult,
  CatchResult,
  MergePreview,
  MergeResult,
  CollectionCreature,
  CreatureSlot,
  NearbyCreature,
} from "../../src/types";

// --- Helpers ---

function makeSlots(rarities: string[]): CreatureSlot[] {
  const slotIds = ["eyes", "mouth", "body", "tail"] as const;
  // Use real variant IDs from traits.json
  const variantIds = ["eye_c01", "mth_c01", "bod_c01", "tal_c01"];
  return rarities.map((r, i) => ({
    slotId: slotIds[i % slotIds.length],
    variantId: variantIds[i % variantIds.length],
    rarity: r as any,
  }));
}

function makeNearby(id: string, name: string): NearbyCreature {
  return {
    id,
    name,
    slots: makeSlots(["common", "common", "common", "common"]),
    spawnedAt: Date.now(),
  };
}

function makeCollection(id: string, name: string, generation = 1): CollectionCreature {
  return {
    id,
    name,
    slots: makeSlots(["legendary", "common", "rare", "epic"]),
    caughtAt: Date.now(),
    generation,
  };
}

const renderer = new SimpleTextRenderer();

// --- renderScan ---

describe("renderScan", () => {
  const result: ScanResult = {
    energy: 6,
    batch: null,
    nearby: [
      { index: 1, creature: makeNearby("c1", "Sparks"), catchRate: 0.55, energyCost: 3 },
      { index: 2, creature: makeNearby("c2", "Muddle"), catchRate: 0.92, energyCost: 1 },
    ],
  };

  test("contains creature names", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("Sparks");
    expect(out).toContain("Muddle");
  });

  test("contains catch rates", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("55%");
    expect(out).toContain("92%");
  });

  test("contains energy costs", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("3E");
    expect(out).toContain("1E");
  });

  test("contains ANSI color codes", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("\x1b[");
  });

  test("contains energy bar", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("Energy:");
    expect(out).toContain("6/");
  });
});

// --- renderCatch ---

describe("renderCatch — success", () => {
  const result: CatchResult = {
    success: true,
    creature: makeNearby("c1", "Sparks"),
    energySpent: 3,
    fled: false,
    xpEarned: 25,
    attemptsRemaining: 3,
    failPenalty: 0,
  };

  test("contains CAUGHT", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("CAUGHT");
  });

  test("contains creature name", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("Sparks");
  });

  test("contains XP earned", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("25");
  });
});

describe("renderCatch — escaped", () => {
  const result: CatchResult = {
    success: false,
    creature: makeNearby("c1", "Lumina"),
    energySpent: 5,
    fled: false,
    xpEarned: 0,
    attemptsRemaining: 2,
    failPenalty: 0.1,
  };

  test("contains ESCAPED", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("ESCAPED");
  });

  test("contains creature name", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("Lumina");
  });

  test("contains attempts remaining", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("2 attempts remaining");
  });
});

describe("renderCatch — fled", () => {
  const result: CatchResult = {
    success: false,
    creature: makeNearby("c1", "Vortex"),
    energySpent: 5,
    fled: true,
    xpEarned: 0,
    attemptsRemaining: 0,
    failPenalty: 0,
  };

  test("contains FLED", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("FLED");
  });

  test("contains creature name", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("Vortex");
  });
});

// --- renderCollection ---

describe("renderCollection", () => {
  const collection = [makeCollection("c1", "Sparks", 4), makeCollection("c2", "Muddle", 1)];

  test("contains creature names", () => {
    const out = renderer.renderCollection(collection);
    expect(out).toContain("Sparks");
    expect(out).toContain("Muddle");
  });

  test("contains ANSI codes", () => {
    const out = renderer.renderCollection(collection);
    expect(out).toContain("\x1b[");
  });

  test("contains levels", () => {
    const out = renderer.renderCollection(collection);
    expect(out).toContain("Lv 4");
    expect(out).toContain("Lv 1");
  });

  test("empty collection returns message", () => {
    const out = renderer.renderCollection([]);
    expect(out).toContain("No creatures");
  });
});

// --- renderMergePreview ---

describe("renderMergePreview", () => {
  const target = makeCollection("c1", "Sparks", 4);
  const food = makeCollection("c2", "Muddle", 1);

  const preview: MergePreview = {
    target,
    food,
    slotChances: [
      { slotId: "eyes", currentRarity: "legendary", nextRarity: "mythic", chance: 0.65 },
      { slotId: "tail", currentRarity: "epic", nextRarity: "legendary", chance: 0.20 },
      { slotId: "body", currentRarity: "rare", nextRarity: "epic", chance: 0.10 },
      { slotId: "mouth", currentRarity: "common", nextRarity: "uncommon", chance: 0.05 },
    ],
  };

  test("contains both creature names", () => {
    const out = renderer.renderMergePreview(preview);
    expect(out).toContain("Sparks");
    expect(out).toContain("Muddle");
  });

  test("contains slot names", () => {
    const out = renderer.renderMergePreview(preview);
    expect(out).toContain("eyes");
    expect(out).toContain("tail");
    expect(out).toContain("body");
    expect(out).toContain("mouth");
  });

  test("contains arrow separator in output", () => {
    const out = renderer.renderMergePreview(preview);
    expect(out).toContain("→");
  });

  test("contains percentages", () => {
    const out = renderer.renderMergePreview(preview);
    expect(out).toContain("65%");
    expect(out).toContain("20%");
  });

  test("contains ANSI codes", () => {
    const out = renderer.renderMergePreview(preview);
    expect(out).toContain("\x1b[");
  });
});

// --- renderMergeResult ---

describe("renderMergeResult", () => {
  const target = makeCollection("c1", "Sparks", 4);
  // Upgrade eyes slot to mythic
  target.slots = target.slots.map((s) =>
    s.slotId === "eyes" ? { ...s, rarity: "mythic" } : s
  );

  const food = makeCollection("c2", "Muddle", 1);

  const result: MergeResult = {
    success: true,
    target,
    food,
    upgradedSlot: "eyes",
    previousRarity: "legendary",
    newRarity: "mythic",
    graftedVariantName: "Pebble Gaze",
  };

  test("contains MERGE SUCCESS", () => {
    const out = renderer.renderMergeResult(result);
    expect(out).toContain("MERGE SUCCESS");
  });

  test("contains upgraded slot name", () => {
    const out = renderer.renderMergeResult(result);
    expect(out).toContain("eyes");
  });

  test("contains grafted variant name", () => {
    const out = renderer.renderMergeResult(result);
    expect(out).toContain("Pebble Gaze");
  });

  test("contains rarity names", () => {
    const out = renderer.renderMergeResult(result);
    expect(out).toContain("legendary");
    expect(out).toContain("mythic");
  });

  test("contains food creature name consumed message", () => {
    const out = renderer.renderMergeResult(result);
    expect(out).toContain("Muddle");
    expect(out).toContain("consumed");
  });
});

// --- renderEnergy ---

describe("renderEnergy", () => {
  test("contains Energy label and values", () => {
    const out = renderer.renderEnergy(6, 10);
    expect(out).toContain("Energy:");
    expect(out).toContain("6/10");
  });

  test("contains ANSI green color", () => {
    const out = renderer.renderEnergy(6, 10);
    expect(out).toContain("\x1b[32m");
  });
});

// --- renderNotification ---

describe("renderNotification", () => {
  test("returns notification message directly", () => {
    const out = renderer.renderNotification({ message: "A creature appeared!", level: "moderate" });
    expect(out).toBe("A creature appeared!");
  });
});
