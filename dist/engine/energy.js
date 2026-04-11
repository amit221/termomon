"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENERGY_GAIN_INTERVAL_MS = exports.MAX_ENERGY = void 0;
exports.processEnergyGain = processEnergyGain;
exports.spendEnergy = spendEnergy;
const loader_1 = require("../config/loader");
const config = (0, loader_1.loadConfig)();
const ENERGY_GAIN_INTERVAL_MS = config.energy.gainIntervalMs;
exports.ENERGY_GAIN_INTERVAL_MS = ENERGY_GAIN_INTERVAL_MS;
const MAX_ENERGY = config.energy.maxEnergy;
exports.MAX_ENERGY = MAX_ENERGY;
function processEnergyGain(state, now) {
    const elapsed = now - state.lastEnergyGainAt;
    const intervals = Math.floor(elapsed / ENERGY_GAIN_INTERVAL_MS);
    if (intervals <= 0)
        return 0;
    const maxGain = MAX_ENERGY - state.energy;
    const gained = Math.min(intervals, maxGain);
    state.energy += gained;
    state.lastEnergyGainAt += intervals * ENERGY_GAIN_INTERVAL_MS;
    return gained;
}
function spendEnergy(state, amount) {
    if (state.energy < amount) {
        throw new Error(`Not enough energy: have ${state.energy}, need ${amount}`);
    }
    state.energy -= amount;
}
//# sourceMappingURL=energy.js.map