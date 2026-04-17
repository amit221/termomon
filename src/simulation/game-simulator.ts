import { GameState, CollectionCreature } from "../types";
import { GameEngine } from "../engine/game-engine";
import { loadConfig } from "../config/loader";
import { SimulationConfig, SimulationResult, SimAction, StrategyName, ActionType } from "./types";
import { makeRng, makeDefaultState } from "./helpers";

// --- Breed pair helper ---

function findBreedPairs(state: GameState): Array<[CollectionCreature, CollectionCreature]> {
  const active = state.collection.filter((c) => !c.archived);
  // Group by speciesId
  const bySpecies = new Map<string, CollectionCreature[]>();
  for (const c of active) {
    const group = bySpecies.get(c.speciesId) ?? [];
    group.push(c);
    bySpecies.set(c.speciesId, group);
  }
  const pairs: Array<[CollectionCreature, CollectionCreature]> = [];
  for (const group of bySpecies.values()) {
    if (group.length >= 2) {
      pairs.push([group[0], group[1]]);
    }
  }
  return pairs;
}

// --- Strategy types ---

type StrategyDecision = { type: ActionType; detail?: string } | null;
type StrategyFn = (
  state: GameState,
  engine: GameEngine,
  rng: () => number
) => StrategyDecision;

// --- Strategy: random ---

function randomStrategy(state: GameState, _engine: GameEngine, rng: () => number): StrategyDecision {
  const actions: Array<() => StrategyDecision> = [];

  // catch
  if (state.nearby.length > 0) {
    actions.push(() => ({
      type: "catch" as ActionType,
      detail: `nearby:${state.nearby.length}`,
    }));
  }

  // breed
  const pairs = findBreedPairs(state);
  if (pairs.length > 0) {
    actions.push(() => ({ type: "breed" as ActionType, detail: `pairs:${pairs.length}` }));
  }

  // scan
  actions.push(() => ({ type: "scan" as ActionType, detail: "look_around" }));

  if (actions.length === 0) return { type: "idle" };

  const idx = Math.floor(rng() * actions.length);
  return actions[idx]();
}

// --- Strategy: greedy ---

function greedyStrategy(state: GameState, _engine: GameEngine, _rng: () => number): StrategyDecision {
  // Priority: catch > breed > scan

  // 1. catch
  if (state.nearby.length > 0) {
    return { type: "catch", detail: `nearby:${state.nearby.length}` };
  }

  // 2. breed
  const pairs = findBreedPairs(state);
  if (pairs.length > 0) {
    return { type: "breed", detail: `pairs:${pairs.length}` };
  }

  // 3. scan to get creatures
  return { type: "scan", detail: "look_around" };
}

// --- Strategy: passive ---

function passiveStrategy(state: GameState, _engine: GameEngine, _rng: () => number): StrategyDecision {
  // Only catches, never breeds
  if (state.nearby.length > 0) {
    return { type: "catch", detail: `nearby:${state.nearby.length}` };
  }

  return { type: "scan", detail: "look_around" };
}

const STRATEGIES: Record<StrategyName, StrategyFn> = {
  random: randomStrategy,
  greedy: greedyStrategy,
  passive: passiveStrategy,
};

// --- GameSimulator class ---

export class GameSimulator {
  constructor(private readonly config: SimulationConfig) {}

  runAll(): SimulationResult[] {
    const results: SimulationResult[] = [];
    for (let i = 0; i < this.config.runs; i++) {
      results.push(this.runOne(this.config.seed + i));
    }
    return results;
  }

  private runOne(seed: number): SimulationResult {
    const rng = makeRng(seed);
    const state = makeDefaultState();
    const engine = new GameEngine(state);
    const strategyFn = STRATEGIES[this.config.strategy];
    const actions: SimAction[] = [];
    const balanceConfig = loadConfig();
    const spawnIntervalMs = balanceConfig.batch.spawnIntervalMs;

    for (let tick = 0; tick < this.config.ticksPerGame; tick++) {
      const now = (tick + 1) * spawnIntervalMs;

      // Change session every 10 ticks
      if (tick % 10 === 0) {
        state.currentSessionId = `sim-session-${Math.floor(tick / 10)}`;
      }

      // Process the tick
      try {
        engine.processTick({ timestamp: now, sessionId: state.currentSessionId }, rng);
      } catch (err) {
        actions.push({
          tick,
          type: "idle",
          detail: `processTick error: ${err instanceof Error ? err.message : String(err)}`,
          success: false,
        });
        continue;
      }

      // Get strategy decision
      const decision = strategyFn(state, engine, rng);
      if (!decision || decision.type === "idle") {
        actions.push({ tick, type: "idle", detail: "no_action", success: true });
        continue;
      }

      // Execute the decision
      const action = this.executeAction(decision.type, state, engine, rng, tick, decision.detail ?? "");
      actions.push(action);
    }

    return {
      seed,
      strategy: this.config.strategy,
      ticks: this.config.ticksPerGame,
      actions,
      violations: [],
      finalState: engine.getState(),
    };
  }

  private executeAction(
    type: ActionType,
    state: GameState,
    engine: GameEngine,
    rng: () => number,
    tick: number,
    detail: string
  ): SimAction {
    try {
      switch (type) {
        case "scan": {
          engine.scan(rng);
          return { tick, type, detail, success: true };
        }

        case "catch": {
          if (state.nearby.length === 0) {
            engine.scan(rng);
          }
          if (state.nearby.length === 0) {
            return { tick, type, detail: "no_nearby_after_scan", success: false };
          }
          const idx = Math.floor(rng() * state.nearby.length);
          const result = engine.catch(idx, rng);
          return {
            tick,
            type,
            detail: `caught:${result.success} species:${result.creature.speciesId}`,
            success: result.success,
          };
        }

        case "breed": {
          const pairs = findBreedPairs(state);
          if (pairs.length === 0) {
            return { tick, type, detail: "no_pairs", success: false };
          }
          const pairIdx = Math.floor(rng() * pairs.length);
          const [parentA, parentB] = pairs[pairIdx];
          const breedResult = engine.breedExecute(parentA.id, parentB.id, rng);
          return {
            tick,
            type,
            detail: `child:${breedResult.child.id} species:${breedResult.child.speciesId} gen:${breedResult.child.generation}`,
            success: true,
          };
        }

        case "archive":
        case "release": {
          // archive/release removed in v7
          return { tick, type, detail: "removed", success: false };
        }

        default:
          return { tick, type: "idle", detail: "unknown_action", success: false };
      }
    } catch (err) {
      return {
        tick,
        type,
        detail: `error: ${err instanceof Error ? err.message : String(err)}`,
        success: false,
      };
    }
  }
}
