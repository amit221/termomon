# Rarity Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 1-100 rarity score to each creature and its individual slots, combining trait rarity (80%) and color rarity (20%).

**Architecture:** New pure-function module `src/engine/rarity.ts` computes scores using existing species trait pools and color weights. The renderer displays slot scores inline next to each trait and a creature-level score next to creature names.

**Tech Stack:** TypeScript, Jest (ts-jest), existing config/species APIs

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/engine/rarity.ts` | Pure score calculation functions |
| Create | `tests/engine/rarity.test.ts` | Unit tests for all score functions |
| Modify | `src/renderers/simple-text.ts` | Display scores in scan/collection/catch/breed/archive output |
| Modify | `src/index.ts` | Export rarity functions |

---

### Task 1: Core rarity scoring module — trait rarity score

**Files:**
- Create: `tests/engine/rarity.test.ts`
- Create: `src/engine/rarity.ts`

- [ ] **Step 1: Write the failing tests for `calculateTraitRarityScore`**

```typescript
// tests/engine/rarity.test.ts
import { calculateTraitRarityScore, calculateColorRarityScore, calculateSlotScore, calculateCreatureScore } from "../../src/engine/rarity";

const mockGetSpeciesById = jest.fn();
const mockLoadConfig = jest.fn();

jest.mock("../../src/config/species", () => ({
  getSpeciesById: (...args: unknown[]) => mockGetSpeciesById(...args),
}));

jest.mock("../../src/config/loader", () => ({
  loadConfig: () => mockLoadConfig(),
}));

function makeSpecies(slotId: string, spawnRates: { id: string; spawnRate: number }[]) {
  return {
    id: "test_species",
    name: "Test",
    traitPools: {
      [slotId]: spawnRates.map((t) => ({ ...t, name: t.id, art: "x" })),
    },
  };
}

describe("calculateTraitRarityScore", () => {
  test("rarest trait in pool scores 100", () => {
    const species = makeSpecies("eyes", [
      { id: "common", spawnRate: 0.12 },
      { id: "mid", spawnRate: 0.06 },
      { id: "rare", spawnRate: 0.003 },
    ]);
    mockGetSpeciesById.mockReturnValue(species);
    expect(calculateTraitRarityScore("test_species", "eyes", "rare")).toBe(100);
  });

  test("most common trait in pool scores 1", () => {
    const species = makeSpecies("eyes", [
      { id: "common", spawnRate: 0.12 },
      { id: "mid", spawnRate: 0.06 },
      { id: "rare", spawnRate: 0.003 },
    ]);
    mockGetSpeciesById.mockReturnValue(species);
    expect(calculateTraitRarityScore("test_species", "eyes", "common")).toBe(1);
  });

  test("middle trait scores between 1 and 100", () => {
    const species = makeSpecies("eyes", [
      { id: "common", spawnRate: 0.12 },
      { id: "mid", spawnRate: 0.06 },
      { id: "rare", spawnRate: 0.003 },
    ]);
    mockGetSpeciesById.mockReturnValue(species);
    expect(calculateTraitRarityScore("test_species", "eyes", "mid")).toBe(50.5);
  });

  test("single trait in pool scores 50", () => {
    const species = makeSpecies("eyes", [
      { id: "only", spawnRate: 0.10 },
    ]);
    mockGetSpeciesById.mockReturnValue(species);
    expect(calculateTraitRarityScore("test_species", "eyes", "only")).toBe(50);
  });

  test("unknown species returns 50", () => {
    mockGetSpeciesById.mockReturnValue(undefined);
    expect(calculateTraitRarityScore("unknown", "eyes", "x")).toBe(50);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/rarity.test.ts --no-coverage 2>&1 | head -30`
Expected: FAIL — cannot find module `../../src/engine/rarity`

- [ ] **Step 3: Implement `calculateTraitRarityScore`**

```typescript
// src/engine/rarity.ts
import { CreatureSlot, CreatureColor, SlotId } from "../types";
import { getSpeciesById } from "../config/species";
import { loadConfig } from "../config/loader";

/**
 * Calculate the rarity score (1-100) for a specific trait within its species slot pool.
 * Rarest trait = 100, most common = 1. Single-trait pools return 50.
 */
export function calculateTraitRarityScore(
  speciesId: string,
  slotId: string,
  variantId: string
): number {
  const species = getSpeciesById(speciesId);
  if (!species) return 50;

  const pool = species.traitPools[slotId as SlotId];
  if (!pool || pool.length === 0) return 50;
  if (pool.length === 1) return 50;

  // Sort by spawnRate descending (most common first → lowest rank)
  const sorted = [...pool].sort((a, b) => b.spawnRate - a.spawnRate);
  const index = sorted.findIndex((t) => t.id === variantId);
  if (index === -1) return 50;

  // index 0 = most common = rank 1, last = rarest = highest rank
  return (index / (sorted.length - 1)) * 99 + 1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/rarity.test.ts --no-coverage 2>&1 | tail -20`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/rarity.ts tests/engine/rarity.test.ts
git commit -m "feat: add calculateTraitRarityScore for per-trait rarity scoring"
```

---

### Task 2: Color rarity score

**Files:**
- Modify: `tests/engine/rarity.test.ts`
- Modify: `src/engine/rarity.ts`

- [ ] **Step 1: Write the failing tests for `calculateColorRarityScore`**

Add to `tests/engine/rarity.test.ts`:

```typescript
describe("calculateColorRarityScore", () => {
  beforeEach(() => {
    mockLoadConfig.mockReturnValue({
      colors: {
        grey: 0.30,
        white: 0.25,
        cyan: 0.20,
        magenta: 0.13,
        yellow: 0.08,
        red: 0.04,
      },
    });
  });

  test("red (rarest) scores 100", () => {
    expect(calculateColorRarityScore("red")).toBe(100);
  });

  test("grey (most common) scores 1", () => {
    expect(calculateColorRarityScore("grey")).toBe(1);
  });

  test("cyan scores 60 (middle-ish)", () => {
    // 6 colors sorted desc by weight: grey, white, cyan, magenta, yellow, red
    // cyan is index 2 → (2/5)*99 + 1 = 40.6
    expect(calculateColorRarityScore("cyan")).toBeCloseTo(40.6, 1);
  });

  test("yellow scores 80.2", () => {
    // index 4 → (4/5)*99 + 1 = 80.2
    expect(calculateColorRarityScore("yellow")).toBeCloseTo(80.2, 1);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx jest tests/engine/rarity.test.ts --no-coverage 2>&1 | tail -20`
Expected: `calculateColorRarityScore` tests FAIL

- [ ] **Step 3: Implement `calculateColorRarityScore`**

Add to `src/engine/rarity.ts`:

```typescript
/**
 * Calculate the rarity score (1-100) for a color based on its spawn weight.
 * Rarest color (lowest weight) = 100, most common = 1.
 */
export function calculateColorRarityScore(color: CreatureColor): number {
  const config = loadConfig();
  const entries = Object.entries(config.colors);
  if (entries.length <= 1) return 50;

  // Sort by weight descending (most common first)
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const index = sorted.findIndex(([c]) => c === color);
  if (index === -1) return 50;

  return (index / (sorted.length - 1)) * 99 + 1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/rarity.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/rarity.ts tests/engine/rarity.test.ts
git commit -m "feat: add calculateColorRarityScore"
```

---

### Task 3: Slot score and creature score

**Files:**
- Modify: `tests/engine/rarity.test.ts`
- Modify: `src/engine/rarity.ts`

- [ ] **Step 1: Write failing tests for `calculateSlotScore` and `calculateCreatureScore`**

Add to `tests/engine/rarity.test.ts`:

```typescript
describe("calculateSlotScore", () => {
  beforeEach(() => {
    const species = makeSpecies("eyes", [
      { id: "common", spawnRate: 0.12 },
      { id: "rare", spawnRate: 0.003 },
    ]);
    mockGetSpeciesById.mockReturnValue(species);
    mockLoadConfig.mockReturnValue({
      colors: {
        grey: 0.30,
        white: 0.25,
        cyan: 0.20,
        magenta: 0.13,
        yellow: 0.08,
        red: 0.04,
      },
    });
  });

  test("applies 80/20 weighting for trait and color", () => {
    // rare trait: index 1 of 2 → (1/1)*99+1 = 100
    // red color: index 5 of 6 → (5/5)*99+1 = 100
    const slot: CreatureSlot = { slotId: "eyes" as SlotId, variantId: "rare", color: "red" };
    expect(calculateSlotScore("test_species", slot)).toBe(100);
  });

  test("all common scores low", () => {
    // common trait: index 0 of 2 → 1
    // grey color: index 0 of 6 → 1
    const slot: CreatureSlot = { slotId: "eyes" as SlotId, variantId: "common", color: "grey" };
    expect(calculateSlotScore("test_species", slot)).toBe(1);
  });

  test("rare trait + common color is trait-heavy", () => {
    // rare trait = 100, grey color = 1
    // 0.8 * 100 + 0.2 * 1 = 80.2
    const slot: CreatureSlot = { slotId: "eyes" as SlotId, variantId: "rare", color: "grey" };
    expect(calculateSlotScore("test_species", slot)).toBeCloseTo(80.2, 1);
  });
});

describe("calculateCreatureScore", () => {
  beforeEach(() => {
    mockGetSpeciesById.mockImplementation((speciesId: string) => {
      return {
        id: speciesId,
        name: "Test",
        traitPools: {
          eyes: [
            { id: "common_eye", name: "c", art: "x", spawnRate: 0.12 },
            { id: "rare_eye", name: "r", art: "x", spawnRate: 0.003 },
          ],
          mouth: [
            { id: "common_mouth", name: "c", art: "x", spawnRate: 0.12 },
            { id: "rare_mouth", name: "r", art: "x", spawnRate: 0.003 },
          ],
        },
      };
    });
    mockLoadConfig.mockReturnValue({
      colors: {
        grey: 0.30,
        white: 0.25,
        cyan: 0.20,
        magenta: 0.13,
        yellow: 0.08,
        red: 0.04,
      },
    });
  });

  test("averages slot scores and rounds", () => {
    const slots: CreatureSlot[] = [
      { slotId: "eyes" as SlotId, variantId: "rare_eye", color: "red" },      // slot score = 100
      { slotId: "mouth" as SlotId, variantId: "common_mouth", color: "grey" }, // slot score = 1
    ];
    // avg(100, 1) = 50.5 → rounds to 51
    expect(calculateCreatureScore("test_species", slots)).toBe(51);
  });

  test("all rare traits + rare colors = 100", () => {
    const slots: CreatureSlot[] = [
      { slotId: "eyes" as SlotId, variantId: "rare_eye", color: "red" },
      { slotId: "mouth" as SlotId, variantId: "rare_mouth", color: "red" },
    ];
    expect(calculateCreatureScore("test_species", slots)).toBe(100);
  });

  test("all common traits + common colors = 1", () => {
    const slots: CreatureSlot[] = [
      { slotId: "eyes" as SlotId, variantId: "common_eye", color: "grey" },
      { slotId: "mouth" as SlotId, variantId: "common_mouth", color: "grey" },
    ];
    expect(calculateCreatureScore("test_species", slots)).toBe(1);
  });

  test("empty slots returns 50", () => {
    expect(calculateCreatureScore("test_species", [])).toBe(50);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx jest tests/engine/rarity.test.ts --no-coverage 2>&1 | tail -20`
Expected: `calculateSlotScore` and `calculateCreatureScore` tests FAIL

- [ ] **Step 3: Implement `calculateSlotScore` and `calculateCreatureScore`**

Add to `src/engine/rarity.ts`:

```typescript
const TRAIT_WEIGHT = 0.8;
const COLOR_WEIGHT = 0.2;

/**
 * Calculate the combined rarity score (1-100) for a single slot.
 * Combines trait rarity (80%) and color rarity (20%).
 */
export function calculateSlotScore(speciesId: string, slot: CreatureSlot): number {
  const traitScore = calculateTraitRarityScore(speciesId, slot.slotId, slot.variantId);
  const colorScore = calculateColorRarityScore(slot.color);
  return TRAIT_WEIGHT * traitScore + COLOR_WEIGHT * colorScore;
}

/**
 * Calculate the overall rarity score (1-100) for a creature.
 * Average of all slot scores, rounded to nearest integer.
 */
export function calculateCreatureScore(speciesId: string, slots: CreatureSlot[]): number {
  if (slots.length === 0) return 50;
  const total = slots.reduce((sum, slot) => sum + calculateSlotScore(speciesId, slot), 0);
  return Math.round(total / slots.length);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/rarity.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/rarity.ts tests/engine/rarity.test.ts
git commit -m "feat: add slot and creature rarity score calculations"
```

---

### Task 4: Export rarity functions from barrel

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add exports to `src/index.ts`**

Add this line after the existing breed export:

```typescript
export { calculateTraitRarityScore, calculateColorRarityScore, calculateSlotScore, calculateCreatureScore } from "./engine/rarity";
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: export rarity score functions from barrel"
```

---

### Task 5: Display scores in renderer — `renderCreatureSideBySide`

**Files:**
- Modify: `src/renderers/simple-text.ts`

The `renderCreatureSideBySide` function is used by `renderScan`, `renderCatch`, `renderCollection`, `renderArchive`, `renderBreedPreview`, and `renderBreedResult`. Updating it adds scores everywhere at once.

- [ ] **Step 1: Add import for rarity functions**

At the top of `src/renderers/simple-text.ts`, add the import:

```typescript
import { calculateSlotScore, calculateCreatureScore } from "../engine/rarity";
```

- [ ] **Step 2: Update `renderCreatureSideBySide` to show slot scores**

Replace the trait line rendering in `renderCreatureSideBySide`. Currently (lines 143-153):

```typescript
  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = speciesId ? getTraitDefinition(speciesId, s.variantId) : getVariantById(s.variantId);
      const name = variant?.name ?? s.variantId;
      const slotColor = COLOR_ANSI[s.color ?? "white"] || WHITE;
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${slotColor}${name}${RESET}`);
    } else {
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${DIM}—${RESET}`);
    }
  }
```

Replace with:

```typescript
  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = speciesId ? getTraitDefinition(speciesId, s.variantId) : getVariantById(s.variantId);
      const name = variant?.name ?? s.variantId;
      const slotColor = COLOR_ANSI[s.color ?? "white"] || WHITE;
      const score = speciesId ? Math.round(calculateSlotScore(speciesId, s)) : 0;
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${slotColor}${name}${RESET} ${DIM}[${score}]${RESET}`);
    } else {
      traitLines.push(`${DIM}${slotId.padEnd(5)}${RESET} ${DIM}—${RESET}`);
    }
  }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/renderers/simple-text.ts
git commit -m "feat: display per-slot rarity scores in creature trait display"
```

---

### Task 6: Display creature-level score in scan, collection, catch, breed, archive

**Files:**
- Modify: `src/renderers/simple-text.ts`

- [ ] **Step 1: Add creature score to `renderScan`**

In `renderScan`, update the creature name line (line 196). Change:

```typescript
      lines.push(`  ${DIM}[${entry.index + 1}]${RESET} ${BOLD}${c.name}${RESET} ${DIM}(${c.speciesId})${RESET}`);
```

To:

```typescript
      const creatureScore = calculateCreatureScore(c.speciesId, c.slots);
      lines.push(`  ${DIM}[${entry.index + 1}]${RESET} ${BOLD}${c.name}${RESET} ${DIM}(${c.speciesId})${RESET}  ⭐ ${creatureScore}`);
```

- [ ] **Step 2: Add creature score to `renderCatch` (success case)**

In the success block of `renderCatch`, change the line (line 217):

```typescript
      lines.push(`  ${BOLD}${c.name}${RESET} joined your collection!`);
```

To:

```typescript
      const creatureScore = calculateCreatureScore(c.speciesId, c.slots);
      lines.push(`  ${BOLD}${c.name}${RESET} joined your collection!  ⭐ ${creatureScore}`);
```

- [ ] **Step 3: Add creature score to `renderCollection`**

In `renderCollection`, change the creature name line (line 324):

```typescript
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}`);
```

To:

```typescript
      const creatureScore = calculateCreatureScore(creature.speciesId, creature.slots);
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  ⭐ ${creatureScore}`);
```

- [ ] **Step 4: Add creature score to `renderArchive`**

In `renderArchive`, change the creature name line (line 347):

```typescript
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}`);
```

To:

```typescript
      const creatureScore = calculateCreatureScore(creature.speciesId, creature.slots);
      lines.push(`  ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  ⭐ ${creatureScore}`);
```

- [ ] **Step 5: Add creature score to `renderBreedResult`**

In `renderBreedResult`, change the child name line (line 292):

```typescript
    lines.push(`  ${BOLD}${child.name}${RESET} was born!`);
```

To:

```typescript
    const childScore = calculateCreatureScore(child.speciesId, child.slots);
    lines.push(`  ${BOLD}${child.name}${RESET} was born!  ⭐ ${childScore}`);
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 7: Run all tests**

Run: `npm test 2>&1 | tail -20`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/renderers/simple-text.ts
git commit -m "feat: display creature rarity score in scan, catch, collection, archive, breed"
```
