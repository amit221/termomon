# Catch Risk/Reward Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the species-based collection system with a trait-based single-creature system featuring energy economy, batch spawning with shared attempts, escalating failure penalty, and a merge system with mutation.

**Architecture:** All engine modules remain pure functions with injected RNG. New `traits.ts` config module loads 300 traits from a `traits.json` config file. Existing engine files (catch, spawn, evolution, inventory) are rewritten — not patched — since the core data model changes fundamentally. State migration handles existing save files.

**Tech Stack:** TypeScript, Jest (ts-jest), existing config loader pattern, existing renderer pattern.

**Spec:** `docs/superpowers/specs/2026-04-04-catch-risk-reward-design.md`
**Trait Data:** `docs/superpowers/specs/2026-04-04-catch-traits-reference.csv`

**Scope:** This plan covers Phase 1 (trait system, energy, batch catching) and Phase 2 (merging). Phase 3 (axolotl art) and Phase 4 (polish/balance) are separate plans.

---

## File Map

### New Files
- `config/traits.json` — All 300 trait definitions + synergy pairs + rarity weights
- `src/config/traits.ts` — Trait loader, lookup maps, rarity constants
- `src/engine/energy.ts` — Energy gain/spend logic
- `src/engine/merge.ts` — Merge success, trait inheritance, mutation
- `src/engine/batch.ts` — Batch spawning with shared attempts
- `tests/engine/energy.test.ts`
- `tests/engine/merge.test.ts`
- `tests/engine/batch.test.ts`
- `tests/config/traits.test.ts`

### Modified Files
- `src/types.ts` — New Rarity tiers, Trait types, rewritten GameState/NearbyCreature/CollectionEntry
- `src/config/constants.ts` — New balance constants (energy, batch, merge, mutation)
- `src/config/loader.ts` — Load traits.json alongside balance.json
- `src/engine/game-engine.ts` — Rewire to use batch/energy/merge instead of old catch/spawn/evolution
- `src/engine/catch.ts` — Rewrite for energy cost + shared attempts + escalating penalty
- `src/engine/spawn.ts` — Rewrite for batch spawning with trait generation
- `src/engine/ticks.ts` — Add energy drip to tick processing
- `src/renderers/simple-text.ts` — Rewrite scan/catch/collection/inventory/status renders for traits
- `src/cli.ts` — Add merge command, update catch (remove item arg), update inventory
- `src/mcp-server.ts` — Add merge tool, update existing tools
- `src/index.ts` — Export new modules
- `src/state/state-manager.ts` — Add migration for old state → new state
- `config/balance.json` — Replace spawning/catching/rewards sections

### Removed (code deleted, not files)
- `src/engine/evolution.ts` — Replaced by merge.ts
- `src/engine/inventory.ts` — Energy replaces item drip; milestones stay but give energy
- `src/config/creatures.ts` — Single creature type, no species map needed
- `src/config/items.ts` — Single energy resource, no item definitions

### Test Files Updated
- All existing test files need updates to match new types/signatures
- Old evolution/inventory tests replaced by merge/energy tests

---

## Task 1: Update Types

**Files:**
- Modify: `src/types.ts`
- Test: `npm run build` (type-check only, no runtime tests yet)

- [ ] **Step 1: Rewrite the Rarity type and add trait types**

Replace the entire `src/types.ts` with the new type system. Key changes:
- Rarity expands from 5 to 8 tiers
- New TraitSlotId, TraitDefinition, CreatureTrait, MergeModifierType types
- NearbyCreature gets traits + batch fields
- CollectionEntry becomes individual creature instances with traits
- GameState gets energy, batch state
- New MergeResult type
- Remove CreatureDefinition (replaced by trait-based system)
- Remove ItemDefinition (replaced by energy)
- Remove evolution-related types

```typescript
// src/types.ts

// --- Rarity (8 tiers, pyramid distribution) ---

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic" | "ancient" | "void";

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "ancient", "void"];

export const RARITY_STARS: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  ancient: 7,
  void: 8,
};

// --- Traits ---

export type TraitSlotId = "eyes" | "mouth" | "tail" | "gills" | "pattern" | "aura";

export const TRAIT_SLOTS: TraitSlotId[] = ["eyes", "mouth", "tail", "gills", "pattern", "aura"];

export type MergeModifierType = "stable" | "volatile" | "catalyst";

export interface MergeModifier {
  type: MergeModifierType;
  value: number;
}

export interface TraitDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  art: string;
  mergeModifier: MergeModifier;
}

export interface TraitSlotConfig {
  slotId: TraitSlotId;
  variants: TraitDefinition[];
}

export interface CatalystSynergy {
  traitA: string;  // trait id
  traitB: string;  // trait id
  bonus: number;
}

export interface CreatureTrait {
  slotId: TraitSlotId;
  traitId: string;
  rarity: Rarity;
  mergeModifier: MergeModifier;
}

// --- Creature Art Template ---

export interface CreatureArtTemplate {
  lines: string[];       // Template lines with {eyes}, {mouth}, {tail}, {gills}, {pattern}, {aura} placeholders
}

// --- Time ---

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// --- Game State ---

export interface Tick {
  timestamp: number;
  sessionId?: string;
  eventType?: string;
}

export interface NearbyCreature {
  id: string;             // unique instance id
  traits: CreatureTrait[];
  spawnedAt: number;
}

export interface CollectionCreature {
  id: string;             // unique instance id
  traits: CreatureTrait[];
  caughtAt: number;
  generation: number;     // 0 = wild-caught, increments on merge
  mergedFrom?: [string, string];  // parent ids (for lineage)
}

export interface BatchState {
  attemptsRemaining: number;
  failPenalty: number;    // accumulated catch rate penalty
  spawnedAt: number;      // when this batch was created
}

export interface PlayerProfile {
  level: number;
  xp: number;
  totalCatches: number;
  totalMerges: number;
  totalTicks: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface GameSettings {
  renderer: "simple" | "rich" | "browser" | "terminal";
  notificationLevel: "minimal" | "moderate" | "off";
}

export interface GameState {
  version: number;
  profile: PlayerProfile;
  collection: CollectionCreature[];
  energy: number;
  lastEnergyGainAt: number;
  nearby: NearbyCreature[];
  batch: BatchState | null;
  recentTicks: Tick[];
  claimedMilestones: string[];
  settings: GameSettings;
}

// --- Engine Results ---

export interface Notification {
  message: string;
  level: "minimal" | "moderate";
}

export interface ScanEntry {
  index: number;
  creature: NearbyCreature;
  catchRate: number;
  energyCost: number;
}

export interface ScanResult {
  nearby: ScanEntry[];
  energy: number;
  batch: BatchState | null;
}

export interface CatchResult {
  success: boolean;
  creature: NearbyCreature;
  energySpent: number;
  fled: boolean;
  xpEarned: number;
  attemptsRemaining: number;
  failPenalty: number;
}

export interface MergeResult {
  success: boolean;
  parentA: CollectionCreature;
  parentB: CollectionCreature;
  child: CollectionCreature | null;  // null if merge failed
  mergeRate: number;
  synergyBonuses: CatalystSynergy[];
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  energy: number;
  nearbyCount: number;
  batchAttemptsRemaining: number;
}

export interface TickResult {
  notifications: Notification[];
  spawned: boolean;
  energyGained: number;
  despawned: string[];
}

// --- Renderer Interface ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderMerge(result: MergeResult): string;
  renderCollection(collection: CollectionCreature[]): string;
  renderEnergy(energy: number, maxEnergy: number): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types.ts`
Expected: Passes (types only, no imports to break). Other files will fail — that's expected, we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): rewrite type system for trait-based creatures

- 8 rarity tiers (common → void)
- 6 trait slots with merge modifiers
- Energy replaces items
- Batch state for shared attempts
- CollectionCreature replaces CollectionEntry
- MergeResult type for merge system
- Remove species-based types"
```

---

## Task 2: Trait Config & Loader

**Files:**
- Create: `config/traits.json`
- Create: `src/config/traits.ts`
- Create: `tests/config/traits.test.ts`

- [ ] **Step 1: Write failing tests for trait loader**

```typescript
// tests/config/traits.test.ts
import {
  loadTraits,
  getTraitsBySlot,
  getTraitById,
  getTraitsByRarity,
  getSynergies,
  getRaritySpawnWeight,
  RARITY_CATCH_PENALTY,
  RARITY_ENERGY_VALUE,
} from "../../src/config/traits";

describe("loadTraits", () => {
  test("loads all 300 traits across 6 slots", () => {
    const traits = loadTraits();
    expect(traits.length).toBe(300);
  });

  test("each slot has 50 traits", () => {
    const slots = ["eyes", "mouth", "tail", "gills", "pattern", "aura"];
    for (const slot of slots) {
      const slotTraits = getTraitsBySlot(slot as any);
      expect(slotTraits.length).toBe(50);
    }
  });

  test("pyramid distribution per slot: 16/10/8/5/4/3/2/2", () => {
    const expected: Record<string, number> = {
      common: 16, uncommon: 10, rare: 8, epic: 5,
      legendary: 4, mythic: 3, ancient: 2, void: 2,
    };
    const slotTraits = getTraitsBySlot("eyes");
    for (const [rarity, count] of Object.entries(expected)) {
      const filtered = slotTraits.filter(t => t.rarity === rarity);
      expect(filtered.length).toBe(count);
    }
  });

  test("getTraitById returns correct trait", () => {
    const trait = getTraitById("eye_c01");
    expect(trait).toBeDefined();
    expect(trait!.name).toBe("Pebble Gaze");
    expect(trait!.rarity).toBe("common");
  });

  test("getTraitById returns undefined for unknown id", () => {
    expect(getTraitById("nonexistent")).toBeUndefined();
  });

  test("getTraitsByRarity returns traits of that rarity for a slot", () => {
    const rareEyes = getTraitsByRarity("eyes", "rare");
    expect(rareEyes.length).toBe(8);
    for (const t of rareEyes) {
      expect(t.rarity).toBe("rare");
    }
  });

  test("synergies are loaded", () => {
    const synergies = getSynergies();
    expect(synergies.length).toBeGreaterThan(20);
    for (const s of synergies) {
      expect(s.traitA).toBeDefined();
      expect(s.traitB).toBeDefined();
      expect(s.bonus).toBeGreaterThan(0);
    }
  });

  test("rarity spawn weights sum to 1", () => {
    const rarities = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "ancient", "void"] as const;
    const sum = rarities.reduce((s, r) => s + getRaritySpawnWeight(r), 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  test("RARITY_CATCH_PENALTY has correct values", () => {
    expect(RARITY_CATCH_PENALTY.common).toBe(0.00);
    expect(RARITY_CATCH_PENALTY.uncommon).toBe(0.02);
    expect(RARITY_CATCH_PENALTY.rare).toBe(0.04);
    expect(RARITY_CATCH_PENALTY.void).toBe(0.14);
  });

  test("RARITY_ENERGY_VALUE has correct values", () => {
    expect(RARITY_ENERGY_VALUE.common).toBe(0);
    expect(RARITY_ENERGY_VALUE.uncommon).toBe(1);
    expect(RARITY_ENERGY_VALUE.void).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/config/traits.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Convert CSV to traits.json**

Write a one-off script to convert the CSV to JSON, then save as `config/traits.json`:

```bash
node -e "
const fs = require('fs');
const csv = fs.readFileSync('docs/superpowers/specs/2026-04-04-catch-traits-reference.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());

const traits = [];
const synergies = [];
let section = 'traits';

for (const line of lines) {
  if (line.startsWith('slot,trait_id')) { section = 'traits'; continue; }
  if (line.includes('Sheet: Rarity')) { section = 'rarity'; continue; }
  if (line.includes('Sheet: Catalyst')) { section = 'synergy'; continue; }
  if (line.includes('Sheet:')) { section = 'skip'; continue; }
  if (section === 'skip') continue;

  const cols = line.split(',');

  if (section === 'traits' && cols.length >= 7 && cols[0].match(/^(eyes|mouth|tail|gills|pattern|aura)$/)) {
    traits.push({
      slot: cols[0],
      id: cols[1],
      name: cols[2],
      rarity: cols[3],
      art: cols[4],
      mergeModifier: { type: cols[5], value: parseFloat(cols[6]) }
    });
  }

  if (section === 'synergy' && cols.length >= 4 && !cols[0].startsWith('Trait') && !cols[0].startsWith('Note')) {
    const a = cols[0].match(/\(([^)]+)\)/);
    const b = cols[1].match(/\(([^)]+)\)/);
    if (a && b) {
      synergies.push({ traitA: a[1], traitB: b[1], bonus: parseFloat(cols[2]) });
    }
  }
}

const config = {
  raritySpawnWeights: {
    common: 0.30, uncommon: 0.22, rare: 0.17, epic: 0.13,
    legendary: 0.08, mythic: 0.05, ancient: 0.03, void: 0.02
  },
  rarityCatchPenalty: {
    common: 0.00, uncommon: 0.02, rare: 0.04, epic: 0.06,
    legendary: 0.08, mythic: 0.10, ancient: 0.12, void: 0.14
  },
  rarityEnergyValue: {
    common: 0, uncommon: 1, rare: 2, epic: 3,
    legendary: 4, mythic: 5, ancient: 6, void: 7
  },
  traits,
  synergies
};

fs.writeFileSync('config/traits.json', JSON.stringify(config, null, 2));
console.log('Traits:', traits.length, 'Synergies:', synergies.length);
"
```

Verify: `node -e "const t = require('./config/traits.json'); console.log('traits:', t.traits.length, 'synergies:', t.synergies.length)"`
Expected: `traits: 300 synergies: 30` (approximately)

- [ ] **Step 4: Implement trait loader**

```typescript
// src/config/traits.ts
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

function ensureLoaded(): void {
  if (_config) return;
  const configPath = path.join(__dirname, "../../config/traits.json");
  _config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  _allTraits = _config!.traits.map((t) => ({
    id: t.id,
    name: t.name,
    rarity: t.rarity,
    art: t.art,
    mergeModifier: t.mergeModifier,
  }));
  _bySlot = new Map();
  _byId = new Map();
  for (const entry of _config!.traits) {
    const def = _allTraits.find((d) => d.id === entry.id)!;
    if (!_bySlot.has(entry.slot)) _bySlot.set(entry.slot, []);
    _bySlot.get(entry.slot)!.push(def);
    _byId.set(def.id, def);
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
```

- [ ] **Step 5: Run tests**

Run: `npx jest tests/config/traits.test.ts`
Expected: PASS (or minor fixes needed based on actual CSV data)

- [ ] **Step 6: Commit**

```bash
git add config/traits.json src/config/traits.ts tests/config/traits.test.ts
git commit -m "feat(config): add trait system with 300 traits across 6 slots

- config/traits.json: 300 trait definitions + synergy pairs
- src/config/traits.ts: loader with lookup maps
- Pyramid distribution: 16/10/8/5/4/3/2/2 per rarity
- 8 rarity tiers with spawn weights, catch penalties, energy values"
```

---

## Task 3: Energy System

**Files:**
- Create: `src/engine/energy.ts`
- Create: `tests/engine/energy.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/energy.test.ts
import { calculateEnergyCost, processEnergyGain, spendEnergy, canAfford } from "../../src/engine/energy";
import { GameState, CreatureTrait } from "../../src/types";

function makeTraits(rarities: string[]): CreatureTrait[] {
  return rarities.map((r, i) => ({
    slotId: ["eyes", "mouth", "tail", "gills", "pattern", "aura"][i] as any,
    traitId: `test_${r}_${i}`,
    rarity: r as any,
    mergeModifier: { type: "stable" as const, value: 0.05 },
  }));
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("calculateEnergyCost", () => {
  test("all common = 1 energy", () => {
    const traits = makeTraits(["common", "common", "common", "common", "common", "common"]);
    expect(calculateEnergyCost(traits)).toBe(1);
  });

  test("4 common + 2 uncommon = 3 energy", () => {
    const traits = makeTraits(["common", "common", "common", "common", "uncommon", "uncommon"]);
    expect(calculateEnergyCost(traits)).toBe(3);
  });

  test("6 void = 43 energy", () => {
    const traits = makeTraits(["void", "void", "void", "void", "void", "void"]);
    expect(calculateEnergyCost(traits)).toBe(43);
  });

  test("mixed traits", () => {
    const traits = makeTraits(["common", "common", "uncommon", "uncommon", "rare", "epic"]);
    // 0 + 0 + 1 + 1 + 2 + 3 = 7, +1 = 8
    expect(calculateEnergyCost(traits)).toBe(8);
  });
});

describe("processEnergyGain", () => {
  test("gains 1 energy when 30 min have passed", () => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: thirtyMinAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(1);
    expect(state.energy).toBe(6);
  });

  test("gains multiple energy for multiple intervals", () => {
    const twoHoursAgo = Date.now() - 120 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: twoHoursAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(4); // 120 / 30 = 4
    expect(state.energy).toBe(9);
  });

  test("caps at max energy (30)", () => {
    const twoHoursAgo = Date.now() - 120 * 60 * 1000;
    const state = makeState({ energy: 28, lastEnergyGainAt: twoHoursAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(state.energy).toBe(30);
    expect(gained).toBe(2);
  });

  test("no gain if interval not reached", () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: fiveMinAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(0);
    expect(state.energy).toBe(5);
  });
});

describe("spendEnergy", () => {
  test("deducts energy from state", () => {
    const state = makeState({ energy: 10 });
    spendEnergy(state, 3);
    expect(state.energy).toBe(7);
  });

  test("throws if insufficient energy", () => {
    const state = makeState({ energy: 2 });
    expect(() => spendEnergy(state, 5)).toThrow();
  });
});

describe("canAfford", () => {
  test("returns true when enough energy", () => {
    expect(canAfford(10, 5)).toBe(true);
  });

  test("returns false when not enough", () => {
    expect(canAfford(2, 5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/energy.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement energy module**

```typescript
// src/engine/energy.ts
import { GameState, CreatureTrait, Rarity } from "../types";
import { RARITY_ENERGY_VALUE } from "../config/traits";

const ENERGY_GAIN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENERGY = 30;

export function calculateEnergyCost(traits: CreatureTrait[]): number {
  const sum = traits.reduce((s, t) => s + RARITY_ENERGY_VALUE[t.rarity], 0);
  return 1 + sum;
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

export function canAfford(currentEnergy: number, cost: number): boolean {
  return currentEnergy >= cost;
}

export { MAX_ENERGY, ENERGY_GAIN_INTERVAL_MS };
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/engine/energy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/energy.ts tests/engine/energy.test.ts
git commit -m "feat(engine): add energy system — gain, spend, cost calculation"
```

---

## Task 4: Batch Spawning With Trait Generation

**Files:**
- Create: `src/engine/batch.ts`
- Create: `tests/engine/batch.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/batch.test.ts
import { spawnBatch, generateCreatureTraits, cleanupBatch } from "../../src/engine/batch";
import { GameState, NearbyCreature, BatchState, Rarity } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("generateCreatureTraits", () => {
  test("generates 6 traits", () => {
    const traits = generateCreatureTraits(() => 0.5);
    expect(traits).toHaveLength(6);
    const slots = traits.map(t => t.slotId);
    expect(slots).toEqual(["eyes", "mouth", "tail", "gills", "pattern", "aura"]);
  });

  test("each trait has required fields", () => {
    const traits = generateCreatureTraits(() => 0.5);
    for (const t of traits) {
      expect(t.traitId).toBeDefined();
      expect(t.rarity).toBeDefined();
      expect(t.mergeModifier).toBeDefined();
      expect(t.mergeModifier.type).toMatch(/stable|volatile|catalyst/);
    }
  });

  test("low rng produces common traits", () => {
    // rng = 0.1 should be well within common range (30%)
    const traits = generateCreatureTraits(() => 0.1);
    for (const t of traits) {
      expect(t.rarity).toBe("common");
    }
  });
});

describe("spawnBatch", () => {
  test("spawns 2-4 creatures with batch state", () => {
    const state = makeState();
    const now = Date.now();
    const spawned = spawnBatch(state, now, () => 0.5);
    expect(state.nearby.length).toBeGreaterThanOrEqual(2);
    expect(state.nearby.length).toBeLessThanOrEqual(4);
    expect(state.batch).not.toBeNull();
    expect(state.batch!.attemptsRemaining).toBe(3);
    expect(state.batch!.failPenalty).toBe(0);
  });

  test("does not spawn if batch already active", () => {
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      nearby: [{ id: "test", traits: [], spawnedAt: Date.now() }],
    });
    const spawned = spawnBatch(state, Date.now(), () => 0.5);
    expect(spawned).toHaveLength(0);
    expect(state.nearby).toHaveLength(1);
  });

  test("each spawned creature has unique id and 6 traits", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    const ids = state.nearby.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of state.nearby) {
      expect(c.traits).toHaveLength(6);
    }
  });
});

describe("cleanupBatch", () => {
  test("removes batch and nearby when timed out", () => {
    const thirtyOneMinAgo = Date.now() - 31 * 60 * 1000;
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: thirtyOneMinAgo },
      nearby: [{ id: "old", traits: [], spawnedAt: thirtyOneMinAgo }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
    expect(despawned).toEqual(["old"]);
  });

  test("removes batch when no attempts remaining", () => {
    const state = makeState({
      batch: { attemptsRemaining: 0, failPenalty: 0.2, spawnedAt: Date.now() },
      nearby: [{ id: "a", traits: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
  });

  test("keeps batch if still active", () => {
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      nearby: [{ id: "a", traits: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(1);
    expect(state.batch).not.toBeNull();
    expect(despawned).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/batch.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement batch module**

```typescript
// src/engine/batch.ts
import { GameState, NearbyCreature, CreatureTrait, TraitSlotId, Rarity, TRAIT_SLOTS, RARITY_ORDER } from "../types";
import { getTraitsBySlot, getRaritySpawnWeight, getTraitsByRarity } from "../config/traits";
import { v4 as uuidv4 } from "crypto";

const BATCH_LINGER_MS = 30 * 60 * 1000; // 30 minutes
const SHARED_ATTEMPTS = 3;
const BATCH_SIZE_WEIGHTS = [
  { size: 2, weight: 0.40 },
  { size: 3, weight: 0.40 },
  { size: 4, weight: 0.20 },
];

function generateId(): string {
  // Simple unique ID without external deps
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pickRarity(rng: () => number): Rarity {
  const roll = rng();
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += getRaritySpawnWeight(rarity);
    if (roll < cumulative) return rarity;
  }
  return "common";
}

function pickBatchSize(rng: () => number): number {
  const roll = rng();
  let cumulative = 0;
  for (const { size, weight } of BATCH_SIZE_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return size;
  }
  return 2;
}

export function generateCreatureTraits(rng: () => number): CreatureTrait[] {
  return TRAIT_SLOTS.map((slotId) => {
    const rarity = pickRarity(rng);
    const variants = getTraitsByRarity(slotId, rarity);
    const pick = Math.floor(rng() * variants.length);
    const trait = variants[Math.min(pick, variants.length - 1)];
    return {
      slotId,
      traitId: trait.id,
      rarity: trait.rarity,
      mergeModifier: trait.mergeModifier,
    };
  });
}

export function spawnBatch(
  state: GameState,
  now: number,
  rng: () => number
): NearbyCreature[] {
  // Don't spawn if batch already active
  if (state.batch && state.batch.attemptsRemaining > 0) return [];

  const count = pickBatchSize(rng);
  const spawned: NearbyCreature[] = [];

  for (let i = 0; i < count; i++) {
    const creature: NearbyCreature = {
      id: generateId(),
      traits: generateCreatureTraits(rng),
      spawnedAt: now,
    };
    spawned.push(creature);
  }

  state.nearby = spawned;
  state.batch = {
    attemptsRemaining: SHARED_ATTEMPTS,
    failPenalty: 0,
    spawnedAt: now,
  };

  return spawned;
}

export function cleanupBatch(state: GameState, now: number): string[] {
  if (!state.batch) return [];

  const timedOut = now - state.batch.spawnedAt > BATCH_LINGER_MS;
  const noAttempts = state.batch.attemptsRemaining <= 0;

  if (timedOut || noAttempts) {
    const despawned = state.nearby.map((c) => c.id);
    state.nearby = [];
    state.batch = null;
    return despawned;
  }

  return [];
}

export { BATCH_LINGER_MS, SHARED_ATTEMPTS, BATCH_SIZE_WEIGHTS };
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/engine/batch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/batch.ts tests/engine/batch.test.ts
git commit -m "feat(engine): add batch spawning with trait generation and shared attempts"
```

---

## Task 5: Catch Rewrite (Energy + Shared Attempts + Escalating Penalty)

**Files:**
- Modify: `src/engine/catch.ts` (full rewrite)
- Create: `tests/engine/catch-v2.test.ts` (new tests, keep old for reference)

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/catch-v2.test.ts
import { attemptCatch, calculateCatchRate } from "../../src/engine/catch";
import { GameState, CreatureTrait, NearbyCreature, BatchState } from "../../src/types";

function makeTraits(rarities: string[]): CreatureTrait[] {
  return rarities.map((r, i) => ({
    slotId: ["eyes", "mouth", "tail", "gills", "pattern", "aura"][i] as any,
    traitId: `test_${r}_${i}`,
    rarity: r as any,
    mergeModifier: { type: "stable" as const, value: 0.05 },
  }));
}

function makeNearby(id: string, rarities: string[]): NearbyCreature {
  return { id, traits: makeTraits(rarities), spawnedAt: Date.now() };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [makeNearby("c1", ["common", "common", "common", "common", "common", "common"])],
    batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("calculateCatchRate", () => {
  test("all common with 0 fail penalty = 80%", () => {
    const traits = makeTraits(["common", "common", "common", "common", "common", "common"]);
    expect(calculateCatchRate(traits, 0)).toBeCloseTo(0.80);
  });

  test("6 rare with 0 fail penalty = 56%", () => {
    const traits = makeTraits(["rare", "rare", "rare", "rare", "rare", "rare"]);
    expect(calculateCatchRate(traits, 0)).toBeCloseTo(0.56);
  });

  test("fail penalty reduces rate", () => {
    const traits = makeTraits(["common", "common", "common", "common", "common", "common"]);
    expect(calculateCatchRate(traits, 0.1)).toBeCloseTo(0.70);
    expect(calculateCatchRate(traits, 0.2)).toBeCloseTo(0.60);
  });

  test("floor at 5%", () => {
    const traits = makeTraits(["void", "void", "void", "void", "void", "void"]);
    expect(calculateCatchRate(traits, 0.5)).toBe(0.05);
  });
});

describe("attemptCatch", () => {
  test("success: spends energy, removes creature, adds to collection", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1); // low roll = success
    expect(result.success).toBe(true);
    expect(result.energySpent).toBe(1);
    expect(state.energy).toBe(9);
    expect(state.nearby).toHaveLength(0);
    expect(state.collection).toHaveLength(1);
    expect(state.batch!.attemptsRemaining).toBe(2);
  });

  test("failure: spends energy, keeps creature, increments fail penalty", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.99); // high roll = fail
    expect(result.success).toBe(false);
    expect(result.energySpent).toBe(1);
    expect(state.energy).toBe(9);
    expect(state.nearby).toHaveLength(1); // creature stays
    expect(state.batch!.attemptsRemaining).toBe(2);
    expect(state.batch!.failPenalty).toBeCloseTo(0.10);
  });

  test("throws if not enough energy", () => {
    const state = makeState({ energy: 0 });
    expect(() => attemptCatch(state, 0, () => 0.1)).toThrow(/energy/i);
  });

  test("throws if no batch active", () => {
    const state = makeState({ batch: null });
    expect(() => attemptCatch(state, 0, () => 0.1)).toThrow(/batch/i);
  });

  test("throws if no attempts remaining", () => {
    const state = makeState({
      batch: { attemptsRemaining: 0, failPenalty: 0, spawnedAt: Date.now() },
    });
    expect(() => attemptCatch(state, 0, () => 0.1)).toThrow(/attempt/i);
  });

  test("throws if invalid creature index", () => {
    const state = makeState();
    expect(() => attemptCatch(state, 5, () => 0.1)).toThrow();
  });

  test("escalating penalty affects subsequent catches", () => {
    const state = makeState({
      nearby: [
        makeNearby("c1", ["common", "common", "common", "common", "common", "common"]),
        makeNearby("c2", ["common", "common", "common", "common", "common", "common"]),
      ],
    });
    // First catch fails
    attemptCatch(state, 0, () => 0.99);
    expect(state.batch!.failPenalty).toBeCloseTo(0.10);
    // Second catch should have penalty applied
    const result = attemptCatch(state, 0, () => 0.75);
    // Rate was 80% - 10% penalty = 70%, roll 0.75 > 0.70 → fail
    expect(result.success).toBe(false);
  });

  test("xp earned based on avg trait rarity", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.xpEarned).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/catch-v2.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite catch module**

```typescript
// src/engine/catch.ts
import { GameState, NearbyCreature, CatchResult, CreatureTrait, CollectionCreature, Rarity, RARITY_ORDER } from "../types";
import { RARITY_CATCH_PENALTY, RARITY_ENERGY_VALUE } from "../config/traits";
import { calculateEnergyCost, spendEnergy } from "./energy";

const BASE_CATCH_RATE = 0.80;
const MIN_CATCH_RATE = 0.05;
const MAX_CATCH_RATE = 0.95;
const FAIL_PENALTY_PER_MISS = 0.10;

const XP_PER_RARITY: Record<Rarity, number> = {
  common: 10, uncommon: 25, rare: 50, epic: 100,
  legendary: 250, mythic: 500, ancient: 1000, void: 2000,
};

export function calculateCatchRate(traits: CreatureTrait[], failPenalty: number): number {
  const traitPenalty = traits.reduce((sum, t) => sum + RARITY_CATCH_PENALTY[t.rarity], 0);
  const rate = BASE_CATCH_RATE - traitPenalty - failPenalty;
  return Math.max(MIN_CATCH_RATE, Math.min(MAX_CATCH_RATE, rate));
}

function calculateXp(traits: CreatureTrait[]): number {
  const total = traits.reduce((sum, t) => sum + XP_PER_RARITY[t.rarity], 0);
  return Math.round(total / traits.length);
}

export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  rng: () => number
): CatchResult {
  if (!state.batch) throw new Error("No active batch");
  if (state.batch.attemptsRemaining <= 0) throw new Error("No attempts remaining");
  if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) {
    throw new Error(`Invalid creature index: ${nearbyIndex}`);
  }

  const creature = state.nearby[nearbyIndex];
  const energyCost = calculateEnergyCost(creature.traits);

  if (state.energy < energyCost) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${energyCost}`);
  }

  // Spend energy and attempt
  spendEnergy(state, energyCost);
  state.batch.attemptsRemaining--;

  const catchRate = calculateCatchRate(creature.traits, state.batch.failPenalty);
  const roll = rng();
  const success = roll < catchRate;

  if (success) {
    // Remove from nearby
    state.nearby.splice(nearbyIndex, 1);

    // Add to collection
    const collected: CollectionCreature = {
      id: creature.id,
      traits: creature.traits,
      caughtAt: Date.now(),
      generation: 0,
    };
    state.collection.push(collected);

    // XP
    const xpEarned = calculateXp(creature.traits);
    state.profile.xp += xpEarned;
    state.profile.totalCatches++;

    // Level up check
    const nextLevelXp = state.profile.level * 100;
    if (state.profile.xp >= nextLevelXp) {
      state.profile.level++;
      state.profile.xp -= nextLevelXp;
    }

    return {
      success: true,
      creature,
      energySpent: energyCost,
      fled: false,
      xpEarned,
      attemptsRemaining: state.batch.attemptsRemaining,
      failPenalty: state.batch.failPenalty,
    };
  }

  // Failed
  state.batch.failPenalty += FAIL_PENALTY_PER_MISS;

  return {
    success: false,
    creature,
    energySpent: energyCost,
    fled: false,
    xpEarned: 0,
    attemptsRemaining: state.batch.attemptsRemaining,
    failPenalty: state.batch.failPenalty,
  };
}

export { BASE_CATCH_RATE, MIN_CATCH_RATE, MAX_CATCH_RATE, FAIL_PENALTY_PER_MISS, XP_PER_RARITY };
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/engine/catch-v2.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/catch.ts tests/engine/catch-v2.test.ts
git commit -m "feat(engine): rewrite catch for energy + shared attempts + escalating penalty"
```

---

## Task 6: Merge System

**Files:**
- Create: `src/engine/merge.ts`
- Create: `tests/engine/merge.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/merge.test.ts
import {
  calculateMergeRate,
  findSynergies,
  resolveTraitInheritance,
  attemptMerge,
} from "../../src/engine/merge";
import { GameState, CollectionCreature, CreatureTrait, MergeResult } from "../../src/types";

function makeTrait(slot: string, rarity: string, modType: string, modValue: number): CreatureTrait {
  return {
    slotId: slot as any,
    traitId: `${slot}_${rarity}_test`,
    rarity: rarity as any,
    mergeModifier: { type: modType as any, value: modValue },
  };
}

function makeCreature(id: string, traitSpecs: Array<[string, string, string, number]>): CollectionCreature {
  return {
    id,
    traits: traitSpecs.map(([slot, rarity, modType, modValue]) => makeTrait(slot, rarity, modType, modValue)),
    caughtAt: Date.now(),
    generation: 0,
  };
}

function makeAllStable(id: string): CollectionCreature {
  return makeCreature(id, [
    ["eyes", "common", "stable", 0.08],
    ["mouth", "common", "stable", 0.08],
    ["tail", "common", "stable", 0.08],
    ["gills", "common", "stable", 0.08],
    ["pattern", "common", "stable", 0.08],
    ["aura", "common", "stable", 0.08],
  ]);
}

function makeAllVolatile(id: string): CollectionCreature {
  return makeCreature(id, [
    ["eyes", "rare", "volatile", -0.15],
    ["mouth", "rare", "volatile", -0.15],
    ["tail", "rare", "volatile", -0.15],
    ["gills", "rare", "volatile", -0.15],
    ["pattern", "rare", "volatile", -0.15],
    ["aura", "rare", "volatile", -0.15],
  ]);
}

function makeState(collection: CollectionCreature[]): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection,
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
  };
}

describe("calculateMergeRate", () => {
  test("all stable parents → capped at 90%", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const rate = calculateMergeRate(a, b, []);
    expect(rate).toBeCloseTo(0.90);
  });

  test("all volatile parents → floored at 5%", () => {
    const a = makeAllVolatile("a");
    const b = makeAllVolatile("b");
    const rate = calculateMergeRate(a, b, []);
    expect(rate).toBe(0.05);
  });

  test("base rate with neutral modifiers = 50%", () => {
    const a = makeCreature("a", [
      ["eyes", "common", "stable", 0], ["mouth", "common", "stable", 0],
      ["tail", "common", "stable", 0], ["gills", "common", "stable", 0],
      ["pattern", "common", "stable", 0], ["aura", "common", "stable", 0],
    ]);
    const b = makeCreature("b", [
      ["eyes", "common", "stable", 0], ["mouth", "common", "stable", 0],
      ["tail", "common", "stable", 0], ["gills", "common", "stable", 0],
      ["pattern", "common", "stable", 0], ["aura", "common", "stable", 0],
    ]);
    expect(calculateMergeRate(a, b, [])).toBeCloseTo(0.50);
  });
});

describe("resolveTraitInheritance", () => {
  test("returns 6 traits", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const result = resolveTraitInheritance(a.traits, b.traits, () => 0.5);
    expect(result).toHaveLength(6);
  });

  test("each slot is represented", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const result = resolveTraitInheritance(a.traits, b.traits, () => 0.5);
    const slots = result.map(t => t.slotId);
    expect(slots).toEqual(["eyes", "mouth", "tail", "gills", "pattern", "aura"]);
  });

  test("with rng=0.5, inherits from parents (no mutation)", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    // rng 0.5 should be well above mutation threshold for stable traits
    const result = resolveTraitInheritance(a.traits, b.traits, () => 0.5);
    for (const t of result) {
      expect(t.rarity).toBe("common"); // both parents are common, no mutation
    }
  });
});

describe("attemptMerge", () => {
  test("success: removes parents, adds child", () => {
    const a = makeAllStable("a");
    const b = makeAllStable("b");
    const state = makeState([a, b]);
    // rng 0.1 = merge succeeds (rate ~90%), trait inheritance picks parents
    const result = attemptMerge(state, "a", "b", () => 0.1);
    expect(result.success).toBe(true);
    expect(result.child).not.toBeNull();
    expect(state.collection).toHaveLength(1); // parents removed, child added
    expect(state.collection[0].generation).toBe(1);
    expect(state.collection[0].mergedFrom).toEqual(["a", "b"]);
    expect(state.profile.totalMerges).toBe(1);
  });

  test("failure: removes parents, no child", () => {
    const a = makeAllVolatile("a");
    const b = makeAllVolatile("b");
    const state = makeState([a, b]);
    // rng 0.99 with 5% merge rate = fail
    const result = attemptMerge(state, "a", "b", () => 0.99);
    expect(result.success).toBe(false);
    expect(result.child).toBeNull();
    expect(state.collection).toHaveLength(0); // both parents consumed
    expect(state.profile.totalMerges).toBe(1);
  });

  test("throws if parent not found", () => {
    const state = makeState([makeAllStable("a")]);
    expect(() => attemptMerge(state, "a", "missing", () => 0.1)).toThrow();
  });

  test("throws if same creature", () => {
    const state = makeState([makeAllStable("a")]);
    expect(() => attemptMerge(state, "a", "a", () => 0.1)).toThrow();
  });

  test("child generation = max parent generation + 1", () => {
    const a = { ...makeAllStable("a"), generation: 3 };
    const b = { ...makeAllStable("b"), generation: 1 };
    const state = makeState([a, b]);
    const result = attemptMerge(state, "a", "b", () => 0.1);
    expect(result.child!.generation).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/merge.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement merge module**

```typescript
// src/engine/merge.ts
import {
  GameState, CollectionCreature, CreatureTrait, MergeResult,
  CatalystSynergy, Rarity, RARITY_ORDER, TRAIT_SLOTS, TraitSlotId,
} from "../types";
import { getSynergies, getTraitsByRarity } from "../config/traits";

const BASE_MERGE_RATE = 0.50;
const MIN_MERGE_RATE = 0.05;
const MAX_MERGE_RATE = 0.90;
const BASE_MUTATION = 0.08;
const VOLATILE_MUTATION_BONUS = 0.07;
const STABLE_MUTATION_PENALTY = 0.04;
const MIN_MUTATION = 0.01;
const MAX_MUTATION = 0.30;
const MUTATION_UP_WEIGHT = 0.75;
const DOUBLE_MUTATION_CHANCE = 0.25;

export function findSynergies(
  parentA: CollectionCreature,
  parentB: CollectionCreature,
  synergies: CatalystSynergy[]
): CatalystSynergy[] {
  const allTraitIds = new Set([
    ...parentA.traits.map(t => t.traitId),
    ...parentB.traits.map(t => t.traitId),
  ]);
  return synergies.filter(s => allTraitIds.has(s.traitA) && allTraitIds.has(s.traitB));
}

export function calculateMergeRate(
  parentA: CollectionCreature,
  parentB: CollectionCreature,
  activeSynergies: CatalystSynergy[]
): number {
  const allTraits = [...parentA.traits, ...parentB.traits];
  const modifierSum = allTraits.reduce((sum, t) => sum + t.mergeModifier.value, 0);
  const synergyBonus = activeSynergies.reduce((sum, s) => sum + s.bonus, 0);
  const rate = BASE_MERGE_RATE + modifierSum + synergyBonus;
  return Math.max(MIN_MERGE_RATE, Math.min(MAX_MERGE_RATE, rate));
}

function clampRarityIndex(idx: number): number {
  return Math.max(0, Math.min(RARITY_ORDER.length - 1, idx));
}

function resolveSlot(
  slotId: TraitSlotId,
  traitA: CreatureTrait,
  traitB: CreatureTrait,
  rng: () => number
): CreatureTrait {
  // Calculate mutation chance
  const volatileCount = [traitA, traitB].filter(t => t.mergeModifier.type === "volatile").length;
  const stableCount = [traitA, traitB].filter(t => t.mergeModifier.type === "stable").length;
  const mutationChance = Math.max(MIN_MUTATION, Math.min(MAX_MUTATION,
    BASE_MUTATION + (volatileCount * VOLATILE_MUTATION_BONUS) - (stableCount * STABLE_MUTATION_PENALTY)
  ));

  const rarerIdx = Math.max(RARITY_ORDER.indexOf(traitA.rarity), RARITY_ORDER.indexOf(traitB.rarity));

  // Roll for mutation
  if (rng() < mutationChance) {
    let targetIdx: number;
    if (rng() < MUTATION_UP_WEIGHT) {
      // Mutation up
      const steps = rng() < DOUBLE_MUTATION_CHANCE ? 2 : 1;
      targetIdx = clampRarityIndex(rarerIdx + steps);
    } else {
      // Mutation down
      targetIdx = clampRarityIndex(rarerIdx - 1);
    }
    const targetRarity = RARITY_ORDER[targetIdx];
    const variants = getTraitsByRarity(slotId, targetRarity);
    if (variants.length > 0) {
      const pick = variants[Math.floor(rng() * variants.length)];
      return { slotId, traitId: pick.id, rarity: pick.rarity, mergeModifier: pick.mergeModifier };
    }
  }

  // No mutation — inherit from parent
  const roll = rng();
  const idxA = RARITY_ORDER.indexOf(traitA.rarity);
  const idxB = RARITY_ORDER.indexOf(traitB.rarity);
  const rarerParent = idxA >= idxB ? traitA : traitB;
  const otherParent = idxA >= idxB ? traitB : traitA;

  if (roll < 0.55) {
    return { ...rarerParent, slotId };
  } else if (roll < 0.85) {
    return { ...otherParent, slotId };
  } else {
    // Random trait of same rarity as rarer parent
    const variants = getTraitsByRarity(slotId, rarerParent.rarity);
    if (variants.length > 0) {
      const pick = variants[Math.floor(rng() * variants.length)];
      return { slotId, traitId: pick.id, rarity: pick.rarity, mergeModifier: pick.mergeModifier };
    }
    return { ...rarerParent, slotId };
  }
}

export function resolveTraitInheritance(
  traitsA: CreatureTrait[],
  traitsB: CreatureTrait[],
  rng: () => number
): CreatureTrait[] {
  return TRAIT_SLOTS.map((slotId) => {
    const traitA = traitsA.find(t => t.slotId === slotId)!;
    const traitB = traitsB.find(t => t.slotId === slotId)!;
    return resolveSlot(slotId, traitA, traitB, rng);
  });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function attemptMerge(
  state: GameState,
  parentAId: string,
  parentBId: string,
  rng: () => number
): MergeResult {
  if (parentAId === parentBId) throw new Error("Cannot merge a creature with itself");

  const parentAIdx = state.collection.findIndex(c => c.id === parentAId);
  const parentBIdx = state.collection.findIndex(c => c.id === parentBId);
  if (parentAIdx === -1) throw new Error(`Creature not found: ${parentAId}`);
  if (parentBIdx === -1) throw new Error(`Creature not found: ${parentBId}`);

  const parentA = state.collection[parentAIdx];
  const parentB = state.collection[parentBIdx];

  const synergies = getSynergies();
  const activeSynergies = findSynergies(parentA, parentB, synergies);
  const mergeRate = calculateMergeRate(parentA, parentB, activeSynergies);

  // Remove both parents (consumed regardless of outcome)
  state.collection = state.collection.filter(c => c.id !== parentAId && c.id !== parentBId);
  state.profile.totalMerges++;

  const roll = rng();
  if (roll >= mergeRate) {
    // Merge failed — both parents lost
    return { success: false, parentA, parentB, child: null, mergeRate, synergyBonuses: activeSynergies };
  }

  // Merge succeeded — create child
  const childTraits = resolveTraitInheritance(parentA.traits, parentB.traits, rng);
  const child: CollectionCreature = {
    id: generateId(),
    traits: childTraits,
    caughtAt: Date.now(),
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    mergedFrom: [parentAId, parentBId],
  };
  state.collection.push(child);

  return { success: true, parentA, parentB, child, mergeRate, synergyBonuses: activeSynergies };
}

export {
  BASE_MERGE_RATE, MIN_MERGE_RATE, MAX_MERGE_RATE,
  BASE_MUTATION, VOLATILE_MUTATION_BONUS, STABLE_MUTATION_PENALTY,
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/engine/merge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/merge.ts tests/engine/merge.test.ts
git commit -m "feat(engine): add merge system with trait inheritance and mutation"
```

---

## Task 7: Update Balance Config & Constants

**Files:**
- Modify: `config/balance.json`
- Modify: `src/config/constants.ts`
- Modify: `src/config/loader.ts`

- [ ] **Step 1: Update balance.json**

Replace the spawning, catching, and rewards sections. Keep progression, messages, and timeOfDay. Remove creatures and items arrays. Add new batch, energy, and merge sections.

Key changes to `config/balance.json`:
- `spawning` → `batch` section (batchSizeWeights, sharedAttempts, batchLingerMs, ticksPerSpawnCheck, spawnProbability)
- `catching` → update with baseCatchRate, minCatchRate, maxCatchRate, failPenaltyPerMiss, xpPerRarity
- Add `energy` section (gainIntervalMs, maxEnergy, startingEnergy, sessionBonus, streakBonuses)
- Add `merge` section (baseMergeRate, min/max, baseMutation, volatileBonus, stablePenalty, mutationUpWeight, doubleMutationChance)
- Remove `creatures` array, `items` array
- Update `rewards` (milestones now give energy instead of items)
- Update `messages` for new scan/catch/merge/collection formats

- [ ] **Step 2: Update constants.ts to export new values**

Remove old creature/item/evolution exports. Add batch, energy, merge constant exports.

- [ ] **Step 3: Build and fix any import issues**

Run: `npx tsc --noEmit`
Fix any remaining compilation errors.

- [ ] **Step 4: Commit**

```bash
git add config/balance.json src/config/constants.ts src/config/loader.ts
git commit -m "feat(config): update balance config for trait-based system

- Replace species spawning with batch spawning config
- Add energy economy parameters
- Add merge system parameters
- Remove creature/item definitions (now in traits.json)
- Update message templates"
```

---

## Task 8: Rewrite Game Engine

**Files:**
- Modify: `src/engine/game-engine.ts`
- Update: `tests/engine/game-engine.test.ts`

- [ ] **Step 1: Write tests for new game engine**

Tests for the rewired engine: processTick should handle energy gain + batch spawn/cleanup. scan/catch/merge delegate to new modules.

- [ ] **Step 2: Rewrite game-engine.ts**

Key changes:
- `processTick`: calls `processEnergyGain`, `cleanupBatch`, conditionally `spawnBatch`, streak/tick processing
- `scan()`: returns `ScanResult` with traits, energy costs, batch state
- `catch(index)`: delegates to new `attemptCatch` (no itemId parameter)
- `merge(idA, idB)`: delegates to `attemptMerge`
- Remove: `evolve()`, item/creature map dependencies
- Add: `merge()` method

- [ ] **Step 3: Run full test suite, fix failures**

Run: `npx jest`
Fix any remaining issues.

- [ ] **Step 4: Commit**

```bash
git add src/engine/game-engine.ts tests/engine/game-engine.test.ts
git commit -m "feat(engine): rewire game engine for trait/energy/batch/merge system"
```

---

## Task 9: Update Renderer

**Files:**
- Modify: `src/renderers/simple-text.ts`
- Update: `tests/renderers/simple-text.test.ts`

- [ ] **Step 1: Rewrite renderer methods**

Key changes:
- `renderScan`: Show batch info (attempts remaining, fail penalty), each creature with traits + energy cost + catch rate
- `renderCatch`: Show success/fail with trait info, energy spent, attempts remaining
- `renderMerge`: Show merge result with probability breakdown, child traits or failure message
- `renderCollection`: Show each creature with traits, generation, merge modifier summary
- `renderEnergy`: Simple energy display
- `renderStatus`: Show energy, merge count, collection count
- Remove: `renderEvolve`, `renderInventory` (old item-based)

- [ ] **Step 2: Update renderer tests**

- [ ] **Step 3: Run tests**

Run: `npx jest tests/renderers/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/
git commit -m "feat(renderer): rewrite for trait-based creatures with merge display"
```

---

## Task 10: Update CLI & MCP Server

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/mcp-server.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Update CLI**

Key changes:
- `catch` command: remove `--item` flag, just takes creature index
- Add `merge <id1> <id2>` command
- `inventory` → `energy` command (show current energy)
- Remove `evolve` command
- Update all commands to use new engine API

- [ ] **Step 2: Update MCP server**

Add merge tool, remove evolve tool, update catch tool (no item parameter).

- [ ] **Step 3: Update index.ts exports**

Export new modules, remove old ones.

- [ ] **Step 4: Update skills**

Update skill SKILL.md files for `/catch`, `/collection`, `/inventory`, add `/merge`.

- [ ] **Step 5: Build and test**

Run: `npm run build && npm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts src/mcp-server.ts src/index.ts skills/
git commit -m "feat(cli): add merge command, update catch/scan for new system"
```

---

## Task 11: State Migration

**Files:**
- Modify: `src/state/state-manager.ts`
- Create: `tests/state/migration.test.ts`

- [ ] **Step 1: Write migration tests**

Test that old v1 state (with species collection, items inventory, fragment-based entries) is migrated to v2 state (with empty collection, starting energy, no items).

- [ ] **Step 2: Implement migration in StateManager.load()**

```typescript
// In StateManager.load():
// If state.version === 1 (or undefined):
//   - Set version = 2
//   - Convert inventory items to energy equivalent
//   - Clear collection (old fragments don't map to new system)
//   - Set energy = startingEnergy
//   - Set lastEnergyGainAt = Date.now()
//   - Clear nearby
//   - Set batch = null
//   - Keep: profile (level, xp, streaks), claimedMilestones, settings, recentTicks
```

- [ ] **Step 3: Run migration tests**

Run: `npx jest tests/state/migration.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/state/state-manager.ts tests/state/migration.test.ts
git commit -m "feat(state): add v1 → v2 migration for trait-based system"
```

---

## Task 12: Cleanup & Final Integration

**Files:**
- Remove old test files that reference deleted functionality
- Remove: `src/engine/evolution.ts`, `src/engine/inventory.ts`, `src/config/creatures.ts`, `src/config/items.ts`
- Update remaining test files

- [ ] **Step 1: Delete removed modules**

```bash
rm src/engine/evolution.ts src/engine/inventory.ts src/config/creatures.ts src/config/items.ts
rm tests/engine/evolution.test.ts tests/engine/inventory.test.ts
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 4: Manual smoke test**

```bash
node dist/cli.js status
node dist/cli.js scan
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete catch risk/reward redesign

- Single creature type with 300 traits across 6 slots
- Energy economy replaces item system
- Batch spawning with 3 shared attempts
- Escalating failure penalty per batch
- Merge system with trait inheritance and mutation
- 8 rarity tiers (pyramid distribution)
- 15.6 billion possible trait combinations
- State migration from v1 → v2"
```

---

## Out of Scope (Separate Plans)

- **Phase 3: Art** — Final axolotl art template, composable art regions per trait slot, renderer updates for visual trait display
- **Phase 4: Polish** — Catalyst synergy discovery UI, balance tuning, community features
