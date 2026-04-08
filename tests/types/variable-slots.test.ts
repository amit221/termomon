import { SpeciesDefinition, TraitDefinition } from "../../src/types";

describe("SpeciesDefinition variable slots", () => {
  test("species with 3 slots is valid SpeciesDefinition", () => {
    const species: SpeciesDefinition = {
      id: "test3",
      name: "Test3",
      description: "3-slot species",
      spawnWeight: 10,
      art: [" /\\_/\\", "( EE )", " > MM <", "  TT"],
      traitPools: {
        eyes: [{ id: "t_eye_01", name: "Test", art: "o.o", spawnRate: 1.0 }],
        mouth: [{ id: "t_mth_01", name: "Test", art: " ^ ", spawnRate: 1.0 }],
        tail: [{ id: "t_tal_01", name: "Test", art: "~~", spawnRate: 1.0 }],
      },
    };
    expect(species.traitPools.eyes).toHaveLength(1);
    expect(species.traitPools.body).toBeUndefined();
  });

  test("species with 4 slots is still valid", () => {
    const species: SpeciesDefinition = {
      id: "test4",
      name: "Test4",
      description: "4-slot species",
      spawnWeight: 10,
      art: ["  ~(EE)~", "    MM", "   BB", "   TT"],
      traitPools: {
        eyes: [{ id: "t_eye_01", name: "Test", art: "o.o", spawnRate: 1.0 }],
        mouth: [{ id: "t_mth_01", name: "Test", art: " ^ ", spawnRate: 1.0 }],
        body: [{ id: "t_bod_01", name: "Test", art: "░░", spawnRate: 1.0 }],
        tail: [{ id: "t_tal_01", name: "Test", art: "~~", spawnRate: 1.0 }],
      },
    };
    expect(Object.keys(species.traitPools)).toHaveLength(4);
  });
});
