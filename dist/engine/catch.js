"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCatchRate = calculateCatchRate;
exports.calculateXpEarned = calculateXpEarned;
exports.calculateEnergyCost = calculateEnergyCost;
exports.attemptCatch = attemptCatch;
const species_1 = require("../config/species");
const loader_1 = require("../config/loader");
const energy_1 = require("./energy");
/**
 * Calculate the catch rate based on the rarest trait's spawn rate across all slots.
 *
 * Formula:
 *   rarest_trait = min(spawn_rate) across all slots
 *   catch_rate = baseCatchRate - (difficultyScale * (1 - rarest_trait / maxTraitSpawnRate)) - failPenalty
 *   clamped to [minCatchRate, maxCatchRate]
 */
function calculateCatchRate(speciesId, slots, failPenalty) {
    const config = (0, loader_1.loadConfig)();
    const { baseCatchRate, minCatchRate, maxCatchRate, maxTraitSpawnRate, difficultyScale } = config.catching;
    // Find rarest trait spawn rate
    let rarestRate = maxTraitSpawnRate;
    for (const slot of slots) {
        const trait = (0, species_1.getTraitDefinition)(speciesId, slot.variantId);
        if (trait && trait.spawnRate < rarestRate) {
            rarestRate = trait.spawnRate;
        }
    }
    const rate = baseCatchRate - (difficultyScale * (1 - rarestRate / maxTraitSpawnRate)) - failPenalty;
    return Math.max(minCatchRate, Math.min(maxCatchRate, rate));
}
/**
 * Calculate XP earned from catching a creature.
 * Base XP + bonus per rare trait (spawn rate < 0.05).
 */
function calculateXpEarned(speciesId, slots) {
    const config = (0, loader_1.loadConfig)();
    let rareCount = 0;
    for (const slot of slots) {
        const trait = (0, species_1.getTraitDefinition)(speciesId, slot.variantId);
        if (trait && trait.spawnRate < 0.05)
            rareCount++;
    }
    return config.catching.xpBase + rareCount * config.catching.xpRarityMultiplier;
}
/**
 * Calculate energy cost to attempt catching a creature.
 * 1 + count of rare traits (spawn rate < 0.05), capped at 5.
 */
function calculateEnergyCost(speciesId, slots) {
    let rareCount = 0;
    for (const slot of slots) {
        const trait = (0, species_1.getTraitDefinition)(speciesId, slot.variantId);
        if (trait && trait.spawnRate < 0.05)
            rareCount++;
    }
    return Math.min(1 + rareCount, 5);
}
/**
 * Attempt to catch a nearby creature.
 *
 * Throws if: no active batch, no attempts remaining, invalid index, insufficient energy.
 *
 * On success: removes creature from nearby, adds to collection (generation=0, archived=false), grants XP.
 * On failure: increments failPenalty.
 * Always: spends energy, decrements attemptsRemaining.
 */
function attemptCatch(state, nearbyIndex, rng = Math.random) {
    const config = (0, loader_1.loadConfig)();
    if (!state.batch) {
        throw new Error("No active batch");
    }
    if (state.batch.attemptsRemaining <= 0) {
        throw new Error("No attempts remaining");
    }
    if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) {
        throw new Error("Invalid creature index");
    }
    const nearby = state.nearby[nearbyIndex];
    const energyCost = calculateEnergyCost(nearby.speciesId, nearby.slots);
    if (state.energy < energyCost) {
        throw new Error(`Not enough energy: have ${state.energy}, need ${energyCost}`);
    }
    (0, energy_1.spendEnergy)(state, energyCost);
    state.batch.attemptsRemaining--;
    const catchRate = calculateCatchRate(nearby.speciesId, nearby.slots, state.batch.failPenalty);
    const roll = rng();
    const success = roll < catchRate;
    let xpEarned = 0;
    if (success) {
        state.nearby.splice(nearbyIndex, 1);
        xpEarned = calculateXpEarned(nearby.speciesId, nearby.slots);
        const collectionCreature = {
            id: nearby.id,
            speciesId: nearby.speciesId,
            name: nearby.name,
            slots: nearby.slots,
            caughtAt: Date.now(),
            generation: 0,
            archived: false,
        };
        state.collection.push(collectionCreature);
        state.profile.xp += xpEarned;
        state.profile.totalCatches++;
    }
    else {
        state.batch.failPenalty += config.catching.failPenaltyPerMiss;
    }
    return {
        success,
        creature: nearby,
        energySpent: energyCost,
        fled: false,
        xpEarned,
        attemptsRemaining: state.batch.attemptsRemaining,
        failPenalty: state.batch.failPenalty,
    };
}
//# sourceMappingURL=catch.js.map