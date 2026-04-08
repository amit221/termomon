# Compi Gameplay Overhaul — Design Spec

## Overview

Overhaul Compi from a single-creature rarity grinder into a multi-species creature collection game. Players catch, merge, and curate a collection of 15 distinct creatures, each defined by species and traits. Strategic depth comes from merge inheritance mechanics, trait rarity, and collection building.

---

## Core Changes from Current System

| Aspect | Current | New |
|--------|---------|-----|
| Creatures | 1 creature, 1 species (Compi) | 15 active slots, 10+ species |
| Traits | Cosmetic, grouped by rarity tier | Gameplay-relevant, individual spawn rates |
| Rarity tiers | Common/Uncommon/Rare/Epic/Legendary/Mythic | Removed. Rarity = trait spawn % |
| Colors | None (trait art is the visual) | Unchanged — trait art IS the visual identity |
| Merge | Sacrifice food into target, always succeeds, upgrades 1 slot's rarity | Both parents consumed, 1 child born, trait inheritance per slot with odds |
| Goal | Max rarity on 1 creature | Build a diverse, rare-looking collection |
| Archive | None | Trophy case for finished creatures |

---

## Creature Species

### Structure

Each species is a distinct creature with:
- **Unique name** (e.g., Compi, Drakon, Felith, Orbix)
- **Unique ASCII art template** — a multi-line body shape that is visually distinct from all other species
- **Own trait pool** — ~19 traits per slot (eyes, mouth, body, tail), specific to that species
- **Species spawn rate** — how often this species appears in wild batches (some species are rarer)

### Species Count

- **Launch target**: 10+ distinct species
- Includes the existing Compi species with its current trait pool
- Each new species needs: ASCII art template, 19 traits per slot (with art), flavor text, spawn rate

### Species Spawn Rates

Each species has a spawn weight. When a batch spawns, each creature in the batch independently rolls which species it is.

Example distribution (10 species):

| Species | Spawn Weight | ~Probability |
|---------|-------------|-------------|
| Compi | 10 | ~10% |
| Felith | 10 | ~10% |
| Gloon | 10 | ~10% |
| Thornyx | 10 | ~10% |
| Craggor | 10 | ~10% |
| Orbix | 10 | ~10% |
| Zephyx | 10 | ~10% |
| Drakon | 10 | ~10% |
| Spectra | 10 | ~10% |
| Luminos | 10 | ~10% |

These weights are tunable in config. New species can be added without engine changes.

---

## Trait System

### No Rarity Tiers

The 6-tier rarity system (Common through Mythic) is **removed**. Instead, each trait has an individual spawn rate percentage.

### Trait Spawn Rates

Each species has ~19 traits per slot. Each trait has its own spawn %. When a creature spawns, each of its 4 slots independently rolls from that species' trait pool.

Example — Compi's eyes trait pool:

| Trait | Art | Spawn % |
|-------|-----|---------|
| Pebble Gaze | `○.○` | 12% |
| Dash Sight | `-.–` | 11% |
| Pip Vision | `·.·` | 10% |
| Round Look | `O.O` | 9% |
| Bead Eyes | `°.°` | 8% |
| Half Moon | `◐.◐` | 7% |
| Crescent | `◑_◑` | 6.5% |
| Owl Sight | `○w○` | 6% |
| Slit Gaze | `>.>` | 5.5% |
| Ring Gaze | `◎.◎` | 5% |
| Dot Sight | `●_●` | 4.5% |
| Core Eyes | `◉w◉` | 4% |
| Gem Gaze | `◆.◆` | 3% |
| Star Dust | `❖_❖` | 2.5% |
| Spark Eyes | `✦w✦` | 2% |
| Star Sight | `★w★` | 1.5% |
| Moon Eyes | `☆_☆` | 1% |
| Void Gaze | `⊙_⊙` | 0.7% |
| Prism Eyes | `◈_◈` | 0.3% |

Spawn rates sum to ~100% per slot. The distribution is a gentle curve — common traits appear ~12% of the time, the rarest around ~0.3%. The gap is meaningful but not extreme.

### Trait Spawn Rates Per Slot

All 4 slots (eyes, mouth, body, tail) follow the same pattern independently. Each species defines its own trait pool and spawn rates per slot.

### Creature Rarity

A creature has no rarity label. Its effective rarity is the **product of its trait spawn rates**. A creature with four 0.3% traits is astronomically rarer than one with four 12% traits.

---

## Color System

Colors work the same as the current system — each trait already has its own color/visual style based on its ASCII art. No new color layer is added. The visual richness comes from the trait variety itself, not a separate color axis.

---

## Merge System

### Core Mechanic: Breeding

Merging two creatures of the **same species** produces one child. Both parents are consumed.

### Rules

1. Both parents must be the **same species**
2. Both parents are **consumed** (removed from collection)
3. One child is born (same species)
4. Child's **traits**: each slot independently inherits from one parent
### Trait Inheritance

For each of the 4 slots, the game rolls which parent's trait the child gets. The inheritance is **not 50/50** — rarer traits have a slightly higher chance of being inherited, reflecting their "stronger" genetic presence.

**Inheritance chance formula:**

```
trait_pass_chance = 0.50 + (0.12 - spawn_rate) * 0.8
clamped to [0.45, 0.58]
```

| Trait Spawn Rate | Inheritance Chance |
|------------------|--------------------|
| 12% (very common) | 45% (floor) |
| 8% (common) | 48% |
| 5% (mid) | 51% |
| 3% (uncommon) | 52% |
| 1% (rare) | 54% |
| 0.3% (ultra-rare) | 58% (ceiling) |

**Per-slot resolution:**

For each slot:
1. Calculate inheritance chance for Parent A's trait: `chance_A`
2. Calculate inheritance chance for Parent B's trait: `chance_B`
3. Normalize: `prob_A = chance_A / (chance_A + chance_B)`
4. Roll: child gets Parent A's trait with probability `prob_A`, else Parent B's trait

**Example:**

```
Parent A eyes: Void Gaze (0.7% spawn → 56% inheritance)
Parent B eyes: Pebble Gaze (12% spawn → 45% inheritance)

prob_A = 56 / (56 + 45) = 55%
prob_B = 45 / (56 + 45) = 45%

Child has 55% chance of Void Gaze, 45% chance of Pebble Gaze
```

The rare trait has a slight edge — but it's close to a coin flip. You're favored but not guaranteed.

If both parents have Void Gaze:

```
Both parents have the same trait → child gets Void Gaze = 100%
```

**Key insight**: merging two creatures with the same rare trait guarantees the child has it. This creates the strategy of "catching duplicates" — you need multiple creatures with the same rare trait to lock it in. The slight inheritance edge on rarer traits means they're a bit "stickier" when competing against common traits, but not by much.

### Merge Cost

Each merge costs energy. Cost scales with the rarity of traits involved:

```
merge_cost = base_cost + bonus_per_rare_trait
```

Base cost: 3 energy. +1 energy for each trait across both parents with spawn rate < 5%. Capped at 8 energy.

---

## Collection System

### Active Collection

- **Maximum 15 creatures**
- These are your "working" creatures — available for merging, displayed in `/collection`
- When at cap, you must merge or archive before catching new creatures

### Archive

- **No limit**
- Archived creatures are permanently locked — cannot be used in merges
- Visible in `/archive` view
- Represents your "trophy case" of finished creatures
- Archiving is one-way (cannot un-archive)

### Catching When Full

If active collection is at 15, catching a new creature prompts:
- Choose a creature to archive, merge, or release (delete) to make room
- Or skip the catch

---

## Spawn System

### Batch Spawning (unchanged mechanics)

- Spawn check every 10 ticks
- 60% probability per check
- Batch size: 3-5 creatures
- Batch lingers 30 minutes
- 3 shared catch attempts per batch

### Species + Trait Generation

When a creature spawns:
1. Roll species (weighted by species spawn rates)
2. For each of 4 slots: roll trait from that species' pool (weighted by trait spawn rates)

All rolls are independent.

### Catch Difficulty

Catch difficulty scales with how rare the creature's rarest trait is:

```
rarest_trait = min(spawn_rate) across all 4 slots
catch_rate = 0.90 - (0.50 * (1 - rarest_trait / 0.18))
clamped to [0.15, 0.90]
```

| Rarest Trait Spawn % | Catch Rate |
|---------------------|------------|
| 18% (very common) | 90% |
| 10% | 68% |
| 5% | 52% |
| 1% | 37% |
| 0.1% | 15% (floor) |

Rarer creatures are harder to catch but never impossible. Species rarity affects encounter rate (spawn weight), not catch rate.

---

## New Slash Commands

### Modified Commands

- `/scan` — shows nearby creatures with species and traits. Trait spawn rates visible so players can evaluate rarity
- `/catch [number]` — catches a creature from nearby batch (unchanged mechanic, adjusted difficulty)
- `/collection` — shows active collection (up to 15), with species and traits per creature
- `/merge [id1] [id2]` — merge two same-species creatures, shows preview of inheritance odds before confirming
- `/merge confirm` — executes the merge
- `/status` — player profile with stats

### New Commands

- `/archive [id]` — move a creature from active collection to archive (permanent, cannot undo)
- `/archive` (no args) — view archived creatures
- `/inspect [id]` — detailed view of one creature: species, all trait spawn rates, merge history
- `/release [id]` — permanently delete a creature from active collection (frees a slot)

---

## Data Model Changes

### New: Species Definition

```typescript
interface Species {
  id: string;               // e.g., "compi", "drakon"
  name: string;             // display name
  description: string;      // flavor text
  spawnWeight: number;      // relative spawn rate
  art: string[];            // multi-line ASCII template
  traitPools: {
    eyes: TraitDefinition[];
    mouth: TraitDefinition[];
    body: TraitDefinition[];
    tail: TraitDefinition[];
  };
}

interface TraitDefinition {
  id: string;
  name: string;
  art: string;
  spawnRate: number;        // 0.001 to 0.30 (individual %)
}
```

### Modified: CollectionCreature

```typescript
interface CollectionCreature {
  id: string;
  speciesId: string;        // NEW: which species
  name: string;
  slots: CreatureSlot[];
  caughtAt: number;
  generation: number;       // 0 = wild caught, increments on merge
  mergedFrom?: [string, string]; // parent IDs
  archived: boolean;        // NEW: archive flag
}
```

### Modified: CreatureSlot

```typescript
interface CreatureSlot {
  slotId: SlotId;
  variantId: string;
  // rarity field REMOVED — no more rarity tiers
}
```

### Config Structure

```
config/
  species/
    compi.json       // Compi species definition + trait pools
    drakon.json      // Drakon species definition + trait pools
    felith.json      // etc.
    ...
  balance.json       // Merge costs, catch rates, batch settings
```

---

## Migration from Current System

### What Happens to Existing Players

- Current creature becomes a Compi species creature
- Current trait assignments map to the new Compi trait pool (same trait IDs)
- Current rarity field is dropped — the trait's spawn rate replaces it
- Collection starts with 1 creature (the existing one), 14 empty slots

---

## Creature Species to Design

### Existing
1. **Compi** — axolotl, the original. Common spawn. Uses existing 19-trait-per-slot pool.

### New (need full design: ASCII art + 19 traits per slot + spawn rates)
2. **Drakon** — dragon-like. Rare spawn (~5%)
3. **Felith** — cat-like. Common spawn (~18%)
4. **Orbix** — floating geometric orb. Uncommon (~8%)
5. **Thornyx** — plant/thorn creature. Uncommon (~12%)
6. **Gloon** — blob/slime. Common (~15%)
7. **Spectra** — ghost/wisp. Rare (~3%)
8. **Craggor** — rock golem. Uncommon (~10%)
9. **Zephyx** — bird/wind spirit. Rare (~7%)
10. **Luminos** — crystal/light being. Very rare (~2%)

Each species needs:
- 5-8 line ASCII art template
- 19 traits × 4 slots = 76 trait definitions with ASCII art fragments and spawn rates
- Flavor text

Total new content: 9 species × 76 traits = 684 new trait definitions.

**Important**: Each species should be designed and reviewed individually in its own implementation step. The ASCII art and traits need to be visually verified to look good — this is creative work that can't be batch-generated and needs human review per species.

---

## Balance Targets

| Metric | Target |
|--------|--------|
| Catches per day (active coding) | ~42 (unchanged) |
| Time to "perfect" one creature (all rare traits) | 3-6 weeks |
| Time to fill collection (15 diverse creatures) | 1-2 weeks |
| Time to fill collection with all rare traits | Months (aspirational) |
| Merges per day | 2-5 |
| Archive-worthy creatures per week | 1-2 |

---

## Open Questions

1. **Can you rename creatures?** Adds personal attachment.
2. **Should there be a "favorites" display?** Show off your best 3-5 in your status.
3. **Trait discovery log?** Track which traits you've seen across all species.
4. **Species discovery?** First time catching a new species = special event.
5. **Seasonal/event species?** Time-limited species that only spawn during certain periods.
6. **Cross-species merge in future versions?** Explicitly out of scope for v1 but could be v2.
7. **Exact catch difficulty formula** needs playtesting to tune.
8. **Merge preview UX** — how much information to show before confirming merge.
