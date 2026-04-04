import { GameState, NearbyCreature, CreatureTrait, TraitSlotId, Rarity, TRAIT_SLOTS, RARITY_ORDER } from "../types";
import { getTraitsByRarity, getRaritySpawnWeight } from "../config/traits";

export const BATCH_LINGER_MS = 30 * 60 * 1000; // 30 minutes
export const SHARED_ATTEMPTS = 3;

/**
 * Generate a simple unique ID (no external deps needed)
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Pick a rarity using weighted random based on spawn weights
 */
function pickRarity(rng: () => number): Rarity {
  let cumulative = 0;
  const roll = rng();
  for (const rarity of RARITY_ORDER) {
    cumulative += getRaritySpawnWeight(rarity);
    if (roll < cumulative) {
      return rarity;
    }
  }
  // Fallback to last rarity (void)
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

/**
 * Pick a batch size: 2=40%, 3=40%, 4=20%
 */
function pickBatchSize(rng: () => number): number {
  const roll = rng();
  if (roll < 0.4) return 2;
  if (roll < 0.8) return 3;
  return 4;
}

/**
 * Generate 6 traits (one per slot).
 * For each slot: pick a rarity using weighted random, then pick a random trait of that rarity.
 */
export function generateCreatureTraits(rng: () => number): CreatureTrait[] {
  const traits: CreatureTrait[] = [];

  for (const slot of TRAIT_SLOTS) {
    const rarity = pickRarity(rng);
    const traitOptions = getTraitsByRarity(slot, rarity);

    if (traitOptions.length === 0) {
      // Fallback: try to find any trait for this slot
      const anyTrait = getTraitsByRarity(slot, "common")[0];
      if (anyTrait) {
        traits.push({
          slotId: slot,
          traitId: anyTrait.id,
          rarity: anyTrait.rarity,
          mergeModifier: anyTrait.mergeModifier,
        });
      }
    } else {
      const selectedTrait = traitOptions[Math.floor(rng() * traitOptions.length)];
      traits.push({
        slotId: slot,
        traitId: selectedTrait.id,
        rarity: selectedTrait.rarity,
        mergeModifier: selectedTrait.mergeModifier,
      });
    }
  }

  return traits;
}

/**
 * Spawn a batch of creatures if no batch is currently active.
 * If a batch is active, return empty array.
 */
export function spawnBatch(state: GameState, now: number, rng: () => number): NearbyCreature[] {
  // Check if batch already active
  if (state.batch !== null && state.batch.attemptsRemaining > 0) {
    return [];
  }

  // Pick batch size
  const batchSize = pickBatchSize(rng);

  // Generate creatures
  const spawned: NearbyCreature[] = [];
  for (let i = 0; i < batchSize; i++) {
    const creature: NearbyCreature = {
      id: generateId(),
      traits: generateCreatureTraits(rng),
      spawnedAt: now,
    };
    spawned.push(creature);
  }

  // Update state
  state.nearby = spawned;
  state.batch = {
    attemptsRemaining: SHARED_ATTEMPTS,
    failPenalty: 0,
    spawnedAt: now,
  };

  return spawned;
}

/**
 * Clean up batch and nearby if:
 * - Batch timed out (>30min)
 * - No attempts remaining
 * Otherwise, return empty array.
 */
export function cleanupBatch(state: GameState, now: number): string[] {
  if (state.batch === null) {
    return [];
  }

  const elapsed = now - state.batch.spawnedAt;
  const timedOut = elapsed > BATCH_LINGER_MS;
  const noAttemptsLeft = state.batch.attemptsRemaining === 0;

  if (timedOut || noAttemptsLeft) {
    const despawnedIds = state.nearby.map((c) => c.id);
    state.nearby = [];
    state.batch = null;
    return despawnedIds;
  }

  return [];
}
