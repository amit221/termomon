"use strict";
// src/engine/batch.ts — Multi-species creature spawning
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickColor = pickColor;
exports.pickBatchSize = pickBatchSize;
exports.generateCreatureSlots = generateCreatureSlots;
exports.spawnBatch = spawnBatch;
exports.cleanupBatch = cleanupBatch;
const species_1 = require("../config/species");
const traits_1 = require("../config/traits");
const loader_1 = require("../config/loader");
const constants_1 = require("../config/constants");
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function pickColor(rng) {
    const config = (0, loader_1.loadConfig)();
    const weights = config.colors;
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng() * total;
    for (const [color, weight] of entries) {
        roll -= weight;
        if (roll <= 0)
            return color;
    }
    return entries[entries.length - 1][0];
}
function pickBatchSize(rng) {
    const roll = rng();
    if (roll < 0.4)
        return 3;
    if (roll < 0.8)
        return 4;
    return 5;
}
function generateCreatureSlots(speciesId, rng) {
    const species = (0, species_1.getSpeciesById)(speciesId);
    if (!species)
        throw new Error(`Unknown species: ${speciesId}`);
    const speciesSlots = Object.keys(species.traitPools);
    return speciesSlots.map((slotId) => {
        const trait = (0, species_1.pickTraitForSlot)(species, slotId, rng);
        const color = pickColor(rng);
        return { slotId, variantId: trait.id, color };
    });
}
/**
 * Spawn a batch of 3-5 creatures. No-op if a batch is already active.
 */
function spawnBatch(state, now, rng) {
    if (state.batch !== null && state.batch.attemptsRemaining > 0) {
        return [];
    }
    const batchSize = pickBatchSize(rng);
    const spawned = [];
    for (let i = 0; i < batchSize; i++) {
        const species = (0, species_1.pickSpecies)(rng);
        const creature = {
            id: generateId(),
            speciesId: species.id,
            name: (0, traits_1.loadCreatureName)(rng),
            slots: generateCreatureSlots(species.id, rng),
            spawnedAt: now,
        };
        spawned.push(creature);
    }
    state.nearby = spawned;
    state.batch = {
        attemptsRemaining: constants_1.SHARED_ATTEMPTS,
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
function cleanupBatch(state, now) {
    if (state.batch === null) {
        return [];
    }
    const elapsed = now - state.batch.spawnedAt;
    const timedOut = elapsed > constants_1.BATCH_LINGER_MS;
    const noAttemptsLeft = state.batch.attemptsRemaining === 0;
    if (timedOut || noAttemptsLeft) {
        const despawnedIds = state.nearby.map((c) => c.id);
        state.nearby = [];
        state.batch = null;
        return despawnedIds;
    }
    return [];
}
//# sourceMappingURL=batch.js.map