# Rank-Based Trait Spawning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old spawnRate-weighted trait selection with level-capped, rank-based triangular distribution so low-level players get basic traits and better traits unlock as they level up.

**Architecture:** Traits in each species pool are already ordered by spawnRate descending (index 0 = most common). The trait's "rank" = its index in the pool. During spawning, instead of weighted random by spawnRate, we pick a rank from 0 to `traitRankCap[playerLevel]` using a discrete triangular distribution (skewed toward 0). The catch rate formula changes from spawnRate-based to rank-based: `catchChance = avg(1.0 - traitRank / maxPoolRank * 0.50)`. Energy cost simplifies to a flat 1 per attempt.

**Tech Stack:** TypeScript, Jest (ts-jest)

**Spec reference:** `docs/superpowers/specs/2026-04-13-core-loop-design.md` Sections 1, 5

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/config/species.ts` | Modify | Add `getTraitRank()`, change `pickTraitForSlot()` to rank-based selection with level cap |
| `src/engine/batch.ts` | Modify | Thread `playerLevel` through `generateCreatureSlots()` and `spawnBatch()` |
| `src/engine/catch.ts` | Modify | Rank-based `calculateCatchRate()`, flat `calculateEnergyCost()`, flat `calculateXpEarned()` |
| `src/engine/game-engine.ts` | Modify | Pass `rng` to `spawnBatch` call in `scan()` (already done for `processTick`) |
| `src/index.ts` | Modify | Export new `getTraitRank` |
| `tests/config/species.test.ts` | Modify | Update `pickTraitForSlot` tests for new signature and rank-based behavior |
| `tests/engine/batch.test.ts` | Modify | Update `generateCreatureSlots` and `spawnBatch` tests for level parameter |
| `tests/engine/catch-v2.test.ts` | Modify | Rewrite catch rate/energy/XP tests for rank-based formulas |

---

### Task 1: Add `getTraitRank` to species.ts

**Files:**
- Modify: `src/config/species.ts`
- Test: `tests/config/species.test.ts`

- [ ] **Step 1: Write the failing test for `getTraitRank`**

Add to `tests/config/species.test.ts`:

```typescript
import {
  loadSpecies,
  getSpeciesById,
  getAllSpecies,
  pickSpecies,
  pickTraitForSlot,
  getTraitDefinition,
  getTraitRank,
  _resetSpeciesCache,
} from "../../src/config/species";
```

Add new describe block:

```typescript
describe("getTraitRank", () => {
  it("returns 0 for the first (most common) trait in pool", () => {
    expect(getTraitRank("compi", "eyes", "eye_c01")).toBe(0);
  });

  it("returns last index for the rarest trait", () => {
    // compi eyes has 19 traits, so last index = 18
    expect(getTraitRank("compi", "eyes", "eye_m02")).toBe(18);
  });

  it("returns correct middle rank", () => {
    // eye_u01 is the 6th trait (index 5) in the eyes pool
    expect(getTraitRank("compi", "eyes", "eye_u01")).toBe(5);
  });

  it("returns -1 for unknown variant", () => {
    expect(getTraitRank("compi", "eyes", "eye_x99")).toBe(-1);
  });

  it("returns -1 for unknown species", () => {
    expect(getTraitRank("unknown", "eyes", "eye_c01")).toBe(-1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/config/species.test.ts --testNamePattern="getTraitRank" -v`
Expected: FAIL — `getTraitRank` is not exported

- [ ] **Step 3: Implement `getTraitRank`**

In `src/config/species.ts`, add after the `getTraitDefinition` function:

```typescript
/**
 * Returns the rank (0-based index) of a trait variant within its species+slot pool.
 * Pools are ordered by spawnRate descending, so rank 0 = most common.
 * Returns -1 if species, slot, or variant is not found.
 */
export function getTraitRank(
  speciesId: string,
  slotId: SlotId,
  variantId: string
): number {
  ensureLoaded();
  const species = _speciesById.get(speciesId);
  if (!species) return -1;
  const pool = species.traitPools[slotId];
  if (!pool) return -1;
  const index = pool.findIndex((t) => t.id === variantId);
  return index;
}
```

- [ ] **Step 4: Export `getTraitRank` from `src/index.ts`**

Update the species re-export line in `src/index.ts`:

```typescript
export { loadSpecies, getSpeciesById, getAllSpecies, pickSpecies, pickTraitForSlot, getTraitDefinition, getTraitRank } from "./config/species";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/config/species.test.ts --testNamePattern="getTraitRank" -v`
Expected: PASS (all 5 assertions)

- [ ] **Step 6: Commit**

```bash
git add src/config/species.ts src/index.ts tests/config/species.test.ts
git commit -m "feat: add getTraitRank to look up trait index in species pool"
```

---

### Task 2: Change `pickTraitForSlot` to rank-based selection

**Files:**
- Modify: `src/config/species.ts`
- Modify: `tests/config/species.test.ts`

- [ ] **Step 1: Write failing tests for rank-capped triangular selection**

Replace the existing `pickTraitForSlot` describe block in `tests/config/species.test.ts` with:

```typescript
describe("pickTraitForSlot", () => {
  let compi: SpeciesDefinition;

  beforeEach(() => {
    compi = getSpeciesById("compi")!;
  });

  it("returns a trait for each slot", () => {
    for (const slotId of SLOT_IDS) {
      const trait = pickTraitForSlot(compi, slotId, 5, () => 0.5);
      expect(trait).toBeDefined();
      expect(trait.id).toBeTruthy();
      expect(trait.name).toBeTruthy();
      expect(trait.art).toBeTruthy();
      expect(trait.spawnRate).toBeGreaterThan(0);
    }
  });

  it("at level 1 (rankCap=1), only returns rank 0 or rank 1 traits", () => {
    const validIds = new Set(["eye_c01", "eye_c02"]);
    for (let i = 0; i < 100; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 1, () => i / 100);
      expect(validIds.has(trait.id)).toBe(true);
    }
  });

  it("at level 1, rank 0 (most common) is more likely than rank 1", () => {
    let rank0Count = 0;
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 1, () => i / iterations);
      if (trait.id === "eye_c01") rank0Count++;
    }
    // Triangular distribution: P(rank0) = 2/3 ≈ 67%
    expect(rank0Count / iterations).toBeGreaterThan(0.5);
  });

  it("at level 14 (rankCap=8), can return up to rank 8 traits", () => {
    // rng very close to 1 should produce the highest allowed rank
    const trait = pickTraitForSlot(compi, "eyes", 14, () => 0.9999);
    const pool = compi.traitPools["eyes"]!;
    const idx = pool.findIndex((t) => t.id === trait.id);
    expect(idx).toBeLessThanOrEqual(8);
    expect(idx).toBeGreaterThanOrEqual(0);
  });

  it("never returns traits above the rank cap", () => {
    // Level 3 → rankCap = 2, so only indices 0, 1, 2 allowed
    const allowed = new Set(["eye_c01", "eye_c02", "eye_c03"]);
    for (let i = 0; i < 200; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 3, () => i / 200);
      expect(allowed.has(trait.id)).toBe(true);
    }
  });

  it("triangular distribution skews toward lower ranks", () => {
    const counts: Record<number, number> = {};
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 14, () => i / iterations);
      const pool = compi.traitPools["eyes"]!;
      const idx = pool.findIndex((t) => t.id === trait.id);
      counts[idx] = (counts[idx] || 0) + 1;
    }
    // Rank 0 should have more hits than rank 8
    expect(counts[0]).toBeGreaterThan(counts[8] || 0);
    // Rank 0 should have more hits than rank 4
    expect(counts[0]).toBeGreaterThan(counts[4] || 0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/config/species.test.ts --testNamePattern="pickTraitForSlot" -v`
Expected: FAIL — `pickTraitForSlot` has wrong arity (3 args, now called with 4)

- [ ] **Step 3: Implement rank-based `pickTraitForSlot`**

Replace the existing `pickTraitForSlot` in `src/config/species.ts`:

```typescript
/**
 * Pick a trait for a slot using rank-based triangular distribution.
 *
 * Traits in the pool are ordered by spawnRate descending (index 0 = most common).
 * The trait "rank" is its index. The maximum rank is capped by the player's level
 * via getTraitRankCap(). Within the allowed range [0, maxRank], a discrete
 * triangular distribution skewed toward 0 is used:
 *   weight(k) = maxRank - k + 1
 *
 * @param species - The species definition
 * @param slotId - Which trait slot to pick for
 * @param playerLevel - Player level (determines rank cap)
 * @param rng - Random number generator returning [0, 1)
 */
export function pickTraitForSlot(
  species: SpeciesDefinition,
  slotId: SlotId,
  playerLevel: number,
  rng: () => number
): TraitDefinition {
  const traits = species.traitPools[slotId];
  if (!traits || traits.length === 0) {
    throw new Error(`No traits for slot ${slotId} in species ${species.id}`);
  }

  const { getTraitRankCap } = require("../engine/progression");
  const rankCap = getTraitRankCap(playerLevel);
  const maxRank = Math.min(rankCap, traits.length - 1);

  // Discrete triangular distribution: weight(k) = maxRank - k + 1
  const totalWeight = ((maxRank + 1) * (maxRank + 2)) / 2;
  let roll = rng() * totalWeight;
  for (let k = 0; k <= maxRank; k++) {
    roll -= (maxRank - k + 1);
    if (roll <= 0) return traits[k];
  }
  return traits[maxRank];
}
```

**Note on `require`:** We use a dynamic `require` here to avoid a circular dependency (`species.ts` → `progression.ts` → `loader.ts` → which loads config). This is a targeted solution — `getTraitRankCap` is a pure function that only reads config, so the lazy import is safe.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/config/species.test.ts --testNamePattern="pickTraitForSlot" -v`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config/species.ts tests/config/species.test.ts
git commit -m "feat: rank-based trait selection with level cap and triangular distribution"
```

---

### Task 3: Thread `playerLevel` through `generateCreatureSlots` and `spawnBatch`

**Files:**
- Modify: `src/engine/batch.ts`
- Modify: `tests/engine/batch.test.ts`

- [ ] **Step 1: Write failing tests for level-aware spawning**

Update imports and `generateCreatureSlots` tests in `tests/engine/batch.test.ts`:

```typescript
describe("generateCreatureSlots", () => {
  test("generates exactly 4 slots", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    expect(slots).toHaveLength(4);
  });

  test("slot IDs are eyes, mouth, body, tail in order", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    expect(slots.map(s => s.slotId)).toEqual(SLOT_IDS);
  });

  test("each slot has a variantId string", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    for (const s of slots) {
      expect(typeof s.variantId).toBe("string");
      expect(s.variantId.length).toBeGreaterThan(0);
    }
  });

  test("slots do not have a rarity field", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    for (const s of slots) {
      expect(s).not.toHaveProperty("rarity");
    }
  });

  test("each slot has a color field", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    for (const s of slots) {
      expect(CREATURE_COLORS).toContain(s.color);
    }
  });

  test("throws for unknown species", () => {
    expect(() => generateCreatureSlots("nonexistent", 1, () => 0.5)).toThrow("Unknown species: nonexistent");
  });

  test("level 1 spawns only produce rank 0-1 traits", () => {
    // Run many times with different rng values
    for (let i = 0; i < 50; i++) {
      const slots = generateCreatureSlots("compi", 1, () => i / 50);
      for (const s of slots) {
        // Rank 0-1 traits for eyes: eye_c01, eye_c02
        // Rank 0-1 traits for mouth: mth_c01, mth_c02
        // Rank 0-1 traits for body: bod_c01, bod_c02
        // Rank 0-1 traits for tail: tal_c01, tal_c02
        expect(s.variantId).toMatch(/_(c01|c02)$/);
      }
    }
  });
});
```

Update `spawnBatch` tests — replace all `spawnBatch(state, Date.now(), () => 0.5)` calls to match new behavior (spawnBatch reads level from `state.profile.level` internally, so no signature change needed for spawnBatch):

No signature change for `spawnBatch` — it already has access to `state.profile.level`. The existing tests should mostly work after updating `generateCreatureSlots` calls.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/batch.test.ts -v`
Expected: FAIL — `generateCreatureSlots` called with wrong number of arguments

- [ ] **Step 3: Update `generateCreatureSlots` and `spawnBatch`**

In `src/engine/batch.ts`:

Change `generateCreatureSlots` signature and body:

```typescript
export function generateCreatureSlots(speciesId: string, playerLevel: number, rng: () => number): CreatureSlot[] {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);

  const speciesSlots = Object.keys(species.traitPools) as SlotId[];
  return speciesSlots.map((slotId: SlotId) => {
    const trait = pickTraitForSlot(species, slotId, playerLevel, rng);
    const color = pickColor(rng);
    return { slotId, variantId: trait.id, color };
  });
}
```

Update the `spawnBatch` function to pass `state.profile.level`:

```typescript
export function spawnBatch(state: GameState, now: number, rng: () => number): NearbyCreature[] {
  if (state.batch !== null && state.batch.attemptsRemaining > 0) {
    return [];
  }

  const batchSize = pickBatchSize(rng);
  const spawned: NearbyCreature[] = [];

  for (let i = 0; i < batchSize; i++) {
    const species = pickSpecies(rng);
    const creature: NearbyCreature = {
      id: generateId(),
      speciesId: species.id,
      name: loadCreatureName(rng),
      slots: generateCreatureSlots(species.id, state.profile.level, rng),
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/batch.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/batch.ts tests/engine/batch.test.ts
git commit -m "feat: thread playerLevel through spawn pipeline for rank-capped traits"
```

---

### Task 4: Rank-based catch rate formula

**Files:**
- Modify: `src/engine/catch.ts`
- Modify: `tests/engine/catch-v2.test.ts`

The spec defines:
- Per-trait: `traitCatchChance = 1.0 - (traitRank / maxRankInPool) * 0.50`
- Final: `catchRate = average(traitCatchChance for each slot) - failPenalty`, clamped to [minCatchRate, maxCatchRate]

- [ ] **Step 1: Write failing tests for rank-based catch rate**

Replace the `calculateCatchRate` describe block in `tests/engine/catch-v2.test.ts`. First update the mock setup — the new formula needs `getTraitRank` and `getSpeciesById`:

```typescript
// At the top of the file, update the species mock:
const mockGetTraitRank = jest.fn();
const mockGetSpeciesById = jest.fn();
jest.mock("../../src/config/species", () => ({
  getTraitDefinition: (...args: any[]) => mockGetTraitDefinition(...args),
  getTraitRank: (...args: any[]) => mockGetTraitRank(...args),
  getSpeciesById: (...args: any[]) => mockGetSpeciesById(...args),
}));
```

Update `beforeEach`:

```typescript
beforeEach(() => {
  mockGetTraitDefinition.mockReset();
  mockGetTraitRank.mockReset();
  mockGetSpeciesById.mockReset();
  // Default: compi has 19 traits per slot
  mockGetSpeciesById.mockReturnValue({
    id: "compi",
    traitPools: {
      eyes: new Array(19),
      mouth: new Array(19),
      body: new Array(19),
      tail: new Array(19),
    },
  });
});
```

Add helper:

```typescript
function setupTraitRanks(ranks: Record<string, number>): void {
  mockGetTraitRank.mockImplementation((_speciesId: string, _slotId: string, variantId: string) => {
    return ranks[variantId] ?? 0;
  });
}
```

Replace the `calculateCatchRate` describe:

```typescript
describe("calculateCatchRate", () => {
  test("all rank-0 traits = 100% base (clamped to maxCatchRate 0.90)", () => {
    setupTraitRanks({ c1: 0, c2: 0, c3: 0, c4: 0 });
    const slots = makeSlots(["c1", "c2", "c3", "c4"]);
    const rate = calculateCatchRate("compi", slots, 0);
    // avg(1.0, 1.0, 1.0, 1.0) = 1.0, clamped to 0.90
    expect(rate).toBeCloseTo(0.90);
  });

  test("rank-8 traits lower catch rate", () => {
    setupTraitRanks({ r1: 8, r2: 8, r3: 8, r4: 8 });
    const slots = makeSlots(["r1", "r2", "r3", "r4"]);
    const rate = calculateCatchRate("compi", slots, 0);
    // Each: 1.0 - (8/18)*0.50 = 1.0 - 0.2222 = 0.7778
    // avg = 0.7778
    expect(rate).toBeCloseTo(0.778, 2);
  });

  test("mixed ranks: average of per-trait chances", () => {
    setupTraitRanks({ c1: 0, c2: 0, r1: 8, r2: 18 });
    const slots = makeSlots(["c1", "c2", "r1", "r2"]);
    const rate = calculateCatchRate("compi", slots, 0);
    // rank 0: 1.0, rank 0: 1.0, rank 8: 0.778, rank 18: 0.50
    // avg = (1.0 + 1.0 + 0.778 + 0.50) / 4 = 0.8194
    expect(rate).toBeCloseTo(0.819, 2);
  });

  test("fail penalty reduces rate", () => {
    setupTraitRanks({ c1: 0, c2: 0, c3: 0, c4: 0 });
    const slots = makeSlots(["c1", "c2", "c3", "c4"]);
    // base = 1.0 (clamped to 0.90), penalty = 0.10 → 0.80
    expect(calculateCatchRate("compi", slots, 0.10)).toBeCloseTo(0.80);
  });

  test("rate clamped to minimum (0.15)", () => {
    setupTraitRanks({ r1: 18, r2: 18, r3: 18, r4: 18 });
    const slots = makeSlots(["r1", "r2", "r3", "r4"]);
    // base = 0.50, penalty = 0.50 → 0.00, clamped to 0.15
    const rate = calculateCatchRate("compi", slots, 0.5);
    expect(rate).toBe(0.15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/engine/catch-v2.test.ts --testNamePattern="calculateCatchRate" -v`
Expected: FAIL — old formula produces different numbers

- [ ] **Step 3: Implement rank-based `calculateCatchRate`**

Replace `calculateCatchRate` in `src/engine/catch.ts`:

```typescript
import { getTraitRank, getSpeciesById } from "../config/species";
```

```typescript
/**
 * Calculate catch rate using rank-based formula from spec.
 *
 * Per-trait chance: 1.0 - (traitRank / maxRankInPool) * 0.50
 * Final: average of all per-trait chances - failPenalty, clamped to [min, max]
 */
export function calculateCatchRate(speciesId: string, slots: CreatureSlot[], failPenalty: number): number {
  const config = loadConfig();
  const { minCatchRate, maxCatchRate } = config.catching;
  const species = getSpeciesById(speciesId);

  let totalChance = 0;
  for (const slot of slots) {
    const rank = getTraitRank(speciesId, slot.slotId, slot.variantId);
    const poolSize = species?.traitPools[slot.slotId]?.length ?? 1;
    const maxRankInPool = Math.max(poolSize - 1, 1);
    const traitChance = 1.0 - (Math.max(rank, 0) / maxRankInPool) * 0.50;
    totalChance += traitChance;
  }

  const avgChance = slots.length > 0 ? totalChance / slots.length : 1.0;
  const rate = avgChance - failPenalty;
  return Math.max(minCatchRate, Math.min(maxCatchRate, rate));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/engine/catch-v2.test.ts --testNamePattern="calculateCatchRate" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/catch.ts tests/engine/catch-v2.test.ts
git commit -m "feat: rank-based catch rate formula per spec"
```

---

### Task 5: Simplify energy cost and XP to flat values

**Files:**
- Modify: `src/engine/catch.ts`
- Modify: `tests/engine/catch-v2.test.ts`

The spec says: energy cost = 1 per attempt (flat), XP = flat base from config.

- [ ] **Step 1: Write failing tests for flat energy cost**

Replace the `calculateEnergyCost` describe block in `tests/engine/catch-v2.test.ts`:

```typescript
describe("calculateEnergyCost", () => {
  test("always returns 1 regardless of traits", () => {
    setupTraitRates({ c1: 0.12, c2: 0.10, c3: 0.08, c4: 0.06 });
    const slots = makeSlots(["c1", "c2", "c3", "c4"]);
    expect(calculateEnergyCost("compi", slots)).toBe(1);
  });

  test("returns 1 even for rare traits", () => {
    setupTraitRates({ r1: 0.01, r2: 0.003, r3: 0.02, r4: 0.04 });
    const slots = makeSlots(["r1", "r2", "r3", "r4"]);
    expect(calculateEnergyCost("compi", slots)).toBe(1);
  });
});
```

Replace the `calculateXpEarned` describe block:

```typescript
describe("calculateXpEarned", () => {
  test("returns base XP regardless of trait rarity", () => {
    setupTraitRates({ c1: 0.12, c2: 0.10, c3: 0.08, c4: 0.06 });
    const slots = makeSlots(["c1", "c2", "c3", "c4"]);
    expect(calculateXpEarned("compi", slots)).toBe(20);
  });

  test("returns same base XP for rare traits", () => {
    setupTraitRates({ r1: 0.01, r2: 0.003, r3: 0.02, r4: 0.04 });
    const slots = makeSlots(["r1", "r2", "r3", "r4"]);
    expect(calculateXpEarned("compi", slots)).toBe(20);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/catch-v2.test.ts --testNamePattern="calculateEnergyCost|calculateXpEarned" -v`
Expected: FAIL — current energy cost returns >1 for rare traits, current XP returns >20 for rare traits

- [ ] **Step 3: Simplify both functions**

In `src/engine/catch.ts`:

```typescript
/**
 * Energy cost per catch attempt: flat 1.
 */
export function calculateEnergyCost(_speciesId: string, _slots: CreatureSlot[]): number {
  return 1;
}

/**
 * XP earned from catching: flat base from config.
 */
export function calculateXpEarned(_speciesId: string, _slots: CreatureSlot[]): number {
  const config = loadConfig();
  return config.catching.xpBase;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/catch-v2.test.ts -v`
Expected: PASS (all tests including attemptCatch)

- [ ] **Step 5: Commit**

```bash
git add src/engine/catch.ts tests/engine/catch-v2.test.ts
git commit -m "feat: flat energy cost (1) and flat XP per catch per spec"
```

---

### Task 6: Fix integration tests and run full suite

**Files:**
- Modify: `tests/engine/batch.test.ts` (if any remaining failures)
- Modify: `tests/integration/core-loop.test.ts` (if affected)
- Modify: `tests/integration/gameplay-loop.test.ts` (if affected)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest --verbose 2>&1 | head -100`

Look for failures in:
- `tests/engine/batch.test.ts` — `spawnBatch` tests that didn't pass `level`
- `tests/engine/catch-v2.test.ts` — `attemptCatch` tests using old energy/XP expectations
- `tests/integration/*` — integration tests that might depend on old spawn behavior
- `tests/engine/companion.test.ts` — uses `calculateCatchRate` and `calculateEnergyCost`
- `tests/simulation/*` — simulation tests using GameEngine

- [ ] **Step 2: Fix any failing tests**

Common fixes needed:
- Any test calling `generateCreatureSlots("compi", rng)` needs `generateCreatureSlots("compi", level, rng)`
- Any test asserting energy cost > 1 needs to expect 1
- Any test asserting XP > base needs to expect base only
- Integration tests using `GameEngine.scan()` should work without changes since `spawnBatch` reads level from state internally

- [ ] **Step 3: Run full suite to confirm green**

Run: `npx jest --verbose`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "fix: update tests for rank-based trait spawning"
```

---

### Task 7: Remove dead config (optional cleanup)

**Files:**
- Modify: `src/engine/catch.ts` — remove unused `getTraitDefinition` import if no longer needed
- Verify: `config/balance.json` — `catching.maxTraitSpawnRate` and `catching.difficultyScale` are now unused by catch rate formula

- [ ] **Step 1: Check for unused imports/config**

Grep for `maxTraitSpawnRate` and `difficultyScale` usage outside of tests. If only used in the old `calculateCatchRate`, they can be noted as deprecated but should NOT be removed from `balance.json` yet (other code or tests may reference the config shape).

- [ ] **Step 2: Clean up imports in `catch.ts`**

Remove `getTraitDefinition` import if no longer used (replaced by `getTraitRank` and `getSpeciesById`). Keep `loadConfig` since `calculateXpEarned` still uses it.

- [ ] **Step 3: Run full test suite**

Run: `npx jest --verbose`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "refactor: remove unused imports from catch.ts"
```
