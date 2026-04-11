import { GameState, CatchResult, CreatureSlot } from "../types";
/**
 * Calculate the catch rate based on the rarest trait's spawn rate across all slots.
 *
 * Formula:
 *   rarest_trait = min(spawn_rate) across all slots
 *   catch_rate = baseCatchRate - (difficultyScale * (1 - rarest_trait / maxTraitSpawnRate)) - failPenalty
 *   clamped to [minCatchRate, maxCatchRate]
 */
export declare function calculateCatchRate(speciesId: string, slots: CreatureSlot[], failPenalty: number): number;
/**
 * Calculate XP earned from catching a creature.
 * Base XP + bonus per rare trait (spawn rate < 0.05).
 */
export declare function calculateXpEarned(speciesId: string, slots: CreatureSlot[]): number;
/**
 * Calculate energy cost to attempt catching a creature.
 * 1 + count of rare traits (spawn rate < 0.05), capped at 5.
 */
export declare function calculateEnergyCost(speciesId: string, slots: CreatureSlot[]): number;
/**
 * Attempt to catch a nearby creature.
 *
 * Throws if: no active batch, no attempts remaining, invalid index, insufficient energy.
 *
 * On success: removes creature from nearby, adds to collection (generation=0, archived=false), grants XP.
 * On failure: increments failPenalty.
 * Always: spends energy, decrements attemptsRemaining.
 */
export declare function attemptCatch(state: GameState, nearbyIndex: number, rng?: () => number): CatchResult;
//# sourceMappingURL=catch.d.ts.map