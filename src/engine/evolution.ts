import { GameState, EvolveResult, CreatureDefinition } from "../types";

export function evolveCreature(
  state: GameState,
  creatureId: string,
  creatures: Map<string, CreatureDefinition>
): EvolveResult {
  const creature = creatures.get(creatureId);
  if (!creature) {
    throw new Error(`Unknown creature: ${creatureId}`);
  }

  if (!creature.evolution) {
    throw new Error(`Cannot evolve ${creature.name}`);
  }

  const entry = state.collection.find((c) => c.creatureId === creatureId);
  if (!entry) {
    throw new Error(`${creature.name} not in collection`);
  }

  if (entry.evolved) {
    throw new Error(`Already evolved ${creature.name}`);
  }

  if (entry.fragments < creature.evolution.fragmentCost) {
    throw new Error(
      `Not enough fragments: have ${entry.fragments}, need ${creature.evolution.fragmentCost}`
    );
  }

  let catalystUsed: string | undefined;
  if (creature.evolution.catalystItemId) {
    const catalystCount = state.inventory[creature.evolution.catalystItemId] || 0;
    if (catalystCount <= 0) {
      throw new Error(`Missing catalyst: ${creature.evolution.catalystItemId}`);
    }
    state.inventory[creature.evolution.catalystItemId] = catalystCount - 1;
    catalystUsed = creature.evolution.catalystItemId;
  }

  const target = creatures.get(creature.evolution.targetId);
  if (!target) {
    throw new Error(`Unknown evolution target: ${creature.evolution.targetId}`);
  }

  entry.fragments -= creature.evolution.fragmentCost;
  entry.evolved = true;

  return {
    success: true,
    from: creature,
    to: target,
    fragmentsSpent: creature.evolution.fragmentCost,
    catalystUsed,
  };
}
