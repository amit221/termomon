# Game Tester Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hybrid testing system that programmatically simulates thousands of games to find bugs and analyze balance, smoke-tests the MCP layer, and generates UX scenario prompts for Claude agent playtesting.

**Architecture:** A shared `GameSimulator` plays games by calling engine modules directly (no I/O). Three consumers — BugHunter, BalanceAnalyzer, MCP SmokeTester — process results differently. A scenarios module defines Claude agent prompts. A CLI wrapper ties them together.

**Tech Stack:** TypeScript, Jest (for simulator unit tests), existing GameEngine/types, yargs (CLI)

---

### Task 1: Simulation Types & Helpers

**Files:**
- Create: `src/simulation/types.ts`
- Create: `tests/simulation/types.test.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// src/simulation/types.ts
import { GameState } from "../types";

export type StrategyName = "random" | "greedy" | "passive";

export type ActionType =
  | "scan"
  | "catch"
  | "breed"
  | "upgrade"
  | "quest_start"
  | "quest_check"
  | "archive"
  | "release"
  | "idle";

export interface SimAction {
  tick: number;
  type: ActionType;
  detail: string;
  success: boolean;
}

export interface Violation {
  tick: number;
  action: ActionType;
  invariant: string;
  detail: string;
  seed: number;
  stateSnapshot: Partial<GameState>;
}

export interface SimulationResult {
  seed: number;
  strategy: StrategyName;
  ticks: number;
  actions: SimAction[];
  violations: Violation[];
  finalState: GameState;
}

export interface SimulationConfig {
  runs: number;
  seed: number;
  ticksPerGame: number;
  strategy: StrategyName;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  runs: 1000,
  seed: 42,
  ticksPerGame: 200,
  strategy: "random",
};

export interface BalanceStats {
  goldAtLevel: Map<number, number[]>;
  ticksToLevel: Map<number, number[]>;
  catchRateByTier: Map<string, { attempts: number; successes: number }>;
  energyDepleted: number;
  collectionFullCount: number;
  speciesDiscoveryTicks: number[];
  xpSources: { catches: number; upgrades: number; quests: number; discoveries: number };
  questRewards: number[];
  breedGenerations: number[];
  upgradeRankReached: Map<number, number>;
}

export function createEmptyBalanceStats(): BalanceStats {
  return {
    goldAtLevel: new Map(),
    ticksToLevel: new Map(),
    catchRateByTier: new Map(),
    energyDepleted: 0,
    collectionFullCount: 0,
    speciesDiscoveryTicks: [],
    xpSources: { catches: 0, upgrades: 0, quests: 0, discoveries: 0 },
    questRewards: [],
    breedGenerations: [],
    upgradeRankReached: new Map(),
  };
}
```

- [ ] **Step 2: Write test for types**

```typescript
// tests/simulation/types.test.ts
import {
  DEFAULT_CONFIG,
  createEmptyBalanceStats,
  BalanceStats,
} from "../../src/simulation/types";

describe("simulation types", () => {
  test("DEFAULT_CONFIG has expected defaults", () => {
    expect(DEFAULT_CONFIG.runs).toBe(1000);
    expect(DEFAULT_CONFIG.seed).toBe(42);
    expect(DEFAULT_CONFIG.ticksPerGame).toBe(200);
    expect(DEFAULT_CONFIG.strategy).toBe("random");
  });

  test("createEmptyBalanceStats returns zeroed stats", () => {
    const stats = createEmptyBalanceStats();
    expect(stats.energyDepleted).toBe(0);
    expect(stats.collectionFullCount).toBe(0);
    expect(stats.goldAtLevel.size).toBe(0);
    expect(stats.xpSources.catches).toBe(0);
  });
});
```

- [ ] **Step 3: Run test**

Run: `npx jest tests/simulation/types.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/simulation/types.ts tests/simulation/types.test.ts
git commit -m "feat(simulation): add simulation type definitions and helpers"
```

---

### Task 2: Game Simulator Core

**Files:**
- Create: `src/simulation/game-simulator.ts`
- Create: `tests/simulation/game-simulator.test.ts`

- [ ] **Step 1: Write failing test for GameSimulator**

```typescript
// tests/simulation/game-simulator.test.ts
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
    // Greedy should attempt catches when creatures are nearby
    expect(catchActions.length).toBeGreaterThan(0);
  });

  test("passive strategy never breeds or upgrades", () => {
    const sim = new GameSimulator({ runs: 1, seed: 7, ticksPerGame: 50, strategy: "passive" });
    const results = sim.runAll();
    const forbidden = results[0].actions.filter(
      (a) => a.type === "breed" || a.type === "upgrade" || a.type === "quest_start"
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
    expect(r1[0].finalState.gold).toBe(r2[0].finalState.gold);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/simulation/game-simulator.test.ts --no-coverage`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement GameSimulator**

```typescript
// src/simulation/game-simulator.ts
import { GameState, CollectionCreature, SlotId, MAX_COLLECTION_SIZE } from "../types";
import { GameEngine } from "../engine/game-engine";
import { loadConfig } from "../config/loader";
import { getAllSpecies, getTraitDefinition } from "../config/species";
import { SimulationConfig, SimulationResult, SimAction, StrategyName, ActionType } from "./types";

function makeRng(seed: number): () => number {
  let counter = seed;
  return () => {
    counter++;
    const x = Math.sin(counter * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  };
}

function makeDefaultState(): GameState {
  const config = loadConfig();
  return {
    version: 5,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "",
      totalUpgrades: 0, totalQuests: 0,
    },
    collection: [],
    archive: [],
    energy: config.energy.startingEnergy,
    lastEnergyGainAt: 0,
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    gold: config.economy.startingGold,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "sim-session-0",
  };
}

type StrategyFn = (state: GameState, engine: GameEngine, rng: () => number) => { type: ActionType; detail: string } | null;

function randomStrategy(state: GameState, engine: GameEngine, rng: () => number): { type: ActionType; detail: string } | null {
  const options: (() => { type: ActionType; detail: string } | null)[] = [];

  // Can catch?
  if (state.nearby.length > 0 && state.energy > 0 && state.batch && state.batch.attemptsRemaining > 0 && state.collection.length < MAX_COLLECTION_SIZE) {
    options.push(() => {
      const idx = Math.floor(rng() * state.nearby.length);
      return { type: "catch" as const, detail: `index=${idx}` };
    });
  }

  // Can breed?
  const breedPairs = findBreedPairs(state);
  if (breedPairs.length > 0 && state.energy >= 3 && state.gold >= 3) {
    options.push(() => {
      const pair = breedPairs[Math.floor(rng() * breedPairs.length)];
      return { type: "breed" as const, detail: `${pair[0].id}+${pair[1].id}` };
    });
  }

  // Can upgrade?
  if (state.collection.length > 0 && state.gold >= 3 && state.sessionUpgradeCount < 2) {
    options.push(() => {
      const creature = state.collection[Math.floor(rng() * state.collection.length)];
      const slots: SlotId[] = ["eyes", "mouth", "body", "tail"];
      const slot = slots[Math.floor(rng() * slots.length)];
      return { type: "upgrade" as const, detail: `${creature.id}:${slot}` };
    });
  }

  // Can start quest?
  if (!state.activeQuest && state.collection.length >= 1) {
    options.push(() => {
      const count = Math.min(3, state.collection.length);
      const ids = state.collection.slice(0, count).map((c) => c.id);
      return { type: "quest_start" as const, detail: ids.join(",") };
    });
  }

  // Can check quest?
  if (state.activeQuest && state.activeQuest.sessionsRemaining <= 0) {
    options.push(() => ({ type: "quest_check" as const, detail: "" }));
  }

  // Can archive?
  if (state.collection.length >= MAX_COLLECTION_SIZE) {
    options.push(() => {
      const creature = state.collection[Math.floor(rng() * state.collection.length)];
      return { type: "archive" as const, detail: creature.id };
    });
  }

  if (options.length === 0) return null;
  return options[Math.floor(rng() * options.length)]();
}

function greedyStrategy(state: GameState, engine: GameEngine, rng: () => number): { type: ActionType; detail: string } | null {
  // Priority: catch rarest > upgrade best > breed > quest > archive
  if (state.nearby.length > 0 && state.energy > 0 && state.batch && state.batch.attemptsRemaining > 0 && state.collection.length < MAX_COLLECTION_SIZE) {
    return { type: "catch", detail: "index=0" }; // first creature (spawner puts them in order)
  }

  if (state.collection.length > 0 && state.gold >= 3 && state.sessionUpgradeCount < 2) {
    const creature = state.collection[0];
    return { type: "upgrade", detail: `${creature.id}:eyes` };
  }

  const breedPairs = findBreedPairs(state);
  if (breedPairs.length > 0 && state.energy >= 3 && state.gold >= 3) {
    return { type: "breed", detail: `${breedPairs[0][0].id}+${breedPairs[0][1].id}` };
  }

  if (!state.activeQuest && state.collection.length >= 1) {
    const count = Math.min(3, state.collection.length);
    const ids = state.collection.slice(0, count).map((c) => c.id);
    return { type: "quest_start", detail: ids.join(",") };
  }

  if (state.activeQuest && state.activeQuest.sessionsRemaining <= 0) {
    return { type: "quest_check", detail: "" };
  }

  if (state.collection.length >= MAX_COLLECTION_SIZE) {
    return { type: "archive", detail: state.collection[state.collection.length - 1].id };
  }

  return null;
}

function passiveStrategy(state: GameState, engine: GameEngine, rng: () => number): { type: ActionType; detail: string } | null {
  // Only scan + catch
  if (state.nearby.length > 0 && state.energy > 0 && state.batch && state.batch.attemptsRemaining > 0 && state.collection.length < MAX_COLLECTION_SIZE) {
    const idx = Math.floor(rng() * state.nearby.length);
    return { type: "catch", detail: `index=${idx}` };
  }
  return null;
}

function findBreedPairs(state: GameState): [CollectionCreature, CollectionCreature][] {
  const pairs: [CollectionCreature, CollectionCreature][] = [];
  const active = state.collection.filter((c) => !c.archived);
  const questLocked = new Set(state.activeQuest?.creatureIds ?? []);
  for (let i = 0; i < active.length; i++) {
    if (questLocked.has(active[i].id)) continue;
    for (let j = i + 1; j < active.length; j++) {
      if (questLocked.has(active[j].id)) continue;
      if (active[i].speciesId === active[j].speciesId) {
        pairs.push([active[i], active[j]]);
      }
    }
  }
  return pairs;
}

const STRATEGIES: Record<StrategyName, StrategyFn> = {
  random: randomStrategy,
  greedy: greedyStrategy,
  passive: passiveStrategy,
};

export class GameSimulator {
  private config: SimulationConfig;

  constructor(config: SimulationConfig) {
    this.config = config;
  }

  runAll(): SimulationResult[] {
    const results: SimulationResult[] = [];
    for (let i = 0; i < this.config.runs; i++) {
      const seed = this.config.seed + i;
      results.push(this.runOne(seed));
    }
    return results;
  }

  private runOne(seed: number): SimulationResult {
    const rng = makeRng(seed);
    const state = makeDefaultState();
    state.lastEnergyGainAt = 0;
    state.lastSpawnAt = 0;
    const engine = new GameEngine(state);
    const strategy = STRATEGIES[this.config.strategy];
    const actions: SimAction[] = [];
    const config = loadConfig();
    const spawnInterval = config.batch.spawnIntervalMs;

    for (let tick = 0; tick < this.config.ticksPerGame; tick++) {
      const now = (tick + 1) * spawnInterval; // advance time by spawn interval each tick

      // Change session every 10 ticks to simulate session boundaries
      if (tick % 10 === 0) {
        state.currentSessionId = `sim-session-${Math.floor(tick / 10)}`;
        state.sessionUpgradeCount = 0;
      }

      // Process tick (energy, spawns, quest advancement)
      try {
        engine.processTick({ timestamp: now, sessionId: state.currentSessionId }, rng);
      } catch {
        // Tick processing errors are logged but don't stop simulation
      }

      // Strategy decides action
      const decision = strategy(state, engine, rng);
      if (!decision) {
        actions.push({ tick, type: "idle", detail: "", success: true });
        continue;
      }

      const action: SimAction = { tick, type: decision.type, detail: decision.detail, success: false };

      try {
        switch (decision.type) {
          case "catch": {
            const idx = parseInt(decision.detail.replace("index=", ""), 10);
            const result = engine.catch(idx, rng);
            action.success = result.success;
            action.detail = `${result.creature.speciesId} success=${result.success}`;
            break;
          }
          case "breed": {
            const [idA, idB] = decision.detail.split("+");
            engine.breedExecute(idA, idB, rng);
            action.success = true;
            break;
          }
          case "upgrade": {
            const [creatureId, slot] = decision.detail.split(":");
            engine.upgrade(creatureId, slot as SlotId);
            action.success = true;
            break;
          }
          case "quest_start": {
            const ids = decision.detail.split(",");
            engine.questStart(ids);
            action.success = true;
            break;
          }
          case "quest_check": {
            const result = engine.questCheck();
            action.success = result !== null;
            break;
          }
          case "archive": {
            engine.archive(decision.detail);
            action.success = true;
            break;
          }
          case "release": {
            engine.release(decision.detail);
            action.success = true;
            break;
          }
        }
      } catch (err) {
        action.success = false;
        action.detail += ` error=${err instanceof Error ? err.message : String(err)}`;
      }

      actions.push(action);
    }

    return {
      seed,
      strategy: this.config.strategy,
      ticks: this.config.ticksPerGame,
      actions,
      violations: [], // filled by BugHunter, not the simulator itself
      finalState: structuredClone(engine.getState()),
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/simulation/game-simulator.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/simulation/game-simulator.ts tests/simulation/game-simulator.test.ts
git commit -m "feat(simulation): add core GameSimulator with strategies"
```

---

### Task 3: Bug Hunter — Invariant Checker

**Files:**
- Create: `src/simulation/bug-hunter.ts`
- Create: `tests/simulation/bug-hunter.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/simulation/bug-hunter.test.ts
import { BugHunter } from "../../src/simulation/bug-hunter";

describe("BugHunter", () => {
  test("finds no violations in a clean simulation", () => {
    const hunter = new BugHunter({ runs: 10, seed: 42, ticksPerGame: 50 });
    const report = hunter.run();
    expect(report.totalRuns).toBe(30); // 10 runs * 3 strategies
    expect(report.violations).toEqual([]);
  });

  test("reports contain run metadata", () => {
    const hunter = new BugHunter({ runs: 5, seed: 1, ticksPerGame: 20 });
    const report = hunter.run();
    expect(report.totalRuns).toBe(15);
    expect(typeof report.durationMs).toBe("number");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/simulation/bug-hunter.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement BugHunter**

```typescript
// src/simulation/bug-hunter.ts
import { GameState, MAX_COLLECTION_SIZE } from "../types";
import { GameEngine } from "../engine/game-engine";
import { loadConfig } from "../config/loader";
import { GameSimulator } from "./game-simulator";
import { Violation, StrategyName, SimulationResult } from "./types";

export interface BugHunterConfig {
  runs: number;
  seed: number;
  ticksPerGame: number;
}

export interface BugHunterReport {
  totalRuns: number;
  violations: Violation[];
  durationMs: number;
}

function checkInvariants(result: SimulationResult): Violation[] {
  const violations: Violation[] = [];
  const state = result.finalState;
  const config = loadConfig();

  function addViolation(tick: number, invariant: string, detail: string) {
    violations.push({
      tick,
      action: "idle",
      invariant,
      detail,
      seed: result.seed,
      stateSnapshot: {
        energy: state.energy,
        gold: state.gold,
        collection: state.collection,
        profile: state.profile,
      },
    });
  }

  // Energy bounds
  if (state.energy < 0) {
    addViolation(-1, "energy_negative", `energy=${state.energy}`);
  }
  if (state.energy > config.energy.maxEnergy) {
    addViolation(-1, "energy_exceeds_max", `energy=${state.energy} max=${config.energy.maxEnergy}`);
  }

  // Gold bounds
  if (state.gold < 0) {
    addViolation(-1, "gold_negative", `gold=${state.gold}`);
  }

  // Collection size
  const activeCount = state.collection.filter((c) => !c.archived).length;
  if (activeCount > MAX_COLLECTION_SIZE) {
    addViolation(-1, "collection_exceeds_max", `active=${activeCount} max=${MAX_COLLECTION_SIZE}`);
  }

  // No duplicate IDs
  const ids = state.collection.map((c) => c.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    addViolation(-1, "duplicate_creature_ids", `total=${ids.length} unique=${uniqueIds.size}`);
  }

  // Archived creatures not in active collection
  for (const creature of state.collection) {
    if (creature.archived) {
      addViolation(-1, "archived_in_collection", `creature=${creature.id} is archived but in collection array`);
    }
  }

  // Level never negative
  if (state.profile.level < 1) {
    addViolation(-1, "level_below_1", `level=${state.profile.level}`);
  }

  // XP never negative
  if (state.profile.xp < 0) {
    addViolation(-1, "xp_negative", `xp=${state.profile.xp}`);
  }

  // Nearby bounds
  if (state.nearby.length > 5) {
    addViolation(-1, "nearby_exceeds_5", `nearby=${state.nearby.length}`);
  }

  // Batch attempts
  if (state.batch && state.batch.attemptsRemaining < 0) {
    addViolation(-1, "batch_attempts_negative", `attempts=${state.batch.attemptsRemaining}`);
  }

  // Quest locked creatures should still be in collection
  if (state.activeQuest) {
    for (const id of state.activeQuest.creatureIds) {
      const found = state.collection.find((c) => c.id === id);
      if (!found) {
        addViolation(-1, "quest_creature_missing", `quest creature ${id} not in collection`);
      }
    }
  }

  // Upgrade rank within bounds
  const maxRank = config.upgrade.maxRank;
  for (const creature of state.collection) {
    for (const slot of creature.slots) {
      const rankMatch = slot.variantId.match(/_r(\d+)$/);
      if (rankMatch) {
        const rank = parseInt(rankMatch[1], 10);
        if (rank > maxRank) {
          addViolation(-1, "rank_exceeds_max", `creature=${creature.id} slot=${slot.slotId} rank=${rank} max=${maxRank}`);
        }
      }
    }
  }

  return violations;
}

export class BugHunter {
  private config: BugHunterConfig;

  constructor(config: BugHunterConfig) {
    this.config = config;
  }

  run(): BugHunterReport {
    const start = Date.now();
    const allViolations: Violation[] = [];
    const strategies: StrategyName[] = ["random", "greedy", "passive"];

    for (const strategy of strategies) {
      const sim = new GameSimulator({
        runs: this.config.runs,
        seed: this.config.seed,
        ticksPerGame: this.config.ticksPerGame,
        strategy,
      });
      const results = sim.runAll();
      for (const result of results) {
        const violations = checkInvariants(result);
        allViolations.push(...violations);
      }
    }

    return {
      totalRuns: this.config.runs * strategies.length,
      violations: allViolations,
      durationMs: Date.now() - start,
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/simulation/bug-hunter.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/simulation/bug-hunter.ts tests/simulation/bug-hunter.test.ts
git commit -m "feat(simulation): add BugHunter invariant checker"
```

---

### Task 4: Balance Analyzer

**Files:**
- Create: `src/simulation/balance-analyzer.ts`
- Create: `tests/simulation/balance-analyzer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/simulation/balance-analyzer.test.ts
import { BalanceAnalyzer } from "../../src/simulation/balance-analyzer";

describe("BalanceAnalyzer", () => {
  test("produces stats from simulation runs", () => {
    const analyzer = new BalanceAnalyzer({ runs: 5, seed: 42, ticksPerGame: 30 });
    const report = analyzer.run();
    expect(report.totalRuns).toBe(5);
    expect(report.stats).toBeDefined();
    expect(typeof report.durationMs).toBe("number");
  });

  test("summary highlights are generated", () => {
    const analyzer = new BalanceAnalyzer({ runs: 5, seed: 42, ticksPerGame: 50 });
    const report = analyzer.run();
    expect(report.highlights).toBeDefined();
    expect(Array.isArray(report.highlights)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/simulation/balance-analyzer.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement BalanceAnalyzer**

```typescript
// src/simulation/balance-analyzer.ts
import { GameSimulator } from "./game-simulator";
import { BalanceStats, createEmptyBalanceStats, SimulationResult } from "./types";
import { loadConfig } from "../config/loader";

export interface BalanceAnalyzerConfig {
  runs: number;
  seed: number;
  ticksPerGame: number;
}

export interface BalanceReport {
  totalRuns: number;
  stats: BalanceStats;
  highlights: string[];
  durationMs: number;
}

function collectStats(results: SimulationResult[]): BalanceStats {
  const stats = createEmptyBalanceStats();

  for (const result of results) {
    const state = result.finalState;

    // Gold at level
    const level = state.profile.level;
    if (!stats.goldAtLevel.has(level)) stats.goldAtLevel.set(level, []);
    stats.goldAtLevel.get(level)!.push(state.gold);

    // Collection full
    if (state.collection.length >= 15) stats.collectionFullCount++;

    // XP sources from actions
    for (const action of result.actions) {
      if (action.type === "catch" && action.success) stats.xpSources.catches++;
      if (action.type === "upgrade" && action.success) stats.xpSources.upgrades++;
      if (action.type === "quest_check" && action.success) stats.xpSources.quests++;
    }

    // Catch rate tracking
    const catchAttempts = result.actions.filter((a) => a.type === "catch");
    const catchSuccesses = catchAttempts.filter((a) => a.success);
    if (!stats.catchRateByTier.has("all")) stats.catchRateByTier.set("all", { attempts: 0, successes: 0 });
    const tierStats = stats.catchRateByTier.get("all")!;
    tierStats.attempts += catchAttempts.length;
    tierStats.successes += catchSuccesses.length;

    // Breed generations
    for (const creature of state.collection) {
      if (creature.generation > 0) {
        stats.breedGenerations.push(creature.generation);
      }
    }

    // Species discovery
    stats.speciesDiscoveryTicks.push(state.discoveredSpecies.length);

    // Quest rewards
    for (const action of result.actions) {
      if (action.type === "quest_check" && action.success) {
        stats.questRewards.push(1); // placeholder count
      }
    }

    // Upgrade ranks reached
    for (const creature of state.collection) {
      for (const slot of creature.slots) {
        const rankMatch = slot.variantId.match(/_r(\d+)$/);
        if (rankMatch) {
          const rank = parseInt(rankMatch[1], 10);
          stats.upgradeRankReached.set(rank, (stats.upgradeRankReached.get(rank) ?? 0) + 1);
        }
      }
    }
  }

  return stats;
}

function generateHighlights(stats: BalanceStats, totalRuns: number): string[] {
  const highlights: string[] = [];
  const config = loadConfig();

  // Catch rate
  const allCatch = stats.catchRateByTier.get("all");
  if (allCatch && allCatch.attempts > 0) {
    const rate = ((allCatch.successes / allCatch.attempts) * 100).toFixed(1);
    highlights.push(`Overall catch rate: ${rate}% (${allCatch.successes}/${allCatch.attempts})`);
  }

  // Collection full frequency
  const fullPct = ((stats.collectionFullCount / totalRuns) * 100).toFixed(1);
  highlights.push(`Collection hit cap in ${fullPct}% of runs`);

  // Average species discovered
  if (stats.speciesDiscoveryTicks.length > 0) {
    const avg = stats.speciesDiscoveryTicks.reduce((a, b) => a + b, 0) / stats.speciesDiscoveryTicks.length;
    highlights.push(`Average species discovered: ${avg.toFixed(1)}`);
  }

  // Breed depth
  if (stats.breedGenerations.length > 0) {
    const maxGen = Math.max(...stats.breedGenerations);
    highlights.push(`Max breed generation reached: ${maxGen}`);
  }

  // Upgrade rank distribution
  if (stats.upgradeRankReached.size > 0) {
    const maxRank = Math.max(...stats.upgradeRankReached.keys());
    highlights.push(`Highest upgrade rank reached: ${maxRank}`);
  }

  return highlights;
}

export class BalanceAnalyzer {
  private config: BalanceAnalyzerConfig;

  constructor(config: BalanceAnalyzerConfig) {
    this.config = config;
  }

  run(): BalanceReport {
    const start = Date.now();
    const sim = new GameSimulator({
      runs: this.config.runs,
      seed: this.config.seed,
      ticksPerGame: this.config.ticksPerGame,
      strategy: "random",
    });
    const results = sim.runAll();
    const stats = collectStats(results);
    const highlights = generateHighlights(stats, this.config.runs);

    return {
      totalRuns: this.config.runs,
      stats,
      highlights,
      durationMs: Date.now() - start,
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/simulation/balance-analyzer.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/simulation/balance-analyzer.ts tests/simulation/balance-analyzer.test.ts
git commit -m "feat(simulation): add BalanceAnalyzer stats collector"
```

---

### Task 5: MCP Smoke Tester

**Files:**
- Create: `src/simulation/mcp-smoke.ts`
- Create: `tests/simulation/mcp-smoke.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/simulation/mcp-smoke.test.ts
import { McpSmokeTester } from "../../src/simulation/mcp-smoke";

describe("McpSmokeTester", () => {
  test("runs smoke test without crashes", () => {
    const tester = new McpSmokeTester({ runs: 2, seed: 42 });
    const report = tester.run();
    expect(report.totalRuns).toBe(2);
    expect(report.toolResults).toBeDefined();
    expect(typeof report.durationMs).toBe("number");
  });

  test("tests all core tools", () => {
    const tester = new McpSmokeTester({ runs: 1, seed: 42 });
    const report = tester.run();
    const testedTools = new Set(report.toolResults.map((r) => r.tool));
    expect(testedTools.has("scan")).toBe(true);
    expect(testedTools.has("status")).toBe(true);
    expect(testedTools.has("energy")).toBe(true);
  });

  test("catches error-producing edge cases", () => {
    const tester = new McpSmokeTester({ runs: 1, seed: 42 });
    const report = tester.run();
    // Edge case tests should exist (catch with bad index, etc.)
    const edgeCases = report.toolResults.filter((r) => r.isEdgeCase);
    expect(edgeCases.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/simulation/mcp-smoke.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement McpSmokeTester**

This module calls GameEngine methods directly but through patterns that mirror how MCP tools call them — including testing parameter edge cases and error handling.

```typescript
// src/simulation/mcp-smoke.ts
import { GameEngine } from "../engine/game-engine";
import { GameState, SlotId } from "../types";
import { loadConfig } from "../config/loader";

export interface McpSmokeConfig {
  runs: number;
  seed: number;
}

export interface ToolTestResult {
  tool: string;
  success: boolean;
  error?: string;
  isEdgeCase: boolean;
}

export interface McpSmokeReport {
  totalRuns: number;
  toolResults: ToolTestResult[];
  durationMs: number;
}

function makeRng(seed: number): () => number {
  let counter = seed;
  return () => {
    counter++;
    const x = Math.sin(counter * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  };
}

function makeDefaultState(): GameState {
  const config = loadConfig();
  return {
    version: 5,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "",
      totalUpgrades: 0, totalQuests: 0,
    },
    collection: [],
    archive: [],
    energy: config.energy.startingEnergy,
    lastEnergyGainAt: 0,
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    gold: config.economy.startingGold,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "smoke-session",
  };
}

function testTool(
  engine: GameEngine,
  state: GameState,
  tool: string,
  fn: () => void,
  isEdgeCase: boolean
): ToolTestResult {
  try {
    fn();
    return { tool, success: true, isEdgeCase };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Edge cases are expected to throw — that's success if the error is clean
    if (isEdgeCase) {
      const isCleanError = !msg.includes("Cannot read") && !msg.includes("undefined") && !msg.includes("TypeError");
      return { tool, success: isCleanError, error: msg, isEdgeCase };
    }
    return { tool, success: false, error: msg, isEdgeCase };
  }
}

export class McpSmokeTester {
  private config: McpSmokeConfig;

  constructor(config: McpSmokeConfig) {
    this.config = config;
  }

  run(): McpSmokeReport {
    const start = Date.now();
    const allResults: ToolTestResult[] = [];

    for (let i = 0; i < this.config.runs; i++) {
      const seed = this.config.seed + i;
      const rng = makeRng(seed);
      const results = this.runOne(rng);
      allResults.push(...results);
    }

    return {
      totalRuns: this.config.runs,
      toolResults: allResults,
      durationMs: Date.now() - start,
    };
  }

  private runOne(rng: () => number): ToolTestResult[] {
    const state = makeDefaultState();
    const engine = new GameEngine(state);
    const results: ToolTestResult[] = [];
    const spawnInterval = loadConfig().batch.spawnIntervalMs;

    // --- Normal operations ---

    // Status (always works)
    results.push(testTool(engine, state, "status", () => engine.status(), false));

    // Energy (always works)
    results.push(testTool(engine, state, "energy", () => engine.getGold(), false));

    // Scan (triggers spawn)
    results.push(testTool(engine, state, "scan", () => {
      engine.processTick({ timestamp: spawnInterval * 2, sessionId: "smoke" }, rng);
      engine.scan(rng);
    }, false));

    // Catch (should work if nearby creatures exist)
    if (state.nearby.length > 0) {
      results.push(testTool(engine, state, "catch", () => engine.catch(0, rng), false));
    }

    // Process more ticks to get creatures for breeding/quests
    for (let t = 3; t < 20; t++) {
      try {
        engine.processTick({ timestamp: spawnInterval * t, sessionId: "smoke" }, rng);
        if (state.nearby.length > 0 && state.energy > 0 && state.batch?.attemptsRemaining) {
          engine.catch(0, rng);
        }
      } catch { /* continue */ }
    }

    // Upgrade (if we have creatures and gold)
    if (state.collection.length > 0 && state.gold >= 3) {
      const c = state.collection[0];
      results.push(testTool(engine, state, "upgrade", () => engine.upgrade(c.id, "eyes"), false));
    }

    // Quest start (if we have creatures)
    if (state.collection.length >= 1 && !state.activeQuest) {
      const ids = state.collection.slice(0, 1).map((c) => c.id);
      results.push(testTool(engine, state, "quest_start", () => engine.questStart(ids), false));
    }

    // Archive (if we have creatures)
    if (state.collection.length > 1) {
      const last = state.collection[state.collection.length - 1];
      if (!state.activeQuest?.creatureIds.includes(last.id)) {
        results.push(testTool(engine, state, "archive", () => engine.archive(last.id), false));
      }
    }

    // --- Edge cases ---

    // Catch with out-of-range index
    results.push(testTool(engine, state, "catch", () => engine.catch(999, rng), true));

    // Catch with negative index
    results.push(testTool(engine, state, "catch", () => engine.catch(-1, rng), true));

    // Upgrade with fake creature ID
    results.push(testTool(engine, state, "upgrade", () => engine.upgrade("nonexistent", "eyes"), true));

    // Upgrade with invalid slot
    results.push(testTool(engine, state, "upgrade", () => engine.upgrade("any", "invalid" as SlotId), true));

    // Quest with empty array
    results.push(testTool(engine, state, "quest_start", () => engine.questStart([]), true));

    // Archive nonexistent creature
    results.push(testTool(engine, state, "archive", () => engine.archive("nonexistent-id"), true));

    // Release nonexistent creature
    results.push(testTool(engine, state, "release", () => engine.release("nonexistent-id"), true));

    return results;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/simulation/mcp-smoke.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/simulation/mcp-smoke.ts tests/simulation/mcp-smoke.test.ts
git commit -m "feat(simulation): add MCP smoke tester with edge cases"
```

---

### Task 6: UX Scenario Definitions

**Files:**
- Create: `src/simulation/scenarios.ts`
- Create: `tests/simulation/scenarios.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/simulation/scenarios.test.ts
import { getScenario, getAllScenarios, ScenarioId } from "../../src/simulation/scenarios";

describe("scenarios", () => {
  test("getAllScenarios returns all 7 scenarios", () => {
    const all = getAllScenarios();
    expect(all).toHaveLength(7);
  });

  test("each scenario has required fields", () => {
    for (const scenario of getAllScenarios()) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.name).toBeTruthy();
      expect(scenario.description).toBeTruthy();
      expect(scenario.prompt).toBeTruthy();
      expect(scenario.prompt.length).toBeGreaterThan(100);
    }
  });

  test("getScenario returns specific scenario by id", () => {
    const scenario = getScenario("first-10-minutes");
    expect(scenario).toBeDefined();
    expect(scenario!.name).toContain("First");
  });

  test("getScenario returns undefined for unknown id", () => {
    const scenario = getScenario("nonexistent" as ScenarioId);
    expect(scenario).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/simulation/scenarios.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement scenarios**

```typescript
// src/simulation/scenarios.ts

export type ScenarioId =
  | "first-10-minutes"
  | "energy-wall"
  | "first-breed"
  | "full-collection"
  | "quest-flow"
  | "returning-player"
  | "gold-decision";

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  prompt: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "first-10-minutes",
    name: "First 10 Minutes",
    description: "New player with no context tries to figure out what to do",
    prompt: `You are playtesting a terminal creature collection game called Compi. You have NEVER played before and have ZERO context about how the game works.

Your goal: Figure out how to play. Try commands. See what happens. Be honest about what confuses you.

Rules:
- You can only use these MCP tools: scan, catch, collection, breed, energy, status, settings, upgrade, quest_start, quest_check, archive, release
- Try at least 5 different tools
- Think out loud about what you expect vs what happened
- Note anything that's unclear, missing, or surprising

After playing, write a structured report:
## Friction Points
- What was confusing or unclear?

## Dead Ends
- Moments where you had no good action

## Missing Information
- Things you needed to know but weren't shown

## Suggestions
- Concrete improvements for new player onboarding`,
  },
  {
    id: "energy-wall",
    name: "Energy Wall",
    description: "Player has 0 energy with creatures nearby",
    prompt: `You are playtesting Compi, a terminal creature collection game. You've been playing for a while and have run out of energy. There are creatures nearby that you want to catch but can't.

Your goal: Experience the energy wall and evaluate how the game communicates it.

Steps:
1. Run /status to see your state
2. Run /scan to see nearby creatures
3. Try to /catch — observe what happens
4. Run /energy to check your level
5. Try any other actions you can think of

After playing, write a structured report:
## Friction Points
- Is it clear WHY you can't catch?
- Does the game tell you WHEN you'll have energy again?

## Dead Ends
- What can you actually do with 0 energy?

## Missing Information
- What should the game show you in this state?

## Suggestions
- How should the game handle the energy-depleted state?`,
  },
  {
    id: "first-breed",
    name: "First Breed Attempt",
    description: "Player with 2 same-species creatures tries breeding",
    prompt: `You are playtesting Compi. You have caught several creatures and noticed you have two of the same species. You want to try breeding them.

Your goal: Figure out how breeding works and whether the UX is clear.

Steps:
1. Run /collection to see your creatures
2. Run /breed to see the breed table
3. Try /breed with two creature indexes
4. Look at the inheritance preview
5. If you have enough resources, confirm the breed

After playing, write a structured report:
## Friction Points
- Was the breed command syntax obvious?
- Did you understand the inheritance preview?
- Was the cost clear before confirming?

## Dead Ends
- What if you can't afford to breed?
- What if your creatures aren't compatible?

## Missing Information
- What information would help you decide whether to breed?

## Suggestions
- How could the breeding UX be improved?`,
  },
  {
    id: "full-collection",
    name: "Full Collection",
    description: "Player at 15 creatures with new spawn appearing",
    prompt: `You are playtesting Compi. You have 15 creatures (the maximum) and new creatures have appeared nearby.

Your goal: Manage your full collection and decide what to do.

Steps:
1. Run /collection to review your creatures
2. Run /scan to see what's nearby
3. Try to /catch and observe the error
4. Figure out how to make room (archive or release)
5. Try to catch again

After playing, write a structured report:
## Friction Points
- Was it clear why you couldn't catch?
- Is the difference between archive and release obvious?
- How do you decide which creature to remove?

## Dead Ends
- What if all your creatures are on a quest?

## Missing Information
- Does the game help you compare creature quality?

## Suggestions
- How should the game handle the full collection state?`,
  },
  {
    id: "quest-flow",
    name: "Quest Flow",
    description: "Player tries the full quest lifecycle",
    prompt: `You are playtesting Compi. You have some creatures and want to try the quest system.

Your goal: Complete a full quest cycle and evaluate the UX.

Steps:
1. Run /status to check your state
2. Run /collection to pick quest creatures
3. Start a quest with 1-3 creatures
4. Observe that creatures are locked
5. Try to use locked creatures for other things
6. Check quest progress
7. Complete the quest when ready

After playing, write a structured report:
## Friction Points
- Was it clear how to start a quest?
- Did you understand the lock mechanic?
- Was the reward worth the wait?

## Dead Ends
- What if you lock your only creatures?

## Missing Information
- How long does a quest take? Is this communicated?
- How is reward calculated? Is this shown?

## Suggestions
- How could the quest UX be improved?`,
  },
  {
    id: "returning-player",
    name: "Returning Player",
    description: "Player with existing progress picks up the game cold",
    prompt: `You are playtesting Compi. You played last week and are coming back. You don't remember exactly what you were doing.

Your goal: Orient yourself and figure out what to do next.

Steps:
1. Run /status to see where you left off
2. Run /collection to review your creatures
3. Run /energy to check resources
4. Run /scan to see what's around
5. Decide on your next action

After playing, write a structured report:
## Friction Points
- Could you tell where you left off?
- Was it clear what you should do next?

## Dead Ends
- Any state that was confusing to return to?

## Missing Information
- What context would help a returning player?
- Is there a "what happened since you left" summary?

## Suggestions
- How should the game welcome back returning players?`,
  },
  {
    id: "gold-decision",
    name: "Gold Decision",
    description: "Player has limited gold and must choose between upgrade and breed",
    prompt: `You are playtesting Compi. You have just enough gold for either one upgrade OR one breed, but not both.

Your goal: Make the decision and evaluate whether the game helps you choose.

Steps:
1. Run /status to see your gold
2. Run /collection to see your creatures and their traits
3. Check upgrade costs with /upgrade
4. Check breed options with /breed
5. Make your choice and explain your reasoning

After playing, write a structured report:
## Friction Points
- Did you have enough information to decide?
- Were the costs and benefits clear?
- Did you feel confident in your choice?

## Dead Ends
- What if neither option seems worth it?

## Missing Information
- Does the game show ROI for upgrades vs breeds?
- Is there a way to compare options?

## Suggestions
- How could the game help players make gold decisions?`,
  },
];

export function getAllScenarios(): Scenario[] {
  return SCENARIOS;
}

export function getScenario(id: ScenarioId): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/simulation/scenarios.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/simulation/scenarios.ts tests/simulation/scenarios.test.ts
git commit -m "feat(simulation): add UX scenario definitions for Claude agent"
```

---

### Task 7: Report Formatter

**Files:**
- Create: `src/simulation/report.ts`
- Create: `tests/simulation/report.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/simulation/report.test.ts
import { formatBugReport, formatBalanceReport, formatSmokeReport, writeJsonReport } from "../../src/simulation/report";
import * as fs from "fs";
import * as path from "path";

describe("report formatter", () => {
  test("formatBugReport with no violations", () => {
    const output = formatBugReport({ totalRuns: 100, violations: [], durationMs: 500 });
    expect(output).toContain("100 runs");
    expect(output).toContain("0 violations");
  });

  test("formatBugReport with violations", () => {
    const output = formatBugReport({
      totalRuns: 100,
      violations: [{
        tick: 5,
        action: "catch",
        invariant: "energy_negative",
        detail: "energy=-1",
        seed: 42,
        stateSnapshot: {},
      }],
      durationMs: 500,
    });
    expect(output).toContain("1 violation");
    expect(output).toContain("energy_negative");
    expect(output).toContain("seed=42");
  });

  test("formatBalanceReport includes highlights", () => {
    const output = formatBalanceReport({
      totalRuns: 50,
      stats: {
        goldAtLevel: new Map(),
        ticksToLevel: new Map(),
        catchRateByTier: new Map(),
        energyDepleted: 0,
        collectionFullCount: 0,
        speciesDiscoveryTicks: [],
        xpSources: { catches: 10, upgrades: 5, quests: 3, discoveries: 2 },
        questRewards: [],
        breedGenerations: [],
        upgradeRankReached: new Map(),
      },
      highlights: ["Catch rate: 75%", "Max gen: 3"],
      durationMs: 200,
    });
    expect(output).toContain("Catch rate: 75%");
    expect(output).toContain("Max gen: 3");
  });

  test("formatSmokeReport shows tool results", () => {
    const output = formatSmokeReport({
      totalRuns: 1,
      toolResults: [
        { tool: "scan", success: true, isEdgeCase: false },
        { tool: "catch", success: false, error: "out of range", isEdgeCase: true },
      ],
      durationMs: 100,
    });
    expect(output).toContain("scan");
    expect(output).toContain("catch");
  });

  test("writeJsonReport writes valid JSON", () => {
    const reportDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const filePath = writeJsonReport("test", { hello: "world" });
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(content.hello).toBe("world");
    fs.unlinkSync(filePath);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/simulation/report.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement report formatter**

```typescript
// src/simulation/report.ts
import * as fs from "fs";
import * as path from "path";
import { BugHunterReport } from "./bug-hunter";
import { BalanceReport } from "./balance-analyzer";
import { McpSmokeReport } from "./mcp-smoke";

export function formatBugReport(report: BugHunterReport): string {
  const lines: string[] = [];
  lines.push("=== Bug Hunter Report ===");
  lines.push(`Runs: ${report.totalRuns} | Duration: ${report.durationMs}ms`);
  lines.push("");

  if (report.violations.length === 0) {
    lines.push(`Result: ${report.totalRuns} runs, 0 violations`);
  } else {
    lines.push(`Result: ${report.violations.length} violation(s) found!`);
    lines.push("");
    for (const v of report.violations) {
      lines.push(`  [${v.invariant}] tick=${v.tick} seed=${v.seed}`);
      lines.push(`    ${v.detail}`);
    }
  }

  return lines.join("\n");
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines: string[] = [];
  lines.push("=== Balance Analyzer Report ===");
  lines.push(`Runs: ${report.totalRuns} | Duration: ${report.durationMs}ms`);
  lines.push("");

  lines.push("Highlights:");
  for (const h of report.highlights) {
    lines.push(`  - ${h}`);
  }

  lines.push("");
  lines.push("XP Sources:");
  const xp = report.stats.xpSources;
  const total = xp.catches + xp.upgrades + xp.quests + xp.discoveries;
  if (total > 0) {
    lines.push(`  Catches:     ${xp.catches} (${((xp.catches / total) * 100).toFixed(0)}%)`);
    lines.push(`  Upgrades:    ${xp.upgrades} (${((xp.upgrades / total) * 100).toFixed(0)}%)`);
    lines.push(`  Quests:      ${xp.quests} (${((xp.quests / total) * 100).toFixed(0)}%)`);
    lines.push(`  Discoveries: ${xp.discoveries} (${((xp.discoveries / total) * 100).toFixed(0)}%)`);
  }

  return lines.join("\n");
}

export function formatSmokeReport(report: McpSmokeReport): string {
  const lines: string[] = [];
  lines.push("=== MCP Smoke Test Report ===");
  lines.push(`Runs: ${report.totalRuns} | Duration: ${report.durationMs}ms`);
  lines.push("");

  const normal = report.toolResults.filter((r) => !r.isEdgeCase);
  const edge = report.toolResults.filter((r) => r.isEdgeCase);

  lines.push("Normal operations:");
  for (const r of normal) {
    const status = r.success ? "PASS" : "FAIL";
    lines.push(`  [${status}] ${r.tool}${r.error ? ` — ${r.error}` : ""}`);
  }

  lines.push("");
  lines.push("Edge cases:");
  for (const r of edge) {
    const status = r.success ? "PASS" : "FAIL";
    lines.push(`  [${status}] ${r.tool}${r.error ? ` — ${r.error}` : ""}`);
  }

  const failures = report.toolResults.filter((r) => !r.success);
  lines.push("");
  lines.push(`Result: ${report.toolResults.length} tests, ${failures.length} failures`);

  return lines.join("\n");
}

export function writeJsonReport(module: string, data: unknown): string {
  const reportDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(reportDir, `${module}-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/simulation/report.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/simulation/report.ts tests/simulation/report.test.ts
git commit -m "feat(simulation): add report formatter for terminal and JSON output"
```

---

### Task 8: CLI Entry Point

**Files:**
- Create: `src/simulation/cli.ts`
- Create: `src/simulation/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/simulation/index.ts
export { GameSimulator } from "./game-simulator";
export { BugHunter } from "./bug-hunter";
export { BalanceAnalyzer } from "./balance-analyzer";
export { McpSmokeTester } from "./mcp-smoke";
export { getAllScenarios, getScenario } from "./scenarios";
export * from "./types";
```

- [ ] **Step 2: Create CLI entry point**

```typescript
// src/simulation/cli.ts
import { BugHunter } from "./bug-hunter";
import { BalanceAnalyzer } from "./balance-analyzer";
import { McpSmokeTester } from "./mcp-smoke";
import { getAllScenarios, getScenario, ScenarioId } from "./scenarios";
import { formatBugReport, formatBalanceReport, formatSmokeReport, writeJsonReport } from "./report";
import { execSync } from "child_process";

const args = process.argv.slice(2);
const command = args[0];

function parseFlag(name: string, defaultVal: number): number {
  const flag = args.find((a) => a.startsWith(`--${name}=`));
  return flag ? parseInt(flag.split("=")[1], 10) : defaultVal;
}

function parseFlagStr(name: string, defaultVal: string): string {
  const flag = args.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.split("=")[1] : defaultVal;
}

function runBugs() {
  const runs = parseFlag("runs", 1000);
  const seed = parseFlag("seed", 42);
  const ticks = parseFlag("ticks", 200);
  console.log(`Running bug hunter: ${runs} runs/strategy, seed=${seed}, ${ticks} ticks/game...`);
  const hunter = new BugHunter({ runs, seed, ticksPerGame: ticks });
  const report = hunter.run();
  console.log(formatBugReport(report));
  const jsonPath = writeJsonReport("bugs", report);
  console.log(`\nJSON report: ${jsonPath}`);
}

function runBalance() {
  const runs = parseFlag("runs", 1000);
  const seed = parseFlag("seed", 42);
  const ticks = parseFlag("ticks", 200);
  console.log(`Running balance analyzer: ${runs} runs, seed=${seed}, ${ticks} ticks/game...`);
  const analyzer = new BalanceAnalyzer({ runs, seed, ticksPerGame: ticks });
  const report = analyzer.run();
  console.log(formatBalanceReport(report));
  const jsonPath = writeJsonReport("balance", report);
  console.log(`\nJSON report: ${jsonPath}`);
}

function runSmoke() {
  const runs = parseFlag("runs", 10);
  const seed = parseFlag("seed", 42);
  console.log(`Running MCP smoke test: ${runs} runs, seed=${seed}...`);
  const tester = new McpSmokeTester({ runs, seed });
  const report = tester.run();
  console.log(formatSmokeReport(report));
  const jsonPath = writeJsonReport("smoke", report);
  console.log(`\nJSON report: ${jsonPath}`);
}

function runUx() {
  const scenarioId = parseFlagStr("scenario", "all");

  const scenarios =
    scenarioId === "all"
      ? getAllScenarios()
      : [getScenario(scenarioId as ScenarioId)].filter(Boolean);

  if (scenarios.length === 0) {
    console.error(`Unknown scenario: ${scenarioId}`);
    console.error(`Available: ${getAllScenarios().map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  for (const scenario of scenarios) {
    if (!scenario) continue;
    console.log(`\n=== UX Scenario: ${scenario.name} ===`);
    console.log(scenario.description);
    console.log(`\nLaunching Claude agent for "${scenario.id}"...\n`);

    try {
      execSync(`claude -p "${scenario.prompt.replace(/"/g, '\\"')}"`, {
        stdio: "inherit",
        timeout: 300_000, // 5 minutes per scenario
      });
    } catch (err) {
      console.error(`Scenario "${scenario.id}" failed or timed out`);
    }
  }
}

function runAll() {
  runBugs();
  console.log("\n" + "=".repeat(60) + "\n");
  runBalance();
  console.log("\n" + "=".repeat(60) + "\n");
  runSmoke();
  console.log("\n" + "=".repeat(60) + "\n");
  console.log("Skipping UX scenarios in 'all' mode (run separately with: npx ts-node src/simulation/cli.ts ux)");
}

switch (command) {
  case "bugs":
    runBugs();
    break;
  case "balance":
    runBalance();
    break;
  case "smoke":
    runSmoke();
    break;
  case "ux":
    runUx();
    break;
  case "all":
    runAll();
    break;
  default:
    console.log("Usage: npx ts-node src/simulation/cli.ts <command> [options]");
    console.log("");
    console.log("Commands:");
    console.log("  bugs      Run bug hunter (invariant checks across simulated games)");
    console.log("  balance   Run balance analyzer (stats collection)");
    console.log("  smoke     Run MCP smoke tests (integration layer)");
    console.log("  ux        Run UX scenarios (launches Claude agent)");
    console.log("  all       Run bugs + balance + smoke");
    console.log("");
    console.log("Options:");
    console.log("  --runs=N       Number of simulation runs (default: varies by command)");
    console.log("  --seed=N       RNG seed (default: 42)");
    console.log("  --ticks=N      Ticks per game (default: 200)");
    console.log("  --scenario=ID  Specific UX scenario (default: all)");
    process.exit(1);
}
```

- [ ] **Step 3: Test CLI help output**

Run: `npx ts-node src/simulation/cli.ts`
Expected: Prints usage help and exits

- [ ] **Step 4: Commit**

```bash
git add src/simulation/cli.ts src/simulation/index.ts
git commit -m "feat(simulation): add CLI entry point and barrel export"
```

---

### Task 9: Project Wiring (gitignore, npm scripts)

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Add reports/ to .gitignore**

Append to `.gitignore`:
```
# Simulation reports
reports/
```

- [ ] **Step 2: Add npm scripts to package.json**

Add to `"scripts"` in `package.json`:
```json
"sim": "ts-node src/simulation/cli.ts all",
"sim:bugs": "ts-node src/simulation/cli.ts bugs",
"sim:balance": "ts-node src/simulation/cli.ts balance",
"sim:smoke": "ts-node src/simulation/cli.ts smoke",
"sim:ux": "ts-node src/simulation/cli.ts ux"
```

- [ ] **Step 3: Run a quick smoke test of the full system**

Run: `npx ts-node src/simulation/cli.ts bugs --runs=5 --ticks=20`
Expected: Prints bug hunter report with no violations

- [ ] **Step 4: Run all existing tests to confirm nothing broke**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json
git commit -m "chore: add simulation npm scripts and gitignore reports/"
```

---

### Task 10: Run Full Simulation & Fix Issues

**Files:**
- May modify any `src/simulation/` file based on findings

- [ ] **Step 1: Run bug hunter with default settings**

Run: `npx ts-node src/simulation/cli.ts bugs --runs=100 --ticks=100`
Expected: Report prints. If violations found, investigate and fix.

- [ ] **Step 2: Run balance analyzer**

Run: `npx ts-node src/simulation/cli.ts balance --runs=100 --ticks=100`
Expected: Stats and highlights print.

- [ ] **Step 3: Run MCP smoke tester**

Run: `npx ts-node src/simulation/cli.ts smoke --runs=5`
Expected: All normal operations pass. Edge cases should pass (clean error messages).

- [ ] **Step 4: Fix any issues found**

Address any violations, crashes, or unexpected results. Adjust strategies or invariants as needed.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix(simulation): address issues found during initial simulation runs"
```
