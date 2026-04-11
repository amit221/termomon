import { CreatureSlot, CreatureColor, SlotId } from "../types";
/**
 * Ranks a trait's spawnRate within all traits for that species+slot.
 * Pool is sorted by spawnRate descending (most common first).
 * index 0 → score 1 (most common), last index → score 100 (rarest).
 * Formula: (index / (poolSize - 1)) * 99 + 1
 * Returns 50 for single-trait pools or unknown species/slot/variant.
 */
export declare function calculateTraitRarityScore(speciesId: string, slotId: SlotId, variantId: string): number;
/**
 * Ranks a color's weight among all colors from balance.json.
 * Sorted by weight descending. Same formula as trait score.
 */
export declare function calculateColorRarityScore(color: CreatureColor): number;
/**
 * Combined slot score: 80% trait rarity + 20% color rarity.
 */
export declare function calculateSlotScore(speciesId: string, slot: CreatureSlot): number;
/**
 * Average of all slot scores, rounded to nearest integer.
 * Returns 50 for empty slots.
 */
export declare function calculateCreatureScore(speciesId: string, slots: CreatureSlot[]): number;
//# sourceMappingURL=rarity.d.ts.map