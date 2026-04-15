import { GameSimulator } from "../../src/simulation/game-simulator";

describe("GameSimulator", () => {
  test("runs a single game with random strategy", () => {
    const sim = new GameSimulator({ runs: 1, seed: 42, ticksPerGame: 10, strategy: "random" });
    const results = sim.runAll();
    expect(results).toHaveLength(1);
    expect(results[0].seed).toBe(42);
    expect(results[0].strategy).toBe("random");
    expect(results[0].ticks).toBe(10);
    expect(results[0].actions.length).toBeGreaterThan(0);
    expect(results[0].finalState).toBeDefined();
    expect(results[0].finalState.profile).toBeDefined();
  });

  test("runs multiple games with incrementing seeds", () => {
    const sim = new GameSimulator({ runs: 3, seed: 100, ticksPerGame: 5, strategy: "passive" });
    const results = sim.runAll();
    expect(results).toHaveLength(3);
    expect(results[0].seed).toBe(100);
    expect(results[1].seed).toBe(101);
    expect(results[2].seed).toBe(102);
  });

  test("greedy strategy catches creatures when available", () => {
    const sim = new GameSimulator({ runs: 1, seed: 7, ticksPerGame: 20, strategy: "greedy" });
    const results = sim.runAll();
    const catchActions = results[0].actions.filter((a) => a.type === "catch");
    expect(catchActions.length).toBeGreaterThan(0);
  });

  test("passive strategy never breeds", () => {
    const sim = new GameSimulator({ runs: 1, seed: 7, ticksPerGame: 50, strategy: "passive" });
    const results = sim.runAll();
    const forbidden = results[0].actions.filter(
      (a) => a.type === "breed"
    );
    expect(forbidden).toHaveLength(0);
  });

  test("deterministic: same seed produces same results", () => {
    const sim1 = new GameSimulator({ runs: 1, seed: 99, ticksPerGame: 20, strategy: "random" });
    const sim2 = new GameSimulator({ runs: 1, seed: 99, ticksPerGame: 20, strategy: "random" });
    const r1 = sim1.runAll();
    const r2 = sim2.runAll();
    expect(r1[0].actions.length).toBe(r2[0].actions.length);
    expect(r1[0].finalState.profile.xp).toBe(r2[0].finalState.profile.xp);
  });
});
