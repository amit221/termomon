import { GameState, DiscoveryResult } from "../types";
import { loadConfig } from "../config/loader";
import { grantXp } from "./progression";

/**
 * Record a species discovery (on first catch).
 * Returns DiscoveryResult with isNew=true and bonus XP if it's the first time.
 */
export function recordDiscovery(
  state: GameState,
  speciesId: string
): DiscoveryResult {
  const config = loadConfig();

  if (state.discoveredSpecies.includes(speciesId)) {
    return {
      speciesId,
      isNew: false,
      bonusXp: 0,
      totalDiscovered: state.discoveredSpecies.length,
    };
  }

  state.discoveredSpecies.push(speciesId);
  const bonusXp = config.leveling.xpDiscoveryBonus;
  grantXp(state, bonusXp);

  return {
    speciesId,
    isNew: true,
    bonusXp,
    totalDiscovered: state.discoveredSpecies.length,
  };
}

/**
 * Check if a species has been discovered.
 */
export function isSpeciesDiscovered(state: GameState, speciesId: string): boolean {
  return state.discoveredSpecies.includes(speciesId);
}

/**
 * Get total number of discovered species.
 */
export function getDiscoveryCount(state: GameState): number {
  return state.discoveredSpecies.length;
}
