import {
  GameState,
  CompanionOverview,
  NearbyHighlight,
  BreedablePair,
} from "../types";
import { getProgressInfo, getSuggestedActions } from "./advisor";
import { calculateCatchRate, calculateEnergyCost } from "./catch";
import { calculateSlotScore } from "./rarity";

export function getCompanionOverview(state: GameState): CompanionOverview {
  const progress = getProgressInfo(state);
  const suggestedActions = getSuggestedActions("companion", null, state);

  // --- Nearby highlights ---
  const nearbyHighlights: NearbyHighlight[] = state.nearby.map((creature, i) => {
    const totalRarity = creature.slots.reduce((sum, slot) => {
      return sum + calculateSlotScore(creature.speciesId, slot);
    }, 0);
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
  const speciesGroups: Record<string, number[]> = {};
  for (let i = 0; i < state.collection.length; i++) {
    const c = state.collection[i];
    if (c.archived) continue;
    if (!speciesGroups[c.speciesId]) speciesGroups[c.speciesId] = [];
    speciesGroups[c.speciesId].push(i);
  }
  for (const [speciesId, indexes] of Object.entries(speciesGroups)) {
    if (indexes.length < 2) continue;
    const a = indexes[0];
    const b = indexes[1];
    breedablePairs.push({
      indexA: a + 1,
      nameA: state.collection[a].name,
      indexB: b + 1,
      nameB: state.collection[b].name,
      speciesId,
    });
  }

  return {
    progress,
    nearbyHighlights,
    breedablePairs,
    suggestedActions,
  };
}
