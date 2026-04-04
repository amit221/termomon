# Config Extraction: Move Hardcoded Values to JSON

**Date:** 2026-04-04
**Status:** Approved

## Goal

Extract all hardcoded game balance values, creature/item definitions, and player-facing messages from TypeScript source files into a single `config/balance.json` file. This gives the developer a single place to tune the game without hunting through code.

This is a developer-tuning config — not player-facing. It ships with the package and players do not modify it.

## JSON Structure

Single file at `config/balance.json` with 7 top-level sections:

### `spawning`

```json
{
  "ticksPerSpawnCheck": 10,
  "spawnProbability": 0.6,
  "maxNearby": 10,
  "initialSpawnCount": 3,
  "creatureLingerMs": 1800000,
  "maxCatchAttempts": 3,
  "spawnWeights": {
    "common": 0.45,
    "uncommon": 0.25,
    "rare": 0.15,
    "epic": 0.10,
    "legendary": 0.05
  },
  "timeOfDay": {
    "morning": [6, 12],
    "afternoon": [12, 17],
    "evening": [17, 21],
    "night": [21, 6]
  }
}
```

**Sources:** `src/config/constants.ts` (lines 3-7, 23-29), `src/engine/ticks.ts` (lines 5-8)

### `catching`

```json
{
  "maxCatchRate": 1.0,
  "bonusItemDropChance": 0.1,
  "bonusItemId": "bytetrap",
  "fragmentsPerCatch": 1,
  "xpPerCatch": {
    "common": 10,
    "uncommon": 25,
    "rare": 50,
    "epic": 100,
    "legendary": 250
  }
}
```

**Sources:** `src/engine/catch.ts` (lines 43, 53-54, 81, 83), `src/config/constants.ts` (lines 13-19)

### `progression`

```json
{
  "xpPerLevel": 100,
  "sessionGapMs": 900000,
  "tickPruneCount": 500
}
```

**Sources:** `src/config/constants.ts` (lines 10-11, 21)

### `rewards`

```json
{
  "passiveDripInterval": 25,
  "passiveDripItems": [
    { "itemId": "bytetrap", "count": 2, "weight": 0.7 },
    { "itemId": "netsnare", "count": 1, "weight": 0.25 },
    { "itemId": "corelock", "count": 1, "weight": 0.05 }
  ],
  "sessionRewardItems": [
    { "itemId": "bytetrap", "count": 3, "weight": 0.6 },
    { "itemId": "netsnare", "count": 1, "weight": 0.3 },
    { "itemId": "shard", "count": 1, "weight": 0.1 }
  ],
  "milestones": [
    {
      "id": "first_catch",
      "description": "First catch!",
      "condition": { "type": "totalCatches", "threshold": 1 },
      "reward": [{ "itemId": "bytetrap", "count": 5 }],
      "oneTime": true
    },
    {
      "id": "catch_10",
      "description": "10 catches!",
      "condition": { "type": "totalCatches", "threshold": 10 },
      "reward": [{ "itemId": "netsnare", "count": 3 }, { "itemId": "shard", "count": 1 }],
      "oneTime": true
    },
    {
      "id": "catch_50",
      "description": "50 catches!",
      "condition": { "type": "totalCatches", "threshold": 50 },
      "reward": [{ "itemId": "corelock", "count": 2 }, { "itemId": "prism", "count": 1 }],
      "oneTime": true
    },
    {
      "id": "streak_3",
      "description": "3-day streak!",
      "condition": { "type": "currentStreak", "threshold": 3 },
      "reward": [{ "itemId": "bytetrap", "count": 3 }],
      "oneTime": true
    },
    {
      "id": "streak_7",
      "description": "7-day streak!",
      "condition": { "type": "currentStreak", "threshold": 7 },
      "reward": [{ "itemId": "netsnare", "count": 3 }, { "itemId": "shard", "count": 2 }],
      "oneTime": true
    },
    {
      "id": "streak_30",
      "description": "30-day streak!",
      "condition": { "type": "currentStreak", "threshold": 30 },
      "reward": [{ "itemId": "corelock", "count": 3 }, { "itemId": "prism", "count": 2 }],
      "oneTime": true
    }
  ]
}
```

**Sources:** `src/config/constants.ts` (lines 31-95)

Milestone conditions change from inline functions to declarative objects. Supported condition types: `totalCatches`, `currentStreak`, `totalTicks`. The loader builds the condition functions from these declarations.

### `creatures`

Array of all 30 creature definitions. Same shape as the current `CreatureDefinition` interface:

```json
[
  {
    "id": "mousebyte",
    "name": "Mousebyte",
    "description": "A tiny field mouse that nests in warm circuit boards",
    "rarity": "common",
    "baseCatchRate": 0.8,
    "art": {
      "simple": ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
      "rich": ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "]
    },
    "spawnCondition": {},
    "evolution": { "targetId": "circuitmouse", "fragmentCost": 5 }
  }
]
```

**Source:** `src/config/creatures.ts` (all 30 entries)

### `items`

Array of all 5 item definitions. Same shape as `ItemDefinition`:

```json
[
  {
    "id": "bytetrap",
    "name": "ByteTrap",
    "description": "Basic capture device — gets the job done",
    "type": "capture",
    "catchMultiplier": 1.0
  }
]
```

**Source:** `src/config/items.ts` (all 5 entries)

### `messages`

All player-facing strings, grouped by command/context. Placeholders use `{name}` syntax.

```json
{
  "scan": {
    "empty": "No signals detected — nothing nearby right now.",
    "header": "NEARBY SIGNALS — {count} detected",
    "catchItems": "Catch items: {count}",
    "footer": "Use /catch [number] to attempt capture"
  },
  "catch": {
    "successHeader": "*** CAUGHT! ***",
    "captured": "{name} captured with {item}",
    "xpGained": "+{xp} XP",
    "fragmentProgress": "Fragments: [{bar}] {count}/{cost}",
    "fragmentCount": "Fragment: {count}",
    "evolutionReady": "[Ready to evolve!]",
    "bonusItem": "Bonus: +{count}x {name}",
    "fledHeader": "* FLED! *",
    "fledMessage": "{name} slipped away for good.",
    "itemUsed": "The {item} was used.",
    "escapedHeader": "X ESCAPED",
    "escapedMessage": "{name} broke free!",
    "escapedHint": "Try again with another {item}"
  },
  "collection": {
    "empty": "Your collection is empty. Use /scan to find creatures nearby.",
    "header": "COLLECTION — {count} creatures",
    "evolved": "[EVOLVED]",
    "caught": "Caught: {count}x",
    "fragProgress": "Frags: [{bar}] {count}/{cost}"
  },
  "inventory": {
    "empty": "Inventory is empty. Complete tasks and catches to earn items.",
    "header": "INVENTORY",
    "captureSection": "CAPTURE DEVICES",
    "catalystSection": "EVOLUTION CATALYSTS"
  },
  "evolve": {
    "failed": "Evolution failed.",
    "successHeader": "[* EVOLUTION COMPLETE! *]",
    "transform": "{from} -> {to}",
    "catalystUsed": "(Used: {catalyst})"
  },
  "status": {
    "header": "STATUS",
    "level": "Level {level}",
    "xp": "XP: {bar} {xp}/{nextXp}",
    "catches": "Total catches: {count}",
    "collection": "Collection: {bar} {count}/{total}",
    "streak": "Streak: {streak} days (best: {best})",
    "nearby": "Nearby: {count} creatures",
    "ticks": "Total ticks: {count}"
  },
  "notifications": {
    "despawn": "{name} slipped away...",
    "rareSpawn": "Rare signal detected!",
    "normalSpawn": "Something flickering nearby...",
    "milestone": "Milestone reward! +{items}",
    "evolutionReady": "{name} has enough fragments to evolve!"
  }
}
```

**Source:** `src/renderers/simple-text.ts`, `src/engine/game-engine.ts`

Error messages (e.g., "Invalid creature index") stay as code — they are developer-facing, not player-facing.

## Loader: `src/config/loader.ts`

New file that reads and caches the JSON config.

**Responsibilities:**
- Read `config/balance.json` using `fs.readFileSync` + `JSON.parse`
- Resolve path relative to package root
- Cache the parsed result (load once, return same object)
- Export typed config object (`BalanceConfig` type)
- Build milestone condition functions from declarative JSON
- Provide a string interpolation helper: `formatMessage(template, vars)` that replaces `{key}` placeholders

**New type in `src/types.ts`:**

```ts
interface MilestoneCondition {
  type: "totalCatches" | "currentStreak" | "totalTicks";
  threshold: number;
}

interface MilestoneConfig {
  id: string;
  description: string;
  condition: MilestoneCondition;
  reward: Array<{ itemId: string; count: number }>;
  oneTime: boolean;
}
```

## Modified Files

### `src/config/constants.ts`
Becomes a thin re-export layer. Imports values from `loader.ts` and exports them with the same names (`TICKS_PER_SPAWN_CHECK`, `SPAWN_PROBABILITY`, `MILESTONES`, etc.). No downstream code changes needed.

### `src/config/creatures.ts`
`CREATURES` array sourced from JSON via loader. `getCreatureMap()` and `getSpawnableCreatures()` stay as helper functions.

### `src/config/items.ts`
`ITEMS` array sourced from JSON via loader. `getItemMap()` stays as helper function.

### `src/renderers/simple-text.ts`
Replace hardcoded strings with lookups from the messages config. Use `formatMessage()` for placeholder interpolation.

### `src/engine/game-engine.ts`
Notification message strings sourced from messages config instead of hardcoded.

### `src/engine/catch.ts`
Currently hardcodes bonus drop chance (`0.1`), bonus item id (`"bytetrap"`), fragments per catch (`1`), and max catch rate (`1.0`). These change to imports from `constants.ts` (which re-exports from the JSON): `BONUS_ITEM_DROP_CHANCE`, `BONUS_ITEM_ID`, `FRAGMENTS_PER_CATCH`, `MAX_CATCH_RATE`.

### `src/engine/ticks.ts`
Currently hardcodes time-of-day hour ranges. These change to imports from `constants.ts`: `TIME_OF_DAY_RANGES`.

## Unchanged Files

- Engine logic files that already import from constants (spawn.ts, evolution.ts, inventory.ts) — no changes needed, they get new values via existing imports
- `src/types.ts` — only additions (MilestoneCondition, MilestoneConfig), no changes to existing types
- `src/state/state-manager.ts`
- `src/cli.ts`, `src/index.ts`
- All skills, hooks, scripts
- `RARITY_STARS` in types.ts stays as code (display mapping, not balance)

## Testing

- **Existing tests:** Pass unchanged — same export names, same types
- **New test:** `tests/config/loader.test.ts`
  - JSON loads and parses without error
  - Exported types match expected interfaces
  - Milestone conditions evaluate correctly (totalCatches >= threshold, etc.)
  - Missing or malformed JSON throws a clear error message
  - `formatMessage()` replaces placeholders correctly

## Build

`config/balance.json` lives at the repo root, outside `src/`. The loader resolves it relative to the package root at runtime. No build copy step needed.

## No New Dependencies

Only uses Node.js `fs` and `path` modules.
