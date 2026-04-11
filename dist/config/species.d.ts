import { SpeciesDefinition, TraitDefinition, SlotId } from "../types";
export declare function loadSpecies(): SpeciesDefinition[];
export declare function getSpeciesById(id: string): SpeciesDefinition | undefined;
export declare function getAllSpecies(): SpeciesDefinition[];
export declare function pickSpecies(rng: () => number): SpeciesDefinition;
export declare function pickTraitForSlot(species: SpeciesDefinition, slotId: SlotId, rng: () => number): TraitDefinition;
export declare function getTraitDefinition(speciesId: string, variantId: string): TraitDefinition | undefined;
export declare function _resetSpeciesCache(): void;
//# sourceMappingURL=species.d.ts.map