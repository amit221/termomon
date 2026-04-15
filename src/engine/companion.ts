import {
  GameState,
  CompanionOverview,
  NearbyHighlight,
  BreedablePair,
} from "../types";
import { getProgressInfo, getSuggestedActions } from "./advisor";
import { calculateCatchRate, calculateEnergyCost } from "./catch";
export function getCompanionOverview(state: GameState): CompanionOverview {
  const progress = getProgressInfo(state);
  const suggestedActions = getSuggestedActions("companion", null, state);

  // --- Nearby highlights ---
  const nearbyHighlights: NearbyHighlight[] = state.nearby.map((creature, i) => {
    const totalRarity = creature.slots.reduce((sum, slot) => sum + (slot.rarity ?? 0), 0);
    return {
      index: i + 1,
      name: creature.name,
      speciesId: creature.speciesId,
      isNewSpecies: !state.discoveredSpecies.includes(creature.speciesId),
      catchRate: calculateCatchRate(creature.speciesId, creature.slots, state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.speciesId, creature.slots),
      totalRarity,
    };
  });

  // --- Breedable pairs ---
  const breedablePairs: BreedablePair[] = [];
  const nonArchived = state.collection
    .map((c, i) => ({ creature: c, index: i }))
    .filter(({ creature }) => !creature.archived);

  if (nonArchived.length >= 2) {
    // Show up to 3 pairs with highest combined rarity
    const pairs: { a: number; b: number; score: number }[] = [];
    for (let i = 0; i < nonArchived.length; i++) {
      for (let j = i + 1; j < nonArchived.length; j++) {
        const scoreA = nonArchived[i].creature.slots.reduce((s, sl) => s + (sl.rarity ?? 0), 0);
        const scoreB = nonArchived[j].creature.slots.reduce((s, sl) => s + (sl.rarity ?? 0), 0);
        pairs.push({ a: i, b: j, score: scoreA + scoreB });
      }
    }
    pairs.sort((a, b) => b.score - a.score);

    for (const pair of pairs.slice(0, 3)) {
      const ca = nonArchived[pair.a];
      const cb = nonArchived[pair.b];
      breedablePairs.push({
        indexA: ca.index + 1,
        nameA: ca.creature.name,
        indexB: cb.index + 1,
        nameB: cb.creature.name,
        speciesId: ca.creature.speciesId === cb.creature.speciesId
          ? ca.creature.speciesId
          : `${ca.creature.speciesId}×${cb.creature.speciesId}`,
      });
    }
  }

  return {
    progress,
    nearbyHighlights,
    breedablePairs,
    suggestedActions,
  };
}
