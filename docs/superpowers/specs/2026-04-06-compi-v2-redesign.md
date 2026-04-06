# Compi v2 — Visual & Mechanics Redesign

## Problem

The current trait system is confusing (6 slots, 8 rarity tiers, stable/volatile/catalyst merge modifiers, synergy bonuses) and the ASCII art looks bad (generic template with swapped punctuation). Players can't visually parse their creatures or understand merge decisions.

## Design Goals

1. Creatures should look like creatures — distinct, colorful, readable at a glance
2. Merge should feel intuitive — "feed one creature to upgrade another" with visible odds
3. Per-slot rarity coloring creates a built-in "complete the set" motivation
4. Hide complexity — rich internals, simple surface
5. Rich Unicode symbols that get progressively fancier at higher rarities

## Rarity Tiers (6)

| Tier | Color | Stars | Symbol Complexity |
|------|-------|-------|-------------------|
| Common | Gray (`\x1b[90m`) | ★····· | Basic: `○ · ° ░ ~` |
| Uncommon | White (`\x1b[97m`) | ★★···· | Half-fills: `◐ ◑ ▒ ⌇` |
| Rare | Cyan (`\x1b[36m`) | ★★★··· | Solid: `◎ ● ◉ ▓ ≋` |
| Epic | Purple (`\x1b[35m`) | ★★★★·· | Ornate: `◆ ❖ ✦ ◈ ⚡` |
| Legendary | Yellow (`\x1b[33m`) | ★★★★★· | Special: `★ ☆ ⬟ ⬡ ☄` |
| Mythic | Red (`\x1b[31m`) | ★★★★★★ | Exotic: `⊙ ◈ ⊗ ✦ ☄✧☄` |

Expandable — more tiers can be added later without structural changes.

## Creature Structure

### 4 Slots

Each creature has 4 visual slots, each with its own independent rarity:

| Slot | Position | Example variants |
|------|----------|-----------------|
| Eyes | Line 1 (top) | `○.○` `◎.◎` `★w★` `⊙_⊙` |
| Mouth | Line 2 (parenthesized) | `( - )` `( ω )` `( ◇ )` `( ⊗ )` |
| Body | Line 3 (framed with ╱╲) | `╱ ░░ ╲` `╱ ▓▓ ╲` `╱ ◈◈ ╲` |
| Tail | Line 4 (bottom) | `~~/` `≋≋` `\⚡/` `☄✧☄` |

### Named Variants (cosmetic identity)

Each slot × rarity tier has a pool of named visual variants. Example:

- Rare eyes: "Ring Gaze" (`◎.◎`), "Dot Sight" (`●_●`), "Core Eyes" (`◉w◉`)
- Epic mouth: "Prism" (`( ∇ )`), "Void" (`( ⊗ )`), "Gem" (`( ◇ )`)

Variants are cosmetic only — no gameplay effect. They give each creature a unique named identity and matter during merge grafting.

Target variant counts per tier:
- Common: 5-6 per slot
- Uncommon: 4-5 per slot
- Rare: 3-4 per slot
- Epic: 3 per slot
- Legendary: 2-3 per slot
- Mythic: 1-2 per slot

### Per-Slot Coloring

Each slot renders in its own rarity color. A creature with legendary eyes, common mouth, rare body, and epic tail displays as:

```
     ★w★        ← yellow (legendary)
    ( - )        ← gray (common)
    ╱ ▓▓ ╲      ← cyan (rare)
     \⚡/        ← purple (epic)
```

This creates the "complete the set" motivation — you can see which parts need upgrading.

### Dynamic Alignment

Use `string-width` npm package to measure actual Unicode display width and pad each line to center within a fixed creature width. This ensures alignment regardless of which symbols are used.

### Creature Names

Each creature gets a generated name (e.g., "Sparks", "Lumina", "Fang"). Names give identity and are used in all UI references.

### Level / Power

Each creature has a single level number derived from total slot rarity internally. Displayed simply as `Lv N`. No other visible stats.

## Catching (unchanged core, simplified display)

- `/scan` shows nearby creatures with their colored art, name, catch rate, and energy cost
- `/catch <number>` attempts a catch — costs energy, luck-based
- Success: creature joins collection, XP gained
- Escaped: creature stays, attempts remaining shown
- Fled: creature gone forever

Catch rate is influenced by overall creature rarity (higher rarity = harder to catch). Energy cost scales with rarity.

## Merge System (redesigned)

### Sacrifice Merge

Feed one creature (food) into another (target). The food is destroyed. The target always survives.

### How It Works

1. Player runs `/merge <target> <food>` — sees a preview with upgrade chances per slot
2. One random slot on the target gets upgraded one rarity tier
3. The slot that gets picked is weighted by rarity: **rarer slots are more likely to be picked**
4. The upgraded slot's visual appearance is **grafted from the food creature** (it takes the food's look for that slot, at the new rarity tier)
5. Player runs `/merge confirm` to execute

### Merge Odds Display

```
Upgrade chances:
  eyes   ▸▸▸▸▸▸▸░░░ 65%  legendary → mythic
  tail   ▸▸░░░░░░░░ 20%  epic → legendary
  body   ▸░░░░░░░░░ 10%  rare → epic
  mouth  ░░░░░░░░░░  5%  common → uncommon
```

Each slot's chance bar is colored in that slot's current rarity color. The player sees exactly what they're gambling on.

### Design Tension

- Early game: merging feels great — weak slots are safe, strong slots keep climbing
- Late game: when most slots are legendary/mythic, it's hard to target the one remaining weak slot — it keeps hitting already-high parts
- This creates a natural difficulty curve without artificial gates

### Grafting

When a slot is upgraded, it takes the food creature's visual appearance for that slot but renders it at the new (upgraded) rarity tier's color. If the food creature's variant for that slot doesn't exist at the new tier, a random variant from the new tier is used instead. This means:
- The food creature's look lives on in the target
- Each merge visibly changes the target's appearance
- Players may seek specific food creatures for their looks

## Screens

All screen layouts are defined in the preview files in the project root. These serve as the visual reference for implementation:

- `_preview_all_screens.js` — complete reference for all screens (scan, catch success/escaped/fled, collection, merge preview/result, status, energy, notification)
- `_preview_aligned.js` — demonstrates dynamic alignment with string-width
- `_preview_unicode.js` — full Unicode symbol palette organized by rarity tier

Run any preview with `node <filename>` to see colored output.

### Screen List

1. **`/scan`** — energy bar, list of nearby creatures with art + rate + cost
2. **`/catch` success** — "✦ CAUGHT! ✦" header, creature art, XP/energy summary
3. **`/catch` escaped** — "✦ ESCAPED ✦" header, creature art, attempts remaining
4. **`/catch` fled** — "✦ FLED ✦" header, creature gone message
5. **`/collection`** — list of owned creatures with art + variant names
6. **`/merge` preview** — target + food creatures shown, upgrade chances per slot with colored bars
7. **`/merge` result** — which slot was upgraded, before → after rarity, grafted variant name, updated creature art
8. **`/status`** — level, XP bar, energy bar, catches, merges, collection count, streak, nearby, ticks
9. **`/energy`** — energy bar + time to next energy
10. **Notification** — passive one-liner when creatures spawn

## Cosmetic Variant Pool

The variant pool should be extensive — this is what makes each creature feel unique. Target: **~80-100 total visual parts** across all slots and tiers, with progressively fancier Unicode at higher rarities. The full pool will be defined in `config/traits.json` during implementation. See `_preview_unicode.js` for the symbol palette reference.

## Clean Break — No Backward Compatibility

This is a v2 rewrite. No migration of old state, no compatibility shims, no renaming of old code. Specifically:

- Old `GameState` shape is replaced entirely — existing `~/.compi/state.json` files are not migrated
- Old engine modules (`merge.ts` with stable/volatile/catalyst, old `spawn.ts` with 6-slot creatures) are rewritten, not patched
- Old config (`config/traits.json` with 6 slots, 8 tiers, merge modifiers) is replaced
- Old renderer code is replaced
- Any types, interfaces, or functions that only existed to support the old system are deleted, not deprecated
- Remove any commands, code paths, or config options that don't serve the v2 design

## What Gets Removed

- Trait slots: gills, pattern, aura (6 → 4 slots)
- Merge modifiers: stable/volatile/catalyst system
- Synergy bonuses
- Rarity tiers: ancient, void (8 → 6 tiers)
- Merge modifier display ("+0.14 (stable)")
- Old box-drawing renderer (the `+---+` / `| |` format)
- Any dead code or types left over from the old system

## What Stays

- Core architecture: pure engine functions, state manager, renderer interface, hook system
- Game loop: ticks → spawns → scan → catch → collect → merge
- Energy system
- XP / leveling
- Batch system (multiple attempts per spawn)
- Milestones

## Technical Notes

- Add `string-width` as a production dependency for dynamic alignment
- All visual variants defined in `config/traits.json` (restructured for 4 slots × 6 tiers)
- Renderer outputs ANSI escape codes — works in Claude Code MCP tool output and standalone CLI
- Creature names generated from a name pool (not UUID-based IDs as display names)
