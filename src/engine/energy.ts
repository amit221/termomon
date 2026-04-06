import { GameState, CreatureSlot, Rarity, RARITY_ORDER } from "../types";
import {
  ENERGY_GAIN_INTERVAL_MS,
  MAX_ENERGY,
  ENERGY_COST_PER_RARITY,
} from "../config/constants";

/**
 * Calculate energy cost from a creature's 4 slots.
 * Uses the average rarity index to look up cost from ENERGY_COST_PER_RARITY.
 */
export function calculateEnergyCost(slots: CreatureSlot[]): number {
  if (slots.length === 0) return 1;

  const totalIndex = slots.reduce((sum, s) => sum + RARITY_ORDER.indexOf(s.rarity), 0);
  const avgIndex = Math.round(totalIndex / slots.length);
  const avgRarity: Rarity = RARITY_ORDER[Math.min(avgIndex, RARITY_ORDER.length - 1)];

  return ENERGY_COST_PER_RARITY[avgRarity] ?? 1;
}

export function processEnergyGain(state: GameState, now: number): number {
  const elapsed = now - state.lastEnergyGainAt;
  const intervals = Math.floor(elapsed / ENERGY_GAIN_INTERVAL_MS);
  if (intervals <= 0) return 0;
  const maxGain = MAX_ENERGY - state.energy;
  const gained = Math.min(intervals, maxGain);
  state.energy += gained;
  state.lastEnergyGainAt += intervals * ENERGY_GAIN_INTERVAL_MS;
  return gained;
}

export function spendEnergy(state: GameState, amount: number): void {
  if (state.energy < amount) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${amount}`);
  }
  state.energy -= amount;
}

export { MAX_ENERGY, ENERGY_GAIN_INTERVAL_MS };
