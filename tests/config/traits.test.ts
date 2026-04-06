import { loadSlots, getVariantsBySlotAndRarity, getVariantById, getSlotForVariant, getRaritySpawnWeight, _resetTraitsCache } from "../../src/config/traits";

beforeEach(() => _resetTraitsCache());

describe("trait loader v2", () => {
  test("loadSlots returns 4 slots", () => {
    const slots = loadSlots();
    expect(slots).toHaveLength(4);
    expect(slots.map(s => s.id)).toEqual(["eyes", "mouth", "body", "tail"]);
  });

  test("getVariantsBySlotAndRarity returns variants", () => {
    const commonEyes = getVariantsBySlotAndRarity("eyes", "common");
    expect(commonEyes.length).toBeGreaterThanOrEqual(3);
    expect(commonEyes[0]).toHaveProperty("id");
    expect(commonEyes[0]).toHaveProperty("name");
    expect(commonEyes[0]).toHaveProperty("art");
  });

  test("getVariantById finds a known variant", () => {
    const v = getVariantById("eye_c01");
    expect(v).toBeDefined();
    expect(v!.name).toBe("Pebble Gaze");
  });

  test("getSlotForVariant returns correct slot", () => {
    expect(getSlotForVariant("eye_c01")).toBe("eyes");
    expect(getSlotForVariant("mth_c01")).toBe("mouth");
    expect(getSlotForVariant("bod_c01")).toBe("body");
    expect(getSlotForVariant("tal_c01")).toBe("tail");
  });

  test("getRaritySpawnWeight returns weights for 6 tiers", () => {
    expect(getRaritySpawnWeight("common")).toBeGreaterThan(0);
    expect(getRaritySpawnWeight("mythic")).toBeGreaterThan(0);
  });
});
