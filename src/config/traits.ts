import * as fs from "fs";
import * as path from "path";
import { TraitVariant, SlotId, Rarity } from "../types";

interface SlotConfig {
  id: SlotId;
  variants: Record<Rarity, TraitVariant[]>;
}

interface TraitsConfig {
  raritySpawnWeights: Record<Rarity, number>;
  slots: Array<{
    id: SlotId;
    variants: Record<string, Array<{ id: string; name: string; art: string }>>;
  }>;
}

let _config: TraitsConfig | null = null;
let _slots: SlotConfig[] = [];
let _byId: Map<string, TraitVariant> = new Map();
let _slotForVariant: Map<string, SlotId> = new Map();

function ensureLoaded(): void {
  if (_config) return;
  const configPath = path.resolve(__dirname, "../../config/traits.json");
  _config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  _slots = [];
  _byId = new Map();
  _slotForVariant = new Map();

  for (const slotRaw of _config!.slots) {
    const variants: Record<string, TraitVariant[]> = {};
    for (const [rarity, variantList] of Object.entries(slotRaw.variants)) {
      variants[rarity] = variantList.map((v) => ({
        id: v.id,
        name: v.name,
        art: v.art,
      }));
      for (const v of variantList) {
        _byId.set(v.id, { id: v.id, name: v.name, art: v.art });
        _slotForVariant.set(v.id, slotRaw.id);
      }
    }
    _slots.push({ id: slotRaw.id, variants: variants as Record<Rarity, TraitVariant[]> });
  }
}

export function loadSlots(): SlotConfig[] {
  ensureLoaded();
  return _slots;
}

export function getVariantsBySlotAndRarity(slot: SlotId, rarity: Rarity): TraitVariant[] {
  ensureLoaded();
  const slotConfig = _slots.find((s) => s.id === slot);
  return slotConfig?.variants[rarity] ?? [];
}

export function getVariantById(id: string): TraitVariant | undefined {
  ensureLoaded();
  return _byId.get(id);
}

export function getSlotForVariant(id: string): SlotId | undefined {
  ensureLoaded();
  return _slotForVariant.get(id);
}

export function getRaritySpawnWeight(rarity: Rarity): number {
  ensureLoaded();
  return _config!.raritySpawnWeights[rarity];
}

export function loadCreatureName(rng: () => number): string {
  const namesPath = path.resolve(__dirname, "../../config/names.json");
  const data = JSON.parse(fs.readFileSync(namesPath, "utf-8"));
  const names: string[] = data.names;
  return names[Math.floor(rng() * names.length)];
}

export function _resetTraitsCache(): void {
  _config = null;
  _slots = [];
  _byId = new Map();
  _slotForVariant = new Map();
}
