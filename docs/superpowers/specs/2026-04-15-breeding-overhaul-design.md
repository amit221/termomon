# Breeding System Overhaul — Design Spec

## Goal

Replace gold, quests, and upgrades with a breeding-focused game loop. Creatures breed to produce offspring with upgraded trait rarities and cross-species hybrids. Simple to start, deep over time.

## Reference

GENEX prototype (`Downloads/genex.html`) — the experience benchmark. The terminal implementation should match its scan→catch→breed→discover pacing and feel.

## What's Removed

| System | Files to Delete/Modify |
|--------|----------------------|
| Gold | `src/engine/gold.ts` (delete), remove `state.gold` from types |
| Quests | `src/engine/quest.ts` (delete), remove `state.activeQuest`, `profile.totalQuests` |
| Upgrades | `src/engine/upgrade.ts` (delete), remove `state.sessionUpgradeCount`, `profile.totalUpgrades` |
| Trait ranks | Remove `_rN` suffix system from variant IDs. A trait is just its ID + rarity color. |
| Skills | Delete `/upgrade` and `/quest` skills |

## What's Kept (Unchanged)

- Energy system (regen, session bonus, spending)
- Catch mechanics (scan, batch spawning, catch rate, fail penalty)
- Collection (15 max) + archive
- Progression/XP system (level, XP thresholds, level-up)
- Discovery tracking
- Species art frames and slot-based trait system
- `/scan`, `/catch`, `/collection`, `/archive`, `/energy`, `/status`, `/settings`, `/create-species`

## Core Loop

```
/scan   → see nearby creatures (species + traits with rarity colors)
/catch  → capture one (costs energy)
/breed  → pick two from collection → child appears
         same species: trait inheritance + rarity upgrade chance
         diff species: AI generates hybrid via /create-species
/collection → view your creatures
/species    → (new) track rarity tier progress per species
```

## Traits & Rarity

### Slot-Based Traits

Each creature has 4 slots: eyes, mouth, body, tail. Each slot has a trait drawn from the species' pool. This stays exactly as it is now.

### Color = Rarity (Per Trait)

Each trait has its own rarity, shown by its color. Same trait name can appear at any rarity. The trait is the WHAT, the color is the HOW GOOD.

8-color rarity system (expanded from current 6):

| Color | Rarity | Spawn Weight |
|-------|--------|-------------|
| grey | Common | 28% |
| white | Uncommon | 22% |
| green | Rare | 18% |
| cyan | Superior | 14% |
| blue | Elite | 8% |
| magenta | Epic | 5% |
| yellow | Legendary | 3% |
| red | Mythic | 2% |

New colors `green` and `blue` are added between white and magenta. This adds 2 new rarity tiers (Rare, Elite) giving a smoother progression curve with more steps to breed through.

Trait rarity is independent of trait identity. Any trait can spawn at any rarity — "Pebble Gaze" can be grey (common) or red (mythic). On catch, each of the 4 trait slots gets a random rarity based on the spawn weights above.

`CreatureColor` type and `CREATURE_COLORS` array updated to include all 8.

A creature's 4 traits each have independent rarity colors. Example:

```
   ·.·              Compi
  ( ω  )
  /░░░░\
   ~~/

  Pebble Gaze   Omega      Dots       Curl
    (cyan)     (magenta)   (grey)    (green)
```

This creature has a rare eyes, epic mouth, common body, uncommon tail.

### No More Trait Ranks

Current system: `eye_c01_r3` (trait + rank suffix). New system: `eye_c01` + separate rarity color. The rank suffix is removed entirely. Rarity is a separate field on the slot, not part of the variant ID.

### Creature Display Color

The creature's overall display color = the color of its highest-rarity trait. This creature would display as magenta (its epic mouth is the highest).

## Species

### The 7 Base Species Stay

Compi, Pyrax, Flikk, Glich, Jinx, Monu, Whiski — all keep their:
- ASCII art frames
- Slot zone mappings
- Trait pools (per slot)
- Spawn weights

Species-specific trait IDs (`flk_eye_01`, `pyr_bod_03`) stay as-is. Each species keeps its unique trait pool. No generic shared pool.

### Any Creature Breeds With Any Creature

No species restriction on breeding. Same-species pairs get a bonus (higher upgrade chance). Cross-species pairs create hybrids.

## Breeding

### Same-Species Breeding

Each slot resolves independently:

**Both parents have the same trait in a slot:**
- Child gets that trait
- Rarity upgrade chance: **35%** to go up one tier
- If either parent has higher rarity, child gets the higher rarity, **15%** chance to go up further
- Can't exceed Mythic (red, rarity index 7)

**Parents have different traits in a slot:**
- 50/50 which trait the child gets
- Child keeps that parent's rarity for that slot
- **10%** chance to upgrade rarity by one tier (same-species bonus)

### Cross-Species Breeding → Hybrid

When parents are different species:

1. Game calls `/create-species` in **breed mode** with parent context
2. AI generates:
   - New species name (AI-generated, not a portmanteau)
   - New ASCII art frame (blending both parents' aesthetics)
   - Trait pool = union of both parents' species trait pools
   - Description/flavor text
3. Child is born as the new hybrid species
4. Per-slot trait resolution works the same as same-species, except:
   - Upgrade chance is **20%** for matching traits (no same-species bonus)
   - **5%** for non-matching traits
5. New species is registered in state and appears in species index
6. Future breeds with this hybrid follow normal rules (it's now a full species)

### Breeding Rules

| Rule | Value |
|------|-------|
| Parents survive | Yes — not consumed |
| Cooldown | Same pair can't breed for 1 session |
| Max breeds per session | 3 |
| Energy cost | 3 base + 1 per uncommon+ trait across both parents (range 3-11) |
| Child generation | max(parentA.gen, parentB.gen) + 1 |
| XP earned | 25 per breed (same as now) |
| Cross-species XP bonus | +25 (50 total for hybrid creation) |

### `/create-species` Breed Mode

The existing skill gets a new mode. When invoked in breed mode, it receives:

```
Parent A: { species, art, traits with rarities }
Parent B: { species, art, traits with rarities }
Mode: "breed"
Instruction: "Create a hybrid species blending {speciesA} and {speciesB}. 
  Generate ASCII art (3-4 lines) that combines visual elements from both parents.
  Name the species. Write one line of description.
  The trait pool should combine both parents' trait pools."
```

The AI returns a species definition in the same JSON format as existing species files. This gets saved to `state.personalSpecies[]`.

### Manual Mode Stays

Players can still use `/create-species` manually to design species from scratch (current behavior). This is separate from breed mode.

## Species Index

New command: `/species` — shows discovery progress.

Per species, tracks which rarity tiers the player has seen on ANY trait of that species:

```
SPECIES INDEX

  Compi         ● ● ● ● ○ ○ ○ ○   4/8
                C U R S E E L M

  Pyrax         ● ● ○ ○ ○ ○ ○ ○   2/8
                C U R S E E L M

  ── HYBRIDS ──

  Emberlotl     ● ● ○ ○ ○ ○ ○ ○   2/8
  (Compi×Pyrax) C U R S E E L M
```

C=Common, U=Uncommon, R=Rare, S=Superior, E=Elite, E=Epic, L=Legendary, M=Mythic. Filled dots colored by their tier. A tier is "discovered" when the player has caught OR bred a creature of that species with at least one trait at that rarity level. Cumulative — once discovered, stays.

Implementation: `state.speciesProgress: Record<string, boolean[]>` — maps speciesId to array of 8 booleans (one per rarity tier).

## Energy Economy

| Parameter | Old | New | Reason |
|-----------|-----|-----|--------|
| maxEnergy | 30 | 30 | Keep |
| gainInterval | 30 min | 30 min | Keep |
| sessionBonus | 3 | 5 | Compensate for removed quest income |
| startEnergy | 10 | 15 | Better new player start |
| catchCost | 1-5 | 1-5 | Keep current formula |
| breedCost | 3-8 (old merge) | 3-11 | New formula: 3 + uncommon+ trait count |
| maxBreedsPerSession | N/A | 3 | New limit |

## XP Sources (Updated)

| Action | XP | Change |
|--------|-----|--------|
| Catch | 10 | Same |
| Breed (same species) | 25 | Same |
| Breed (cross species / hybrid) | 50 | New — bonus for hybrid creation |
| Discovery (new species) | 20 | Same — also applies to hybrids |
| Tier discovery (new rarity tier for a species) | 10 | New — per species progress |

Removed: xpPerUpgrade (8), xpPerQuest (15).

## UI/UX — Terminal Output

### `/scan` — Show Nearby Creatures

Show all nearby creatures at once (not one at a time). Each creature displays its ASCII art with trait colors, species name, and trait names with rarity colors.

```
╭──────────────────────────────────────╮
│  3 creatures nearby     ⚡ 12 energy │
╰──────────────────────────────────────╯

 1)    ·.·            2)   ✦~✦           3)    ○w○
      ( ω  )              <( △  )>            ( ◡  )
      /░░░░\               /▓▓\               /····\
       ~~/                  ☄☄                 ∿∿

    Compi                 Pyrax               Flikk
    Pebble Gaze (cyan)    Ember Gaze (grey)   Owl Sight (green)
    Omega (magenta)       Flame (cyan)        Smile (grey)
    Dots (grey)           Crystal (green)     Light (cyan)
    Curl (green)          Comet (magenta)     Drift (grey)

    catch cost: 2⚡       catch cost: 3⚡      catch cost: 1⚡

  /catch 1   /catch 2   /catch 3
```

Each trait name is rendered in its rarity color. The creature's ASCII art uses the color of its highest-rarity trait.

### `/catch <n>` — Capture Result

```
╭──────────────────────────────────╮
│  ✓ Caught Compi!          -2⚡   │
│                                  │
│       ·.·                        │
│      ( ω  )                      │
│      /░░░░\                      │
│       ~~/                        │
│                                  │
│  Pebble Gaze ●  Omega ●         │
│  Dots ●         Curl ●          │
│                                  │
│  Added to collection (4/15)      │
╰──────────────────────────────────╯
```

Trait dots are colored by rarity. Brief, satisfying confirmation.

### `/breed` — Breed Flow

**Step 1: Selection** — show breedable pairs from collection.

```
╭──────────────────────────────────────╮
│  BREED LAB                    ⚡ 9   │
│  Breeds this session: 1/3            │
╰──────────────────────────────────────╯

  Select parent A (by number):

  1) Compi    ·.· ω ░░ ~~/     (cyan, magenta, grey, green)
  2) Pyrax    ✦~✦ △ ▓▓ ☄☄     (grey, cyan, green, magenta)
  3) Flikk    ○w○ ◡ ·· ∿∿     (green, grey, cyan, grey)
  4) Compi    -.– ~ -- _v_     (grey, grey, grey, grey)

  /breed 1 2
```

Each creature shown as a compact one-liner: species + 4 trait visuals + 4 rarity colors.

**Step 2: Result** — after `/breed 1 2`:

Same species:
```
╭──────────────────────────────────────╮
│  Compi × Compi                -5⚡   │
│                                      │
│       ·.·                            │
│      ( ω  )                          │
│      /░░░░\                          │
│       ~~/                            │
│                                      │
│  Pebble Gaze (cyan)                  │
│  Omega (magenta → yellow!)  ↑ UP!    │
│  Dots (grey)                         │
│  Curl (green)                        │
│                                      │
│  ✓ Born: Compi (Gen 1)               │
│  Added to collection (5/15)          │
│  +25 XP                              │
╰──────────────────────────────────────╯
```

When a trait upgrades rarity, show `↑ UP!` with a color change callout. This is the exciting moment.

Cross-species:
```
╭──────────────────────────────────────╮
│  ★ HYBRID SPECIES BORN!      -7⚡   │
│                                      │
│  Compi × Pyrax                       │
│                                      │
│      ·✦·                             │
│     <( ω )>                          │
│      /▓░\                            │
│       ~☄                             │
│                                      │
│  Emberlotl                           │
│  "A smoldering axolotl with          │
│   crystalline wings of flame"        │
│                                      │
│  Pebble Gaze (cyan)                  │
│  Omega (magenta)                     │
│  Crystal (green → cyan!)  ↑ UP!      │
│  Comet (magenta)                     │
│                                      │
│  ✓ New species discovered!           │
│  +50 XP  +20 Discovery XP           │
╰──────────────────────────────────────╯
```

The hybrid reveal is the BIG moment — new name, new art (AI-generated), description, and the "★ HYBRID SPECIES BORN!" banner.

### `/species` — Species Index (New Command)

```
╭──────────────────────────────────────╮
│  SPECIES INDEX              7 + 2    │
╰──────────────────────────────────────╯

  Compi         ● ● ● ● ○ ○ ○ ○   4/8
                C U R S E E L M

  Pyrax         ● ● ○ ○ ○ ○ ○ ○   2/8
                C U R S E E L M

  ── HYBRIDS ──

  Emberlotl     ● ● ○ ○ ○ ○ ○ ○   2/8
  (Compi×Pyrax) C U R S E E L M
```

Filled dots are colored by their rarity tier. Empty dots are dim. Shows base species first, then hybrids below a separator.

### `/collection` — Updated Display

Same as current but:
- Each trait shows its rarity color (not rank number)
- No gold display
- No quest status
- Creature overall color = highest trait rarity color

### Removed from UI

- Gold display (everywhere)
- Quest status/prompts
- Upgrade prompts
- Trait rank numbers (`r0`..`r7`)
- `/upgrade` command
- `/quest` command

## Catch Rate & Cost (Updated)

Currently catch rate and energy cost use trait RANK (`_rN` suffix). With ranks removed, these use the new rarity index (0-7) instead.

**Catch rate per trait**: `1.0 - (rarityIndex / 7) * 0.50`
Average across 4 traits, minus fail penalty, clamped to [0.15, 0.90]. Same formula structure, just reads `slot.rarity` instead of extracting rank from variantId.

**Energy cost**: `1 + floor(avgRarityRatio * 4)` where avgRarityRatio = average(slot.rarity) / 7. Range: 1-5. Same formula, new input source.

## Progression / Leveling (Updated)

With trait ranks removed, leveling no longer gates rank caps. New purpose:

**Leveling gates RARITY BREEDING CEILING:**

| Level | Max Breedable Rarity |
|-------|---------------------|
| 1-2 | Uncommon (white, index 1) |
| 3-4 | Rare (green, index 2) |
| 5-6 | Superior (cyan, index 3) |
| 7-8 | Elite (blue, index 4) |
| 9-10 | Epic (magenta, index 5) |
| 11-12 | Legendary (yellow, index 6) |
| 13+ | Mythic (red, index 7) |

You can CATCH any rarity (luck-based). But breeding upgrades are capped by level. A level 1 player can catch a mythic creature but can't breed UP to mythic until level 13.

This preserves the progression curve: early game = easy upgrades, late game = hard-earned.

XP thresholds stay as-is. XP sources updated per the XP table in this spec.

## AI Latency for Hybrid Creation

Cross-species breeding calls `/create-species` which requires an AI response (5-30 seconds). The terminal must handle this gracefully:

1. After `/breed 1 2` (cross-species), immediately show: `Creating hybrid species...` with a spinner
2. The breed trait resolution happens locally (instant) — the child's traits are determined immediately
3. The AI call generates the species frame, name, and description IN PARALLEL
4. Once AI responds: show the full hybrid reveal with "★ HYBRID SPECIES BORN!"
5. If AI fails/times out: use a fallback — alternate parent frames (like GENEX did), generate a portmanteau name, generic description. The breed still succeeds.

## Collection Management

Parents survive breeding. With 3 breeds/session and 15 max collection, players hit the cap quickly. Archive is now a KEY mechanic:

- **Before breeding**: if collection is 14/15, the breed can proceed (child fills slot 15). At 15/15, must archive first.
- **Archive prompt**: when collection is full and player tries to breed or catch, suggest archiving: "Collection full. Use /archive <n> to make room."
- **Archive is NOT deletion**: archived creatures preserve species progress data. They count toward the species index.
- **Strategic archiving**: players keep their best breeders and archive weaker creatures. The decision of WHAT to archive adds strategy.

## Scan Layout

Spawn batches produce 3-5 creatures. Terminal width may not fit 5 side-by-side.

- **3 creatures**: show side-by-side (3 columns)
- **4-5 creatures**: show in 2 rows (3 top + 1-2 bottom) or a compact list format

For narrow terminals (<100 chars), fall back to vertical stacked cards (one per creature).

The renderer already handles width detection — adapt the scan display to available width.

## Cleanup — Old Design Artifacts

The following files from the over-engineered spec iteration should be removed:

- `docs/design-analysis/breeding-rules.md` — replaced by this spec
- `docs/design-analysis/breeding-recipes-eyes.csv` — no longer applicable
- `docs/design-analysis/breeding-recipes-mouth.csv` — no longer applicable
- `docs/design-analysis/breeding-recipes-body.csv` — no longer applicable
- `docs/design-analysis/breeding-recipes-tail.csv` — no longer applicable
- `docs/design-analysis/trait-relationships.md` — no longer applicable
- `docs/design-analysis/trait-pool.csv` — no longer applicable
- `docs/design-analysis/breeding-table.md` — no longer applicable
- `scripts/generate-breeding-tables.js` — no longer applicable

These will be deleted as part of the implementation.

## State Migration (v5 → v6)

### New Fields

```typescript
// On GameState
speciesProgress: Record<string, boolean[]>  // speciesId → 8 booleans, one per rarity tier
personalSpecies: SpeciesDefinition[]        // AI-generated hybrid species
sessionBreedCount: number                   // reset each session, max 3
breedCooldowns: Record<string, number>      // "idA+idB" → cooldown expiry timestamp

// On CreatureSlot
rarity: number  // 0-7 index into 8-tier rarity table (replaces rank in variantId)
```

### Removed Fields

```typescript
// From GameState
gold: number
activeQuest: ActiveQuest | null
sessionUpgradeCount: number

// From PlayerProfile
totalUpgrades: number
totalQuests: number
```

### Changed Fields

```typescript
// CreatureSlot.variantId — strip _rN suffix if present
// e.g. "eye_c01_r3" → "eye_c01" (rank info moves to slot.rarity)
```

### Migration Logic

For existing creatures:
1. Extract rank from variantId suffix → map to rarity (rank 0 = common, 1 = uncommon, 2 = rare, 3 = superior, 4 = elite, 5 = epic, 6 = legendary, 7 = mythic)
2. Strip `_rN` suffix from variantId
3. Set `slot.rarity` from extracted rank
4. Initialize `speciesProgress` from existing collection (scan all creatures, mark discovered tiers)
5. Set `gold = undefined`, `activeQuest = undefined`
6. Set `sessionBreedCount = 0`, `breedCooldowns = {}`
7. Set `personalSpecies = []`
