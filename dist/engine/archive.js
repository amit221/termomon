"use strict";
// src/engine/archive.ts — archive and collection cap logic
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveCreature = archiveCreature;
exports.releaseCreature = releaseCreature;
exports.isCollectionFull = isCollectionFull;
const types_1 = require("../types");
/**
 * Move a creature from the active collection to the archive.
 * Sets archived=true on the creature. One-way operation.
 * Throws if the creature is not found in collection or is already archived.
 */
function archiveCreature(state, creatureId) {
    const index = state.collection.findIndex((c) => c.id === creatureId);
    if (index === -1) {
        throw new Error(`Creature not found in collection: ${creatureId}`);
    }
    const creature = state.collection[index];
    if (creature.archived) {
        throw new Error(`Creature is already archived: ${creatureId}`);
    }
    // Remove from collection
    state.collection.splice(index, 1);
    // Mark archived and push to archive
    creature.archived = true;
    state.archive.push(creature);
    return { creature };
}
/**
 * Permanently remove a creature from the collection (gone forever).
 * Throws if the creature is not found in collection.
 */
function releaseCreature(state, creatureId) {
    const index = state.collection.findIndex((c) => c.id === creatureId);
    if (index === -1) {
        throw new Error(`Creature not found in collection: ${creatureId}`);
    }
    state.collection.splice(index, 1);
}
/**
 * Returns true if the active (non-archived) collection has reached the cap.
 * The collection array only holds active creatures, so we check its length directly.
 */
function isCollectionFull(state) {
    return state.collection.length >= types_1.MAX_COLLECTION_SIZE;
}
//# sourceMappingURL=archive.js.map