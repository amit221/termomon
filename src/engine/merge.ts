// src/engine/merge.ts

import {
  GameState,
  CollectionCreature,
  CreatureTrait,
  MergeResult,
  CatalystSynergy,
  Rarity,
  RARITY_ORDER,
  TRAIT_SLOTS,
  TraitSlotId,
} from "../types";
import { getSynergies, getTraitsByRarity } from "../config/traits";

// --- Constants ---

export const BASE_MERGE_RATE = 0.50;
export const MIN_MERGE_RATE = 0.05;
export const MAX_MERGE_RATE = 0.90;
export const BASE_MUTATION = 0.08;
export const VOLATILE_MUTATION_BONUS = 0.07;
export const STABLE_MUTATION_PENALTY = 0.04;
export const MIN_MUTATION = 0.01;
export const MAX_MUTATION = 0.30;
export const MUTATION_UP_WEIGHT = 0.75;
export const DOUBLE_MUTATION_CHANCE = 0.25;

// --- Helpers ---

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rarityIndex(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

function rarityAt(index: number): Rarity {
  return RARITY_ORDER[clamp(index, 0, RARITY_ORDER.length - 1)];
}

function pickRandom<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

// --- Public API ---

/**
 * Find all active synergies given the combined trait IDs of both parents.
 */
export function findSynergies(
  parentA: CollectionCreature,
  parentB: CollectionCreature,
  synergies: CatalystSynergy[]
): CatalystSynergy[] {
  const allTraitIds = new Set([
    ...parentA.traits.map((t) => t.traitId),
    ...parentB.traits.map((t) => t.traitId),
  ]);

  return synergies.filter(
    (s) => allTraitIds.has(s.traitA) && allTraitIds.has(s.traitB)
  );
}

/**
 * Calculate merge success rate from both parents' modifiers and active synergies.
 * Clamps to [MIN_MERGE_RATE, MAX_MERGE_RATE].
 */
export function calculateMergeRate(
  parentA: CollectionCreature,
  parentB: CollectionCreature,
  activeSynergies: CatalystSynergy[]
): number {
  const allTraits = [...parentA.traits, ...parentB.traits];
  const modifierSum = allTraits.reduce((sum, t) => sum + t.mergeModifier.value, 0);
  const synergyBonus = activeSynergies.reduce((sum, s) => sum + s.bonus, 0);
  const rate = BASE_MERGE_RATE + modifierSum + synergyBonus;
  return clamp(rate, MIN_MERGE_RATE, MAX_MERGE_RATE);
}

/**
 * Resolve 6 child traits by independently processing each slot.
 */
export function resolveTraitInheritance(
  traitsA: CreatureTrait[],
  traitsB: CreatureTrait[],
  rng: () => number
): CreatureTrait[] {
  const result: CreatureTrait[] = [];

  for (const slotId of TRAIT_SLOTS) {
    const traitA = traitsA.find((t) => t.slotId === slotId);
    const traitB = traitsB.find((t) => t.slotId === slotId);

    // Determine rarer parent trait
    const indexA = traitA ? rarityIndex(traitA.rarity) : 0;
    const indexB = traitB ? rarityIndex(traitB.rarity) : 0;
    const rarerIndex = Math.max(indexA, indexB);
    const rarerTrait = indexA >= indexB ? traitA : traitB;
    const otherTrait = indexA >= indexB ? traitB : traitA;
    const rarerRarity = rarityAt(rarerIndex);

    // Step 1 — calculate mutation chance
    const traitPair = [traitA, traitB].filter(Boolean) as CreatureTrait[];
    const volatileCount = traitPair.filter((t) => t.mergeModifier.type === "volatile").length;
    const stableCount = traitPair.filter((t) => t.mergeModifier.type === "stable").length;
    const mutationChance = clamp(
      BASE_MUTATION + volatileCount * VOLATILE_MUTATION_BONUS - stableCount * STABLE_MUTATION_PENALTY,
      MIN_MUTATION,
      MAX_MUTATION
    );

    // Step 2 — roll for mutation
    const mutRoll = rng();
    if (mutRoll < mutationChance) {
      // Mutation path
      const dirRoll = rng();
      if (dirRoll < MUTATION_UP_WEIGHT) {
        // Mutation UP
        const doublRoll = rng();
        const step = doublRoll < DOUBLE_MUTATION_CHANCE ? 2 : 1;
        const newIndex = clamp(rarerIndex + step, 0, RARITY_ORDER.length - 1);
        const newRarity = rarityAt(newIndex);
        const candidates = getTraitsByRarity(slotId, newRarity);
        if (candidates.length > 0) {
          const picked = pickRandom(candidates, rng);
          result.push({
            slotId,
            traitId: picked.id,
            rarity: picked.rarity,
            mergeModifier: picked.mergeModifier,
          });
        } else {
          // Fallback: use rarer parent's trait or a synthetic one
          result.push(rarerTrait ?? {
            slotId,
            traitId: `${slotId}_fallback`,
            rarity: newRarity,
            mergeModifier: { type: "stable", value: 0 },
          });
        }
      } else {
        // Mutation DOWN
        const newIndex = clamp(rarerIndex - 1, 0, RARITY_ORDER.length - 1);
        const newRarity = rarityAt(newIndex);
        const candidates = getTraitsByRarity(slotId, newRarity);
        if (candidates.length > 0) {
          const picked = pickRandom(candidates, rng);
          result.push({
            slotId,
            traitId: picked.id,
            rarity: picked.rarity,
            mergeModifier: picked.mergeModifier,
          });
        } else {
          result.push(rarerTrait ?? {
            slotId,
            traitId: `${slotId}_fallback`,
            rarity: newRarity,
            mergeModifier: { type: "stable", value: 0 },
          });
        }
      }
    } else {
      // Step 3 — no mutation: inherit
      const inheritRoll = rng();
      if (inheritRoll < 0.55) {
        // 55%: rarer parent's trait
        if (rarerTrait) {
          result.push({ ...rarerTrait });
        } else {
          result.push({
            slotId,
            traitId: `${slotId}_fallback`,
            rarity: "common",
            mergeModifier: { type: "stable", value: 0 },
          });
        }
      } else if (inheritRoll < 0.85) {
        // 30%: other parent's trait
        const source = otherTrait ?? rarerTrait;
        if (source) {
          result.push({ ...source });
        } else {
          result.push({
            slotId,
            traitId: `${slotId}_fallback`,
            rarity: "common",
            mergeModifier: { type: "stable", value: 0 },
          });
        }
      } else {
        // 15%: random trait of same rarity as rarer parent
        const candidates = getTraitsByRarity(slotId, rarerRarity);
        if (candidates.length > 0) {
          const picked = pickRandom(candidates, rng);
          result.push({
            slotId,
            traitId: picked.id,
            rarity: picked.rarity,
            mergeModifier: picked.mergeModifier,
          });
        } else if (rarerTrait) {
          result.push({ ...rarerTrait });
        } else {
          result.push({
            slotId,
            traitId: `${slotId}_fallback`,
            rarity: rarerRarity,
            mergeModifier: { type: "stable", value: 0 },
          });
        }
      }
    }
  }

  return result;
}

/**
 * Attempt to merge two creatures. Both parents are removed regardless of outcome.
 */
export function attemptMerge(
  state: GameState,
  parentAId: string,
  parentBId: string,
  rng: () => number
): MergeResult {
  if (parentAId === parentBId) {
    throw new Error("Cannot merge a creature with itself.");
  }

  const parentA = state.collection.find((c) => c.id === parentAId);
  const parentB = state.collection.find((c) => c.id === parentBId);

  if (!parentA) throw new Error(`Creature not found: ${parentAId}`);
  if (!parentB) throw new Error(`Creature not found: ${parentBId}`);

  const allSynergies = getSynergies();
  const activeSynergies = findSynergies(parentA, parentB, allSynergies);
  const mergeRate = calculateMergeRate(parentA, parentB, activeSynergies);

  // Remove both parents (consumed regardless of outcome)
  state.collection = state.collection.filter(
    (c) => c.id !== parentAId && c.id !== parentBId
  );
  state.profile.totalMerges += 1;

  // Roll for success
  const roll = rng();
  if (roll < mergeRate) {
    const childTraits = resolveTraitInheritance(parentA.traits, parentB.traits, rng);
    const child: CollectionCreature = {
      id: generateId(),
      traits: childTraits,
      caughtAt: Date.now(),
      generation: Math.max(parentA.generation, parentB.generation) + 1,
      mergedFrom: [parentAId, parentBId],
    };
    state.collection.push(child);
    return {
      success: true,
      parentA,
      parentB,
      child,
      mergeRate,
      synergyBonuses: activeSynergies,
    };
  }

  return {
    success: false,
    parentA,
    parentB,
    child: null,
    mergeRate,
    synergyBonuses: activeSynergies,
  };
}
