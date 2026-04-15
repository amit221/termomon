# Breeding System Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace gold/quests/upgrades with a breeding-focused game loop: 8-color rarity system, rarity upgrades via breeding, cross-species hybrid creation, species progress tracking.

**Architecture:** Four phases executed sequentially: (1) Update types and migrate state v5→v6, (2) Remove gold/quest/upgrade systems, (3) Rewrite breeding engine with new rarity logic, (4) Update UI rendering and add `/species` command. Each phase produces passing tests before moving on.

**Tech Stack:** TypeScript, Jest (ts-jest), Node.js. Tests in `tests/` mirror `src/` structure.

**Spec:** `docs/superpowers/specs/2026-04-15-breeding-overhaul-design.md`

---

## File Map

### Modified Files
| File | Changes |
|------|---------|
| `src/types.ts` | Add 2 colors, add `rarity` to CreatureSlot, new state fields, remove quest/upgrade types |
| `src/state/state-manager.ts` | Add v5→v6 migration, update defaultState |
| `src/engine/breed.ts` | Complete rewrite: parents survive, rarity upgrades, cross-species detection |
| `src/engine/game-engine.ts` | Remove quest/upgrade/gold methods, add species command, update breed/scan flow |
| `src/engine/catch.ts` | Use `slot.rarity` instead of rank extraction for catch rate/cost |
| `src/engine/batch.ts` | Assign random rarity to each trait on spawn |
| `src/engine/progression.ts` | Rarity breeding cap by level (replaces rank cap) |
| `src/engine/advisor.ts` | Remove quest/upgrade suggestions, add breed suggestions |
| `src/engine/energy.ts` | Update session bonus to 5, starting energy to 15 |
| `config/balance.json` | Add new colors, update energy values, remove upgrade/quest/mergeGold sections |
| `src/renderers/simple-text-renderer.ts` | Update scan (one creature), breed result (↑ UP!), add species index render |
| `src/mcp-tools.ts` | Remove upgrade/quest tools, add species tool |
| `src/cli.ts` | Remove upgrade/quest commands, add species command |
| `tests/engine/breed.test.ts` | Complete rewrite for new breeding logic |
| `tests/state/state-manager.test.ts` | Add v5→v6 migration tests |

### Deleted Files
| File | Reason |
|------|--------|
| `src/engine/gold.ts` | Gold system removed |
| `src/engine/quest.ts` | Quest system removed |
| `src/engine/upgrade.ts` | Upgrade system removed |
| `tests/engine/gold.test.ts` | (if exists) |
| `tests/engine/quest.test.ts` | (if exists) |
| `tests/engine/upgrade.test.ts` | (if exists) |
| `skills/upgrade/` | Skill removed |
| `skills/quest/` | Skill removed (check actual skill folder names) |
| `docs/design-analysis/breeding-recipes-*.csv` | Old over-engineered artifacts |
| `docs/design-analysis/breeding-rules.md` | Old artifact |
| `docs/design-analysis/trait-relationships.md` | Old artifact |
| `docs/design-analysis/trait-pool.csv` | Old artifact |
| `docs/design-analysis/breeding-table.md` | Old artifact |
| `scripts/generate-breeding-tables.js` | Old artifact |

### New Files
| File | Purpose |
|------|---------|
| `src/engine/species-index.ts` | Species progress tracking (rarity tier discovery) |
| `tests/engine/species-index.test.ts` | Tests for species index |

---

## Phase 1: Types & State Migration

### Task 1: Expand CreatureColor to 8 colors

**Files:**
- Modify: `src/types.ts:31-32`
- Modify: `config/balance.json:2-9`

- [ ] **Step 1: Update CreatureColor type and array**

In `src/types.ts`, replace lines 31-32:

```typescript
export type CreatureColor = "grey" | "white" | "green" | "cyan" | "blue" | "magenta" | "yellow" | "red";
export const CREATURE_COLORS: CreatureColor[] = ["grey", "white", "green", "cyan", "blue", "magenta", "yellow", "red"];
```

- [ ] **Step 2: Update color spawn weights in balance.json**

In `config/balance.json`, replace the `colors` block:

```json
"colors": {
  "grey": 0.28,
  "white": 0.22,
  "green": 0.18,
  "cyan": 0.14,
  "blue": 0.08,
  "magenta": 0.05,
  "yellow": 0.03,
  "red": 0.02
},
```

- [ ] **Step 3: Run type check**

Run: `npm run build`
Expected: PASS (no type errors — existing code uses CreatureColor which still includes the old colors)

- [ ] **Step 4: Commit**

```bash
git add src/types.ts config/balance.json
git commit -m "feat: expand CreatureColor to 8 colors (add green, blue)"
```

---

### Task 2: Add rarity field to CreatureSlot

**Files:**
- Modify: `src/types.ts:23-27`

- [ ] **Step 1: Add optional rarity field to CreatureSlot**

In `src/types.ts`, update the CreatureSlot interface:

```typescript
export interface CreatureSlot {
  slotId: SlotId;
  variantId: string;
  color: CreatureColor;
  /** 0-7 rarity index. 0=common(grey), 7=mythic(red). Added in v6. */
  rarity?: number;
}
```

Make it optional (`?`) for backward compatibility during migration. After migration it will always be present.

- [ ] **Step 2: Add rarity-color mapping constant**

Below the CREATURE_COLORS array, add:

```typescript
/** Maps rarity index (0-7) to CreatureColor */
export const RARITY_COLORS: CreatureColor[] = ["grey", "white", "green", "cyan", "blue", "magenta", "yellow", "red"];
export const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Superior", "Elite", "Epic", "Legendary", "Mythic"] as const;
export type RarityName = typeof RARITY_NAMES[number];
```

- [ ] **Step 3: Run type check**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add rarity field to CreatureSlot with color mapping"
```

---

### Task 3: Update GameState and PlayerProfile for v6

**Files:**
- Modify: `src/types.ts:87-122`

- [ ] **Step 1: Remove quest/upgrade fields from PlayerProfile, add totalBreeds**

Replace `PlayerProfile` interface:

```typescript
export interface PlayerProfile {
  level: number;
  xp: number;
  totalCatches: number;
  totalMerges: number;  // kept for backward compat, renamed semantically to breeds
  totalTicks: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}
```

- [ ] **Step 2: Update GameState — remove gold/quest/upgrade, add new fields**

Replace `GameState` interface:

```typescript
export interface GameState {
  version: number; // 6
  profile: PlayerProfile;
  collection: CollectionCreature[];
  archive: CollectionCreature[];
  energy: number;
  lastEnergyGainAt: number;
  nearby: NearbyCreature[];
  batch: BatchState | null;
  lastSpawnAt: number;
  recentTicks: Tick[];
  claimedMilestones: string[];
  settings: GameSettings;
  discoveredSpecies: string[];
  currentSessionId: string;
  // v6 new fields
  speciesProgress: Record<string, boolean[]>;
  personalSpecies: SpeciesDefinition[];
  sessionBreedCount: number;
  breedCooldowns: Record<string, number>;
}
```

- [ ] **Step 3: Remove ActiveQuest, UpgradeResult, QuestStartResult, QuestCompleteResult interfaces**

Delete the following interface blocks from types.ts (lines ~124-158):
- `ActiveQuest`
- `UpgradeResult`
- `QuestStartResult`
- `QuestCompleteResult`

- [ ] **Step 4: Update StatusResult — remove gold and activeQuest**

```typescript
export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  archiveCount: number;
  energy: number;
  nearbyCount: number;
  batchAttemptsRemaining: number;
  discoveredCount: number;
  speciesProgress: Record<string, boolean[]>;
}
```

- [ ] **Step 5: Update SuggestedAction type — remove upgrade and quest**

```typescript
export interface SuggestedAction {
  type: "catch" | "breed" | "scan" | "release" | "collection";
  // ... rest stays the same but remove gold from cost
  cost: { energy?: number };
  // ...
}
```

- [ ] **Step 6: Update ProgressInfo — remove gold, quest references**

Remove from ProgressInfo: `gold`, `teamPower`, `nextPowerMilestone`, `nearestTierThreshold` fields. Add: `speciesProgress: Record<string, boolean[]>`.

- [ ] **Step 7: Update CompanionOverview — remove quest/upgrade**

Remove `upgradeOpportunities`, `questStatus`, `questSessionsRemaining` fields from CompanionOverview.

- [ ] **Step 8: Update Renderer interface — remove quest/upgrade render methods**

Remove: `renderUpgradeResult`, `renderQuestStart`, `renderQuestComplete`. Add: `renderSpeciesIndex(progress: Record<string, boolean[]>): string`.

- [ ] **Step 9: Run type check (expect errors in implementations — that's fine for now)**

Run: `npm run build`
Expected: ERRORS in implementation files that reference removed types. This is expected — we'll fix those in subsequent tasks.

- [ ] **Step 10: Commit**

```bash
git add src/types.ts
git commit -m "feat!: update types for v6 — remove gold/quest/upgrade, add rarity/species fields"
```

---

### Task 4: State migration v5 → v6

**Files:**
- Modify: `src/state/state-manager.ts`
- Test: `tests/state/state-manager.test.ts`

- [ ] **Step 1: Write migration test**

In `tests/state/state-manager.test.ts`, add:

```typescript
describe("migrateV5toV6", () => {
  it("strips _rN suffix from variantId and sets rarity", () => {
    const v5State = createV5State({
      collection: [
        makeCreature("c1", "compi", [
          { slotId: "eyes", variantId: "eye_c01_r3", color: "cyan" },
          { slotId: "mouth", variantId: "mth_r01_r0", color: "grey" },
          { slotId: "body", variantId: "bod_c02", color: "white" }, // no rank suffix
          { slotId: "tail", variantId: "tal_e01_r7", color: "red" },
        ]),
      ],
      gold: 42,
      activeQuest: { id: "q1", creatureIds: ["c1"], startedAtSession: 1, sessionsRemaining: 1, teamPower: 10 },
      sessionUpgradeCount: 2,
    });

    const migrated = migrateV5toV6(v5State);

    expect(migrated.version).toBe(6);
    // Rank suffix stripped, rarity set from rank
    expect(migrated.collection[0].slots[0].variantId).toBe("eye_c01");
    expect(migrated.collection[0].slots[0].rarity).toBe(3); // _r3 → rarity 3
    expect(migrated.collection[0].slots[1].rarity).toBe(0); // _r0 → rarity 0
    expect(migrated.collection[0].slots[2].rarity).toBe(0); // no suffix → rarity 0
    expect(migrated.collection[0].slots[3].rarity).toBe(7); // _r7 → rarity 7
    // Removed fields
    expect((migrated as any).gold).toBeUndefined();
    expect((migrated as any).activeQuest).toBeUndefined();
    expect((migrated as any).sessionUpgradeCount).toBeUndefined();
    // New fields
    expect(migrated.speciesProgress).toBeDefined();
    expect(migrated.personalSpecies).toEqual([]);
    expect(migrated.sessionBreedCount).toBe(0);
    expect(migrated.breedCooldowns).toEqual({});
  });

  it("initializes speciesProgress from existing collection", () => {
    const v5State = createV5State({
      collection: [
        makeCreature("c1", "compi", [
          { slotId: "eyes", variantId: "eye_c01_r0", color: "grey" },    // rarity 0 = common
          { slotId: "mouth", variantId: "mth_c01_r2", color: "cyan" },   // rarity 2 = rare
          { slotId: "body", variantId: "bod_c01_r0", color: "grey" },
          { slotId: "tail", variantId: "tal_c01_r5", color: "magenta" }, // rarity 5 = epic
        ]),
      ],
    });

    const migrated = migrateV5toV6(v5State);

    // Compi has tiers 0, 2, 5 discovered
    expect(migrated.speciesProgress["compi"][0]).toBe(true);  // common
    expect(migrated.speciesProgress["compi"][1]).toBe(false); // uncommon
    expect(migrated.speciesProgress["compi"][2]).toBe(true);  // rare
    expect(migrated.speciesProgress["compi"][5]).toBe(true);  // epic
  });
});
```

You'll need helper functions `createV5State` and `makeCreature` — create them as test utilities that produce valid v5 state objects.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/state/state-manager.test.ts --testNamePattern="migrateV5toV6" -v`
Expected: FAIL — `migrateV5toV6` doesn't exist yet

- [ ] **Step 3: Implement migrateV5toV6**

In `src/state/state-manager.ts`, add after `migrateV4toV5`:

```typescript
function migrateV5toV6(raw: Record<string, unknown>): GameState {
  const state = raw as any;

  // Strip _rN suffix from variantId, set rarity field
  for (const list of [state.collection, state.nearby, state.archive]) {
    if (Array.isArray(list)) {
      for (const creature of list) {
        if (Array.isArray(creature.slots)) {
          for (const slot of creature.slots) {
            const match = slot.variantId?.match(/_r(\d+)$/);
            if (match) {
              slot.rarity = parseInt(match[1], 10);
              slot.variantId = slot.variantId.replace(/_r\d+$/, "");
            } else {
              slot.rarity = slot.rarity ?? 0;
            }
            // Update color to match rarity
            const RARITY_TO_COLOR = ["grey", "white", "green", "cyan", "blue", "magenta", "yellow", "red"];
            slot.color = RARITY_TO_COLOR[Math.min(slot.rarity, 7)] || "grey";
          }
        }
      }
    }
  }

  // Remove old fields
  delete state.gold;
  delete state.activeQuest;
  delete state.sessionUpgradeCount;
  if (state.profile) {
    delete state.profile.totalUpgrades;
    delete state.profile.totalQuests;
  }

  // Initialize speciesProgress from existing collection + archive
  const progress: Record<string, boolean[]> = {};
  for (const list of [state.collection, state.archive]) {
    if (Array.isArray(list)) {
      for (const creature of list) {
        const sid = creature.speciesId;
        if (!progress[sid]) progress[sid] = Array(8).fill(false);
        for (const slot of creature.slots || []) {
          const r = slot.rarity ?? 0;
          if (r >= 0 && r < 8) progress[sid][r] = true;
        }
      }
    }
  }
  state.speciesProgress = progress;

  // Add new fields
  state.personalSpecies = state.personalSpecies || [];
  state.sessionBreedCount = 0;
  state.breedCooldowns = {};

  state.version = 6;
  return state as GameState;
}
```

- [ ] **Step 4: Update the load() method to handle v5→v6 migration**

In the `load()` method, add v5 migration case:

```typescript
if (version === 5) {
  logger.info("Migrating state from v5 to v6", { path: this.filePath });
  return migrateV5toV6(raw);
}
if (version !== 6) {
  logger.info("Incompatible state version, creating fresh state", { path: this.filePath });
  return defaultState();
}
```

And update the v3/v4 chains to also call v5→v6.

- [ ] **Step 5: Update defaultState() for v6**

```typescript
function defaultState(): GameState {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: 6,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
    },
    collection: [],
    archive: [],
    energy: 15, // updated from 10
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    discoveredSpecies: [],
    currentSessionId: "",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
  };
}
```

- [ ] **Step 6: Run migration tests**

Run: `npx jest tests/state/state-manager.test.ts -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/state/state-manager.ts tests/state/state-manager.test.ts
git commit -m "feat: state migration v5→v6 with rarity extraction and species progress"
```

---

## Phase 2: Remove Gold, Quests, Upgrades

### Task 5: Delete gold, quest, upgrade engine files

**Files:**
- Delete: `src/engine/gold.ts`, `src/engine/quest.ts`, `src/engine/upgrade.ts`
- Delete: `tests/engine/gold.test.ts`, `tests/engine/quest.test.ts`, `tests/engine/upgrade.test.ts` (if they exist)

- [ ] **Step 1: Delete the files**

```bash
rm -f src/engine/gold.ts src/engine/quest.ts src/engine/upgrade.ts
rm -f tests/engine/gold.test.ts tests/engine/quest.test.ts tests/engine/upgrade.test.ts
```

- [ ] **Step 2: Remove imports and usages from game-engine.ts**

Open `src/engine/game-engine.ts` and:
- Remove all imports from `./gold`, `./quest`, `./upgrade`
- Remove or comment out methods: `upgrade()`, `questStart()`, `questCheck()`
- Remove gold/quest references from `processTick()`, `status()`, `getAdvisorContext()`
- In `breedExecute()`: remove the `spendGold()` call and gold cost calculation

- [ ] **Step 3: Remove imports from index.ts**

Open `src/index.ts` and remove any re-exports of gold, quest, or upgrade modules.

- [ ] **Step 4: Remove from mcp-tools.ts and cli.ts**

Remove upgrade/quest tool registrations from `src/mcp-tools.ts`.
Remove upgrade/quest commands from `src/cli.ts`.

- [ ] **Step 5: Update advisor.ts**

Remove references to gold, quests, upgrades in `src/engine/advisor.ts`. Remove "upgrade" and "quest" from suggested action types.

- [ ] **Step 6: Run type check to find remaining references**

Run: `npm run build`
Fix any remaining compile errors from deleted references. Each error points to a line that needs updating.

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: Some tests may fail if they reference gold/quest/upgrade. Fix or delete those tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat!: remove gold, quest, and upgrade systems"
```

---

### Task 6: Delete old design artifacts and upgrade/quest skills

**Files:**
- Delete: old CSVs, scripts, docs, skill folders

- [ ] **Step 1: Delete old design files**

```bash
rm -f docs/design-analysis/breeding-recipes-*.csv
rm -f docs/design-analysis/breeding-rules.md
rm -f docs/design-analysis/trait-relationships.md
rm -f docs/design-analysis/trait-pool.csv
rm -f docs/design-analysis/breeding-table.md
rm -f scripts/generate-breeding-tables.js
```

- [ ] **Step 2: Delete skill folders (check actual names first)**

```bash
ls skills/  # check actual folder names
# Delete upgrade and quest skill folders
rm -rf skills/upgrade/ skills/quest/
# If named differently (e.g., skills/quest-start/, skills/quest-check/), delete those
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old design artifacts and upgrade/quest skills"
```

---

### Task 7: Update energy config values

**Files:**
- Modify: `config/balance.json`
- Modify: `src/engine/energy.ts`

- [ ] **Step 1: Update balance.json energy values**

```json
"energy": {
  "gainIntervalMs": 1800000,
  "maxEnergy": 30,
  "startingEnergy": 15,
  "sessionBonus": 5,
  "baseMergeCost": 3,
  "maxMergeCost": 11,
  "rareThreashold": 0.05
},
```

Change `startingEnergy` from 10 to 15, `sessionBonus` from 3 to 5.

- [ ] **Step 2: Remove upgrade/quest/mergeGold/economy sections from balance.json**

Delete the `upgrade`, `quest`, `mergeGold`, and `economy` keys entirely from balance.json.

- [ ] **Step 3: Add breed-specific config to balance.json**

```json
"breed": {
  "sameTraitUpgradeChance": 0.35,
  "sameTraitHigherParentUpgradeChance": 0.15,
  "diffTraitSameSpeciesUpgradeChance": 0.10,
  "diffTraitCrossSpeciesUpgradeChance": 0.05,
  "crossSpeciesMatchUpgradeChance": 0.20,
  "maxBreedsPerSession": 3,
  "cooldownSessions": 1,
  "baseCost": 3,
  "rarityScale": 1
},
```

- [ ] **Step 4: Add leveling rarity caps to balance.json**

```json
"leveling": {
  "thresholds": [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
  "rarityBreedCaps": [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7],
  "xpPerCatch": 10,
  "xpPerMerge": 25,
  "xpPerHybrid": 50,
  "xpDiscoveryBonus": 20,
  "xpTierDiscovery": 10
},
```

- [ ] **Step 5: Update BalanceConfig type in types.ts**

Update the `BalanceConfig` interface to match the new balance.json structure — remove `upgrade`, `quest`, `mergeGold`, `economy` fields, update `breed` and `leveling` fields.

- [ ] **Step 6: Run type check and tests**

Run: `npm run build && npm test`
Fix any remaining issues.

- [ ] **Step 7: Commit**

```bash
git add config/balance.json src/types.ts src/engine/energy.ts
git commit -m "feat: update energy config (session bonus 5, starting 15) and breed config"
```

---

## Phase 3: Breeding Overhaul

### Task 8: Rewrite breed.ts — core breeding logic

**Files:**
- Modify: `src/engine/breed.ts`
- Test: `tests/engine/breed.test.ts`

- [ ] **Step 1: Write test for same-species, same-trait rarity upgrade**

```typescript
describe("executeBreed v6", () => {
  it("same trait in slot → child gets that trait with upgrade chance", () => {
    const state = makeState({
      collection: [
        makeCreature("a", "compi", [
          { slotId: "eyes", variantId: "eye_c01", color: "grey", rarity: 0 },
          { slotId: "mouth", variantId: "mth_c01", color: "grey", rarity: 0 },
          { slotId: "body", variantId: "bod_c01", color: "grey", rarity: 0 },
          { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
        ]),
        makeCreature("b", "compi", [
          { slotId: "eyes", variantId: "eye_c01", color: "grey", rarity: 0 }, // same trait
          { slotId: "mouth", variantId: "mth_c02", color: "white", rarity: 1 }, // different trait
          { slotId: "body", variantId: "bod_c01", color: "grey", rarity: 0 },
          { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
        ]),
      ],
      energy: 20,
    });

    // Use a fixed RNG that always returns 0.1 (below 0.35 threshold → upgrade)
    const result = executeBreed(state, "a", "b", () => 0.1);

    // Eyes: same trait eye_c01, rng 0.1 < 0.35 → rarity upgrades 0→1
    expect(result.child.slots[0].variantId).toBe("eye_c01");
    expect(result.child.slots[0].rarity).toBe(1);
    expect(result.child.slots[0].color).toBe("white");

    // Parents should still be in collection (survive breeding)
    expect(state.collection.find(c => c.id === "a")).toBeDefined();
    expect(state.collection.find(c => c.id === "b")).toBeDefined();

    // Child added to collection
    expect(state.collection.length).toBe(3);
  });

  it("parents survive breeding", () => {
    const state = makeState({ collection: [makeCreatureA(), makeCreatureB()], energy: 20 });
    executeBreed(state, "a", "b", Math.random);
    expect(state.collection.length).toBe(3); // 2 parents + 1 child
  });

  it("different species detected as cross-species", () => {
    const state = makeState({
      collection: [
        makeCreature("a", "compi", defaultSlots()),
        makeCreature("b", "pyrax", defaultSlots()),
      ],
      energy: 20,
    });
    const result = executeBreed(state, "a", "b", Math.random);
    expect(result.isCrossSpecies).toBe(true);
  });

  it("respects max breeds per session", () => {
    const state = makeState({
      collection: [makeCreatureA(), makeCreatureB()],
      energy: 50,
      sessionBreedCount: 3,
    });
    expect(() => executeBreed(state, "a", "b", Math.random)).toThrow(/max breeds/i);
  });

  it("respects breed cooldown", () => {
    const state = makeState({
      collection: [makeCreatureA(), makeCreatureB()],
      energy: 20,
      breedCooldowns: { "a+b": Date.now() + 999999 },
    });
    expect(() => executeBreed(state, "a", "b", Math.random)).toThrow(/cooldown/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/breed.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement new executeBreed**

Rewrite `src/engine/breed.ts` with the new logic:

```typescript
import { GameState, CollectionCreature, CreatureSlot, RARITY_COLORS, SlotId, SLOT_IDS } from "../types";
import { loadConfig } from "../config/loader";
import { loadCreatureName } from "../config/traits";
import { spendEnergy } from "./energy";
import { grantXp } from "./progression";

export interface BreedResult {
  child: CollectionCreature;
  parentA: CollectionCreature;
  parentB: CollectionCreature;
  isCrossSpecies: boolean;
  upgrades: { slotId: SlotId; fromRarity: number; toRarity: number }[];
}

export function calculateBreedCost(parentA: CollectionCreature, parentB: CollectionCreature): number {
  const config = loadConfig();
  const base = config.breed.baseCost;
  let uncommonPlus = 0;
  for (const p of [parentA, parentB]) {
    for (const s of p.slots) {
      if ((s.rarity ?? 0) >= 1) uncommonPlus++;
    }
  }
  return Math.min(base + uncommonPlus * config.breed.rarityScale, config.energy.maxMergeCost);
}

function resolveSlot(
  slotA: CreatureSlot,
  slotB: CreatureSlot,
  sameSpecies: boolean,
  rng: () => number,
  maxRarity: number,
): { slot: CreatureSlot; upgraded: boolean } {
  const config = loadConfig();
  const sameVariant = slotA.variantId === slotB.variantId;
  let variantId: string;
  let rarity: number;
  let upgraded = false;

  if (sameVariant) {
    variantId = slotA.variantId;
    const maxParentRarity = Math.max(slotA.rarity ?? 0, slotB.rarity ?? 0);
    rarity = maxParentRarity;

    // Upgrade chance
    const chance = (slotA.rarity ?? 0) === (slotB.rarity ?? 0)
      ? config.breed.sameTraitUpgradeChance
      : config.breed.sameTraitHigherParentUpgradeChance;

    if (rarity < maxRarity && rng() < chance) {
      rarity++;
      upgraded = true;
    }
  } else {
    // 50/50 pick
    const fromA = rng() < 0.5;
    const src = fromA ? slotA : slotB;
    variantId = src.variantId;
    rarity = src.rarity ?? 0;

    // Small upgrade chance
    const chance = sameSpecies
      ? config.breed.diffTraitSameSpeciesUpgradeChance
      : config.breed.diffTraitCrossSpeciesUpgradeChance;

    if (rarity < maxRarity && rng() < chance) {
      rarity++;
      upgraded = true;
    }
  }

  const color = RARITY_COLORS[Math.min(rarity, 7)];

  return {
    slot: { slotId: slotA.slotId, variantId, color, rarity },
    upgraded,
  };
}

export function executeBreed(
  state: GameState,
  parentAId: string,
  parentBId: string,
  rng: () => number,
): BreedResult {
  const config = loadConfig();
  const parentA = state.collection.find(c => c.id === parentAId && !c.archived);
  const parentB = state.collection.find(c => c.id === parentBId && !c.archived);
  if (!parentA || !parentB) throw new Error("Parent not found or archived");
  if (parentAId === parentBId) throw new Error("Cannot breed with self");

  // Check session breed limit
  if (state.sessionBreedCount >= config.breed.maxBreedsPerSession) {
    throw new Error("Max breeds per session reached");
  }

  // Check cooldown
  const cooldownKey = [parentAId, parentBId].sort().join("+");
  if (state.breedCooldowns[cooldownKey] && state.breedCooldowns[cooldownKey] > Date.now()) {
    throw new Error("This pair is on cooldown");
  }

  // Check energy
  const cost = calculateBreedCost(parentA, parentB);
  spendEnergy(state, cost);

  // Resolve rarity cap from level
  const maxRarity = getMaxBreedableRarity(state.profile.level);

  // Determine cross-species
  const isCrossSpecies = parentA.speciesId !== parentB.speciesId;
  const sameSpecies = !isCrossSpecies;

  // Resolve each slot
  const childSlots: CreatureSlot[] = [];
  const upgrades: { slotId: SlotId; fromRarity: number; toRarity: number }[] = [];

  for (const slotId of SLOT_IDS) {
    const slotA = parentA.slots.find(s => s.slotId === slotId)!;
    const slotB = parentB.slots.find(s => s.slotId === slotId)!;
    const { slot, upgraded } = resolveSlot(slotA, slotB, sameSpecies, rng, maxRarity);
    childSlots.push(slot);
    if (upgraded) {
      const fromRarity = Math.max(slotA.rarity ?? 0, slotB.rarity ?? 0);
      upgrades.push({ slotId, fromRarity, toRarity: slot.rarity! });
    }
  }

  // Create child (parents survive!)
  const child: CollectionCreature = {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    speciesId: isCrossSpecies ? `hybrid_${parentA.speciesId}_${parentB.speciesId}` : parentA.speciesId,
    name: loadCreatureName(rng),
    slots: childSlots,
    caughtAt: Date.now(),
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    mergedFrom: [parentAId, parentBId],
    archived: false,
  };

  state.collection.push(child);
  state.sessionBreedCount++;
  state.breedCooldowns[cooldownKey] = Date.now() + config.breed.cooldownSessions * 86400000;
  state.profile.totalMerges++;

  // XP
  const xp = isCrossSpecies ? config.leveling.xpPerHybrid : config.leveling.xpPerMerge;
  grantXp(state, xp);

  // Update species progress
  updateSpeciesProgress(state, child);

  return { child, parentA, parentB, isCrossSpecies, upgrades };
}

function getMaxBreedableRarity(level: number): number {
  const config = loadConfig();
  const caps = config.leveling.rarityBreedCaps;
  const idx = Math.min(level - 1, caps.length - 1);
  return caps[idx] ?? 7;
}

export function updateSpeciesProgress(state: GameState, creature: CollectionCreature): void {
  const sid = creature.speciesId;
  if (!state.speciesProgress[sid]) {
    state.speciesProgress[sid] = Array(8).fill(false);
  }
  for (const slot of creature.slots) {
    const r = slot.rarity ?? 0;
    if (r >= 0 && r < 8) state.speciesProgress[sid][r] = true;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/engine/breed.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/breed.ts tests/engine/breed.test.ts
git commit -m "feat: rewrite breeding — parents survive, rarity upgrades, cross-species detection"
```

---

### Task 9: Update catch system for rarity

**Files:**
- Modify: `src/engine/catch.ts`
- Modify: `src/engine/batch.ts`

- [ ] **Step 1: Update batch.ts to assign random rarity on spawn**

In the creature spawning function in `batch.ts`, after picking a trait for each slot, assign a random rarity:

```typescript
// After picking the trait variant for a slot:
const rarityWeights = Object.values(config.colors); // [0.28, 0.22, 0.18, ...]
const rarityIndex = weightedRandomIndex(rarityWeights, rng);
const color = RARITY_COLORS[rarityIndex];
// Set: slot.rarity = rarityIndex, slot.color = color
```

- [ ] **Step 2: Update catch.ts to use slot.rarity**

Replace rank extraction (`getTraitRank`, `extractRank`) with `slot.rarity ?? 0`:

```typescript
export function calculateCatchRate(speciesId: string, slots: CreatureSlot[], failPenalty: number): number {
  const config = loadConfig();
  const perTrait = slots.map(s => 1.0 - ((s.rarity ?? 0) / 7) * config.catching.difficultyScale);
  const avg = perTrait.reduce((a, b) => a + b, 0) / perTrait.length;
  return Math.max(config.catching.minCatchRate, Math.min(config.catching.maxCatchRate, avg - failPenalty));
}

export function calculateEnergyCost(speciesId: string, slots: CreatureSlot[]): number {
  const avgRarity = slots.reduce((s, sl) => s + (sl.rarity ?? 0), 0) / slots.length;
  return Math.max(1, Math.min(5, 1 + Math.floor((avgRarity / 7) * 4)));
}
```

- [ ] **Step 3: Update catch to record species progress**

After successful catch, call `updateSpeciesProgress(state, creature)`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (update existing catch tests if they break)

- [ ] **Step 5: Commit**

```bash
git add src/engine/catch.ts src/engine/batch.ts
git commit -m "feat: catch system uses rarity field, random rarity on spawn"
```

---

### Task 10: Species index engine

**Files:**
- Create: `src/engine/species-index.ts`
- Create: `tests/engine/species-index.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { getSpeciesIndex, SpeciesIndexEntry } from "../../src/engine/species-index";

describe("species-index", () => {
  it("returns progress for each discovered species", () => {
    const progress = {
      compi: [true, true, false, false, false, false, false, false],
      pyrax: [true, false, false, false, false, false, false, false],
    };
    const result = getSpeciesIndex(progress);
    expect(result).toHaveLength(2);
    expect(result[0].speciesId).toBe("compi");
    expect(result[0].discovered).toBe(2);
    expect(result[0].total).toBe(8);
  });

  it("separates hybrids from base species", () => {
    const progress = {
      compi: [true, true, false, false, false, false, false, false],
      "hybrid_compi_pyrax": [true, false, false, false, false, false, false, false],
    };
    const result = getSpeciesIndex(progress);
    const base = result.filter(r => !r.isHybrid);
    const hybrids = result.filter(r => r.isHybrid);
    expect(base).toHaveLength(1);
    expect(hybrids).toHaveLength(1);
    expect(hybrids[0].speciesId).toBe("hybrid_compi_pyrax");
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// src/engine/species-index.ts
import { RARITY_NAMES } from "../types";

export interface SpeciesIndexEntry {
  speciesId: string;
  tiers: boolean[]; // 8 booleans
  discovered: number;
  total: 8;
  isHybrid: boolean;
}

export function getSpeciesIndex(progress: Record<string, boolean[]>): SpeciesIndexEntry[] {
  return Object.entries(progress)
    .map(([speciesId, tiers]) => ({
      speciesId,
      tiers: tiers.length === 8 ? tiers : Array(8).fill(false).map((_, i) => tiers[i] ?? false),
      discovered: tiers.filter(Boolean).length,
      total: 8 as const,
      isHybrid: speciesId.startsWith("hybrid_"),
    }))
    .sort((a, b) => {
      if (a.isHybrid !== b.isHybrid) return a.isHybrid ? 1 : -1;
      return a.speciesId.localeCompare(b.speciesId);
    });
}
```

- [ ] **Step 3: Run tests**

Run: `npx jest tests/engine/species-index.test.ts -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/engine/species-index.ts tests/engine/species-index.test.ts
git commit -m "feat: species index engine — tracks rarity tier progress per species"
```

---

### Task 11: Update progression — rarity breed cap by level

**Files:**
- Modify: `src/engine/progression.ts`

- [ ] **Step 1: Add getMaxBreedableRarity function**

If not already exported from breed.ts, add to progression.ts:

```typescript
export function getMaxBreedableRarity(level: number): number {
  const config = loadConfig();
  const caps = config.leveling.rarityBreedCaps;
  const idx = Math.min(level - 1, caps.length - 1);
  return caps[idx] ?? 7;
}
```

Remove the old `getTraitRankCap` function (or keep as deprecated alias).

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/engine/progression.ts
git commit -m "feat: rarity breed cap by level replaces rank cap"
```

---

## Phase 4: UI/UX & Commands

### Task 12: Update game-engine.ts — integrate new breeding, add species

**Files:**
- Modify: `src/engine/game-engine.ts`

- [ ] **Step 1: Update breedExecute to use new breed logic**

Replace the old breed execution with the new `executeBreed` from the rewritten breed.ts. The new function returns `BreedResult` with `isCrossSpecies` and `upgrades` fields.

- [ ] **Step 2: Add species() method**

```typescript
species(): SpeciesIndexEntry[] {
  return getSpeciesIndex(this.state.speciesProgress);
}
```

- [ ] **Step 3: Update scan() to show one creature**

Update the scan method to return only the first nearby creature (or spawn one). The scan result should contain a single `ScanEntry` instead of an array.

- [ ] **Step 4: Update status() — remove gold/quest references**

Return the updated `StatusResult` without gold or activeQuest.

- [ ] **Step 5: Reset sessionBreedCount on new session**

In `processTick` or session detection, reset `state.sessionBreedCount = 0` and clear expired cooldowns.

- [ ] **Step 6: Run type check and tests**

Run: `npm run build && npm test`
Fix remaining compile errors.

- [ ] **Step 7: Commit**

```bash
git add src/engine/game-engine.ts
git commit -m "feat: integrate new breeding, add species command, update scan to show one creature"
```

---

### Task 13: Update renderer — scan, breed, species displays

**Files:**
- Modify: `src/renderers/simple-text-renderer.ts`

- [ ] **Step 1: Update renderScan for single creature**

Show one creature with trait names and rarity colors, catch cost, and `/catch` or `/scan` options.

- [ ] **Step 2: Update renderBreedResult with ↑ UP! callout**

When `result.upgrades` has entries, show `↑ UP!` with the rarity change for each upgraded slot.

- [ ] **Step 3: Add hybrid reveal**

When `result.isCrossSpecies`, show `★ HYBRID SPECIES BORN!` banner with species name and description.

- [ ] **Step 4: Add renderSpeciesIndex method**

Render the species progress table with filled/empty dots per rarity tier.

- [ ] **Step 5: Remove renderUpgradeResult, renderQuestStart, renderQuestComplete**

Delete these methods from the renderer.

- [ ] **Step 6: Run type check and test**

Run: `npm run build && npm test`

- [ ] **Step 7: Commit**

```bash
git add src/renderers/simple-text-renderer.ts
git commit -m "feat: update renderer — single scan, breed ↑UP!, hybrid reveal, species index"
```

---

### Task 14: Add /species skill and update MCP tools

**Files:**
- Create: `skills/species/SKILL.md` (or appropriate skill folder)
- Modify: `src/mcp-tools.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Create /species skill**

```markdown
# /species

Show your species discovery progress — which rarity tiers you've found for each species.
```

- [ ] **Step 2: Add species tool to mcp-tools.ts**

Register a `species` tool that calls `engine.species()` and renders via `renderer.renderSpeciesIndex()`.

- [ ] **Step 3: Add species command to cli.ts**

Add a `species` subcommand to the yargs CLI.

- [ ] **Step 4: Update /breed skill**

Update the breed skill SKILL.md to reflect: any creature can breed with any, parents survive, rarity upgrades.

- [ ] **Step 5: Update /breedable**

Update to show ALL non-archived creatures as breedable (no same-species restriction). Show cooldown status.

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add /species command, update breed/breedable skills and MCP tools"
```

---

### Task 15: Final integration test and cleanup

**Files:**
- All

- [ ] **Step 1: Run full build**

Run: `npm run build:all`
Expected: PASS — no compile errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Manual smoke test**

Test the actual game flow:
```bash
node scripts/cli.js scan
node scripts/cli.js catch 1
node scripts/cli.js collection
node scripts/cli.js breed 1 2  # (after catching 2 creatures)
node scripts/cli.js species
node scripts/cli.js status
node scripts/cli.js energy
```

Verify:
- Scan shows one creature with rarity-colored traits
- Catch works and adds to collection
- Breed produces child with parents surviving
- Species shows progress dots
- Status has no gold/quest info
- No errors or crashes

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup and integration verification"
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|-----------------|------|
| Remove gold/quests/upgrades | Task 5, 6 |
| 8-color rarity system | Task 1 |
| Rarity field on CreatureSlot | Task 2 |
| State migration v5→v6 | Task 4 |
| Breeding: parents survive | Task 8 |
| Breeding: rarity upgrade chance | Task 8 |
| Breeding: cross-species = hybrid | Task 8 |
| Breed cooldown + session limit | Task 8 |
| Catch rate uses rarity | Task 9 |
| Spawn assigns random rarity | Task 9 |
| Species progress tracking | Task 10 |
| Leveling gates rarity breeding | Task 11, 7 |
| Scan shows one creature | Task 12 |
| ↑ UP! breed display | Task 13 |
| ★ HYBRID SPECIES BORN! display | Task 13 |
| /species command | Task 14 |
| Energy config updates | Task 7 |
| Delete old artifacts | Task 6 |
| Update types (v6) | Task 3 |

**Note:** The `/create-species` breed mode (AI-generated hybrid art) is intentionally deferred to a follow-up task. Task 8 uses a placeholder hybrid speciesId (`hybrid_X_Y`) with parent frame blending. The full AI integration will be a separate plan once the core breeding system is stable.
