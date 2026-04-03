# Terminal Creature Collection Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Pokemon Go-inspired creature collection game that runs as a Claude Code plugin, where terminal activity passively spawns creatures the user can catch via slash commands.

**Architecture:** Four decoupled layers — Activity Tracker (hooks record ticks), Game Engine (pure logic, no I/O), Rendering Layer (pluggable renderers), Platform Adapter (Claude Code skills + hooks). A CLI binary bridges them: hooks call it to record ticks, skills call it to run commands, it outputs JSON that renderers format.

**Tech Stack:** TypeScript, Node.js, Jest for testing, JSON files for state and config data.

**Spec:** `docs/superpowers/specs/2026-04-03-terminal-creature-game-design.md`

---

## File Structure

```
package.json
tsconfig.json
jest.config.ts
src/
  types.ts                          — All TypeScript types and interfaces
  config/
    constants.ts                    — Game balance tuning (spawn rates, tick thresholds, etc.)
    creatures.ts                    — Creature roster data (~20 creatures for POC)
    items.ts                        — Item definitions (capture items + catalysts)
  state/
    state-manager.ts                — Read/write ~/.termomon/state.json atomically
  engine/
    ticks.ts                        — Process ticks, derive sessions/streaks/steps
    spawn.ts                        — Spawn algorithm (rarity weights, time-of-day, RNG)
    catch.ts                        — Catch mechanics (probability, item multipliers, flee)
    evolution.ts                    — Evolution logic (fragments, catalysts, transform)
    inventory.ts                    — Item management (add, remove, check, milestone rewards)
    game-engine.ts                  — Orchestrator: wires tick→spawn→catch→evolve flow
  renderers/
    renderer.ts                     — Renderer interface definition
    simple-text.ts                  — Markdown/ASCII renderer for Claude Code
  cli.ts                            — CLI entry point: parses args, runs engine, outputs result
  index.ts                          — Package entry point: exports engine + types
scripts/
  tick-hook.js                      — Standalone hook script (no TS compilation needed)
claude-plugin/
  manifest.json                     — Claude Code plugin manifest
  skills/
    scan.md                         — /scan skill
    catch.md                        — /catch skill
    collection.md                   — /collection skill
    inventory.md                    — /inventory skill
    evolve.md                       — /evolve skill
    status.md                       — /status skill
    settings.md                     — /settings skill
  hooks.json                        — Hook event configuration
tests/
  state/
    state-manager.test.ts
  engine/
    ticks.test.ts
    spawn.test.ts
    catch.test.ts
    evolution.test.ts
    inventory.test.ts
    game-engine.test.ts
  renderers/
    simple-text.test.ts
  cli.test.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /c/Users/97254/compi
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "termomon",
  "version": "0.1.0",
  "description": "A terminal creature collection game — catch digital beings as you work",
  "main": "dist/index.js",
  "bin": {
    "termomon": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "dev": "tsc --watch"
  },
  "keywords": ["cli", "game", "terminal", "claude-code", "plugin"],
  "license": "MIT",
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.4",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create jest.config.ts**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts"],
};

export default config;
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
coverage/
*.tgz
.termomon/
```

- [ ] **Step 6: Install dependencies and verify**

```bash
npm install
npx tsc --version
npx jest --version
```

Expected: TypeScript 5.x, Jest 29.x, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json jest.config.ts .gitignore package-lock.json
git commit -m "chore: scaffold project with TypeScript and Jest"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types.ts

// --- Rarity ---

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_STARS: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

// --- Creatures ---

export interface CreatureArt {
  simple: string[];   // Lines of ASCII art for simple text renderer
  rich: string[];     // Lines of Unicode/box-drawing art for rich terminal
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface SpawnCondition {
  timeOfDay?: TimeOfDay[];       // Which times this creature can appear (empty = any)
  minTotalTicks?: number;        // Minimum lifetime ticks before this creature unlocks
}

export interface CreatureDefinition {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  baseCatchRate: number;          // 0-1 probability
  art: CreatureArt;
  spawnCondition: SpawnCondition;
  evolution?: {
    targetId: string;             // ID of evolved form
    fragmentCost: number;         // How many fragments needed
    catalystItemId?: string;      // Optional catalyst item required
  };
}

// --- Items ---

export type ItemType = "capture" | "catalyst";

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  catchMultiplier?: number;       // For capture items: multiplier on catch rate
}

// --- Game State ---

export interface Tick {
  timestamp: number;              // Unix ms
  sessionId?: string;
  eventType?: string;
}

export interface NearbyCreature {
  creatureId: string;
  spawnedAt: number;              // Unix ms
  failedAttempts: number;
  maxAttempts: number;
}

export interface CollectionEntry {
  creatureId: string;
  fragments: number;
  totalCaught: number;
  firstCaughtAt: number;          // Unix ms
  evolved: boolean;
}

export interface PlayerProfile {
  level: number;
  xp: number;
  totalCatches: number;
  totalTicks: number;
  currentStreak: number;          // Days
  longestStreak: number;
  lastActiveDate: string;         // YYYY-MM-DD
}

export interface GameSettings {
  renderer: "rich" | "simple" | "browser" | "terminal";
  notificationLevel: "minimal" | "moderate" | "off";
}

export interface GameState {
  version: number;                // Schema version for migrations
  profile: PlayerProfile;
  collection: CollectionEntry[];
  inventory: Record<string, number>;  // itemId -> count
  nearby: NearbyCreature[];
  recentTicks: Tick[];            // Pruned periodically
  claimedMilestones: string[];
  settings: GameSettings;
}

// --- Engine Results ---

export interface ScanResult {
  nearby: Array<{
    index: number;
    creature: CreatureDefinition;
    spawnedAt: number;
    catchRate: number;
  }>;
}

export interface CatchResult {
  success: boolean;
  creature: CreatureDefinition;
  itemUsed: ItemDefinition;
  fragmentsEarned: number;
  totalFragments: number;
  xpEarned: number;
  bonusItem?: { item: ItemDefinition; count: number };
  fled: boolean;
  evolutionReady: boolean;
}

export interface EvolveResult {
  success: boolean;
  from: CreatureDefinition;
  to: CreatureDefinition;
  fragmentsSpent: number;
  catalystUsed?: string;
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  totalCreatures: number;
  nearbyCount: number;
}

export interface TickResult {
  notifications: Notification[];
  spawned: CreatureDefinition[];
  itemsEarned: Array<{ item: ItemDefinition; count: number }>;
  despawned: string[];           // Creature names that left
}

export interface Notification {
  type: "spawn" | "rare_spawn" | "despawn" | "milestone" | "evolution_ready";
  message: string;
}

// --- Renderer ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderCollection(collection: CollectionEntry[], creatures: Map<string, CreatureDefinition>): string;
  renderInventory(inventory: Record<string, number>, items: Map<string, ItemDefinition>): string;
  renderEvolve(result: EvolveResult): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: define core types for creatures, items, state, and renderer"
```

---

### Task 3: Game Constants and Config Data

**Files:**
- Create: `src/config/constants.ts`
- Create: `src/config/creatures.ts`
- Create: `src/config/items.ts`

- [ ] **Step 1: Create constants**

```typescript
// src/config/constants.ts

export const TICKS_PER_SPAWN_CHECK = 10;
export const SPAWN_PROBABILITY = 0.6;        // 60% chance on each check
export const MAX_NEARBY = 5;
export const CREATURE_LINGER_MS = 30 * 60 * 1000;  // 30 minutes
export const MAX_CATCH_ATTEMPTS = 3;

export const SESSION_GAP_MS = 15 * 60 * 1000;  // 15 min gap = new session
export const TICK_PRUNE_COUNT = 500;             // Keep last 500 ticks

export const XP_PER_CATCH: Record<string, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
};

export const XP_PER_LEVEL = 100;

export const SPAWN_WEIGHTS: Record<string, number> = {
  common: 0.45,
  uncommon: 0.25,
  rare: 0.15,
  epic: 0.10,
  legendary: 0.05,
};

// Item drip: every N ticks, award items
export const PASSIVE_DRIP_INTERVAL = 25;
export const PASSIVE_DRIP_ITEMS: Array<{ itemId: string; count: number; weight: number }> = [
  { itemId: "bytetrap", count: 2, weight: 0.7 },
  { itemId: "netsnare", count: 1, weight: 0.25 },
  { itemId: "corelock", count: 1, weight: 0.05 },
];

// Milestone definitions
export interface Milestone {
  id: string;
  description: string;
  condition: (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean;
  reward: Array<{ itemId: string; count: number }>;
  oneTime: boolean;
}

export const MILESTONES: Milestone[] = [
  {
    id: "first_catch",
    description: "First catch!",
    condition: (p) => p.totalCatches >= 1,
    reward: [{ itemId: "bytetrap", count: 5 }],
    oneTime: true,
  },
  {
    id: "catch_10",
    description: "10 catches!",
    condition: (p) => p.totalCatches >= 10,
    reward: [{ itemId: "netsnare", count: 3 }, { itemId: "shard", count: 1 }],
    oneTime: true,
  },
  {
    id: "catch_50",
    description: "50 catches!",
    condition: (p) => p.totalCatches >= 50,
    reward: [{ itemId: "corelock", count: 2 }, { itemId: "prism", count: 1 }],
    oneTime: true,
  },
  {
    id: "streak_3",
    description: "3-day streak!",
    condition: (p) => p.currentStreak >= 3,
    reward: [{ itemId: "bytetrap", count: 3 }],
    oneTime: true,
  },
  {
    id: "streak_7",
    description: "7-day streak!",
    condition: (p) => p.currentStreak >= 7,
    reward: [{ itemId: "netsnare", count: 3 }, { itemId: "shard", count: 2 }],
    oneTime: true,
  },
  {
    id: "streak_30",
    description: "30-day streak!",
    condition: (p) => p.currentStreak >= 30,
    reward: [{ itemId: "corelock", count: 3 }, { itemId: "prism", count: 2 }],
    oneTime: true,
  },
];

export const SESSION_REWARD_ITEMS: Array<{ itemId: string; count: number; weight: number }> = [
  { itemId: "bytetrap", count: 3, weight: 0.6 },
  { itemId: "netsnare", count: 1, weight: 0.3 },
  { itemId: "shard", count: 1, weight: 0.1 },
];
```

- [ ] **Step 2: Create creature roster**

```typescript
// src/config/creatures.ts

import { CreatureDefinition } from "../types";

export const CREATURES: CreatureDefinition[] = [
  // === COMMON (8 base + 8 evolved = 16) ===
  {
    id: "glitchlet",
    name: "Glitchlet",
    description: "A flickering pixel that can't decide what shape it is",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: [" .~. ", " |o| ", " '-' "],
      rich: [" ╭~╮ ", " │o│ ", " ╰─╯ "],
    },
    spawnCondition: {},
    evolution: { targetId: "glitchform", fragmentCost: 5 },
  },
  {
    id: "glitchform",
    name: "Glitchform",
    description: "A stabilized mass of corrupted pixels, humming with static",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" .~~~. ", " |O O| ", " |===| ", " '---' "],
      rich: [" ╭~~~╮ ", " │O O│ ", " │===│ ", " ╰───╯ "],
    },
    spawnCondition: {},
  },
  {
    id: "nullbyte",
    name: "Nullbyte",
    description: "Exists in the gaps between your data",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: ["  0  ", " /|\\ ", "  |  "],
      rich: ["  0  ", " /|\\ ", "  |  "],
    },
    spawnCondition: {},
    evolution: { targetId: "nullword", fragmentCost: 5 },
  },
  {
    id: "nullword",
    name: "Nullword",
    description: "A void where information used to be, now pulsing with emptiness",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" 0 0 ", " /|\\ ", "/===\\", "  |  "],
      rich: [" 0 0 ", " /|\\ ", "/===\\", "  |  "],
    },
    spawnCondition: {},
  },
  {
    id: "blinkbit",
    name: "Blinkbit",
    description: "Appears for exactly one frame then vanishes",
    rarity: "common",
    baseCatchRate: 0.75,
    art: {
      simple: [" * ", "*+*", " * "],
      rich: [" * ", "*+*", " * "],
    },
    spawnCondition: {},
    evolution: { targetId: "blinkburst", fragmentCost: 5 },
  },
  {
    id: "blinkburst",
    name: "Blinkburst",
    description: "A rapid strobe of ones and zeroes, impossible to look away",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" *** ", "**+**", " *** "],
      rich: [" *** ", "**+**", " *** "],
    },
    spawnCondition: {},
  },
  {
    id: "dustmote",
    name: "Dustmote",
    description: "A single particle drifting through dead processes",
    rarity: "common",
    baseCatchRate: 0.85,
    art: {
      simple: ["  .  ", " (.) ", "  '  "],
      rich: ["  .  ", " (.) ", "  '  "],
    },
    spawnCondition: {},
    evolution: { targetId: "dustcloud", fragmentCost: 5 },
  },
  {
    id: "dustcloud",
    name: "Dustcloud",
    description: "A swirling cluster of forgotten data fragments",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" .:. ", "(.:.)", " ':' "],
      rich: [" .:. ", "(.:.)", " ':' "],
    },
    spawnCondition: {},
  },

  // === UNCOMMON (4 base + 4 evolved = 8) ===
  {
    id: "hexashade",
    name: "Hexashade",
    description: "A shadow made of shifting hex values",
    rarity: "uncommon",
    baseCatchRate: 0.55,
    art: {
      simple: [" /##\\ ", " #  # ", " \\##/ "],
      rich: [" /##\\ ", " #  # ", " \\##/ "],
    },
    spawnCondition: {},
    evolution: { targetId: "hexwraith", fragmentCost: 7 },
  },
  {
    id: "hexwraith",
    name: "Hexwraith",
    description: "A towering column of hex that rewrites reality around it",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["/####\\", "#    #", "#    #", "\\####/"],
      rich: ["/####\\", "#    #", "#    #", "\\####/"],
    },
    spawnCondition: {},
  },
  {
    id: "loopwyrm",
    name: "Loopwyrm",
    description: "Caught in an infinite loop, endlessly chasing its own tail",
    rarity: "uncommon",
    baseCatchRate: 0.5,
    art: {
      simple: [" ,-, ", "(   )", " `-' "],
      rich: [" ,-. ", "(   )", " `-' "],
    },
    spawnCondition: {},
    evolution: { targetId: "recurserpent", fragmentCost: 7 },
  },
  {
    id: "recurserpent",
    name: "Recurserpent",
    description: "Each scale contains a smaller copy of itself",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: [" ,--. ", "(,-.))", " `--' "],
      rich: [" ,--. ", "(,-.))", " `--' "],
    },
    spawnCondition: {},
  },
  {
    id: "driftpixel",
    name: "Driftpixel",
    description: "Floats aimlessly between screen buffers",
    rarity: "uncommon",
    baseCatchRate: 0.5,
    art: {
      simple: ["~ . ~", " .+. ", "~ . ~"],
      rich: ["~ . ~", " .+. ", "~ . ~"],
    },
    spawnCondition: { timeOfDay: ["afternoon", "evening"] },
    evolution: { targetId: "driftswarm", fragmentCost: 7 },
  },
  {
    id: "driftswarm",
    name: "Driftswarm",
    description: "Hundreds of lost pixels moving as one",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["~.~.~", ".+.+.", "~.~.~"],
      rich: ["~.~.~", ".+.+.", "~.~.~"],
    },
    spawnCondition: {},
  },
  {
    id: "staticling",
    name: "Staticling",
    description: "Born from white noise between channels",
    rarity: "uncommon",
    baseCatchRate: 0.55,
    art: {
      simple: [" %%% ", " %o% ", " %%% "],
      rich: [" %%% ", " %o% ", " %%% "],
    },
    spawnCondition: { timeOfDay: ["night", "morning"] },
    evolution: { targetId: "staticstorm", fragmentCost: 7 },
  },
  {
    id: "staticstorm",
    name: "Staticstorm",
    description: "A raging tempest of electromagnetic interference",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["%%%%%", "%%o%%", "%%%%%"],
      rich: ["%%%%%", "%%o%%", "%%%%%"],
    },
    spawnCondition: {},
  },

  // === RARE (2 base + 2 evolved = 4) ===
  {
    id: "voidmoth",
    name: "Voidmoth",
    description: "Drawn to the glow of active terminals",
    rarity: "rare",
    baseCatchRate: 0.35,
    art: {
      simple: ["\\ | /", " \\|/ ", " /|\\ ", "/ | \\"],
      rich: ["\\ | /", " \\|/ ", " /|\\ ", "/ | \\"],
    },
    spawnCondition: { timeOfDay: ["night", "evening"] },
    evolution: { targetId: "voidraptor", fragmentCost: 10, catalystItemId: "shard" },
  },
  {
    id: "voidraptor",
    name: "Voidraptor",
    description: "Its wings tear holes in the display wherever it flies",
    rarity: "rare",
    baseCatchRate: 0,
    art: {
      simple: ["\\\\|//", " \\|/ ", " /|\\ ", "//|\\\\"],
      rich: ["\\\\|//", " \\|/ ", " /|\\ ", "//|\\\\"],
    },
    spawnCondition: {},
  },
  {
    id: "flickerjack",
    name: "Flickerjack",
    description: "A mischievous sprite that scrambles your cursor position",
    rarity: "rare",
    baseCatchRate: 0.3,
    art: {
      simple: [" >:) ", " ]|[ ", " / \\ "],
      rich: [" >:) ", " ]|[ ", " / \\ "],
    },
    spawnCondition: { timeOfDay: ["morning", "afternoon"] },
    evolution: { targetId: "flickerfiend", fragmentCost: 10, catalystItemId: "shard" },
  },
  {
    id: "flickerfiend",
    name: "Flickerfiend",
    description: "Commands an army of misplaced characters",
    rarity: "rare",
    baseCatchRate: 0,
    art: {
      simple: [">>:))", "]]|[[", " / \\ "],
      rich: [">>:))", "]]|[[", " / \\ "],
    },
    spawnCondition: {},
  },

  // === EPIC (1 base + 1 evolved = 2) ===
  {
    id: "phantomcursor",
    name: "Phantomcursor",
    description: "The ghost of every misplaced caret",
    rarity: "epic",
    baseCatchRate: 0.15,
    art: {
      simple: ["  |  ", " [|] ", "  |  ", " /_\\ "],
      rich: ["  |  ", " [|] ", "  |  ", " /_\\ "],
    },
    spawnCondition: { minTotalTicks: 200 },
    evolution: { targetId: "phantomkernel", fragmentCost: 15, catalystItemId: "prism" },
  },
  {
    id: "phantomkernel",
    name: "Phantomkernel",
    description: "A spectral process that haunts your system at ring zero",
    rarity: "epic",
    baseCatchRate: 0,
    art: {
      simple: [" .|. ", "[[|]]", " .|. ", "//_\\\\"],
      rich: [" .|. ", "[[|]]", " .|. ", "//_\\\\"],
    },
    spawnCondition: {},
  },

  // === LEGENDARY (1, no evolution) ===
  {
    id: "overflux",
    name: "Overflux",
    description: "A cascade of raw energy from the edge of memory",
    rarity: "legendary",
    baseCatchRate: 0.05,
    art: {
      simple: ["<|=|>", "=|X|=", "<|=|>"],
      rich: ["<|=|>", "=|X|=", "<|=|>"],
    },
    spawnCondition: { minTotalTicks: 500, timeOfDay: ["night"] },
  },
];

export function getCreatureMap(): Map<string, CreatureDefinition> {
  const map = new Map<string, CreatureDefinition>();
  for (const c of CREATURES) {
    map.set(c.id, c);
  }
  return map;
}

export function getSpawnableCreatures(): CreatureDefinition[] {
  return CREATURES.filter((c) => c.baseCatchRate > 0);
}
```

- [ ] **Step 3: Create item definitions**

```typescript
// src/config/items.ts

import { ItemDefinition } from "../types";

export const ITEMS: ItemDefinition[] = [
  {
    id: "bytetrap",
    name: "ByteTrap",
    description: "Basic capture device — gets the job done",
    type: "capture",
    catchMultiplier: 1.0,
  },
  {
    id: "netsnare",
    name: "NetSnare",
    description: "An improved trap with tighter data bindings",
    type: "capture",
    catchMultiplier: 1.5,
  },
  {
    id: "corelock",
    name: "CoreLock",
    description: "Military-grade containment — rarely fails",
    type: "capture",
    catchMultiplier: 2.0,
  },
  {
    id: "shard",
    name: "Shard",
    description: "A crystallized data fragment, needed for basic evolution",
    type: "catalyst",
  },
  {
    id: "prism",
    name: "Prism",
    description: "A prismatic memory core, needed for advanced evolution",
    type: "catalyst",
  },
];

export function getItemMap(): Map<string, ItemDefinition> {
  const map = new Map<string, ItemDefinition>();
  for (const item of ITEMS) {
    map.set(item.id, item);
  }
  return map;
}
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/
git commit -m "feat: add game constants, creature roster, and item definitions"
```

---

### Task 4: State Manager

**Files:**
- Create: `src/state/state-manager.ts`
- Create: `tests/state/state-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/state/state-manager.test.ts

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { StateManager } from "../../src/state/state-manager";
import { GameState } from "../../src/types";

describe("StateManager", () => {
  let tmpDir: string;
  let stateManager: StateManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "termomon-test-"));
    stateManager = new StateManager(path.join(tmpDir, "state.json"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates default state when no file exists", () => {
    const state = stateManager.load();
    expect(state.version).toBe(1);
    expect(state.profile.level).toBe(1);
    expect(state.profile.xp).toBe(0);
    expect(state.profile.totalCatches).toBe(0);
    expect(state.collection).toEqual([]);
    expect(state.nearby).toEqual([]);
    expect(state.inventory).toEqual({ bytetrap: 5 });
    expect(state.settings.renderer).toBe("simple");
    expect(state.settings.notificationLevel).toBe("moderate");
  });

  test("saves and loads state", () => {
    const state = stateManager.load();
    state.profile.totalCatches = 42;
    state.inventory["netsnare"] = 3;
    stateManager.save(state);

    const loaded = stateManager.load();
    expect(loaded.profile.totalCatches).toBe(42);
    expect(loaded.inventory["netsnare"]).toBe(3);
  });

  test("creates parent directory if missing", () => {
    const deepPath = path.join(tmpDir, "a", "b", "state.json");
    const mgr = new StateManager(deepPath);
    const state = mgr.load();
    mgr.save(state);
    expect(fs.existsSync(deepPath)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/state/state-manager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement StateManager**

```typescript
// src/state/state-manager.ts

import * as fs from "fs";
import * as path from "path";
import { GameState } from "../types";

function defaultState(): GameState {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: 1,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: {
      renderer: "simple",
      notificationLevel: "moderate",
    },
  };
}

export class StateManager {
  constructor(private filePath: string) {}

  load(): GameState {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(data) as GameState;
    } catch {
      return defaultState();
    }
  }

  save(state: GameState): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tmp, this.filePath);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/state/state-manager.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/ tests/state/
git commit -m "feat: add state manager with atomic save and default state"
```

---

### Task 5: Tick Processor

**Files:**
- Create: `src/engine/ticks.ts`
- Create: `tests/engine/ticks.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/engine/ticks.test.ts

import { processNewTick, getTimeOfDay, deriveStreak } from "../../src/engine/ticks";
import { GameState, Tick } from "../../src/types";
import { StateManager } from "../../src/state/state-manager";

// Helper to create a minimal game state
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("getTimeOfDay", () => {
  test("returns morning for 6-11", () => {
    expect(getTimeOfDay(8)).toBe("morning");
  });
  test("returns afternoon for 12-16", () => {
    expect(getTimeOfDay(14)).toBe("afternoon");
  });
  test("returns evening for 17-20", () => {
    expect(getTimeOfDay(19)).toBe("evening");
  });
  test("returns night for 21-5", () => {
    expect(getTimeOfDay(23)).toBe("night");
    expect(getTimeOfDay(3)).toBe("night");
  });
});

describe("deriveStreak", () => {
  test("continues streak if last active was yesterday", () => {
    const result = deriveStreak("2026-04-02", "2026-04-03", 5);
    expect(result).toBe(6);
  });
  test("keeps streak if last active is today", () => {
    const result = deriveStreak("2026-04-03", "2026-04-03", 5);
    expect(result).toBe(5);
  });
  test("resets streak if gap > 1 day", () => {
    const result = deriveStreak("2026-04-01", "2026-04-03", 5);
    expect(result).toBe(1);
  });
  test("starts streak at 1 for first activity", () => {
    const result = deriveStreak("2026-04-03", "2026-04-03", 0);
    expect(result).toBe(1);
  });
});

describe("processNewTick", () => {
  test("increments totalTicks", () => {
    const state = makeState();
    const tick: Tick = { timestamp: Date.now() };
    processNewTick(state, tick);
    expect(state.profile.totalTicks).toBe(1);
  });

  test("adds tick to recentTicks", () => {
    const state = makeState();
    const tick: Tick = { timestamp: Date.now() };
    processNewTick(state, tick);
    expect(state.recentTicks).toHaveLength(1);
    expect(state.recentTicks[0].timestamp).toBe(tick.timestamp);
  });

  test("prunes recentTicks beyond limit", () => {
    const ticks: Tick[] = Array.from({ length: 500 }, (_, i) => ({
      timestamp: 1000 + i,
    }));
    const state = makeState({ recentTicks: ticks });
    processNewTick(state, { timestamp: 9999 });
    expect(state.recentTicks.length).toBeLessThanOrEqual(500);
    expect(state.recentTicks[state.recentTicks.length - 1].timestamp).toBe(9999);
  });

  test("updates lastActiveDate and streak", () => {
    const state = makeState();
    state.profile.lastActiveDate = "2026-04-02";
    state.profile.currentStreak = 3;
    const tick: Tick = { timestamp: new Date("2026-04-03T10:00:00").getTime() };
    processNewTick(state, tick);
    expect(state.profile.lastActiveDate).toBe("2026-04-03");
    expect(state.profile.currentStreak).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/engine/ticks.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement tick processor**

```typescript
// src/engine/ticks.ts

import { GameState, Tick, TimeOfDay } from "../types";
import { TICK_PRUNE_COUNT } from "../config/constants";

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function deriveStreak(
  lastActiveDate: string,
  todayDate: string,
  currentStreak: number
): number {
  if (lastActiveDate === todayDate) {
    return Math.max(currentStreak, 1);
  }

  const last = new Date(lastActiveDate + "T00:00:00");
  const today = new Date(todayDate + "T00:00:00");
  const diffDays = Math.floor(
    (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) {
    return currentStreak + 1;
  }
  return 1;
}

export function processNewTick(state: GameState, tick: Tick): void {
  state.profile.totalTicks++;

  state.recentTicks.push(tick);
  if (state.recentTicks.length > TICK_PRUNE_COUNT) {
    state.recentTicks = state.recentTicks.slice(-TICK_PRUNE_COUNT);
  }

  const tickDate = new Date(tick.timestamp);
  const todayStr = tickDate.toISOString().split("T")[0];

  state.profile.currentStreak = deriveStreak(
    state.profile.lastActiveDate,
    todayStr,
    state.profile.currentStreak
  );
  state.profile.longestStreak = Math.max(
    state.profile.longestStreak,
    state.profile.currentStreak
  );
  state.profile.lastActiveDate = todayStr;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/engine/ticks.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ticks.ts tests/engine/ticks.test.ts
git commit -m "feat: add tick processor with time-of-day and streak logic"
```

---

### Task 6: Spawn Engine

**Files:**
- Create: `src/engine/spawn.ts`
- Create: `tests/engine/spawn.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/engine/spawn.test.ts

import {
  shouldCheckSpawn,
  rollSpawn,
  pickCreature,
  processSpawns,
  cleanupDespawned,
} from "../../src/engine/spawn";
import { GameState, NearbyCreature, CreatureDefinition } from "../../src/types";
import { CREATURES, getSpawnableCreatures } from "../../src/config/creatures";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("shouldCheckSpawn", () => {
  test("returns true when totalTicks is multiple of TICKS_PER_SPAWN_CHECK", () => {
    expect(shouldCheckSpawn(10)).toBe(true);
    expect(shouldCheckSpawn(20)).toBe(true);
  });
  test("returns false otherwise", () => {
    expect(shouldCheckSpawn(7)).toBe(false);
    expect(shouldCheckSpawn(0)).toBe(false);
  });
});

describe("rollSpawn", () => {
  test("returns true when roll is below probability", () => {
    expect(rollSpawn(() => 0.1)).toBe(true);
  });
  test("returns false when roll is above probability", () => {
    expect(rollSpawn(() => 0.99)).toBe(false);
  });
});

describe("pickCreature", () => {
  test("returns a spawnable creature", () => {
    const creature = pickCreature(14, 100, () => 0.1);
    expect(creature).toBeDefined();
    expect(creature!.baseCatchRate).toBeGreaterThan(0);
  });
  test("respects time-of-day filter", () => {
    // Run many picks at night — should never get afternoon-only creatures
    for (let i = 0; i < 50; i++) {
      const creature = pickCreature(23, 1000, Math.random);
      if (creature && creature.spawnCondition.timeOfDay) {
        expect(creature.spawnCondition.timeOfDay).toContain("night");
      }
    }
  });
  test("respects minTotalTicks", () => {
    // With only 10 ticks, should not get phantomcursor (needs 200)
    for (let i = 0; i < 50; i++) {
      const creature = pickCreature(14, 10, Math.random);
      if (creature) {
        expect(creature.id).not.toBe("phantomcursor");
      }
    }
  });
});

describe("cleanupDespawned", () => {
  test("removes creatures past their linger window", () => {
    const now = Date.now();
    const state = makeState({
      nearby: [
        { creatureId: "glitchlet", spawnedAt: now - 999999, failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "nullbyte", spawnedAt: now - 1000, failedAttempts: 0, maxAttempts: 3 },
      ],
    });
    const despawned = cleanupDespawned(state, now);
    expect(despawned).toEqual(["glitchlet"]);
    expect(state.nearby).toHaveLength(1);
    expect(state.nearby[0].creatureId).toBe("nullbyte");
  });
});

describe("processSpawns", () => {
  test("does not exceed MAX_NEARBY", () => {
    const now = Date.now();
    const state = makeState({
      nearby: Array.from({ length: 5 }, (_, i) => ({
        creatureId: `creature_${i}`,
        spawnedAt: now,
        failedAttempts: 0,
        maxAttempts: 3,
      })),
      profile: {
        level: 1, xp: 0, totalCatches: 0, totalTicks: 10,
        currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
      },
    });
    const spawned = processSpawns(state, now, () => 0.01);
    expect(spawned).toHaveLength(0);
    expect(state.nearby.length).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/engine/spawn.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement spawn engine**

```typescript
// src/engine/spawn.ts

import { GameState, CreatureDefinition, NearbyCreature } from "../types";
import { getTimeOfDay } from "./ticks";
import { getSpawnableCreatures } from "../config/creatures";
import {
  TICKS_PER_SPAWN_CHECK,
  SPAWN_PROBABILITY,
  MAX_NEARBY,
  CREATURE_LINGER_MS,
  MAX_CATCH_ATTEMPTS,
  SPAWN_WEIGHTS,
} from "../config/constants";

export function shouldCheckSpawn(totalTicks: number): boolean {
  return totalTicks > 0 && totalTicks % TICKS_PER_SPAWN_CHECK === 0;
}

export function rollSpawn(rng: () => number = Math.random): boolean {
  return rng() < SPAWN_PROBABILITY;
}

export function pickCreature(
  hour: number,
  totalTicks: number,
  rng: () => number = Math.random
): CreatureDefinition | null {
  const timeOfDay = getTimeOfDay(hour);
  const spawnable = getSpawnableCreatures().filter((c) => {
    if (c.spawnCondition.timeOfDay && !c.spawnCondition.timeOfDay.includes(timeOfDay)) {
      return false;
    }
    if (c.spawnCondition.minTotalTicks && totalTicks < c.spawnCondition.minTotalTicks) {
      return false;
    }
    return true;
  });

  if (spawnable.length === 0) return null;

  // Weight by rarity
  const weighted = spawnable.map((c) => ({
    creature: c,
    weight: SPAWN_WEIGHTS[c.rarity] || 0,
  }));

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.creature;
  }

  return weighted[weighted.length - 1].creature;
}

export function cleanupDespawned(state: GameState, now: number): string[] {
  const despawned: string[] = [];
  state.nearby = state.nearby.filter((n) => {
    if (now - n.spawnedAt > CREATURE_LINGER_MS) {
      despawned.push(n.creatureId);
      return false;
    }
    return true;
  });
  return despawned;
}

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
  const creature = pickCreature(hour, state.profile.totalTicks, rng);
  if (!creature) return spawned;

  // Don't spawn duplicates of already-nearby creatures
  if (state.nearby.some((n) => n.creatureId === creature.id)) return spawned;

  state.nearby.push({
    creatureId: creature.id,
    spawnedAt: now,
    failedAttempts: 0,
    maxAttempts: MAX_CATCH_ATTEMPTS,
  });
  spawned.push(creature);

  return spawned;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/engine/spawn.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/spawn.ts tests/engine/spawn.test.ts
git commit -m "feat: add spawn engine with rarity weights, time-of-day, and despawn"
```

---

### Task 7: Catch Engine

**Files:**
- Create: `src/engine/catch.ts`
- Create: `tests/engine/catch.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/engine/catch.test.ts

import { attemptCatch } from "../../src/engine/catch";
import { GameState, NearbyCreature } from "../../src/types";
import { getCreatureMap } from "../../src/config/creatures";
import { getItemMap } from "../../src/config/items";

const creatures = getCreatureMap();
const items = getItemMap();

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { bytetrap: 5, netsnare: 2 },
    nearby: [
      { creatureId: "glitchlet", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
    ],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("attemptCatch", () => {
  test("succeeds when rng is below catch rate", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.1);
    expect(result.success).toBe(true);
    expect(result.creature.id).toBe("glitchlet");
    expect(result.fragmentsEarned).toBe(1);
    expect(result.fled).toBe(false);
    // Should remove from nearby
    expect(state.nearby).toHaveLength(0);
    // Should add to collection
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].creatureId).toBe("glitchlet");
    expect(state.collection[0].fragments).toBe(1);
    // Should consume item
    expect(state.inventory["bytetrap"]).toBe(4);
    // Should award XP
    expect(state.profile.xp).toBeGreaterThan(0);
    expect(state.profile.totalCatches).toBe(1);
  });

  test("fails when rng is above catch rate", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.fled).toBe(false);
    expect(state.nearby).toHaveLength(1);
    expect(state.nearby[0].failedAttempts).toBe(1);
    expect(state.inventory["bytetrap"]).toBe(4);
  });

  test("creature flees after max attempts", () => {
    const state = makeState();
    state.nearby[0].failedAttempts = 2; // Already failed twice
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.fled).toBe(true);
    expect(state.nearby).toHaveLength(0);
  });

  test("uses item multiplier", () => {
    // NetSnare has 1.5x — so effective catch rate for glitchlet (0.8) = 1.0 clamped
    const state = makeState();
    const result = attemptCatch(state, 0, "netsnare", creatures, items, () => 0.9);
    expect(result.success).toBe(true);
    expect(state.inventory["netsnare"]).toBe(1);
  });

  test("returns error-like result for invalid index", () => {
    const state = makeState();
    expect(() => attemptCatch(state, 5, "bytetrap", creatures, items)).toThrow("Invalid creature index");
  });

  test("returns error for missing item", () => {
    const state = makeState();
    state.inventory = {};
    expect(() => attemptCatch(state, 0, "bytetrap", creatures, items)).toThrow("No bytetrap in inventory");
  });

  test("adds fragments to existing collection entry on duplicate catch", () => {
    const state = makeState();
    state.collection.push({
      creatureId: "glitchlet", fragments: 3, totalCaught: 3,
      firstCaughtAt: 1000, evolved: false,
    });
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.1);
    expect(result.success).toBe(true);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].fragments).toBe(4);
    expect(state.collection[0].totalCaught).toBe(4);
    expect(result.totalFragments).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/engine/catch.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement catch engine**

```typescript
// src/engine/catch.ts

import {
  GameState,
  CatchResult,
  CreatureDefinition,
  ItemDefinition,
} from "../types";
import { XP_PER_CATCH, XP_PER_LEVEL } from "../config/constants";

export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  itemId: string,
  creatures: Map<string, CreatureDefinition>,
  items: Map<string, ItemDefinition>,
  rng: () => number = Math.random
): CatchResult {
  if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) {
    throw new Error("Invalid creature index");
  }

  const itemCount = state.inventory[itemId] || 0;
  if (itemCount <= 0) {
    throw new Error(`No ${itemId} in inventory`);
  }

  const nearby = state.nearby[nearbyIndex];
  const creature = creatures.get(nearby.creatureId);
  if (!creature) {
    throw new Error(`Unknown creature: ${nearby.creatureId}`);
  }

  const item = items.get(itemId);
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }

  // Consume item
  state.inventory[itemId] = itemCount - 1;

  // Calculate effective catch rate
  const multiplier = item.catchMultiplier || 1;
  const effectiveRate = Math.min(creature.baseCatchRate * multiplier, 1);

  const roll = rng();
  const success = roll < effectiveRate;

  if (success) {
    // Remove from nearby
    state.nearby.splice(nearbyIndex, 1);

    // Add to collection or increment fragments
    let entry = state.collection.find((c) => c.creatureId === creature.id);
    if (entry) {
      entry.fragments++;
      entry.totalCaught++;
    } else {
      entry = {
        creatureId: creature.id,
        fragments: 1,
        totalCaught: 1,
        firstCaughtAt: Date.now(),
        evolved: false,
      };
      state.collection.push(entry);
    }

    // Award XP
    const xp = XP_PER_CATCH[creature.rarity] || 10;
    state.profile.xp += xp;
    state.profile.totalCatches++;

    // Level up check
    while (state.profile.xp >= state.profile.level * XP_PER_LEVEL) {
      state.profile.xp -= state.profile.level * XP_PER_LEVEL;
      state.profile.level++;
    }

    // Check evolution readiness
    const evolutionReady = creature.evolution
      ? entry.fragments >= creature.evolution.fragmentCost
      : false;

    return {
      success: true,
      creature,
      itemUsed: item,
      fragmentsEarned: 1,
      totalFragments: entry.fragments,
      xpEarned: xp,
      fled: false,
      evolutionReady,
    };
  }

  // Failed catch
  nearby.failedAttempts++;
  const fled = nearby.failedAttempts >= nearby.maxAttempts;
  if (fled) {
    state.nearby.splice(nearbyIndex, 1);
  }

  return {
    success: false,
    creature,
    itemUsed: item,
    fragmentsEarned: 0,
    totalFragments: state.collection.find((c) => c.creatureId === creature.id)?.fragments || 0,
    xpEarned: 0,
    fled,
    evolutionReady: false,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/engine/catch.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/catch.ts tests/engine/catch.test.ts
git commit -m "feat: add catch engine with probability, items, fragments, and flee"
```

---

### Task 8: Evolution Engine

**Files:**
- Create: `src/engine/evolution.ts`
- Create: `tests/engine/evolution.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/engine/evolution.test.ts

import { evolveCreature } from "../../src/engine/evolution";
import { GameState } from "../../src/types";
import { getCreatureMap } from "../../src/config/creatures";

const creatures = getCreatureMap();

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { shard: 2, prism: 1 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("evolveCreature", () => {
  test("evolves when fragments and catalyst are sufficient", () => {
    const state = makeState({
      collection: [
        { creatureId: "glitchlet", fragments: 6, totalCaught: 6, firstCaughtAt: 1000, evolved: false },
      ],
    });
    const result = evolveCreature(state, "glitchlet", creatures);
    expect(result.success).toBe(true);
    expect(result.from.id).toBe("glitchlet");
    expect(result.to.id).toBe("glitchform");
    expect(result.fragmentsSpent).toBe(5);
    // Collection should show evolved
    expect(state.collection[0].evolved).toBe(true);
    expect(state.collection[0].fragments).toBe(1); // 6 - 5 = 1
  });

  test("fails when not enough fragments", () => {
    const state = makeState({
      collection: [
        { creatureId: "glitchlet", fragments: 3, totalCaught: 3, firstCaughtAt: 1000, evolved: false },
      ],
    });
    expect(() => evolveCreature(state, "glitchlet", creatures)).toThrow("Not enough fragments");
  });

  test("fails when already evolved", () => {
    const state = makeState({
      collection: [
        { creatureId: "glitchlet", fragments: 10, totalCaught: 10, firstCaughtAt: 1000, evolved: true },
      ],
    });
    expect(() => evolveCreature(state, "glitchlet", creatures)).toThrow("Already evolved");
  });

  test("fails when creature has no evolution", () => {
    const state = makeState({
      collection: [
        { creatureId: "overflux", fragments: 10, totalCaught: 10, firstCaughtAt: 1000, evolved: false },
      ],
    });
    expect(() => evolveCreature(state, "overflux", creatures)).toThrow("Cannot evolve");
  });

  test("fails when creature not in collection", () => {
    const state = makeState();
    expect(() => evolveCreature(state, "glitchlet", creatures)).toThrow("not in collection");
  });

  test("consumes catalyst item when required", () => {
    const state = makeState({
      collection: [
        { creatureId: "voidmoth", fragments: 12, totalCaught: 12, firstCaughtAt: 1000, evolved: false },
      ],
    });
    const result = evolveCreature(state, "voidmoth", creatures);
    expect(result.success).toBe(true);
    expect(result.catalystUsed).toBe("shard");
    expect(state.inventory["shard"]).toBe(1); // Was 2, used 1
  });

  test("fails when catalyst is missing", () => {
    const state = makeState({
      collection: [
        { creatureId: "voidmoth", fragments: 12, totalCaught: 12, firstCaughtAt: 1000, evolved: false },
      ],
      inventory: {},
    });
    expect(() => evolveCreature(state, "voidmoth", creatures)).toThrow("Missing catalyst");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/engine/evolution.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement evolution engine**

```typescript
// src/engine/evolution.ts

import { GameState, EvolveResult, CreatureDefinition } from "../types";

export function evolveCreature(
  state: GameState,
  creatureId: string,
  creatures: Map<string, CreatureDefinition>
): EvolveResult {
  const creature = creatures.get(creatureId);
  if (!creature) {
    throw new Error(`Unknown creature: ${creatureId}`);
  }

  if (!creature.evolution) {
    throw new Error(`Cannot evolve ${creature.name}`);
  }

  const entry = state.collection.find((c) => c.creatureId === creatureId);
  if (!entry) {
    throw new Error(`${creature.name} not in collection`);
  }

  if (entry.evolved) {
    throw new Error(`Already evolved ${creature.name}`);
  }

  if (entry.fragments < creature.evolution.fragmentCost) {
    throw new Error(
      `Not enough fragments: have ${entry.fragments}, need ${creature.evolution.fragmentCost}`
    );
  }

  // Check catalyst
  let catalystUsed: string | undefined;
  if (creature.evolution.catalystItemId) {
    const catalystCount = state.inventory[creature.evolution.catalystItemId] || 0;
    if (catalystCount <= 0) {
      throw new Error(`Missing catalyst: ${creature.evolution.catalystItemId}`);
    }
    state.inventory[creature.evolution.catalystItemId] = catalystCount - 1;
    catalystUsed = creature.evolution.catalystItemId;
  }

  const target = creatures.get(creature.evolution.targetId);
  if (!target) {
    throw new Error(`Unknown evolution target: ${creature.evolution.targetId}`);
  }

  // Spend fragments and mark evolved
  entry.fragments -= creature.evolution.fragmentCost;
  entry.evolved = true;

  return {
    success: true,
    from: creature,
    to: target,
    fragmentsSpent: creature.evolution.fragmentCost,
    catalystUsed,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/engine/evolution.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/evolution.ts tests/engine/evolution.test.ts
git commit -m "feat: add evolution engine with fragment cost and catalyst items"
```

---

### Task 9: Inventory Manager

**Files:**
- Create: `src/engine/inventory.ts`
- Create: `tests/engine/inventory.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/engine/inventory.test.ts

import { processPassiveDrip, processSessionReward, checkMilestones } from "../../src/engine/inventory";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("processPassiveDrip", () => {
  test("awards items at drip interval", () => {
    const state = makeState();
    state.profile.totalTicks = 25;
    const items = processPassiveDrip(state, () => 0.1); // Low roll = bytetrap (weight 0.7)
    expect(items.length).toBeGreaterThan(0);
    expect(state.inventory["bytetrap"]).toBeGreaterThan(5);
  });

  test("does not award at non-interval ticks", () => {
    const state = makeState();
    state.profile.totalTicks = 13;
    const items = processPassiveDrip(state, () => 0.1);
    expect(items).toHaveLength(0);
  });
});

describe("processSessionReward", () => {
  test("awards items", () => {
    const state = makeState();
    const items = processSessionReward(state, () => 0.1);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe("checkMilestones", () => {
  test("awards milestone on first catch", () => {
    const state = makeState();
    state.profile.totalCatches = 1;
    const reached: string[] = [];
    const items = checkMilestones(state, reached);
    expect(items.length).toBeGreaterThan(0);
    expect(reached).toContain("first_catch");
  });

  test("does not re-award already claimed milestone", () => {
    const state = makeState();
    state.profile.totalCatches = 1;
    const reached = ["first_catch"];
    const items = checkMilestones(state, reached);
    expect(items).toHaveLength(0);
  });

  test("awards streak milestone", () => {
    const state = makeState();
    state.profile.currentStreak = 3;
    const reached: string[] = [];
    const items = checkMilestones(state, reached);
    expect(reached).toContain("streak_3");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/engine/inventory.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement inventory manager**

```typescript
// src/engine/inventory.ts

import { GameState, ItemDefinition } from "../types";
import { getItemMap } from "../config/items";
import {
  PASSIVE_DRIP_INTERVAL,
  PASSIVE_DRIP_ITEMS,
  SESSION_REWARD_ITEMS,
  MILESTONES,
} from "../config/constants";

const itemMap = getItemMap();

function weightedPick(
  options: Array<{ itemId: string; count: number; weight: number }>,
  rng: () => number
): { itemId: string; count: number } {
  const totalWeight = options.reduce((s, o) => s + o.weight, 0);
  let roll = rng() * totalWeight;
  for (const opt of options) {
    roll -= opt.weight;
    if (roll <= 0) return { itemId: opt.itemId, count: opt.count };
  }
  return options[options.length - 1];
}

function addItem(
  state: GameState,
  itemId: string,
  count: number
): { item: ItemDefinition; count: number } | null {
  const item = itemMap.get(itemId);
  if (!item) return null;
  state.inventory[itemId] = (state.inventory[itemId] || 0) + count;
  return { item, count };
}

export function processPassiveDrip(
  state: GameState,
  rng: () => number = Math.random
): Array<{ item: ItemDefinition; count: number }> {
  const results: Array<{ item: ItemDefinition; count: number }> = [];

  if (state.profile.totalTicks <= 0) return results;
  if (state.profile.totalTicks % PASSIVE_DRIP_INTERVAL !== 0) return results;

  const pick = weightedPick(PASSIVE_DRIP_ITEMS, rng);
  const added = addItem(state, pick.itemId, pick.count);
  if (added) results.push(added);

  return results;
}

export function processSessionReward(
  state: GameState,
  rng: () => number = Math.random
): Array<{ item: ItemDefinition; count: number }> {
  const results: Array<{ item: ItemDefinition; count: number }> = [];

  const pick = weightedPick(SESSION_REWARD_ITEMS, rng);
  const added = addItem(state, pick.itemId, pick.count);
  if (added) results.push(added);

  return results;
}

export function checkMilestones(
  state: GameState,
  claimedMilestones: string[]
): Array<{ item: ItemDefinition; count: number }> {
  const results: Array<{ item: ItemDefinition; count: number }> = [];

  for (const milestone of MILESTONES) {
    if (claimedMilestones.includes(milestone.id)) continue;
    if (!milestone.condition(state.profile)) continue;

    claimedMilestones.push(milestone.id);
    for (const reward of milestone.reward) {
      const added = addItem(state, reward.itemId, reward.count);
      if (added) results.push(added);
    }
  }

  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/engine/inventory.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/inventory.ts tests/engine/inventory.test.ts
git commit -m "feat: add inventory manager with passive drip, session rewards, milestones"
```

---

### Task 10: Game Engine Orchestrator

**Files:**
- Create: `src/engine/game-engine.ts`
- Create: `tests/engine/game-engine.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/engine/game-engine.test.ts

import { GameEngine } from "../../src/engine/game-engine";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 9,
      currentStreak: 1, longestStreak: 1, lastActiveDate: "2026-04-03",
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    claimedMilestones: [],
    ...overrides,
  } as GameState & { claimedMilestones: string[] };
}

describe("GameEngine", () => {
  test("processTick increments ticks and may spawn", () => {
    const state = makeState();
    const engine = new GameEngine(state);
    // Tick 10 triggers spawn check
    const result = engine.processTick({ timestamp: Date.now() }, () => 0.01);
    expect(state.profile.totalTicks).toBe(10);
    expect(result.notifications).toBeDefined();
  });

  test("scan returns nearby creatures", () => {
    const now = Date.now();
    const state = makeState({
      nearby: [
        { creatureId: "glitchlet", spawnedAt: now, failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "nullbyte", spawnedAt: now, failedAttempts: 0, maxAttempts: 3 },
      ],
    });
    const engine = new GameEngine(state);
    const result = engine.scan();
    expect(result.nearby).toHaveLength(2);
    expect(result.nearby[0].creature.id).toBe("glitchlet");
    expect(result.nearby[1].creature.id).toBe("nullbyte");
  });

  test("catch uses engine and returns result", () => {
    const now = Date.now();
    const state = makeState({
      nearby: [
        { creatureId: "glitchlet", spawnedAt: now, failedAttempts: 0, maxAttempts: 3 },
      ],
    });
    const engine = new GameEngine(state);
    const result = engine.catch(0, "bytetrap", () => 0.1);
    expect(result.success).toBe(true);
  });

  test("evolve delegates to evolution engine", () => {
    const state = makeState({
      collection: [
        { creatureId: "glitchlet", fragments: 6, totalCaught: 6, firstCaughtAt: 1000, evolved: false },
      ],
    });
    const engine = new GameEngine(state);
    const result = engine.evolve("glitchlet");
    expect(result.success).toBe(true);
    expect(result.to.id).toBe("glitchform");
  });

  test("status returns player profile summary", () => {
    const state = makeState();
    const engine = new GameEngine(state);
    const result = engine.status();
    expect(result.profile.level).toBe(1);
    expect(result.totalCreatures).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/engine/game-engine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement game engine**

We need to add `claimedMilestones` to `GameState`. First update `src/types.ts`:

Add this field to `GameState`:

```typescript
// In GameState interface, add:
  claimedMilestones: string[];
```

Update the default state in `src/state/state-manager.ts` to include `claimedMilestones: []`.

Then create the engine:

```typescript
// src/engine/game-engine.ts

import {
  GameState,
  Tick,
  ScanResult,
  CatchResult,
  EvolveResult,
  StatusResult,
  TickResult,
  Notification,
  CreatureDefinition,
  ItemDefinition,
} from "../types";
import { getCreatureMap, getSpawnableCreatures, CREATURES } from "../config/creatures";
import { getItemMap } from "../config/items";
import { processNewTick } from "./ticks";
import { processSpawns, cleanupDespawned } from "./spawn";
import { attemptCatch } from "./catch";
import { evolveCreature } from "./evolution";
import { processPassiveDrip, checkMilestones } from "./inventory";

export class GameEngine {
  private creatures: Map<string, CreatureDefinition>;
  private items: Map<string, ItemDefinition>;

  constructor(private state: GameState) {
    this.creatures = getCreatureMap();
    this.items = getItemMap();
  }

  processTick(tick: Tick, rng: () => number = Math.random): TickResult {
    const now = tick.timestamp;
    const notifications: Notification[] = [];

    // 1. Record tick
    processNewTick(this.state, tick);

    // 2. Cleanup despawned creatures
    const despawned = cleanupDespawned(this.state, now);
    for (const id of despawned) {
      const c = this.creatures.get(id);
      notifications.push({
        type: "despawn",
        message: `${c?.name || id} slipped away...`,
      });
    }

    // 3. Try spawning
    const spawned = processSpawns(this.state, now, rng);
    for (const c of spawned) {
      const isRare = c.rarity === "rare" || c.rarity === "epic" || c.rarity === "legendary";
      notifications.push({
        type: isRare ? "rare_spawn" : "spawn",
        message: isRare
          ? "Rare signal detected!"
          : "Something flickering nearby...",
      });
    }

    // 4. Passive item drip
    const itemsEarned = processPassiveDrip(this.state, rng);

    // 5. Check milestones
    if (!this.state.claimedMilestones) {
      this.state.claimedMilestones = [];
    }
    const milestoneItems = checkMilestones(this.state, this.state.claimedMilestones);
    itemsEarned.push(...milestoneItems);

    if (milestoneItems.length > 0) {
      const itemNames = milestoneItems.map((i) => `${i.count}x ${i.item.name}`).join(", ");
      notifications.push({
        type: "milestone",
        message: `Milestone reward! +${itemNames}`,
      });
    }

    // 6. Check evolution readiness
    for (const entry of this.state.collection) {
      if (entry.evolved) continue;
      const creature = this.creatures.get(entry.creatureId);
      if (!creature?.evolution) continue;
      if (entry.fragments >= creature.evolution.fragmentCost) {
        notifications.push({
          type: "evolution_ready",
          message: `${creature.name} has enough fragments to evolve!`,
        });
      }
    }

    return {
      notifications,
      spawned,
      itemsEarned,
      despawned: despawned.map((id) => this.creatures.get(id)?.name || id),
    };
  }

  scan(): ScanResult {
    const now = Date.now();
    // Cleanup expired first
    cleanupDespawned(this.state, now);

    return {
      nearby: this.state.nearby.map((n, i) => {
        const creature = this.creatures.get(n.creatureId)!;
        return {
          index: i,
          creature,
          spawnedAt: n.spawnedAt,
          catchRate: creature.baseCatchRate,
        };
      }),
    };
  }

  catch(
    nearbyIndex: number,
    itemId: string,
    rng: () => number = Math.random
  ): CatchResult {
    return attemptCatch(this.state, nearbyIndex, itemId, this.creatures, this.items, rng);
  }

  evolve(creatureId: string): EvolveResult {
    return evolveCreature(this.state, creatureId, this.creatures);
  }

  status(): StatusResult {
    return {
      profile: { ...this.state.profile },
      collectionCount: this.state.collection.length,
      totalCreatures: CREATURES.length,
      nearbyCount: this.state.nearby.length,
    };
  }

  getState(): GameState {
    return this.state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/engine/game-engine.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Run all tests to check nothing broke**

```bash
npx jest
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/state/state-manager.ts src/engine/game-engine.ts tests/engine/game-engine.test.ts
git commit -m "feat: add game engine orchestrator wiring tick, spawn, catch, evolve"
```

---

### Task 11: Simple Text Renderer

**Files:**
- Create: `src/renderers/renderer.ts`
- Create: `src/renderers/simple-text.ts`
- Create: `tests/renderers/simple-text.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/renderers/simple-text.test.ts

import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { getCreatureMap } from "../../src/config/creatures";
import { getItemMap } from "../../src/config/items";

const renderer = new SimpleTextRenderer();
const creatures = getCreatureMap();
const items = getItemMap();

describe("SimpleTextRenderer", () => {
  test("renderScan shows nearby creatures with art and info", () => {
    const result = renderer.renderScan({
      nearby: [
        {
          index: 0,
          creature: creatures.get("glitchlet")!,
          spawnedAt: Date.now(),
          catchRate: 0.8,
        },
        {
          index: 1,
          creature: creatures.get("hexashade")!,
          spawnedAt: Date.now(),
          catchRate: 0.55,
        },
      ],
    });
    expect(result).toContain("Glitchlet");
    expect(result).toContain("Hexashade");
    expect(result).toContain("[1]");
    expect(result).toContain("[2]");
    expect(result).toContain("/catch");
  });

  test("renderScan shows empty message when nothing nearby", () => {
    const result = renderer.renderScan({ nearby: [] });
    expect(result).toContain("nothing");
  });

  test("renderCatch shows success", () => {
    const result = renderer.renderCatch({
      success: true,
      creature: creatures.get("glitchlet")!,
      itemUsed: items.get("bytetrap")!,
      fragmentsEarned: 1,
      totalFragments: 3,
      xpEarned: 10,
      fled: false,
      evolutionReady: false,
    });
    expect(result).toContain("Caught");
    expect(result).toContain("Glitchlet");
    expect(result).toContain("3");
  });

  test("renderCatch shows failure", () => {
    const result = renderer.renderCatch({
      success: false,
      creature: creatures.get("glitchlet")!,
      itemUsed: items.get("bytetrap")!,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: false,
      evolutionReady: false,
    });
    expect(result).toContain("escaped");
  });

  test("renderCatch shows fled", () => {
    const result = renderer.renderCatch({
      success: false,
      creature: creatures.get("glitchlet")!,
      itemUsed: items.get("bytetrap")!,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: true,
      evolutionReady: false,
    });
    expect(result).toContain("fled");
  });

  test("renderCollection shows creatures with fragment counts", () => {
    const result = renderer.renderCollection(
      [
        { creatureId: "glitchlet", fragments: 3, totalCaught: 5, firstCaughtAt: 1000, evolved: false },
      ],
      creatures
    );
    expect(result).toContain("Glitchlet");
    expect(result).toContain("3");
  });

  test("renderInventory shows items with counts", () => {
    const result = renderer.renderInventory({ bytetrap: 5, netsnare: 2 }, items);
    expect(result).toContain("ByteTrap");
    expect(result).toContain("5");
  });

  test("renderStatus shows profile info", () => {
    const result = renderer.renderStatus({
      profile: {
        level: 3, xp: 50, totalCatches: 15, totalTicks: 200,
        currentStreak: 5, longestStreak: 7, lastActiveDate: "2026-04-03",
      },
      collectionCount: 4,
      totalCreatures: 30,
      nearbyCount: 2,
    });
    expect(result).toContain("Level 3");
    expect(result).toContain("15");
    expect(result).toContain("5");
  });

  test("renderNotification returns one-line message", () => {
    const result = renderer.renderNotification({
      type: "spawn",
      message: "Something flickering nearby...",
    });
    expect(result).toContain("flickering");
    expect(result.split("\n").length).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/renderers/simple-text.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create renderer interface (re-export from types)**

```typescript
// src/renderers/renderer.ts

// The Renderer interface is defined in types.ts.
// This file re-exports it and provides a factory.
export { Renderer } from "../types";
```

- [ ] **Step 4: Implement simple text renderer**

```typescript
// src/renderers/simple-text.ts

import {
  Renderer,
  ScanResult,
  CatchResult,
  EvolveResult,
  StatusResult,
  Notification,
  CollectionEntry,
  CreatureDefinition,
  ItemDefinition,
  RARITY_STARS,
} from "../types";

function stars(rarity: string): string {
  const count = RARITY_STARS[rarity as keyof typeof RARITY_STARS] || 1;
  return "*".repeat(count) + "-".repeat(5 - count);
}

function rarityLabel(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return "No signals detected — nothing nearby right now.";
    }

    let out = `NEARBY SIGNALS — ${result.nearby.length} detected\n\n`;

    for (const entry of result.nearby) {
      const c = entry.creature;
      const art = c.art.simple.map((line) => "    " + line).join("\n");
      out += `[${entry.index + 1}] ${c.name}\n`;
      out += art + "\n";
      out += `    ${stars(c.rarity)} ${rarityLabel(c.rarity)}\n`;
      out += `    Catch rate: ${Math.round(entry.catchRate * 100)}%\n\n`;
    }

    out += "Use /catch [number] to attempt capture";
    return out;
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;

    if (result.success) {
      let out = `Caught! ${c.name} captured with ${result.itemUsed.name}.\n`;
      out += `+${result.xpEarned} XP | Fragments: ${result.totalFragments}`;
      if (c.evolution) {
        out += `/${c.evolution.fragmentCost}`;
      }
      if (result.evolutionReady) {
        out += ` — Ready to evolve!`;
      }
      if (result.bonusItem) {
        out += `\nBonus: +${result.bonusItem.count}x ${result.bonusItem.item.name}`;
      }
      return out;
    }

    if (result.fled) {
      return `${c.name} fled! The ${result.itemUsed.name} was used but ${c.name} got away for good.`;
    }

    return `${c.name} escaped the ${result.itemUsed.name}! It's still nearby — try again.`;
  }

  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    if (collection.length === 0) {
      return "Your collection is empty. Use /scan to find creatures nearby.";
    }

    let out = `COLLECTION — ${collection.length} creatures\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? " [EVOLVED]" : "";
      out += `${c.name}${evolvedLabel}  ${stars(c.rarity)}\n`;
      out += `  Caught: ${entry.totalCaught}x`;
      if (c.evolution && !entry.evolved) {
        out += ` | Fragments: ${entry.fragments}/${c.evolution.fragmentCost}`;
        if (entry.fragments >= c.evolution.fragmentCost) {
          out += ` — Ready to evolve!`;
        }
      }
      out += "\n\n";
    }

    return out.trimEnd();
  }

  renderInventory(
    inventory: Record<string, number>,
    items: Map<string, ItemDefinition>
  ): string {
    const entries = Object.entries(inventory).filter(([, count]) => count > 0);

    if (entries.length === 0) {
      return "Inventory is empty.";
    }

    let out = "INVENTORY\n\n";
    for (const [itemId, count] of entries) {
      const item = items.get(itemId);
      if (!item) continue;
      out += `${item.name} x${count}\n`;
      out += `  ${item.description}\n\n`;
    }

    return out.trimEnd();
  }

  renderEvolve(result: EvolveResult): string {
    if (!result.success) {
      return "Evolution failed.";
    }

    let out = `${result.from.name} evolved into ${result.to.name}!\n\n`;
    const art = result.to.art.simple.map((line) => "  " + line).join("\n");
    out += art + "\n\n";
    out += result.to.description;
    if (result.catalystUsed) {
      out += `\n(Used: ${result.catalystUsed})`;
    }
    return out;
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    let out = "STATUS\n\n";
    out += `Level ${p.level} (${p.xp} XP)\n`;
    out += `Total catches: ${p.totalCatches}\n`;
    out += `Collection: ${result.collectionCount}/${result.totalCreatures}\n`;
    out += `Streak: ${p.currentStreak} days (best: ${p.longestStreak})\n`;
    out += `Nearby: ${result.nearbyCount} creatures\n`;
    out += `Total ticks: ${p.totalTicks}`;
    return out;
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest tests/renderers/simple-text.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderers/ tests/renderers/
git commit -m "feat: add simple text renderer with ASCII art and markdown output"
```

---

### Task 12: CLI Entry Point

**Files:**
- Create: `src/cli.ts`
- Create: `src/index.ts`
- Create: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/cli.test.ts

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("CLI", () => {
  let tmpDir: string;
  let statePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "termomon-cli-test-"));
    statePath = path.join(tmpDir, "state.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function run(cmd: string): string {
    return execSync(`npx ts-node src/cli.ts ${cmd}`, {
      env: { ...process.env, TERMOMON_STATE_PATH: statePath },
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
  }

  test("status returns JSON with profile", () => {
    const out = run("status --json");
    const result = JSON.parse(out);
    expect(result.profile.level).toBe(1);
  });

  test("tick records a tick and returns result", () => {
    const out = run("tick --json");
    const result = JSON.parse(out);
    expect(result.notifications).toBeDefined();
  });

  test("scan returns nearby list", () => {
    const out = run("scan --json");
    const result = JSON.parse(out);
    expect(result.nearby).toBeDefined();
  });

  test("inventory returns items", () => {
    const out = run("inventory --json");
    const result = JSON.parse(out);
    expect(result).toBeDefined();
  });

  test("status in text mode returns readable output", () => {
    const out = run("status");
    expect(out).toContain("Level");
    expect(out).toContain("STATUS");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/cli.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create package entry point**

```typescript
// src/index.ts

export { GameEngine } from "./engine/game-engine";
export { StateManager } from "./state/state-manager";
export { SimpleTextRenderer } from "./renderers/simple-text";
export { CREATURES, getCreatureMap, getSpawnableCreatures } from "./config/creatures";
export { ITEMS, getItemMap } from "./config/items";
export * from "./types";
```

- [ ] **Step 4: Implement CLI**

```typescript
#!/usr/bin/env node
// src/cli.ts

import * as path from "path";
import * as os from "os";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { getCreatureMap } from "./config/creatures";
import { getItemMap } from "./config/items";

const statePath =
  process.env.TERMOMON_STATE_PATH ||
  path.join(os.homedir(), ".termomon", "state.json");

const args = process.argv.slice(2);
const command = args[0];
const jsonMode = args.includes("--json");

const stateManager = new StateManager(statePath);
const state = stateManager.load();
const engine = new GameEngine(state);
const renderer = new SimpleTextRenderer();
const creatures = getCreatureMap();
const items = getItemMap();

function output(data: unknown, text: string): void {
  if (jsonMode) {
    console.log(JSON.stringify(data));
  } else {
    console.log(text);
  }
}

function save(): void {
  stateManager.save(engine.getState());
}

try {
  switch (command) {
    case "tick": {
      const sessionId = args.find((a) => a.startsWith("--session="))?.split("=")[1];
      const eventType = args.find((a) => a.startsWith("--event="))?.split("=")[1];
      const result = engine.processTick({
        timestamp: Date.now(),
        sessionId,
        eventType,
      });
      save();
      output(result, result.notifications.map((n) => renderer.renderNotification(n)).join("\n"));
      break;
    }

    case "scan": {
      const result = engine.scan();
      save();
      output(result, renderer.renderScan(result));
      break;
    }

    case "catch": {
      const index = parseInt(args[1], 10) - 1; // User-facing is 1-indexed
      const itemId = args.find((a) => a.startsWith("--item="))?.split("=")[1] || "bytetrap";
      if (isNaN(index)) {
        console.error("Usage: termomon catch [number] --item=bytetrap");
        process.exit(1);
      }
      const result = engine.catch(index, itemId);
      save();
      output(result, renderer.renderCatch(result));
      break;
    }

    case "collection": {
      const collection = engine.getState().collection;
      output(collection, renderer.renderCollection(collection, creatures));
      break;
    }

    case "inventory": {
      const inventory = engine.getState().inventory;
      output(inventory, renderer.renderInventory(inventory, items));
      break;
    }

    case "evolve": {
      const creatureId = args[1];
      if (!creatureId) {
        console.error("Usage: termomon evolve [creature-id]");
        process.exit(1);
      }
      const result = engine.evolve(creatureId);
      save();
      output(result, renderer.renderEvolve(result));
      break;
    }

    case "status": {
      const result = engine.status();
      output(result, renderer.renderStatus(result));
      break;
    }

    case "settings": {
      const setting = args[1];
      const value = args[2];
      if (setting && value) {
        const gameState = engine.getState();
        if (setting === "renderer") {
          gameState.settings.renderer = value as "rich" | "simple" | "browser" | "terminal";
        } else if (setting === "notifications") {
          gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
        }
        save();
        output(gameState.settings, `Settings updated: ${setting} = ${value}`);
      } else {
        const settings = engine.getState().settings;
        output(settings, `SETTINGS\n\nRenderer: ${settings.renderer}\nNotifications: ${settings.notificationLevel}`);
      }
      break;
    }

    default:
      console.log("Termomon — Terminal Creature Collection Game\n");
      console.log("Commands:");
      console.log("  tick                    Record activity tick");
      console.log("  scan                    Show nearby creatures");
      console.log("  catch [n] --item=ID     Catch creature #n");
      console.log("  collection              View your creatures");
      console.log("  inventory               View your items");
      console.log("  evolve [creature-id]    Evolve a creature");
      console.log("  status                  Your profile");
      console.log("  settings [key] [value]  View/change settings");
      console.log("\nAdd --json for machine-readable output.");
      break;
  }
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (jsonMode) {
    console.log(JSON.stringify({ error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
```

- [ ] **Step 5: Install ts-node for CLI testing**

```bash
npm install --save-dev ts-node
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx jest tests/cli.test.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Run full test suite**

```bash
npx jest
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/cli.ts src/index.ts tests/cli.test.ts package.json package-lock.json
git commit -m "feat: add CLI entry point with all game commands and JSON output mode"
```

---

### Task 13: Claude Code Hook Script

**Files:**
- Create: `scripts/tick-hook.js`

- [ ] **Step 1: Create the hook script**

This is a standalone JS file that runs without compilation. It reads hook data from stdin, extracts metadata, and calls the CLI `tick` command.

```javascript
#!/usr/bin/env node
// scripts/tick-hook.js
//
// Claude Code hook script. Receives JSON on stdin, records a game tick.
// Configured to fire on: PostToolUse, UserPromptSubmit, Stop, SessionStart

const { execFileSync } = require("child_process");
const path = require("path");

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id || "";
    const eventType = data.hook_event_name || "";

    // Run the tick command — fire and forget, don't block the user
    const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
    const args = ["tick", `--session=${sessionId}`, `--event=${eventType}`, "--json"];

    execFileSync("node", [cliPath, ...args], {
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // Silent failure — never interrupt the user's workflow
  }

  // Output notification context for Claude (additionalContext)
  // Only on PostToolUse and Stop events
  try {
    const data = JSON.parse(input);
    if (data.hook_event_name === "PostToolUse" || data.hook_event_name === "Stop") {
      const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
      const result = execFileSync("node", [cliPath, "scan", "--json"], {
        timeout: 5000,
        encoding: "utf-8",
      });
      const scan = JSON.parse(result);
      if (scan.nearby && scan.nearby.length > 0) {
        const notification = {
          additionalContext: `[Termomon] ${scan.nearby.length} creature(s) nearby. The user can run /scan to see them.`,
        };
        process.stdout.write(JSON.stringify(notification));
      }
    }
  } catch {
    // Silent failure
  }
});
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/tick-hook.js
```

- [ ] **Step 3: Verify it runs with mock input**

```bash
echo '{"session_id":"test","hook_event_name":"PostToolUse"}' | node scripts/tick-hook.js
```

Expected: No error output (may fail to find dist/cli.js since we haven't built yet, but the script itself should not crash).

- [ ] **Step 4: Commit**

```bash
git add scripts/tick-hook.js
git commit -m "feat: add Claude Code hook script for passive tick recording"
```

---

### Task 14: Claude Code Plugin Manifest and Skills

**Files:**
- Create: `claude-plugin/manifest.json`
- Create: `claude-plugin/hooks.json`
- Create: `claude-plugin/skills/scan.md`
- Create: `claude-plugin/skills/catch.md`
- Create: `claude-plugin/skills/collection.md`
- Create: `claude-plugin/skills/inventory.md`
- Create: `claude-plugin/skills/evolve.md`
- Create: `claude-plugin/skills/status.md`
- Create: `claude-plugin/skills/settings.md`

- [ ] **Step 1: Create plugin manifest**

```json
{
  "name": "termomon",
  "version": "0.1.0",
  "description": "Terminal creature collection game — catch digital beings as you work",
  "skills": [
    "skills/scan.md",
    "skills/catch.md",
    "skills/collection.md",
    "skills/inventory.md",
    "skills/evolve.md",
    "skills/status.md",
    "skills/settings.md"
  ]
}
```

- [ ] **Step 2: Create hooks configuration**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PLUGIN_ROOT/scripts/tick-hook.js\""
      }
    ],
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PLUGIN_ROOT/scripts/tick-hook.js\""
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PLUGIN_ROOT/scripts/tick-hook.js\""
      }
    ],
    "SessionStart": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PLUGIN_ROOT/scripts/tick-hook.js\""
      }
    ]
  }
}
```

- [ ] **Step 3: Create /scan skill**

```markdown
---
name: scan
description: Show nearby creatures that can be caught
---

Run the termomon scan command and display the results to the user.

Run this Bash command:
```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" scan
```

Display the output exactly as returned — it contains ASCII art and creature information. Do not summarize or reformat.
```

- [ ] **Step 4: Create /catch skill**

```markdown
---
name: catch
description: Attempt to catch a nearby creature
---

The user wants to catch a creature. Parse the arguments to determine:
- Which creature number (1-indexed) from the scan list
- Optionally which item to use (default: bytetrap)

Usage: `/catch [number]` or `/catch [number] --item=netsnare`

Run this Bash command with the appropriate arguments:
```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" catch $ARGUMENTS
```

Display the output exactly as returned. If the catch succeeds, congratulate briefly. If it fails, let the user know they can try again.
```

- [ ] **Step 5: Create /collection skill**

```markdown
---
name: collection
description: Browse your caught creatures and evolution progress
---

Run the termomon collection command and display the results.

```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" collection
```

Display the output exactly as returned.
```

- [ ] **Step 6: Create /inventory skill**

```markdown
---
name: inventory
description: View your items
---

Run the termomon inventory command and display the results.

```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" inventory
```

Display the output exactly as returned.
```

- [ ] **Step 7: Create /evolve skill**

```markdown
---
name: evolve
description: Evolve a creature that has enough fragments
---

The user wants to evolve a creature. Parse the argument for the creature ID.

Usage: `/evolve [creature-name]`

The creature name should be lowercased (e.g., "glitchlet", not "Glitchlet").

```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" evolve $ARGUMENTS
```

Display the output exactly as returned — it includes the evolved creature's art.
```

- [ ] **Step 8: Create /status skill**

```markdown
---
name: status
description: View your player profile and game stats
---

Run the termomon status command and display the results.

```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" status
```

Display the output exactly as returned.
```

- [ ] **Step 9: Create /settings skill**

```markdown
---
name: settings
description: View or change game settings (renderer, notifications)
---

View or change termomon settings.

Usage:
- `/settings` — view current settings
- `/settings renderer [rich|simple|browser|terminal]` — change renderer
- `/settings notifications [minimal|moderate|off]` — change notification level

```bash
node "$CLAUDE_PLUGIN_ROOT/dist/cli.js" settings $ARGUMENTS
```

Display the output exactly as returned.
```

- [ ] **Step 10: Commit**

```bash
git add claude-plugin/
git commit -m "feat: add Claude Code plugin manifest, hooks, and slash command skills"
```

---

### Task 15: Build, Smoke Test, and Final Verification

**Files:**
- Modify: `package.json` (add build + prepublish scripts if needed)

- [ ] **Step 1: Build the project**

```bash
npx tsc
```

Expected: No errors. `dist/` directory created with compiled JS.

- [ ] **Step 2: Run full test suite**

```bash
npx jest --coverage
```

Expected: All tests PASS.

- [ ] **Step 3: Smoke test the compiled CLI**

```bash
export TERMOMON_STATE_PATH=/tmp/termomon-smoke-test/state.json
node dist/cli.js status
node dist/cli.js tick
node dist/cli.js tick
node dist/cli.js tick
node dist/cli.js scan
node dist/cli.js inventory
```

Expected: Each command produces readable output, no crashes.

- [ ] **Step 4: Smoke test the hook script**

```bash
echo '{"session_id":"smoke","hook_event_name":"PostToolUse"}' | node scripts/tick-hook.js
```

Expected: No errors, state file updated.

- [ ] **Step 5: Clean up smoke test state**

```bash
rm -rf /tmp/termomon-smoke-test
```

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "chore: build verification and smoke test fixes"
```

- [ ] **Step 7: Final commit — tag POC v0.1.0**

```bash
git tag v0.1.0
```
