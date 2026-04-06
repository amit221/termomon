// src/engine/merge.ts — sacrifice merge system

import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  Rarity,
  RARITY_ORDER,
  SLOT_IDS,
  MergePreview,
  MergeResult,
  SlotUpgradeChance,
} from "../types";
import { getVariantsBySlotAndRarity, getVariantById } from "../config/traits";
import { SLOT_WEIGHT_BASE, SLOT_WEIGHT_PER_TIER } from "../config/constants";

/**
 * Calculate weighted upgrade chances for each slot of the target creature.
 * Rarer slots have higher weight (they are more valuable to upgrade).
 * Weights are normalized to percentages. Result is sorted by chance descending.
 */
export function calculateSlotChances(target: CollectionCreature): SlotUpgradeChance[] {
  const results: SlotUpgradeChance[] = [];

  for (const slot of target.slots) {
    const currentIndex = RARITY_ORDER.indexOf(slot.rarity);
    // If already at max rarity, still include but next = max
    const nextIndex = Math.min(currentIndex + 1, RARITY_ORDER.length - 1);
    const nextRarity = RARITY_ORDER[nextIndex];

    // Higher rarity slots get higher weight
    const weight = SLOT_WEIGHT_BASE + currentIndex * SLOT_WEIGHT_PER_TIER;
    results.push({
      slotId: slot.slotId,
      currentRarity: slot.rarity,
      nextRarity,
      chance: weight, // raw weight before normalization
    });
  }

  // Normalize to percentages
  const totalWeight = results.reduce((sum, r) => sum + r.chance, 0);
  for (const r of results) {
    r.chance = totalWeight > 0 ? r.chance / totalWeight : 1 / results.length;
  }

  // Sort by chance descending
  results.sort((a, b) => b.chance - a.chance);

  return results;
}

/**
 * Preview a merge: returns slot chances without mutating state.
 * Throws if creatures not found or same creature used for both.
 */
export function previewMerge(state: GameState, targetId: string, foodId: string): MergePreview {
  if (targetId === foodId) {
    throw new Error("Cannot merge a creature with itself.");
  }

  const target = state.collection.find((c) => c.id === targetId);
  const food = state.collection.find((c) => c.id === foodId);

  if (!target) throw new Error(`Creature not found: ${targetId}`);
  if (!food) throw new Error(`Creature not found: ${foodId}`);

  const slotChances = calculateSlotChances(target);

  return { target, food, slotChances };
}

/**
 * Execute a sacrifice merge:
 * 1. Pick a slot via weighted random from slot chances
 * 2. Upgrade that slot one tier
 * 3. Graft a random variant from the new tier onto the target
 * 4. Remove food from collection
 * 5. Increment target generation, set mergedFrom
 */
export function executeMerge(
  state: GameState,
  targetId: string,
  foodId: string,
  rng: () => number = Math.random
): MergeResult {
  if (targetId === foodId) {
    throw new Error("Cannot merge a creature with itself.");
  }

  const target = state.collection.find((c) => c.id === targetId);
  const food = state.collection.find((c) => c.id === foodId);

  if (!target) throw new Error(`Creature not found: ${targetId}`);
  if (!food) throw new Error(`Creature not found: ${foodId}`);

  const slotChances = calculateSlotChances(target);

  // Weighted random pick a slot
  const roll = rng();
  let cumulative = 0;
  let pickedSlotId: SlotId = slotChances[0].slotId;
  for (const sc of slotChances) {
    cumulative += sc.chance;
    if (roll < cumulative) {
      pickedSlotId = sc.slotId;
      break;
    }
  }

  // Find the actual slot on the target
  const slotIndex = target.slots.findIndex((s) => s.slotId === pickedSlotId);
  const slot = target.slots[slotIndex];

  const previousRarity = slot.rarity;
  const currentIndex = RARITY_ORDER.indexOf(previousRarity);
  const newIndex = Math.min(currentIndex + 1, RARITY_ORDER.length - 1);
  const newRarity: Rarity = RARITY_ORDER[newIndex];

  // Graft: try to use the food creature's variant for this slot at the new tier.
  // If food's variant doesn't exist at the new tier, pick a random one.
  const foodSlot = food.slots.find((s) => s.slotId === pickedSlotId);
  const foodVariant = foodSlot ? getVariantById(foodSlot.variantId) : null;
  const newTierVariants = getVariantsBySlotAndRarity(pickedSlotId, newRarity);

  // Check if the food's exact variant exists at the new tier (same name)
  let pickedVariant = foodVariant
    ? newTierVariants.find((v) => v.name === foodVariant.name) ?? null
    : null;

  // Fallback: pick random variant at new tier
  if (!pickedVariant && newTierVariants.length > 0) {
    pickedVariant = newTierVariants[Math.floor(rng() * newTierVariants.length)];
  }

  // Update target slot in-place
  target.slots[slotIndex] = {
    slotId: pickedSlotId,
    variantId: pickedVariant?.id ?? slot.variantId,
    rarity: newRarity,
  };

  // Update target metadata
  target.generation += 1;
  target.mergedFrom = [targetId, foodId];

  // Remove food from collection
  state.collection = state.collection.filter((c) => c.id !== foodId);

  // Increment merge count
  state.profile.totalMerges += 1;

  return {
    success: true,
    target,
    food,
    upgradedSlot: pickedSlotId,
    previousRarity,
    newRarity,
    graftedVariantName: pickedVariant?.name ?? `${pickedSlotId} variant`,
  };
}
