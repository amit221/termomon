# Termomon UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve game UX with 5 key features: spawn 3-10 creatures per scan, show catch item inventory counts and attempt limits, display creature art in collection, add box-drawing borders to UI, and add catch animation effects.

**Architecture:** All changes are isolated to the renderer (`simple-text.ts`), spawn constants (`constants.ts`), and spawn logic (`spawn.ts`). The pure engine logic remains untouched. Rendering improvements use Unicode box-drawing characters for borders and alignment. Spawn improvements increase `MAX_NEARBY` and add multi-creature spawning without changing the core game loop.

**Tech Stack:** TypeScript, Jest for tests, Unicode box-drawing characters for UI

---

## File Structure

### Files to Modify:
- `src/config/constants.ts` — Increase MAX_NEARBY (5→10), add INITIAL_SPAWN_COUNT
- `src/engine/spawn.ts` — Add function to spawn multiple creatures on startup
- `src/renderers/simple-text.ts` — Enhanced renderers with borders, art, animations, summaries
- `tests/renderers/simple-text.test.ts` — Tests for new render output

### Files to Create:
None — all changes fit in existing architecture

---

## Task 1: Increase max creatures nearby & add multi-spawn support

**Files:**
- Modify: `src/config/constants.ts:5-6`
- Modify: `src/engine/spawn.ts:67-93`
- Create: `tests/engine/spawn-multi.test.ts`

**Rationale:** Currently `MAX_NEARBY = 5` limits total creatures visible, and `processSpawns` spawns only 1 creature per tick. This makes scanning boring. Solution: raise `MAX_NEARBY` to 10 and allow spawning up to 3 creatures per successful spawn check (respecting the max).

- [ ] **Step 1: Write failing tests for multi-spawn**

```typescript
// tests/engine/spawn-multi.test.ts
import { processSpawns } from "../../src/engine/spawn";
import { GameState } from "../../src/types";

describe("spawn multi-creatures", () => {
  it("should spawn up to 3 creatures when conditions allow", () => {
    const state: GameState = {
      version: 1,
      profile: { level: 1, xp: 0, totalCatches: 0, totalTicks: 100, currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-03" },
      collection: [],
      inventory: {},
      nearby: [],
      recentTicks: [],
      claimedMilestones: [],
      settings: { renderer: "simple", notificationLevel: "moderate" },
    };

    // Mock RNG to always spawn
    const mockRng = () => 0.1; // Always passes spawn check
    
    const spawned = processSpawns(state, Date.now(), mockRng);
    expect(spawned.length).toBeLessThanOrEqual(3);
    expect(spawned.length).toBeGreaterThan(0);
  });

  it("should not exceed MAX_NEARBY even with multi-spawn", () => {
    const state: GameState = {
      version: 1,
      profile: { level: 1, xp: 0, totalCatches: 0, totalTicks: 100, currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-03" },
      collection: [],
      inventory: {},
      nearby: [
        { creatureId: "mousebyte", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "buglet", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "sparkit", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "cryptbug", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "datamoth", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "glitchling", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "pixelwing", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "codesnake", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "hackrat", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "bitspin", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
      ],
      recentTicks: [],
      claimedMilestones: [],
      settings: { renderer: "simple", notificationLevel: "moderate" },
    };

    const spawned = processSpawns(state, Date.now(), () => 0.1);
    expect(state.nearby.length).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/engine/spawn-multi.test.ts -v
```

Expected output: `FAIL — processSpawns spawns only 1 creature, tests expect up to 3`

- [ ] **Step 3: Update constants.ts to increase MAX_NEARBY**

```typescript
// src/config/constants.ts
export const TICKS_PER_SPAWN_CHECK = 10;
export const SPAWN_PROBABILITY = 0.6;
export const MAX_NEARBY = 10;  // Changed from 5 to 10
export const INITIAL_SPAWN_COUNT = 3;  // New: max creatures to spawn per check
export const CREATURE_LINGER_MS = 30 * 60 * 1000;
export const MAX_CATCH_ATTEMPTS = 3;
```

- [ ] **Step 4: Update spawn.ts processSpawns to spawn multiple creatures**

Replace the `processSpawns` function:

```typescript
export function processSpawns(
  state: GameState,
  now: number,
  rng: () => number = Math.random
): CreatureDefinition[] {
  const spawned: CreatureDefinition[] = [];

  if (state.nearby.length >= MAX_NEARBY) return spawned;
  if (!shouldCheckSpawn(state.profile.totalTicks)) return spawned;
  if (!rollSpawn(rng)) return spawned;

  const hour = new Date(now).getHours();

  // Spawn up to INITIAL_SPAWN_COUNT creatures (respecting MAX_NEARBY)
  for (let i = 0; i < INITIAL_SPAWN_COUNT; i++) {
    if (state.nearby.length >= MAX_NEARBY) break;

    const creature = pickCreature(hour, state.profile.totalTicks, rng);
    if (!creature) continue;

    // Don't spawn duplicate creatures
    if (state.nearby.some((n) => n.creatureId === creature.id)) continue;

    state.nearby.push({
      creatureId: creature.id,
      spawnedAt: now,
      failedAttempts: 0,
      maxAttempts: MAX_CATCH_ATTEMPTS,
    });
    spawned.push(creature);
  }

  return spawned;
}
```

Also add the import at the top:

```typescript
import {
  // ... existing imports ...
  INITIAL_SPAWN_COUNT,
} from "../config/constants";
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest tests/engine/spawn-multi.test.ts -v
```

Expected output: `PASS — both tests pass`

- [ ] **Step 6: Run full test suite to ensure no regressions**

```bash
npm test
```

Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add src/config/constants.ts src/engine/spawn.ts tests/engine/spawn-multi.test.ts
git commit -m "feat: increase creature spawn limit to 10 and spawn up to 3 per check

- Increase MAX_NEARBY from 5 to 10
- Add INITIAL_SPAWN_COUNT constant (3)
- Update processSpawns to spawn multiple creatures per successful spawn check
- Prevents duplicate spawns and respects MAX_NEARBY limit
- Add tests to verify multi-spawn behavior and max limit enforcement"
```

---

## Task 2: Add catch item inventory summary to scan result

**Files:**
- Modify: `src/types.ts:107-114`
- Modify: `src/engine/game-engine.ts:104-118`
- Modify: `src/renderers/simple-text.ts:24-42`
- Create: `tests/renderers/simple-text-inventory-summary.test.ts`

**Rationale:** Users don't know how many catch balls they have or how many attempts remain. Add a summary showing total catch items (bytetrap + netsnare + corelock) and remaining attempts for each creature in the scan.

- [ ] **Step 1: Write failing test for inventory summary in scan**

```typescript
// tests/renderers/simple-text-inventory-summary.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { ScanResult, CreatureDefinition } from "../../src/types";

describe("SimpleTextRenderer scan inventory summary", () => {
  const mockCreature: CreatureDefinition = {
    id: "test",
    name: "TestMonster",
    description: "A test creature",
    rarity: "common",
    baseCatchRate: 0.8,
    art: { simple: ["  test  "], rich: ["  test  "] },
    spawnCondition: {},
  };

  it("should include total catch items count at top of scan", () => {
    const renderer = new SimpleTextRenderer();
    const scanResult: ScanResult = {
      nearby: [
        {
          index: 0,
          creature: mockCreature,
          spawnedAt: Date.now(),
          catchRate: 0.8,
        },
      ],
    };
    const inventory = { bytetrap: 5, netsnare: 2, corelock: 0 };
    const output = renderer.renderScan(scanResult, inventory);
    
    expect(output).toContain("Total catch items: 7");
  });

  it("should show remaining attempts for each creature", () => {
    const renderer = new SimpleTextRenderer();
    const creature2: CreatureDefinition = { ...mockCreature, id: "test2", name: "TestMonster2" };
    const scanResult: ScanResult = {
      nearby: [
        {
          index: 0,
          creature: mockCreature,
          spawnedAt: Date.now(),
          catchRate: 0.8,
        },
        {
          index: 1,
          creature: creature2,
          spawnedAt: Date.now(),
          catchRate: 0.7,
        },
      ],
    };
    const inventory = { bytetrap: 10 };
    const output = renderer.renderScan(scanResult, inventory);
    
    expect(output).toContain("Attempts left: 3/3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/renderers/simple-text-inventory-summary.test.ts -v
```

Expected: `FAIL — renderScan does not accept inventory parameter`

- [ ] **Step 3: Modify ScanResult type to include inventory info**

Update `src/types.ts` ScanResult interface (lines 107-114):

```typescript
export interface ScanResult {
  nearby: Array<{
    index: number;
    creature: CreatureDefinition;
    spawnedAt: number;
    catchRate: number;
    attemptsRemaining?: number;  // New: attempts left for this creature (maxAttempts - failedAttempts)
  }>;
  totalCatchItems?: number;  // New: total count of bytetrap + netsnare + corelock
}
```

- [ ] **Step 4: Update game-engine scan() to include inventory summary**

Modify `src/engine/game-engine.ts` scan method (lines 104-119):

```typescript
  scan(): ScanResult {
    const now = Date.now();
    cleanupDespawned(this.state, now);

    // Calculate total catch items
    const catchItems = ["bytetrap", "netsnare", "corelock"];
    const totalCatchItems = catchItems.reduce((sum, id) => sum + (this.state.inventory[id] || 0), 0);

    return {
      nearby: this.state.nearby.map((n, i) => {
        const creature = this.creatures.get(n.creatureId)!;
        return {
          index: i,
          creature,
          spawnedAt: n.spawnedAt,
          catchRate: creature.baseCatchRate,
          attemptsRemaining: n.maxAttempts - n.failedAttempts,  // New
        };
      }),
      totalCatchItems,  // New
    };
  }
```

- [ ] **Step 5: Update renderer to display inventory summary**

Modify `src/renderers/simple-text.ts` renderScan method (lines 24-42):

```typescript
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return "No signals detected — nothing nearby right now.";
    }

    let out = `┌──────────────────────────────────┐\n`;
    out += `│ NEARBY SIGNALS — ${result.nearby.length} detected${" ".repeat(Math.max(0, 12 - result.nearby.length.toString().length))}│\n`;
    if (result.totalCatchItems !== undefined) {
      out += `│ Catch items: ${result.totalCatchItems}${" ".repeat(Math.max(0, 18 - result.totalCatchItems.toString().length))}│\n`;
    }
    out += `└──────────────────────────────────┘\n\n`;

    for (const entry of result.nearby) {
      const c = entry.creature;
      const art = c.art.simple.map((line) => "    " + line).join("\n");
      out += `┌─ [${entry.index + 1}] ${c.name}${"─".repeat(Math.max(0, 22 - entry.index.toString().length - c.name.length))}┐\n`;
      out += art + "\n";
      out += `│ ${stars(c.rarity)} ${rarityLabel(c.rarity)}${" ".repeat(Math.max(0, 28 - rarityLabel(c.rarity).length))}│\n`;
      out += `│ Catch rate: ${Math.round(entry.catchRate * 100)}%${" ".repeat(Math.max(0, 20 - Math.round(entry.catchRate * 100).toString().length))}│\n`;
      if (entry.attemptsRemaining !== undefined) {
        out += `│ Attempts: ${entry.attemptsRemaining}/3${" ".repeat(Math.max(0, 21 - entry.attemptsRemaining.toString().length))}│\n`;
      }
      out += `└──────────────────────────────────┘\n\n`;
    }

    out += "Use /catch [number] to attempt capture";
    return out;
  }
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx jest tests/renderers/simple-text-inventory-summary.test.ts -v
```

Expected: `PASS`

- [ ] **Step 7: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/engine/game-engine.ts src/renderers/simple-text.ts tests/renderers/simple-text-inventory-summary.test.ts
git commit -m "feat: add inventory summary and attempt counter to scan display

- ScanResult now includes totalCatchItems and attemptsRemaining per creature
- game-engine.scan() calculates total catch items (bytetrap + netsnare + corelock)
- renderScan displays catch item count and remaining attempts for each creature
- Add box borders to scan display for better visual structure
- Helps players understand resource availability and creature urgency"
```

---

## Task 3: Display creature art in collection view

**Files:**
- Modify: `src/renderers/simple-text.ts:69-96`
- Create: `tests/renderers/simple-text-collection-art.test.ts`

**Rationale:** Collection only shows names, not the creature art. Inconsistent with scan view. Add art display like scan does.

- [ ] **Step 1: Write failing test for collection art**

```typescript
// tests/renderers/simple-text-collection-art.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { CollectionEntry, CreatureDefinition } from "../../src/types";

describe("SimpleTextRenderer collection with art", () => {
  it("should display creature art in collection view", () => {
    const renderer = new SimpleTextRenderer();
    const creature: CreatureDefinition = {
      id: "mousebyte",
      name: "Mousebyte",
      description: "A tiny mouse",
      rarity: "common",
      baseCatchRate: 0.8,
      art: {
        simple: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
        rich: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
      },
      spawnCondition: {},
    };
    const collection: CollectionEntry[] = [
      {
        creatureId: "mousebyte",
        fragments: 3,
        totalCaught: 2,
        firstCaughtAt: Date.now(),
        evolved: false,
      },
    ];
    const creatures = new Map([["mousebyte", creature]]);

    const output = renderer.renderCollection(collection, creatures);
    
    expect(output).toContain("⠰⡱⢀⠤⠤⡀⢎⠆"); // Should have art
    expect(output).toContain("Mousebyte");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/renderers/simple-text-collection-art.test.ts -v
```

Expected: `FAIL — art lines not found in output`

- [ ] **Step 3: Update renderCollection to include art**

Modify `src/renderers/simple-text.ts` renderCollection method (lines 69-96):

```typescript
  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    if (collection.length === 0) {
      return "Your collection is empty. Use /scan to find creatures nearby.";
    }

    let out = `┌──────────────────────────────────┐\n`;
    out += `│ COLLECTION — ${collection.length} creatures${" ".repeat(Math.max(0, 14 - collection.length.toString().length))}│\n`;
    out += `└──────────────────────────────────┘\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? " [EVOLVED]" : "";
      out += `┌─ ${c.name}${evolvedLabel}${" ".repeat(Math.max(0, 26 - c.name.length - (entry.evolved ? 9 : 0)))}┐\n`;
      out += `│ ${stars(c.rarity)}${" ".repeat(Math.max(0, 30 - stars(c.rarity).length))}│\n`;
      
      // Display creature art
      const art = c.art.simple.map((line) => "  " + line).join("\n");
      out += art + "\n";
      
      out += `│ Caught: ${entry.totalCaught}x${" ".repeat(Math.max(0, 24 - entry.totalCaught.toString().length))}│\n`;
      if (c.evolution && !entry.evolved) {
        out += `│ Fragments: ${entry.fragments}/${c.evolution.fragmentCost}${" ".repeat(Math.max(0, 18 - entry.fragments.toString().length - c.evolution.fragmentCost.toString().length))}│\n`;
        if (entry.fragments >= c.evolution.fragmentCost) {
          out += `│ ✓ Ready to evolve!${" ".repeat(Math.max(0, 12))}│\n`;
        }
      }
      out += `└──────────────────────────────────┘\n\n`;
    }

    return out.trimEnd();
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/renderers/simple-text-collection-art.test.ts -v
```

Expected: `PASS`

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text-collection-art.test.ts
git commit -m "feat: display creature art in collection view

- renderCollection now shows creature art alongside stats
- Add box borders to collection display for visual consistency
- Display evolution readiness with checkmark indicator
- Improves visual appeal and feature parity with scan view"
```

---

## Task 4: Add visual effects to catch attempt display

**Files:**
- Modify: `src/renderers/simple-text.ts:44-67`
- Create: `tests/renderers/simple-text-catch-effects.test.ts`

**Rationale:** Catch result is plain text. Add ASCII animation effects to make success/failure more engaging.

- [ ] **Step 1: Write failing test for catch effects**

```typescript
// tests/renderers/simple-text-catch-effects.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { CatchResult, CreatureDefinition, ItemDefinition } from "../../src/types";

describe("SimpleTextRenderer catch effects", () => {
  const mockCreature: CreatureDefinition = {
    id: "test",
    name: "TestMonster",
    description: "A test creature",
    rarity: "common",
    baseCatchRate: 0.8,
    art: { simple: ["  test  "], rich: ["  test  "] },
    spawnCondition: {},
  };

  const mockItem: ItemDefinition = {
    id: "bytetrap",
    name: "ByteTrap",
    description: "Basic capture",
    type: "capture",
    catchMultiplier: 1.0,
  };

  it("should display success animation on catch", () => {
    const renderer = new SimpleTextRenderer();
    const result: CatchResult = {
      success: true,
      creature: mockCreature,
      itemUsed: mockItem,
      fragmentsEarned: 1,
      totalFragments: 1,
      xpEarned: 10,
      fled: false,
      evolutionReady: false,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("✓"); // Success indicator
    expect(output).toContain("Caught!");
  });

  it("should display failure animation on escape", () => {
    const renderer = new SimpleTextRenderer();
    const result: CatchResult = {
      success: false,
      creature: mockCreature,
      itemUsed: mockItem,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: false,
      evolutionReady: false,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("escaped"); // Failure indicator
  });

  it("should display flee animation when creature flees", () => {
    const renderer = new SimpleTextRenderer();
    const result: CatchResult = {
      success: false,
      creature: mockCreature,
      itemUsed: mockItem,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: true,
      evolutionReady: false,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("fled");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/renderers/simple-text-catch-effects.test.ts -v
```

Expected: `FAIL — output does not contain expected indicators`

- [ ] **Step 3: Update renderCatch with visual effects**

Modify `src/renderers/simple-text.ts` renderCatch method (lines 44-67):

```typescript
  renderCatch(result: CatchResult): string {
    const c = result.creature;

    if (result.success) {
      let out = `╔════════════════════════════════╗\n`;
      out += `║ ✓✓✓ CAUGHT! ✓✓✓${" ".repeat(Math.max(0, 13))}║\n`;
      out += `╠════════════════════════════════╣\n`;
      out += `║ ${c.name} captured with ${result.itemUsed.name}${" ".repeat(Math.max(0, 30 - c.name.length - result.itemUsed.name.length))}║\n`;
      out += `╠════════════════════════════════╣\n`;
      out += `║ +${result.xpEarned} XP${" ".repeat(Math.max(0, 26 - result.xpEarned.toString().length))}║\n`;
      out += `║ Fragments: ${result.totalFragments}`;
      if (c.evolution) {
        out += `/${c.evolution.fragmentCost}`;
      }
      out += `${" ".repeat(Math.max(0, 18 - result.totalFragments.toString().length))}║\n`;
      
      if (result.evolutionReady) {
        out += `║ ★ Ready to evolve!${" ".repeat(Math.max(0, 12))}║\n`;
      }
      if (result.bonusItem) {
        out += `║ Bonus: +${result.bonusItem.count}x ${result.bonusItem.item.name}${" ".repeat(Math.max(0, 21 - result.bonusItem.count.toString().length - result.bonusItem.item.name.length))}║\n`;
      }
      out += `╚════════════════════════════════╝`;
      return out;
    }

    if (result.fled) {
      let out = `╔════════════════════════════════╗\n`;
      out += `║ ✕ FLED! ${" ".repeat(Math.max(0, 21))}║\n`;
      out += `╠════════════════════════════════╣\n`;
      out += `║ ${c.name} slipped away for good.${" ".repeat(Math.max(0, 30 - c.name.length - 20))}║\n`;
      out += `║ The ${result.itemUsed.name} was used.${" ".repeat(Math.max(0, 30 - result.itemUsed.name.length - 14))}║\n`;
      out += `╚════════════════════════════════╝`;
      return out;
    }

    let out = `╔════════════════════════════════╗\n`;
    out += `║ ✗ ESCAPED${" ".repeat(Math.max(0, 20))}║\n`;
    out += `╠════════════════════════════════╣\n`;
    out += `║ ${c.name} broke free!${" ".repeat(Math.max(0, 30 - c.name.length - 12))}║\n`;
    out += `║ Try again with another ${result.itemUsed.name}${" ".repeat(Math.max(0, 30 - result.itemUsed.name.length - 18))}║\n`;
    out += `╚════════════════════════════════╝`;
    return out;
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/renderers/simple-text-catch-effects.test.ts -v
```

Expected: `PASS`

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text-catch-effects.test.ts
git commit -m "feat: add visual effects to catch attempt display

- renderCatch now displays success/failure/flee with box borders
- Add Unicode symbols (✓✓✓, ✗, ✕) for visual feedback
- Improves clarity of catch outcome and engagement
- Better visual hierarchy with double/single line borders"
```

---

## Task 5: Improve inventory display with better borders and organization

**Files:**
- Modify: `src/renderers/simple-text.ts:98-117`
- Create: `tests/renderers/simple-text-inventory-borders.test.ts`

**Rationale:** Inventory display is plain. Add borders and section organization for consistency.

- [ ] **Step 1: Write failing test for inventory borders**

```typescript
// tests/renderers/simple-text-inventory-borders.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { ItemDefinition } from "../../src/types";

describe("SimpleTextRenderer inventory display", () => {
  it("should display inventory with borders and organization", () => {
    const renderer = new SimpleTextRenderer();
    const inventory = {
      bytetrap: 5,
      netsnare: 2,
      corelock: 0,
      shard: 1,
    };
    const items = new Map<string, ItemDefinition>([
      [
        "bytetrap",
        {
          id: "bytetrap",
          name: "ByteTrap",
          description: "Basic capture",
          type: "capture",
        },
      ],
      [
        "netsnare",
        {
          id: "netsnare",
          name: "NetSnare",
          description: "Improved trap",
          type: "capture",
        },
      ],
      [
        "corelock",
        {
          id: "corelock",
          name: "CoreLock",
          description: "Military-grade",
          type: "capture",
        },
      ],
      [
        "shard",
        {
          id: "shard",
          name: "Shard",
          description: "Evolution catalyst",
          type: "catalyst",
        },
      ],
    ]);

    const output = renderer.renderInventory(inventory, items);
    expect(output).toContain("INVENTORY");
    expect(output).toContain("─");
    expect(output).toContain("ByteTrap");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/renderers/simple-text-inventory-borders.test.ts -v
```

Expected: `FAIL — borders not found`

- [ ] **Step 3: Update renderInventory with borders and sections**

Modify `src/renderers/simple-text.ts` renderInventory method (lines 98-117):

```typescript
  renderInventory(
    inventory: Record<string, number>,
    items: Map<string, ItemDefinition>
  ): string {
    const entries = Object.entries(inventory).filter(([, count]) => count > 0);

    if (entries.length === 0) {
      return "Inventory is empty. Complete tasks and catches to earn items.";
    }

    // Separate capture and catalyst items
    const captureItems: typeof entries = [];
    const catalystItems: typeof entries = [];

    for (const [itemId, count] of entries) {
      const item = items.get(itemId);
      if (!item) continue;
      if (item.type === "capture") {
        captureItems.push([itemId, count]);
      } else {
        catalystItems.push([itemId, count]);
      }
    }

    let out = `┌──────────────────────────────────┐\n`;
    out += `│ INVENTORY${" ".repeat(24)}│\n`;
    out += `└──────────────────────────────────┘\n\n`;

    if (captureItems.length > 0) {
      out += `CAPTURE DEVICES\n`;
      for (const [itemId, count] of captureItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  ├─ ${item.name} x${count}\n`;
        out += `  │  ${item.description}\n`;
      }
      out += "\n";
    }

    if (catalystItems.length > 0) {
      out += `EVOLUTION CATALYSTS\n`;
      for (const [itemId, count] of catalystItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  ├─ ${item.name} x${count}\n`;
        out += `  │  ${item.description}\n`;
      }
      out += "\n";
    }

    return out.trimEnd();
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/renderers/simple-text-inventory-borders.test.ts -v
```

Expected: `PASS`

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text-inventory-borders.test.ts
git commit -m "feat: improve inventory display with sections and borders

- Add box borders to inventory header
- Separate capture devices and catalysts into sections
- Use tree-style formatting (├─, │) for better readability
- Improve visual organization and consistency with other views"
```

---

## Task 6: Update status and evolve renders with borders for consistency

**Files:**
- Modify: `src/renderers/simple-text.ts:119-144`

**Rationale:** Other renders now have borders. Update remaining renders (status, evolve) for visual consistency.

- [ ] **Step 1: Write test for status and evolve borders**

```typescript
// tests/renderers/simple-text-consistency.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { StatusResult, EvolveResult, CreatureDefinition } from "../../src/types";

describe("SimpleTextRenderer consistency", () => {
  it("should display status with borders", () => {
    const renderer = new SimpleTextRenderer();
    const result: StatusResult = {
      profile: {
        level: 5,
        xp: 50,
        totalCatches: 10,
        totalTicks: 100,
        currentStreak: 3,
        longestStreak: 7,
        lastActiveDate: "2026-04-03",
      },
      collectionCount: 5,
      totalCreatures: 20,
      nearbyCount: 2,
    };

    const output = renderer.renderStatus(result);
    expect(output).toContain("┌");
    expect(output).toContain("STATUS");
  });

  it("should display evolve result with borders", () => {
    const renderer = new SimpleTextRenderer();
    const creature1: CreatureDefinition = {
      id: "mousebyte",
      name: "Mousebyte",
      description: "A tiny mouse",
      rarity: "common",
      baseCatchRate: 0.8,
      art: { simple: ["⠰⡱⢀⠤⠤⡀⢎⠆"], rich: ["⠰⡱⢀⠤⠤⡀⢎⠆"] },
      spawnCondition: {},
    };
    const creature2: CreatureDefinition = {
      id: "circuitmouse",
      name: "Circuitmouse",
      description: "An evolved mouse",
      rarity: "common",
      baseCatchRate: 0,
      art: { simple: ["⠰⡱⢀⠤⠤⡀⢎⠆ evolved"], rich: ["⠰⡱⢀⠤⠤⡀⢎⠆ evolved"] },
      spawnCondition: {},
    };

    const result: EvolveResult = {
      success: true,
      from: creature1,
      to: creature2,
      fragmentsSpent: 5,
    };

    const output = renderer.renderEvolve(result);
    expect(output).toContain("evolved into");
  });
});
```

- [ ] **Step 2: Run test to verify status/evolve need borders**

```bash
npx jest tests/renderers/simple-text-consistency.test.ts -v
```

- [ ] **Step 3: Update renderStatus with borders**

Replace renderStatus in `src/renderers/simple-text.ts` (lines 134-144):

```typescript
  renderStatus(result: StatusResult): string {
    const p = result.profile;
    let out = `┌──────────────────────────────────┐\n`;
    out += `│ STATUS${" ".repeat(27)}│\n`;
    out += `├──────────────────────────────────┤\n`;
    out += `│ Level ${p.level}${" ".repeat(Math.max(0, 26 - p.level.toString().length))}│\n`;
    out += `│ XP: ${p.xp}${" ".repeat(Math.max(0, 26 - p.xp.toString().length))}│\n`;
    out += `│ Total catches: ${p.totalCatches}${" ".repeat(Math.max(0, 17 - p.totalCatches.toString().length))}│\n`;
    out += `│ Collection: ${result.collectionCount}/${result.totalCreatures}${" ".repeat(Math.max(0, 18 - result.collectionCount.toString().length - result.totalCreatures.toString().length))}│\n`;
    out += `│ Streak: ${p.currentStreak} days (best: ${p.longestStreak})${" ".repeat(Math.max(0, 11 - p.currentStreak.toString().length - p.longestStreak.toString().length))}│\n`;
    out += `│ Nearby: ${result.nearbyCount} creatures${" ".repeat(Math.max(0, 21 - result.nearbyCount.toString().length))}│\n`;
    out += `│ Total ticks: ${p.totalTicks}${" ".repeat(Math.max(0, 18 - p.totalTicks.toString().length))}│\n`;
    out += `└──────────────────────────────────┘`;
    return out;
  }
```

- [ ] **Step 4: Update renderEvolve with borders**

Replace renderEvolve in `src/renderers/simple-text.ts` (lines 119-132):

```typescript
  renderEvolve(result: EvolveResult): string {
    if (!result.success) {
      return "Evolution failed.";
    }

    let out = `╔════════════════════════════════╗\n`;
    out += `║ ★ EVOLUTION COMPLETE! ★${" ".repeat(Math.max(0, 7))}║\n`;
    out += `╠════════════════════════════════╣\n`;
    out += `║ ${result.from.name} → ${result.to.name}${" ".repeat(Math.max(0, 28 - result.from.name.length - result.to.name.length - 3))}║\n`;
    out += `╠════════════════════════════════╣\n`;
    const art = result.to.art.simple.map((line) => "  " + line).join("\n");
    out += art + "\n";
    out += `║${" ".repeat(32)}║\n`;
    out += `║ ${result.to.description}${" ".repeat(Math.max(0, 30 - result.to.description.length))}║\n`;
    if (result.catalystUsed) {
      out += `║ (Used: ${result.catalystUsed})${" ".repeat(Math.max(0, 24 - result.catalystUsed.length))}║\n`;
    }
    out += `╚════════════════════════════════╝`;
    return out;
  }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/renderers/simple-text-consistency.test.ts -v
```

Expected: `PASS`

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text-consistency.test.ts
git commit -m "feat: add borders to status and evolve displays for consistency

- renderStatus now uses box borders with separated sections
- renderEvolve uses double borders and star decoration
- Improves visual consistency across all game displays
- Better visual hierarchy and readability"
```

---

## Verification Checklist

Before completion, verify all features work end-to-end:

- [ ] Run `npm run build` and verify no TypeScript errors
- [ ] Run `npm test` and verify all tests pass
- [ ] Build the plugin: `npm run build`
- [ ] Test scan: Run `/scan` and verify:
  - 3-10 creatures appear (if conditions allow)
  - Catch item count shows at top
  - Each creature shows attempts remaining (e.g., "Attempts: 2/3")
  - Borders appear around each creature
- [ ] Test collection: Run `/collection` and verify:
  - Art displays for each creature
  - Borders appear
  - Layout is organized
- [ ] Test inventory: Run `/inventory` and verify:
  - Capture devices and catalysts are separated
  - Tree-style formatting displays
  - Borders appear
- [ ] Test catch: Run `/catch [number]` and verify:
  - Success shows "✓✓✓ CAUGHT!" with double borders
  - Failure shows "✗ ESCAPED" with borders
  - Flee shows "✕ FLED!" with borders
- [ ] Test status: Run `/status` and verify borders display

