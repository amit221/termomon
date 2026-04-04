import * as fs from "fs";
import * as path from "path";
import { TraitDefinition, TraitSlotId, Rarity, CatalystSynergy } from "../types";

interface TraitJsonEntry {
  slot: TraitSlotId;
  id: string;
  name: string;
  rarity: Rarity;
  art: string;
  mergeModifier: { type: "stable" | "volatile" | "catalyst"; value: number };
}

interface TraitsConfig {
  raritySpawnWeights: Record<Rarity, number>;
  rarityCatchPenalty: Record<Rarity, number>;
  rarityEnergyValue: Record<Rarity, number>;
  traits: TraitJsonEntry[];
  synergies: CatalystSynergy[];
}

let _config: TraitsConfig | null = null;
let _allTraits: TraitDefinition[] = [];
let _bySlot: Map<TraitSlotId, TraitDefinition[]> = new Map();
let _byId: Map<string, TraitDefinition> = new Map();
let _slotById: Map<string, TraitSlotId> = new Map();

function ensureLoaded(): void {
  if (_config) return;
  const configPath = path.resolve(__dirname, "../../config/traits.json");
  _config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  _allTraits = _config!.traits.map((t) => ({
    id: t.id,
    name: t.name,
    rarity: t.rarity,
    art: t.art,
    mergeModifier: t.mergeModifier,
  }));
  _bySlot = new Map();
  _byId = new Map();
  _slotById = new Map();
  for (const entry of _config!.traits) {
    const def = _allTraits.find((d) => d.id === entry.id)!;
    if (!_bySlot.has(entry.slot)) _bySlot.set(entry.slot, []);
    _bySlot.get(entry.slot)!.push(def);
    _byId.set(def.id, def);
    _slotById.set(def.id, entry.slot);
  }
}

export function loadTraits(): TraitDefinition[] {
  ensureLoaded();
  return _allTraits;
}

export function getTraitsBySlot(slot: TraitSlotId): TraitDefinition[] {
  ensureLoaded();
  return _bySlot.get(slot) || [];
}

export function getTraitById(id: string): TraitDefinition | undefined {
  ensureLoaded();
  return _byId.get(id);
}

export function getTraitsByRarity(slot: TraitSlotId, rarity: Rarity): TraitDefinition[] {
  return getTraitsBySlot(slot).filter((t) => t.rarity === rarity);
}

export function getTraitSlot(id: string): TraitSlotId | undefined {
  ensureLoaded();
  return _slotById.get(id);
}

export function getSynergies(): CatalystSynergy[] {
  ensureLoaded();
  return _config!.synergies;
}

export function getRaritySpawnWeight(rarity: Rarity): number {
  ensureLoaded();
  return _config!.raritySpawnWeights[rarity];
}

export const RARITY_CATCH_PENALTY: Record<Rarity, number> = {
  common: 0.00, uncommon: 0.02, rare: 0.04, epic: 0.06,
  legendary: 0.08, mythic: 0.10, ancient: 0.12, void: 0.14,
};

export const RARITY_ENERGY_VALUE: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3,
  legendary: 4, mythic: 5, ancient: 6, void: 7,
};

export function _resetTraitsCache(): void {
  _config = null;
  _allTraits = [];
  _bySlot = new Map();
  _byId = new Map();
  _slotById = new Map();
}
