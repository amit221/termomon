import { GameState, CreatureDefinition, NearbyCreature } from "../types";
import { getTimeOfDay } from "./ticks";
import { getSpawnableCreatures } from "../config/creatures";
import {
  TICKS_PER_SPAWN_CHECK,
  SPAWN_PROBABILITY,
  MAX_NEARBY,
  CREATURE_LINGER_MS,
  MAX_CATCH_ATTEMPTS,
  SPAWN_WEIGHTS,
} from "../config/constants";

export function shouldCheckSpawn(totalTicks: number): boolean {
  return totalTicks > 0 && totalTicks % TICKS_PER_SPAWN_CHECK === 0;
}

export function rollSpawn(rng: () => number = Math.random): boolean {
  return rng() < SPAWN_PROBABILITY;
}

export function pickCreature(
  hour: number,
  totalTicks: number,
  rng: () => number = Math.random
): CreatureDefinition | null {
  const timeOfDay = getTimeOfDay(hour);
  const spawnable = getSpawnableCreatures().filter((c) => {
    if (c.spawnCondition.timeOfDay && !c.spawnCondition.timeOfDay.includes(timeOfDay)) {
      return false;
    }
    if (c.spawnCondition.minTotalTicks && totalTicks < c.spawnCondition.minTotalTicks) {
      return false;
    }
    return true;
  });

  if (spawnable.length === 0) return null;

  const weighted = spawnable.map((c) => ({
    creature: c,
    weight: SPAWN_WEIGHTS[c.rarity] || 0,
  }));

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.creature;
  }

  return weighted[weighted.length - 1].creature;
}

export function cleanupDespawned(state: GameState, now: number): string[] {
  const despawned: string[] = [];
  state.nearby = state.nearby.filter((n) => {
    if (now - n.spawnedAt > CREATURE_LINGER_MS) {
      despawned.push(n.creatureId);
      return false;
    }
    return true;
  });
  return despawned;
}

export function processSpawns(
  state: GameState,
  now: number,
  rng: () => number = Math.random
): CreatureDefinition[] {
  const spawned: CreatureDefinition[] = [];

  if (state.nearby.length >= MAX_NEARBY) return spawned;
  if (!shouldCheckSpawn(state.profile.totalTicks)) return spawned;
  if (!rollSpawn(rng)) return spawned;

  const hour = new Date(now).getHours();
  const creature = pickCreature(hour, state.profile.totalTicks, rng);
  if (!creature) return spawned;

  if (state.nearby.some((n) => n.creatureId === creature.id)) return spawned;

  state.nearby.push({
    creatureId: creature.id,
    spawnedAt: now,
    failedAttempts: 0,
    maxAttempts: MAX_CATCH_ATTEMPTS,
  });
  spawned.push(creature);

  return spawned;
}
