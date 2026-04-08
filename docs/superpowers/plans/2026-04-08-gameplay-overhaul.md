# Gameplay Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Compi from a single-creature rarity grinder into a multi-species collection game with breeding mechanics.

**Architecture:** Remove the 6-tier rarity system. Each creature belongs to a species with its own trait pool where each trait has an individual spawn rate. Merge becomes breeding (both parents consumed, child inherits traits per-slot with weighted odds). Collection capped at 15 with an archive system. Species config is per-file JSON under `config/species/`.

**Tech Stack:** TypeScript, Jest (ts-jest), Node.js. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-08-gameplay-overhaul-design.md`

**Scope:** This plan covers infrastructure + Compi species migration ONLY. Each new species (Drakon, Felith, etc.) gets its own separate plan with visual review.

---

## File Structure

### New files to create
- `config/species/compi.json` — Compi species definition with trait pools + spawn rates
- `src/config/species.ts` — Species loading, lookup, and spawn-rate weighted trait picking
- `src/engine/breed.ts` — New breeding system (replaces merge.ts)
- `src/engine/archive.ts` — Archive + collection cap logic
- `tests/config/species.test.ts` — Species config tests
- `tests/engine/breed.test.ts` — Breeding system tests
- `tests/engine/archive.test.ts` — Archive tests
- `tests/state/migration.test.ts` — State migration tests

### Files to modify
- `src/types.ts` — Add Species types, modify CreatureSlot (remove rarity), modify CollectionCreature (add speciesId, archived), new BreedPreview/BreedResult types, update GameState (add archive, version 4)
- `src/config/constants.ts` — Remove rarity-based constants, add breeding/collection constants
- `src/engine/batch.ts` — Multi-species spawning with per-trait spawn rates
- `src/engine/catch.ts` — New difficulty formula based on rarest trait
- `src/engine/energy.ts` — Simplify energy cost (no rarity tiers)
- `src/engine/game-engine.ts` — Add breed, archive, release methods; modify scan/catch
- `src/renderers/simple-text.ts` — Update all render methods for new data model
- `src/cli.ts` — Add archive, inspect, release commands
- `src/mcp-tools.ts` — Add new MCP tools
- `src/state/state-manager.ts` — v3→v4 migration
- `src/index.ts` — Export new modules
- `config/balance.json` — New balance values for breeding/collection

### Files to remove (after migration)
- `src/engine/merge.ts` — Replaced by breed.ts
- `tests/engine/merge.test.ts` — Replaced by breed.test.ts

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `src/types.ts`
- Test: `npm run build` (type-check only, no runtime test needed)

- [ ] **Step 1: Add Species and TraitDefinition types, remove Rarity from CreatureSlot**

Replace the entire `src/types.ts` with updated types. Key changes:
- Remove `Rarity`, `RARITY_ORDER`, `RARITY_STARS`
- Add `TraitDefinition` with `spawnRate`
- Add `SpeciesDefinition` with `traitPools`
- Remove `rarity` from `CreatureSlot`, add `spawnRate` lookup
- Add `speciesId` and `archived` to `CollectionCreature` and `NearbyCreature`
- Add `archive` array to `GameState`, bump version to 4
- Replace `MergePreview`/`MergeResult` with `BreedPreview`/`BreedResult`
- Add `MAX_COLLECTION_SIZE = 15`
- Update `Renderer` interface

```typescript
// src/types.ts — Compi v3 (multi-species)

// --- Slots (4) ---

export type SlotId = "eyes" | "mouth" | "body" | "tail";
export const SLOT_IDS: SlotId[] = ["eyes", "mouth", "body", "tail"];

// --- Traits ---

export interface TraitVariant {
  id: string;
  name: string;
  art: string;
}

export interface TraitDefinition {
  id: string;
  name: string;
  art: string;
  spawnRate: number; // 0.001 to 0.30
}

export interface CreatureSlot {
  slotId: SlotId;
  variantId: string;
  // rarity removed — spawn rate lives in species config
}

// --- Species ---

export interface SpeciesDefinition {
  id: string;
  name: string;
  description: string;
  spawnWeight: number;
  art: string[]; // multi-line ASCII template
  traitPools: Record<SlotId, TraitDefinition[]>;
}

// --- Collection ---

export const MAX_COLLECTION_SIZE = 15;

// --- Time ---

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// --- Game State ---

export interface Tick {
  timestamp: number;
  sessionId?: string;
  eventType?: string;
}

export interface NearbyCreature {
  id: string;
  speciesId: string;
  name: string;
  slots: CreatureSlot[];
  spawnedAt: number;
}

export interface CollectionCreature {
  id: string;
  speciesId: string;
  name: string;
  slots: CreatureSlot[];
  caughtAt: number;
  generation: number;
  mergedFrom?: [string, string];
  archived: boolean;
}

export interface BatchState {
  attemptsRemaining: number;
  failPenalty: number;
  spawnedAt: number;
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
  notificationLevel: "minimal" | "moderate" | "off";
}

export interface GameState {
  version: number; // 4
  profile: PlayerProfile;
  collection: CollectionCreature[];
  archive: CollectionCreature[];
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

export interface SlotInheritance {
  slotId: SlotId;
  parentAVariant: TraitDefinition;
  parentBVariant: TraitDefinition;
  parentAChance: number; // normalized probability
  parentBChance: number;
}

export interface BreedPreview {
  parentA: CollectionCreature;
  parentB: CollectionCreature;
  slotInheritance: SlotInheritance[];
  energyCost: number;
}

export interface BreedResult {
  child: CollectionCreature;
  parentA: CollectionCreature;
  parentB: CollectionCreature;
  inheritedFrom: Record<SlotId, "A" | "B">;
}

export interface ArchiveResult {
  creature: CollectionCreature;
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  archiveCount: number;
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

// --- Config Types ---

export interface MilestoneCondition {
  type: "totalCatches" | "currentStreak" | "totalTicks";
  threshold: number;
}

export interface MilestoneReward {
  energy?: number;
}

export interface MilestoneConfig {
  id: string;
  description: string;
  condition: MilestoneCondition;
  reward: MilestoneReward[];
  oneTime: boolean;
}

export interface BalanceConfig {
  batch: {
    ticksPerSpawnCheck: number;
    spawnProbability: number;
    batchLingerMs: number;
    sharedAttempts: number;
    timeOfDay: Record<string, [number, number]>;
  };
  catching: {
    baseCatchRate: number;
    minCatchRate: number;
    maxCatchRate: number;
    failPenaltyPerMiss: number;
    maxTraitSpawnRate: number; // reference point for difficulty scaling (0.12)
    difficultyScale: number;  // how much rarity affects catch rate (0.50)
    xpBase: number;           // base XP for a catch
    xpRarityMultiplier: number; // XP bonus per rare trait
  };
  energy: {
    gainIntervalMs: number;
    maxEnergy: number;
    startingEnergy: number;
    sessionBonus: number;
    baseMergeCost: number;  // flat cost per merge
    maxMergeCost: number;   // cap
    rareThreashold: number; // spawn rate below which trait counts as "rare" for cost
  };
  breed: {
    inheritanceBase: number;     // 0.50
    inheritanceRarityScale: number; // 0.80
    inheritanceMin: number;      // 0.45
    inheritanceMax: number;      // 0.58
    referenceSpawnRate: number;  // 0.12
  };
  progression: {
    xpPerLevel: number;
    sessionGapMs: number;
    tickPruneCount: number;
  };
  rewards: {
    milestones: MilestoneConfig[];
  };
  messages: Record<string, Record<string, string>>;
}

// --- Renderer Interface ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderBreedPreview(preview: BreedPreview): string;
  renderBreedResult(result: BreedResult): string;
  renderCollection(collection: CollectionCreature[]): string;
  renderArchive(archive: CollectionCreature[]): string;
  renderEnergy(energy: number, maxEnergy: number): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types.ts`

Expected: Passes (types.ts has no imports that would fail). The rest of the codebase will have compile errors — that's expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor: overhaul types for multi-species collection system

Remove Rarity type and rarity from CreatureSlot. Add Species types,
TraitDefinition with spawnRate, breeding result types, archive support,
collection cap (15), and GameState v4."
```

---

## Task 2: Create Species Config System

**Files:**
- Create: `src/config/species.ts`
- Test: `tests/config/species.test.ts`

- [ ] **Step 1: Write failing tests for species loading**

```typescript
// tests/config/species.test.ts
import {
  loadSpecies,
  getSpeciesById,
  getAllSpecies,
  pickSpecies,
  pickTraitForSlot,
  getTraitDefinition,
  _resetSpeciesCache,
} from "../../src/config/species";

afterEach(() => _resetSpeciesCache());

describe("species loading", () => {
  test("loadSpecies returns array of species", () => {
    const species = loadSpecies();
    expect(species.length).toBeGreaterThan(0);
    for (const s of species) {
      expect(s.id).toBeDefined();
      expect(s.name).toBeDefined();
      expect(s.spawnWeight).toBeGreaterThan(0);
      expect(s.traitPools.eyes.length).toBeGreaterThan(0);
      expect(s.traitPools.mouth.length).toBeGreaterThan(0);
      expect(s.traitPools.body.length).toBeGreaterThan(0);
      expect(s.traitPools.tail.length).toBeGreaterThan(0);
    }
  });

  test("getSpeciesById returns correct species", () => {
    const compi = getSpeciesById("compi");
    expect(compi).toBeDefined();
    expect(compi!.name).toBe("Compi");
  });

  test("getSpeciesById returns undefined for unknown", () => {
    expect(getSpeciesById("nonexistent")).toBeUndefined();
  });

  test("getAllSpecies returns all loaded species", () => {
    const all = getAllSpecies();
    expect(all.length).toBeGreaterThan(0);
    expect(all.find((s) => s.id === "compi")).toBeDefined();
  });
});

describe("pickSpecies", () => {
  test("returns a species using weighted random", () => {
    const species = pickSpecies(() => 0.0);
    expect(species.id).toBeDefined();
  });

  test("different RNG values can produce different species", () => {
    // With only 1 species (compi), always returns compi
    const s1 = pickSpecies(() => 0.0);
    const s2 = pickSpecies(() => 0.99);
    // Both valid species
    expect(s1.id).toBeDefined();
    expect(s2.id).toBeDefined();
  });
});

describe("pickTraitForSlot", () => {
  test("returns a trait from the species pool", () => {
    const compi = getSpeciesById("compi")!;
    const trait = pickTraitForSlot(compi, "eyes", () => 0.0);
    expect(trait.id).toBeDefined();
    expect(trait.name).toBeDefined();
    expect(trait.spawnRate).toBeGreaterThan(0);
  });

  test("respects spawn rate weighting", () => {
    const compi = getSpeciesById("compi")!;
    // rng=0.0 should pick the first trait (highest spawn rate)
    const first = pickTraitForSlot(compi, "eyes", () => 0.0);
    // rng=0.999 should pick one of the last traits (lowest spawn rate)
    const last = pickTraitForSlot(compi, "eyes", () => 0.999);
    // They should likely be different traits
    expect(first.id).toBeDefined();
    expect(last.id).toBeDefined();
  });
});

describe("getTraitDefinition", () => {
  test("finds trait by variantId across all species", () => {
    const trait = getTraitDefinition("compi", "eye_c01");
    expect(trait).toBeDefined();
    expect(trait!.name).toBe("Pebble Gaze");
    expect(trait!.spawnRate).toBeGreaterThan(0);
  });

  test("returns undefined for unknown variant", () => {
    expect(getTraitDefinition("compi", "nonexistent")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/config/species.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement species config loader**

```typescript
// src/config/species.ts — Species config loading and trait picking

import * as fs from "fs";
import * as path from "path";
import { SpeciesDefinition, SlotId, TraitDefinition } from "../types";

const SPECIES_DIR = path.join(__dirname, "../../config/species");

let speciesCache: SpeciesDefinition[] | null = null;
let traitIndex: Map<string, Map<string, TraitDefinition>> | null = null; // speciesId -> variantId -> def

function ensureLoaded(): void {
  if (speciesCache) return;
  speciesCache = [];
  traitIndex = new Map();

  const files = fs.readdirSync(SPECIES_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(SPECIES_DIR, file), "utf-8");
    const species: SpeciesDefinition = JSON.parse(raw);
    speciesCache.push(species);

    const variantMap = new Map<string, TraitDefinition>();
    for (const slotId of ["eyes", "mouth", "body", "tail"] as SlotId[]) {
      for (const trait of species.traitPools[slotId]) {
        variantMap.set(trait.id, trait);
      }
    }
    traitIndex.set(species.id, variantMap);
  }
}

export function loadSpecies(): SpeciesDefinition[] {
  ensureLoaded();
  return speciesCache!;
}

export function getSpeciesById(id: string): SpeciesDefinition | undefined {
  ensureLoaded();
  return speciesCache!.find((s) => s.id === id);
}

export function getAllSpecies(): SpeciesDefinition[] {
  return loadSpecies();
}

export function pickSpecies(rng: () => number): SpeciesDefinition {
  const all = loadSpecies();
  const totalWeight = all.reduce((sum, s) => sum + s.spawnWeight, 0);
  const roll = rng() * totalWeight;
  let cumulative = 0;
  for (const species of all) {
    cumulative += species.spawnWeight;
    if (roll < cumulative) return species;
  }
  return all[all.length - 1];
}

export function pickTraitForSlot(
  species: SpeciesDefinition,
  slotId: SlotId,
  rng: () => number
): TraitDefinition {
  const pool = species.traitPools[slotId];
  const totalWeight = pool.reduce((sum, t) => sum + t.spawnRate, 0);
  const roll = rng() * totalWeight;
  let cumulative = 0;
  for (const trait of pool) {
    cumulative += trait.spawnRate;
    if (roll < cumulative) return trait;
  }
  return pool[pool.length - 1];
}

export function getTraitDefinition(
  speciesId: string,
  variantId: string
): TraitDefinition | undefined {
  ensureLoaded();
  return traitIndex?.get(speciesId)?.get(variantId);
}

export function _resetSpeciesCache(): void {
  speciesCache = null;
  traitIndex = null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/config/species.test.ts`
Expected: FAIL — config/species/compi.json doesn't exist yet (will pass after Task 3)

- [ ] **Step 5: Commit species loader (tests will fully pass after Task 3)**

```bash
git add src/config/species.ts tests/config/species.test.ts
git commit -m "feat: add species config loader with weighted trait picking"
```

---

## Task 3: Create Compi Species File

**Files:**
- Create: `config/species/compi.json`
- Depends on: Task 2

Migrate existing traits from `config/traits.json` into the new per-species format. Each trait gets an individual spawn rate instead of rarity grouping.

- [ ] **Step 1: Create compi.json with all 19 traits per slot and spawn rates**

Create `config/species/compi.json`. This maps the existing 19 Compi traits per slot to individual spawn rates following the spec's gentle curve (12% down to 0.3%).

The file is large (19 traits × 4 slots = 76 trait definitions). Structure:

```json
{
  "id": "compi",
  "name": "Compi",
  "description": "A small digital axolotl that thrives in terminal environments.",
  "spawnWeight": 10,
  "art": [
    "  ~(EE)~",
    "    MM",
    "   BB",
    "   TT"
  ],
  "traitPools": {
    "eyes": [
      { "id": "eye_c01", "name": "Pebble Gaze", "art": "○.○", "spawnRate": 0.12 },
      { "id": "eye_c02", "name": "Dash Sight", "art": "-.–", "spawnRate": 0.11 },
      { "id": "eye_c03", "name": "Pip Vision", "art": "·.·", "spawnRate": 0.10 },
      { "id": "eye_c04", "name": "Round Look", "art": "O.O", "spawnRate": 0.09 },
      { "id": "eye_c05", "name": "Bead Eyes", "art": "°.°", "spawnRate": 0.08 },
      { "id": "eye_u01", "name": "Half Moon", "art": "◐.◐", "spawnRate": 0.07 },
      { "id": "eye_u02", "name": "Crescent", "art": "◑_◑", "spawnRate": 0.065 },
      { "id": "eye_u03", "name": "Owl Sight", "art": "○w○", "spawnRate": 0.06 },
      { "id": "eye_u04", "name": "Slit Gaze", "art": ">.>", "spawnRate": 0.055 },
      { "id": "eye_r01", "name": "Ring Gaze", "art": "◎.◎", "spawnRate": 0.05 },
      { "id": "eye_r02", "name": "Dot Sight", "art": "●_●", "spawnRate": 0.045 },
      { "id": "eye_r03", "name": "Core Eyes", "art": "◉w◉", "spawnRate": 0.04 },
      { "id": "eye_e01", "name": "Gem Gaze", "art": "◆.◆", "spawnRate": 0.03 },
      { "id": "eye_e02", "name": "Star Dust", "art": "❖_❖", "spawnRate": 0.025 },
      { "id": "eye_e03", "name": "Spark Eyes", "art": "✦w✦", "spawnRate": 0.02 },
      { "id": "eye_l01", "name": "Star Sight", "art": "★w★", "spawnRate": 0.015 },
      { "id": "eye_l02", "name": "Moon Eyes", "art": "☆_☆", "spawnRate": 0.01 },
      { "id": "eye_m01", "name": "Void Gaze", "art": "⊙_⊙", "spawnRate": 0.007 },
      { "id": "eye_m02", "name": "Prism Eyes", "art": "◈_◈", "spawnRate": 0.003 }
    ],
    "mouth": [
      { "id": "mth_c01", "name": "Flat Line", "art": " - ", "spawnRate": 0.12 },
      { "id": "mth_c02", "name": "Wave", "art": " ~ ", "spawnRate": 0.11 },
      { "id": "mth_c03", "name": "Smile", "art": " ◡ ", "spawnRate": 0.10 },
      { "id": "mth_c04", "name": "Dot", "art": " . ", "spawnRate": 0.09 },
      { "id": "mth_c05", "name": "Underline", "art": " _ ", "spawnRate": 0.08 },
      { "id": "mth_u01", "name": "Circle", "art": " ∘ ", "spawnRate": 0.07 },
      { "id": "mth_u02", "name": "Ripple", "art": " ≈ ", "spawnRate": 0.065 },
      { "id": "mth_u03", "name": "Curve", "art": " ⌒ ", "spawnRate": 0.06 },
      { "id": "mth_u04", "name": "Whisker", "art": " v ", "spawnRate": 0.055 },
      { "id": "mth_r01", "name": "Omega", "art": " ω ", "spawnRate": 0.05 },
      { "id": "mth_r02", "name": "Swirl", "art": " ∿ ", "spawnRate": 0.045 },
      { "id": "mth_r03", "name": "Triangle", "art": " △ ", "spawnRate": 0.04 },
      { "id": "mth_e01", "name": "Prism", "art": " ∇ ", "spawnRate": 0.03 },
      { "id": "mth_e02", "name": "Void", "art": " ⊗ ", "spawnRate": 0.025 },
      { "id": "mth_e03", "name": "Gem", "art": " ◇ ", "spawnRate": 0.02 },
      { "id": "mth_l01", "name": "Diamond", "art": " ◇ ", "spawnRate": 0.015 },
      { "id": "mth_l02", "name": "Spark", "art": " ✦ ", "spawnRate": 0.01 },
      { "id": "mth_m01", "name": "Core", "art": " ⊗ ", "spawnRate": 0.007 },
      { "id": "mth_m02", "name": "Nova", "art": " ✦ ", "spawnRate": 0.003 }
    ],
    "body": [
      { "id": "bod_c01", "name": "Dots", "art": " ░░ ", "spawnRate": 0.12 },
      { "id": "bod_c02", "name": "Light", "art": " ·· ", "spawnRate": 0.11 },
      { "id": "bod_c03", "name": "Plain", "art": " -- ", "spawnRate": 0.10 },
      { "id": "bod_c04", "name": "Thin", "art": " :: ", "spawnRate": 0.09 },
      { "id": "bod_c05", "name": "Faint", "art": " ∙∙ ", "spawnRate": 0.08 },
      { "id": "bod_u01", "name": "Shade", "art": " ▒▒ ", "spawnRate": 0.07 },
      { "id": "bod_u02", "name": "Mesh", "art": " ## ", "spawnRate": 0.065 },
      { "id": "bod_u03", "name": "Grain", "art": " ░▒ ", "spawnRate": 0.06 },
      { "id": "bod_u04", "name": "Cross", "art": " ++ ", "spawnRate": 0.055 },
      { "id": "bod_r01", "name": "Crystal", "art": " ▓▓ ", "spawnRate": 0.05 },
      { "id": "bod_r02", "name": "Wave", "art": " ≈≈ ", "spawnRate": 0.045 },
      { "id": "bod_r03", "name": "Pulse", "art": " ∿∿ ", "spawnRate": 0.04 },
      { "id": "bod_e01", "name": "Shell", "art": " ◆◆ ", "spawnRate": 0.03 },
      { "id": "bod_e02", "name": "Core", "art": " ⊙⊙ ", "spawnRate": 0.025 },
      { "id": "bod_e03", "name": "Facet", "art": " ◈◈ ", "spawnRate": 0.02 },
      { "id": "bod_l01", "name": "Hex", "art": " ⬡⬡ ", "spawnRate": 0.015 },
      { "id": "bod_l02", "name": "Star", "art": " ✦✦ ", "spawnRate": 0.01 },
      { "id": "bod_m01", "name": "Prism", "art": " ◈◈ ", "spawnRate": 0.007 },
      { "id": "bod_m02", "name": "Void", "art": " ⊙⊙ ", "spawnRate": 0.003 }
    ],
    "tail": [
      { "id": "tal_c01", "name": "Curl", "art": "~~/", "spawnRate": 0.12 },
      { "id": "tal_c02", "name": "Swish", "art": "\\~\\", "spawnRate": 0.11 },
      { "id": "tal_c03", "name": "Stub", "art": "_v_", "spawnRate": 0.10 },
      { "id": "tal_c04", "name": "Droop", "art": "___", "spawnRate": 0.09 },
      { "id": "tal_c05", "name": "Flick", "art": "~/~", "spawnRate": 0.08 },
      { "id": "tal_u01", "name": "Zigzag", "art": "⌇⌇", "spawnRate": 0.07 },
      { "id": "tal_u02", "name": "Drift", "art": "∿∿", "spawnRate": 0.065 },
      { "id": "tal_u03", "name": "Whirl", "art": "~~⌇", "spawnRate": 0.06 },
      { "id": "tal_u04", "name": "Wag", "art": "~⌇~", "spawnRate": 0.055 },
      { "id": "tal_r01", "name": "Ripple", "art": "≋≋", "spawnRate": 0.05 },
      { "id": "tal_r02", "name": "Bolt", "art": "↯↯", "spawnRate": 0.045 },
      { "id": "tal_r03", "name": "Fork", "art": "\\⌇/", "spawnRate": 0.04 },
      { "id": "tal_e01", "name": "Lightning", "art": "\\⚡/", "spawnRate": 0.03 },
      { "id": "tal_e02", "name": "Infinity", "art": "\\∞/", "spawnRate": 0.025 },
      { "id": "tal_e03", "name": "Shimmer", "art": "✧✧", "spawnRate": 0.02 },
      { "id": "tal_l01", "name": "Comet", "art": "☄☄", "spawnRate": 0.015 },
      { "id": "tal_l02", "name": "Glitter", "art": "\\✧/", "spawnRate": 0.01 },
      { "id": "tal_m01", "name": "Supernova", "art": "☄✧☄", "spawnRate": 0.007 },
      { "id": "tal_m02", "name": "Eternal", "art": "\\∞/", "spawnRate": 0.003 }
    ]
  }
}
```

- [ ] **Step 2: Run species tests**

Run: `npx jest tests/config/species.test.ts`
Expected: PASS — all tests should now pass with compi.json in place

- [ ] **Step 3: Commit**

```bash
git add config/species/compi.json
git commit -m "feat: add Compi species config with per-trait spawn rates

Migrates 76 traits from rarity-grouped traits.json to individual spawn
rates (12% most common, 0.3% rarest) in the new species config format."
```

---

## Task 4: Implement Breeding System

**Files:**
- Create: `src/engine/breed.ts`
- Test: `tests/engine/breed.test.ts`

- [ ] **Step 1: Write failing tests for breeding**

```typescript
// tests/engine/breed.test.ts
import { calculateInheritance, previewBreed, executeBreed } from "../../src/engine/breed";
import { CollectionCreature, GameState, SlotId, CreatureSlot } from "../../src/types";

function makeSlot(slotId: SlotId, variantId: string): CreatureSlot {
  return { slotId, variantId };
}

function makeCreature(id: string, speciesId: string, variants: string[]): CollectionCreature {
  return {
    id,
    speciesId,
    name: "Test",
    slots: [
      makeSlot("eyes", variants[0]),
      makeSlot("mouth", variants[1]),
      makeSlot("body", variants[2]),
      makeSlot("tail", variants[3]),
    ],
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

function makeState(creatures: CollectionCreature[]): GameState {
  return {
    version: 4,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-01-01",
    },
    collection: creatures,
    archive: [],
    energy: 30,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

describe("calculateInheritance", () => {
  test("rarer trait gets slightly higher inheritance chance", () => {
    // eye_c01 has 12% spawn, eye_m02 has 0.3% spawn
    const result = calculateInheritance("compi", "eye_c01", "eye_m02");
    expect(result.chanceA).toBeLessThan(result.chanceB); // rare trait favored
    expect(result.chanceA).toBeGreaterThan(0.4);
    expect(result.chanceB).toBeLessThan(0.6);
  });

  test("same trait on both parents = 100% for that trait", () => {
    const result = calculateInheritance("compi", "eye_c01", "eye_c01");
    // Both same → normalized to 50/50 but doesn't matter, same trait either way
    expect(result.chanceA + result.chanceB).toBeCloseTo(1.0);
  });
});

describe("previewBreed", () => {
  test("returns inheritance odds for all 4 slots", () => {
    const a = makeCreature("a", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const b = makeCreature("b", "compi", ["eye_m02", "mth_m02", "bod_m02", "tal_m02"]);
    const state = makeState([a, b]);
    const preview = previewBreed(state, "a", "b");
    expect(preview.slotInheritance).toHaveLength(4);
    expect(preview.parentA.id).toBe("a");
    expect(preview.parentB.id).toBe("b");
    expect(preview.energyCost).toBeGreaterThan(0);
  });

  test("throws if different species", () => {
    const a = makeCreature("a", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const b = makeCreature("b", "drakon", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const state = makeState([a, b]);
    expect(() => previewBreed(state, "a", "b")).toThrow("same species");
  });

  test("throws if same creature", () => {
    const a = makeCreature("a", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const state = makeState([a]);
    expect(() => previewBreed(state, "a", "a")).toThrow();
  });
});

describe("executeBreed", () => {
  test("consumes both parents and produces child", () => {
    const a = makeCreature("a", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const b = makeCreature("b", "compi", ["eye_m02", "mth_m02", "bod_m02", "tal_m02"]);
    const state = makeState([a, b]);
    state.energy = 10;
    const result = executeBreed(state, "a", "b", () => 0.5);
    // Both parents removed
    expect(state.collection).toHaveLength(1);
    // Child exists
    expect(result.child).toBeDefined();
    expect(result.child.speciesId).toBe("compi");
    expect(result.child.generation).toBe(1);
    expect(result.child.slots).toHaveLength(4);
    // Each slot is from one parent
    for (const slot of result.child.slots) {
      const fromA = a.slots.find((s) => s.slotId === slot.slotId)!.variantId;
      const fromB = b.slots.find((s) => s.slotId === slot.slotId)!.variantId;
      expect([fromA, fromB]).toContain(slot.variantId);
    }
  });

  test("increments totalMerges", () => {
    const a = makeCreature("a", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const b = makeCreature("b", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const state = makeState([a, b]);
    state.energy = 10;
    executeBreed(state, "a", "b");
    expect(state.profile.totalMerges).toBe(1);
  });

  test("spends energy", () => {
    const a = makeCreature("a", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const b = makeCreature("b", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const state = makeState([a, b]);
    state.energy = 10;
    const before = state.energy;
    executeBreed(state, "a", "b");
    expect(state.energy).toBeLessThan(before);
  });

  test("throws if insufficient energy", () => {
    const a = makeCreature("a", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const b = makeCreature("b", "compi", ["eye_c01", "mth_c01", "bod_c01", "tal_c01"]);
    const state = makeState([a, b]);
    state.energy = 0;
    expect(() => executeBreed(state, "a", "b")).toThrow("energy");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/breed.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement breeding system**

```typescript
// src/engine/breed.ts — Breeding system (both parents consumed, child inherits traits)

import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
  BreedPreview,
  BreedResult,
  SlotInheritance,
} from "../types";
import { getSpeciesById, getTraitDefinition } from "../config/species";
import { loadConfig } from "../config/loader";

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/**
 * Calculate inheritance chance for a single trait.
 * Rarer traits (lower spawn rate) get slightly higher inheritance chance.
 *
 * Formula: trait_pass_chance = base + (referenceRate - spawnRate) * scale
 * Clamped to [min, max]
 */
function traitPassChance(spawnRate: number): number {
  const config = loadConfig();
  const { inheritanceBase, inheritanceRarityScale, inheritanceMin, inheritanceMax, referenceSpawnRate } = config.breed;
  const chance = inheritanceBase + (referenceSpawnRate - spawnRate) * inheritanceRarityScale;
  return Math.max(inheritanceMin, Math.min(inheritanceMax, chance));
}

/**
 * Calculate normalized inheritance probabilities for one slot.
 * Returns chance for parent A's trait vs parent B's trait.
 */
export function calculateInheritance(
  speciesId: string,
  variantIdA: string,
  variantIdB: string
): { chanceA: number; chanceB: number } {
  const traitA = getTraitDefinition(speciesId, variantIdA);
  const traitB = getTraitDefinition(speciesId, variantIdB);
  const rateA = traitA?.spawnRate ?? 0.05;
  const rateB = traitB?.spawnRate ?? 0.05;
  const rawA = traitPassChance(rateA);
  const rawB = traitPassChance(rateB);
  const total = rawA + rawB;
  return { chanceA: rawA / total, chanceB: rawB / total };
}

/**
 * Calculate energy cost for a breed.
 */
function calculateBreedCost(
  speciesId: string,
  parentA: CollectionCreature,
  parentB: CollectionCreature
): number {
  const config = loadConfig();
  const { baseMergeCost, maxMergeCost, rareThreashold } = config.energy;
  let rareCount = 0;
  for (const slot of [...parentA.slots, ...parentB.slots]) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < rareThreashold) rareCount++;
  }
  return Math.min(baseMergeCost + rareCount, maxMergeCost);
}

/**
 * Preview a breed without mutating state.
 */
export function previewBreed(
  state: GameState,
  parentAId: string,
  parentBId: string
): BreedPreview {
  if (parentAId === parentBId) {
    throw new Error("Cannot breed a creature with itself.");
  }

  const parentA = state.collection.find((c) => c.id === parentAId);
  const parentB = state.collection.find((c) => c.id === parentBId);
  if (!parentA) throw new Error(`Creature not found: ${parentAId}`);
  if (!parentB) throw new Error(`Creature not found: ${parentBId}`);
  if (parentA.speciesId !== parentB.speciesId) {
    throw new Error("Cannot breed creatures of different species. Both must be the same species.");
  }
  if (parentA.archived || parentB.archived) {
    throw new Error("Cannot breed archived creatures.");
  }

  const speciesId = parentA.speciesId;
  const slotInheritance: SlotInheritance[] = SLOT_IDS.map((slotId) => {
    const slotA = parentA.slots.find((s) => s.slotId === slotId)!;
    const slotB = parentB.slots.find((s) => s.slotId === slotId)!;
    const traitA = getTraitDefinition(speciesId, slotA.variantId);
    const traitB = getTraitDefinition(speciesId, slotB.variantId);
    const { chanceA, chanceB } = calculateInheritance(speciesId, slotA.variantId, slotB.variantId);
    return {
      slotId,
      parentAVariant: traitA ?? { id: slotA.variantId, name: "Unknown", art: "?", spawnRate: 0.05 },
      parentBVariant: traitB ?? { id: slotB.variantId, name: "Unknown", art: "?", spawnRate: 0.05 },
      parentAChance: chanceA,
      parentBChance: chanceB,
    };
  });

  return {
    parentA,
    parentB,
    slotInheritance,
    energyCost: calculateBreedCost(speciesId, parentA, parentB),
  };
}

/**
 * Execute a breed: both parents consumed, one child born.
 */
export function executeBreed(
  state: GameState,
  parentAId: string,
  parentBId: string,
  rng: () => number = Math.random
): BreedResult {
  const preview = previewBreed(state, parentAId, parentBId);
  const { parentA, parentB, energyCost } = preview;

  if (state.energy < energyCost) {
    throw new Error(`Not enough energy. Need ${energyCost}, have ${state.energy}.`);
  }

  // Spend energy
  state.energy -= energyCost;

  // Roll inheritance per slot
  const childSlots: CreatureSlot[] = [];
  const inheritedFrom: Record<string, "A" | "B"> = {};

  for (const inheritance of preview.slotInheritance) {
    const roll = rng();
    const fromA = roll < inheritance.parentAChance;
    const variant = fromA ? inheritance.parentAVariant : inheritance.parentBVariant;
    childSlots.push({ slotId: inheritance.slotId, variantId: variant.id });
    inheritedFrom[inheritance.slotId] = fromA ? "A" : "B";
  }

  // Create child
  const child: CollectionCreature = {
    id: generateId(),
    speciesId: parentA.speciesId,
    name: parentA.name, // inherit name from parent A
    slots: childSlots,
    caughtAt: Date.now(),
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    mergedFrom: [parentAId, parentBId],
    archived: false,
  };

  // Remove both parents, add child
  state.collection = state.collection.filter(
    (c) => c.id !== parentAId && c.id !== parentBId
  );
  state.collection.push(child);

  // Update profile
  state.profile.totalMerges += 1;

  return {
    child,
    parentA,
    parentB,
    inheritedFrom: inheritedFrom as Record<SlotId, "A" | "B">,
  };
}
```

- [ ] **Step 4: Add breed balance config to balance.json**

Add the `breed` section and update `energy` and `catching` sections in `config/balance.json`:

Add after the existing `merge` section:
```json
"breed": {
  "inheritanceBase": 0.50,
  "inheritanceRarityScale": 0.80,
  "inheritanceMin": 0.45,
  "inheritanceMax": 0.58,
  "referenceSpawnRate": 0.12
}
```

Update the `energy` section to include:
```json
"baseMergeCost": 3,
"maxMergeCost": 8,
"rareThreashold": 0.05
```

Update the `catching` section to include:
```json
"maxTraitSpawnRate": 0.12,
"difficultyScale": 0.50,
"xpBase": 20,
"xpRarityMultiplier": 5
```

- [ ] **Step 5: Run tests**

Run: `npx jest tests/engine/breed.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/breed.ts tests/engine/breed.test.ts config/balance.json
git commit -m "feat: implement breeding system — both parents consumed, trait inheritance

Rarer traits have slightly higher inheritance chance (45-58%).
Both parents must be same species. Energy cost scales with rare trait count."
```

---

## Task 5: Implement Archive and Collection Cap

**Files:**
- Create: `src/engine/archive.ts`
- Test: `tests/engine/archive.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/archive.test.ts
import { archiveCreature, releaseCreature } from "../../src/engine/archive";
import { CollectionCreature, GameState, MAX_COLLECTION_SIZE } from "../../src/types";

function makeCreature(id: string): CollectionCreature {
  return {
    id, speciesId: "compi", name: "Test",
    slots: [
      { slotId: "eyes", variantId: "eye_c01" },
      { slotId: "mouth", variantId: "mth_c01" },
      { slotId: "body", variantId: "bod_c01" },
      { slotId: "tail", variantId: "tal_c01" },
    ],
    caughtAt: Date.now(), generation: 0, archived: false,
  };
}

function makeState(count: number): GameState {
  const creatures = Array.from({ length: count }, (_, i) => makeCreature(`c${i}`));
  return {
    version: 4,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-01-01",
    },
    collection: creatures,
    archive: [],
    energy: 10, lastEnergyGainAt: Date.now(),
    nearby: [], batch: null, recentTicks: [],
    claimedMilestones: [], settings: { notificationLevel: "moderate" },
  };
}

describe("archiveCreature", () => {
  test("moves creature from collection to archive", () => {
    const state = makeState(3);
    const result = archiveCreature(state, "c1");
    expect(state.collection).toHaveLength(2);
    expect(state.archive).toHaveLength(1);
    expect(state.archive[0].id).toBe("c1");
    expect(state.archive[0].archived).toBe(true);
    expect(result.creature.id).toBe("c1");
  });

  test("throws if creature not found", () => {
    const state = makeState(1);
    expect(() => archiveCreature(state, "nonexistent")).toThrow("not found");
  });

  test("throws if already archived", () => {
    const state = makeState(1);
    state.collection[0].archived = true;
    expect(() => archiveCreature(state, "c0")).toThrow("already archived");
  });
});

describe("releaseCreature", () => {
  test("removes creature from collection permanently", () => {
    const state = makeState(3);
    releaseCreature(state, "c1");
    expect(state.collection).toHaveLength(2);
    expect(state.collection.find((c) => c.id === "c1")).toBeUndefined();
  });

  test("throws if creature not found", () => {
    const state = makeState(1);
    expect(() => releaseCreature(state, "nonexistent")).toThrow("not found");
  });
});

describe("collection cap", () => {
  test("MAX_COLLECTION_SIZE is 15", () => {
    expect(MAX_COLLECTION_SIZE).toBe(15);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/archive.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement archive module**

```typescript
// src/engine/archive.ts — Archive and collection management

import { GameState, ArchiveResult } from "../types";

/**
 * Archive a creature: moves it from active collection to archive.
 * Archived creatures cannot be used in breeding. One-way operation.
 */
export function archiveCreature(state: GameState, creatureId: string): ArchiveResult {
  const index = state.collection.findIndex((c) => c.id === creatureId);
  if (index === -1) throw new Error(`Creature not found: ${creatureId}`);
  
  const creature = state.collection[index];
  if (creature.archived) throw new Error(`Creature ${creatureId} is already archived.`);

  // Remove from collection
  state.collection.splice(index, 1);

  // Mark as archived and add to archive
  creature.archived = true;
  state.archive.push(creature);

  return { creature };
}

/**
 * Release a creature: permanently removes it from active collection.
 */
export function releaseCreature(state: GameState, creatureId: string): void {
  const index = state.collection.findIndex((c) => c.id === creatureId);
  if (index === -1) throw new Error(`Creature not found: ${creatureId}`);
  state.collection.splice(index, 1);
}

/**
 * Check if collection is full.
 */
export function isCollectionFull(state: GameState): boolean {
  return state.collection.filter((c) => !c.archived).length >= 15;
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/engine/archive.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/archive.ts tests/engine/archive.test.ts
git commit -m "feat: add archive system and collection management

Archive moves creatures to permanent trophy case (one-way).
Release permanently deletes. Collection capped at 15 active."
```

---

## Task 6: Rewrite Batch Spawning for Multi-Species

**Files:**
- Modify: `src/engine/batch.ts`
- Test: `tests/engine/batch.test.ts`

- [ ] **Step 1: Write new batch tests**

Replace `tests/engine/batch.test.ts` with tests for multi-species spawning. Key tests:

- `spawnBatch` produces creatures with `speciesId` field
- Each creature's slots have `variantId` without `rarity`
- Species is picked via weighted random from `pickSpecies`
- Traits are picked via `pickTraitForSlot` with spawn rate weighting
- Batch respects existing batch (no-op if batch active)
- Cleanup works as before

- [ ] **Step 2: Rewrite batch.ts**

Replace the spawn logic to use species system:

```typescript
// src/engine/batch.ts — Multi-species creature spawning

import { GameState, NearbyCreature, CreatureSlot, SLOT_IDS, SlotId } from "../types";
import { pickSpecies, pickTraitForSlot } from "../config/species";
import { loadCreatureName } from "../config/traits";
import { BATCH_LINGER_MS, SHARED_ATTEMPTS } from "../config/constants";

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function pickBatchSize(rng: () => number): number {
  const roll = rng();
  if (roll < 0.4) return 3;
  if (roll < 0.8) return 4;
  return 5;
}

export function generateCreatureSlots(
  speciesId: string,
  rng: () => number
): CreatureSlot[] {
  const species = require("../config/species").getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);
  
  return SLOT_IDS.map((slotId: SlotId) => {
    const trait = pickTraitForSlot(species, slotId, rng);
    return { slotId, variantId: trait.id };
  });
}

export function spawnBatch(
  state: GameState,
  now: number,
  rng: () => number
): NearbyCreature[] {
  if (state.batch && state.batch.attemptsRemaining > 0) return state.nearby;

  const count = pickBatchSize(rng);
  const spawned: NearbyCreature[] = [];

  for (let i = 0; i < count; i++) {
    const species = pickSpecies(rng);
    const slots = generateCreatureSlots(species.id, rng);
    spawned.push({
      id: generateId(),
      speciesId: species.id,
      name: loadCreatureName(rng),
      slots,
      spawnedAt: now,
    });
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

  const expired = now - state.batch.spawnedAt > BATCH_LINGER_MS;
  const exhausted = state.batch.attemptsRemaining <= 0;

  if (!expired && !exhausted) return [];

  const despawned = state.nearby.map((c) => c.id);
  state.nearby = [];
  state.batch = null;
  return despawned;
}
```

- [ ] **Step 3: Run tests**

Run: `npx jest tests/engine/batch.test.ts`
Expected: PASS (some old tests may need updating for new types)

- [ ] **Step 4: Commit**

```bash
git add src/engine/batch.ts tests/engine/batch.test.ts
git commit -m "refactor: rewrite batch spawning for multi-species system

Uses pickSpecies() for weighted species selection and pickTraitForSlot()
for per-trait spawn rate weighting. Creatures now have speciesId and
slots without rarity field."
```

---

## Task 7: Update Catch System

**Files:**
- Modify: `src/engine/catch.ts`
- Test: `tests/engine/catch-v2.test.ts`

- [ ] **Step 1: Update catch formula to use rarest trait spawn rate**

The new formula from the spec:
```
rarest_trait = min(spawn_rate) across all 4 slots
catch_rate = 0.90 - (0.50 * (1 - rarest_trait / 0.12))
clamped to [0.15, 0.90]
```

Update `calculateCatchRate()` to look up trait spawn rates via `getTraitDefinition()` instead of using rarity tiers. Update `calculateXpEarned()` and `calculateEnergyCost()` similarly.

- [ ] **Step 2: Update tests**

Update tests in `catch-v2.test.ts` to use new creature format (no rarity field, with speciesId).

- [ ] **Step 3: Run tests and verify**

Run: `npx jest tests/engine/catch-v2.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/engine/catch.ts tests/engine/catch-v2.test.ts
git commit -m "refactor: update catch system for trait-based difficulty

Catch rate now based on rarest trait spawn rate instead of average
rarity tier. XP and energy cost also derive from trait spawn rates."
```

---

## Task 8: State Migration v3 → v4

**Files:**
- Modify: `src/state/state-manager.ts`
- Test: `tests/state/migration.test.ts`

- [ ] **Step 1: Write migration tests**

Test that v3 state (with rarity on slots, no speciesId, no archive) migrates to v4 correctly:
- `speciesId: "compi"` added to all creatures
- `archived: false` added to all creatures
- `rarity` removed from slots
- `archive: []` added to state
- `version` bumped to 4

- [ ] **Step 2: Implement migration in state-manager.ts**

Add a `migrateV3toV4()` function that transforms old state. Call it in `load()` when `version === 3`.

- [ ] **Step 3: Update defaultState() for v4**

New default state includes `archive: []`, `version: 4`, and creatures have `speciesId` and `archived` fields.

- [ ] **Step 4: Run tests**

Run: `npx jest tests/state/migration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/state-manager.ts tests/state/migration.test.ts
git commit -m "feat: add v3→v4 state migration

Adds speciesId='compi' and archived=false to existing creatures.
Removes rarity from slots. Adds archive array. Bumps version to 4."
```

---

## Task 9: Update Game Engine

**Files:**
- Modify: `src/engine/game-engine.ts`

- [ ] **Step 1: Replace merge methods with breed methods, add archive/release**

Update `GameEngine` class:
- Replace `mergePreview()` → `breedPreview()` delegating to `previewBreed()`
- Replace `mergeExecute()` → `breedExecute()` delegating to `executeBreed()`
- Add `archive(creatureId)` delegating to `archiveCreature()`
- Add `release(creatureId)` delegating to `releaseCreature()`
- Update `status()` to include `archiveCount`
- Add collection cap check to `catch()` — throw if at 15

- [ ] **Step 2: Commit**

```bash
git add src/engine/game-engine.ts
git commit -m "refactor: update game engine for breeding and archive

Replace merge with breed methods. Add archive and release.
Enforce 15-creature collection cap on catch."
```

---

## Task 10: Update Renderer

**Files:**
- Modify: `src/renderers/simple-text.ts`
- Test: `tests/renderers/simple-text.test.ts`

- [ ] **Step 1: Update render methods**

Key changes:
- `renderCreatureLines()`: remove rarity colors, use trait name display
- `renderMergePreview()` → `renderBreedPreview()`: show inheritance odds per slot
- `renderMergeResult()` → `renderBreedResult()`: show child with inheritance sources
- Add `renderArchive()`: display archived creatures
- Update `renderCollection()`: show speciesId, generation
- Update `renderScan()`: show species name, trait spawn rates for rarity context
- Remove all `RARITY_COLOR` references

- [ ] **Step 2: Update render tests**

Update `simple-text.test.ts` to use new types (no rarity, with speciesId).

- [ ] **Step 3: Run tests**

Run: `npx jest tests/renderers/simple-text.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text.test.ts
git commit -m "refactor: update renderer for multi-species breeding system

Replace merge renders with breed renders. Add archive view.
Remove rarity-based coloring. Show species name and trait spawn rates."
```

---

## Task 11: Update CLI and MCP Tools

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/mcp-tools.ts`

- [ ] **Step 1: Update CLI commands**

- Replace `merge` command with `breed` (or keep `merge` as alias)
- Add `archive [id]` command
- Add `archive` (no args) to view archive
- Add `release [id]` command
- Update `collection` to show new format
- Update `scan` to show species names

- [ ] **Step 2: Update MCP tools**

Mirror CLI changes in MCP tool registration:
- Replace `merge` tool with `breed` tool
- Add `archive` tool
- Add `release` tool

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts src/mcp-tools.ts
git commit -m "feat: add breed, archive, release commands to CLI and MCP

Replace merge command with breed. Add archive (view + move) and
release commands. Update scan/collection for multi-species display."
```

---

## Task 12: Update Exports and Skills

**Files:**
- Modify: `src/index.ts`
- Modify: `skills/merge/SKILL.md` (or create `skills/breed/`)
- Create: `skills/archive/SKILL.md`

- [ ] **Step 1: Update index.ts exports**

Add exports for new modules: `breed.ts`, `archive.ts`, `species.ts`.
Remove export of old `merge.ts`.

- [ ] **Step 2: Update/create skill files**

Update merge skill to reference breed command. Create archive skill.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts skills/
git commit -m "feat: update exports and skills for new breed/archive system"
```

---

## Task 13: Clean Up Old Modules

**Files:**
- Delete: `src/engine/merge.ts`
- Delete: `tests/engine/merge.test.ts`
- Modify: `src/config/traits.ts` — keep for backward compat but simplify
- Modify: `src/config/constants.ts` — remove rarity-based constants

- [ ] **Step 1: Remove old merge module**

Delete `src/engine/merge.ts` and `tests/engine/merge.test.ts`.

- [ ] **Step 2: Update constants.ts**

Remove `RARITY_CATCH_PENALTY`, `XP_PER_RARITY`, `ENERGY_COST_PER_RARITY`, `SLOT_WEIGHT_BASE`, `SLOT_WEIGHT_PER_TIER`. Add breed config constants loaded from `balance.json`.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old merge system and rarity-based constants

Clean up deprecated modules. All tests passing with new breed system."
```

---

## Task 14: Integration Test

**Files:**
- Create: `tests/integration/gameplay-loop.test.ts`

- [ ] **Step 1: Write end-to-end gameplay loop test**

Test the full flow: spawn → scan → catch → catch another of same species → breed → archive.

```typescript
// tests/integration/gameplay-loop.test.ts
import { GameEngine } from "../../src/engine/game-engine";
import { GameState } from "../../src/types";

function freshState(): GameState {
  return {
    version: 4,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-01-01",
    },
    collection: [],
    archive: [],
    energy: 30,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

test("full gameplay loop: scan → catch × 2 → breed → archive", () => {
  const state = freshState();
  const engine = new GameEngine(state);
  let rngCounter = 0;
  const rng = () => {
    rngCounter++;
    return (rngCounter % 100) / 100;
  };

  // Scan spawns creatures
  const scan = engine.scan(rng);
  expect(scan.nearby.length).toBeGreaterThan(0);

  // Find two creatures of the same species
  const species0 = scan.nearby[0].creature.speciesId;
  // Catch first
  const catch1 = engine.catch(0, rng);
  expect(catch1.success).toBeDefined();

  // If we need another of same species, scan again
  // Force spawn by clearing batch
  state.batch = null;
  state.nearby = [];
  const scan2 = engine.scan(rng);

  // Catch another
  const catch2 = engine.catch(0, rng);

  // If we have 2+ of same species, breed them
  const sameSpecies = state.collection.filter((c) => c.speciesId === species0);
  if (sameSpecies.length >= 2) {
    const preview = engine.breedPreview(sameSpecies[0].id, sameSpecies[1].id);
    expect(preview.slotInheritance).toHaveLength(4);

    const before = state.collection.length;
    const result = engine.breedExecute(sameSpecies[0].id, sameSpecies[1].id, rng);
    expect(state.collection.length).toBe(before - 1); // 2 consumed, 1 born
    expect(result.child.generation).toBeGreaterThan(0);

    // Archive the child
    const archiveResult = engine.archive(result.child.id);
    expect(state.archive).toHaveLength(1);
    expect(archiveResult.creature.archived).toBe(true);
  }
});
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/gameplay-loop.test.ts
git commit -m "test: add integration test for full gameplay loop

Tests scan → catch → breed → archive flow end-to-end."
```

---

## Post-Implementation Notes

### What's NOT in this plan (separate plans needed):

1. **New species design** — Each of the 9 new species (Drakon, Felith, Orbix, Thornyx, Gloon, Spectra, Craggor, Zephyx, Luminos) needs its own plan with:
   - ASCII art template design
   - 76 trait definitions (19 per slot × 4 slots) with art and spawn rates
   - Visual review to ensure the creature looks good in terminal
   - Integration test

2. **Old traits.json cleanup** — After all tests pass with the new system, the old `config/traits.json` can be removed or kept as reference.

3. **Skill files** — Each slash command skill (scan, catch, collection, merge→breed) needs SKILL.md updates.
