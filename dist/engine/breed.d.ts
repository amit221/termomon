import { GameState, BreedPreview, BreedResult, BreedableEntry, BreedPartnersView, BreedTable } from "../types";
/**
 * Calculate normalized inheritance probabilities for one slot.
 * Returns { chanceA, chanceB } where chanceA + chanceB = 1.
 */
export declare function calculateInheritance(speciesId: string, variantIdA: string, variantIdB: string): {
    chanceA: number;
    chanceB: number;
};
/**
 * Preview a breed: returns inheritance odds and energy cost without mutating state.
 */
export declare function previewBreed(state: GameState, parentAId: string, parentBId: string): BreedPreview;
/**
 * Execute a breed:
 * 1. Validate parents
 * 2. Check energy
 * 3. Resolve each slot via weighted random
 * 4. Build child creature
 * 5. Remove both parents, add child, spend energy
 */
export declare function executeBreed(state: GameState, parentAId: string, parentBId: string, rng?: () => number): BreedResult;
/**
 * List creatures from the collection that have at least one valid breeding partner
 * (same species, both non-archived, not themselves). Each entry uses a 1-indexed
 * position matching the creature's raw position in `state.collection`.
 */
export declare function listBreedable(state: GameState): BreedableEntry[];
/**
 * For a creature at the given 1-indexed collection position, return it and
 * its list of compatible (same-species, non-archived, non-self) partners with
 * each partner's 1-indexed collection position and the energy cost to breed.
 *
 * Throws on out-of-range or archived selection.
 */
export declare function listPartnersFor(state: GameState, creatureIndex: number): BreedPartnersView;
/**
 * Build the data for the /breed top-level view: creatures grouped by species,
 * only including species with >= 2 non-archived members. Each species entry
 * carries a "silhouette" (the slots of the first non-archived creature of that
 * species) which the renderer draws in a single neutral grey to the left of
 * the table.
 */
export declare function buildBreedTable(state: GameState): BreedTable;
//# sourceMappingURL=breed.d.ts.map