import { GameState, NearbyCreature, CreatureSlot, CreatureColor } from "../types";
export declare function pickColor(rng: () => number): CreatureColor;
export declare function pickBatchSize(rng: () => number): number;
export declare function generateCreatureSlots(speciesId: string, rng: () => number): CreatureSlot[];
/**
 * Spawn a batch of 3-5 creatures. No-op if a batch is already active.
 */
export declare function spawnBatch(state: GameState, now: number, rng: () => number): NearbyCreature[];
/**
 * Clean up batch and nearby creatures when:
 * - Batch timed out (>30min)
 * - No attempts remaining
 */
export declare function cleanupBatch(state: GameState, now: number): string[];
//# sourceMappingURL=batch.d.ts.map