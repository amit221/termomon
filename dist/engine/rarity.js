"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTraitRarityScore = calculateTraitRarityScore;
exports.calculateColorRarityScore = calculateColorRarityScore;
exports.calculateSlotScore = calculateSlotScore;
exports.calculateCreatureScore = calculateCreatureScore;
const species_1 = require("../config/species");
const loader_1 = require("../config/loader");
/**
 * Ranks a trait's spawnRate within all traits for that species+slot.
 * Pool is sorted by spawnRate descending (most common first).
 * index 0 → score 1 (most common), last index → score 100 (rarest).
 * Formula: (index / (poolSize - 1)) * 99 + 1
 * Returns 50 for single-trait pools or unknown species/slot/variant.
 */
function calculateTraitRarityScore(speciesId, slotId, variantId) {
    const species = (0, species_1.getSpeciesById)(speciesId);
    if (!species)
        return 50;
    const pool = species.traitPools[slotId];
    if (!pool || pool.length === 0)
        return 50;
    if (pool.length === 1)
        return 50;
    // Sort descending by spawnRate (most common first → index 0)
    const sorted = [...pool].sort((a, b) => b.spawnRate - a.spawnRate);
    const index = sorted.findIndex((t) => t.id === variantId);
    if (index === -1)
        return 50;
    return (index / (sorted.length - 1)) * 99 + 1;
}
/**
 * Ranks a color's weight among all colors from balance.json.
 * Sorted by weight descending. Same formula as trait score.
 */
function calculateColorRarityScore(color) {
    const config = (0, loader_1.loadConfig)();
    const colorMap = config.colors;
    const entries = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
    if (entries.length <= 1)
        return 50;
    const index = entries.findIndex(([name]) => name === color);
    if (index === -1)
        return 50;
    return (index / (entries.length - 1)) * 99 + 1;
}
/**
 * Combined slot score: 80% trait rarity + 20% color rarity.
 */
function calculateSlotScore(speciesId, slot) {
    const traitScore = calculateTraitRarityScore(speciesId, slot.slotId, slot.variantId);
    const colorScore = calculateColorRarityScore(slot.color);
    return 0.8 * traitScore + 0.2 * colorScore;
}
/**
 * Average of all slot scores, rounded to nearest integer.
 * Returns 50 for empty slots.
 */
function calculateCreatureScore(speciesId, slots) {
    if (slots.length === 0)
        return 50;
    const total = slots.reduce((sum, slot) => sum + calculateSlotScore(speciesId, slot), 0);
    return Math.round(total / slots.length);
}
//# sourceMappingURL=rarity.js.map