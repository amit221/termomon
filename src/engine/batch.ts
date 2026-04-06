import { GameState, NearbyCreature, CreatureSlot, SlotId, Rarity, SLOT_IDS, RARITY_ORDER } from "../types";
import { getVariantsBySlotAndRarity, getRaritySpawnWeight, loadCreatureName } from "../config/traits";
import { BATCH_LINGER_MS, SHARED_ATTEMPTS } from "../config/constants";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pickRarity(rng: () => number): Rarity {
  let cumulative = 0;
  const roll = rng();
  for (const rarity of RARITY_ORDER) {
    cumulative += getRaritySpawnWeight(rarity);
    if (roll < cumulative) {
      return rarity;
    }
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

function pickBatchSize(rng: () => number): number {
  const roll = rng();
  if (roll < 0.4) return 2;
  if (roll < 0.8) return 3;
  return 4;
}

/**
 * Generate 4 slots (eyes/mouth/body/tail).
 * For each slot: pick a rarity using weighted random, then pick a random variant of that rarity.
 */
export function generateCreatureSlots(rng: () => number): CreatureSlot[] {
  const slots: CreatureSlot[] = [];

  for (const slotId of SLOT_IDS) {
    const rarity = pickRarity(rng);
    const variants = getVariantsBySlotAndRarity(slotId, rarity);

    if (variants.length === 0) {
      // Fallback to common
      const fallbackVariants = getVariantsBySlotAndRarity(slotId, "common");
      if (fallbackVariants.length > 0) {
        const v = fallbackVariants[Math.floor(rng() * fallbackVariants.length)];
        slots.push({ slotId, variantId: v.id, rarity: "common" });
      }
    } else {
      const v = variants[Math.floor(rng() * variants.length)];
      slots.push({ slotId, variantId: v.id, rarity });
    }
  }

  return slots;
}

/**
 * Spawn a batch of 2-4 creatures. No-op if a batch is already active.
 */
export function spawnBatch(state: GameState, now: number, rng: () => number): NearbyCreature[] {
  if (state.batch !== null && state.batch.attemptsRemaining > 0) {
    return [];
  }

  const batchSize = pickBatchSize(rng);
  const spawned: NearbyCreature[] = [];

  for (let i = 0; i < batchSize; i++) {
    const creature: NearbyCreature = {
      id: generateId(),
      name: loadCreatureName(rng),
      slots: generateCreatureSlots(rng),
      spawnedAt: now,
    };
    spawned.push(creature);
  }

  state.nearby = spawned;
  state.batch = {
    attemptsRemaining: SHARED_ATTEMPTS,
    failPenalty: 0,
    spawnedAt: now,
  };

  return spawned;
}

/**
 * Clean up batch and nearby creatures when:
 * - Batch timed out (>30min)
 * - No attempts remaining
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
