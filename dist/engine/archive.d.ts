import { GameState, ArchiveResult } from "../types";
/**
 * Move a creature from the active collection to the archive.
 * Sets archived=true on the creature. One-way operation.
 * Throws if the creature is not found in collection or is already archived.
 */
export declare function archiveCreature(state: GameState, creatureId: string): ArchiveResult;
/**
 * Permanently remove a creature from the collection (gone forever).
 * Throws if the creature is not found in collection.
 */
export declare function releaseCreature(state: GameState, creatureId: string): void;
/**
 * Returns true if the active (non-archived) collection has reached the cap.
 * The collection array only holds active creatures, so we check its length directly.
 */
export declare function isCollectionFull(state: GameState): boolean;
//# sourceMappingURL=archive.d.ts.map