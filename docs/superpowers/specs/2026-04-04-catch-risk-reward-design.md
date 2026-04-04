# Catch Risk/Reward Redesign

## Problem

The current catch system has no meaningful tradeoffs. Players always target the rarest creature, and failure has negligible cost (1 basic item). There is no strategy, risk/reward, or anticipation.

## Solution Overview

Replace the current species-based collection system with a **single-creature, trait-based system** inspired by CryptoKitties. Every creature is the same species (axolotl) but with randomized traits that determine its value. Add a **merge system** where players sacrifice two creatures for a chance at a better one — with the risk of losing both.

## Core Concepts

### Single Creature Type

All creatures are the same base species (axolotl, using cat placeholder art until final art is designed). Value comes entirely from **traits**, not species.

### Trait System

Every creature has **4 trait slots**. Each trait has a **rarity tier** and a **merge modifier**.

**Trait Slots:**
- Eyes (visual: changes eye characters in art)
- Mouth (visual: changes mouth character in art)
- Tail (visual: changes tail character in art)
- Ears/Gills (visual: changes top of art)

**Rarity Tiers & Spawn Weights:**
- Common (60% spawn chance)
- Uncommon (25%)
- Rare (10%)
- Legendary (5%)

Each slot has 4+ trait variants across rarity tiers. The exact trait values (which characters map to which rarity) are a content/art decision to be finalized separately.

**Merge Modifiers — each trait is one of:**
- **Stable**: +5% to +15% merge success chance. Safe, predictable ingredients. Mostly common/uncommon traits.
- **Volatile**: -10% to -20% merge success chance, but increases mutation chance during merge. Risky but can produce rare outputs. Mostly rare/legendary traits.
- **Catalyst**: +15% to +25% merge success when paired with a specific other trait. Rewards knowledge of synergies.

### Composable Art

The creature art template has swappable regions for each trait slot. Traits change the visual characters in their region. Example using cat placeholder:

```
 /\_/\       /\_/\       /\_/\
( o.o )     ( ◉.◉ )     ( ★.★ )
 ( w )       ( △ )       ( ⚡)
  ~~~         ~~~         ~✦~
```

Art design (final axolotl art with composable regions) is a separate task from the mechanics implementation.

## Catching

### Energy Resource

- **Single resource: Energy**
- Earn 1 Energy passively every 30 minutes
- Catching costs Energy based on the creature's trait rarity
- Cost formula: sum of trait rarity values (Common=0, Uncommon=1, Rare=2, Legendary=3) across all 4 slots, then add 1. Range: 1 energy (all common, 0+1) to 13 energy (all legendary, 12+1). Examples: all-common=1E, two uncommon+two common=3E, one rare+three common=3E, all-rare=9E

Replaces the current multi-item system (ByteTrap, NetSnare, CoreLock).

### Batch Spawning

- Creatures spawn in **batches** of 2-4 (weighted: 2=40%, 3=40%, 4=20%)
- Each creature in a batch gets random traits rolled independently
- Batch frequency: approximately every 10 ticks (same as current spawn check interval)
- Batch timeout: 30 minutes (same as current creature linger)

### Shared Attempts

- Each batch has **3 shared attempts** — total across ALL creatures in the batch
- Each catch attempt uses 1 attempt from the pool
- You can retry the same creature (costs another shared attempt)
- When attempts run out or batch times out, all uncaught creatures flee

### Escalating Failure Penalty

- Each **failed** catch attempt in a batch increases the fail chance for subsequent attempts
- Penalty per failure: +10% added to fail chance (i.e., -10% to catch rate)
- Penalty resets when a new batch spawns
- This means: failing on a rare creature first makes catching the easy ones harder too

### Catch Rate

- Base catch rate is the same for all creatures (they're the same species)
- Effective rate is modified by trait rarity: rarer trait combos are harder to catch
- Base rate (all common): ~80%
- Each uncommon trait: -5%
- Each rare trait: -10%
- Each legendary trait: -15%
- Further reduced by escalating failure penalty from missed attempts

### Example Scenario

```
Batch spawns: 3 creatures. You have 5 Energy, 3 Attempts.

#1: Dot[C] + ω[C] + ^[C] + /\_/\[C]   → Cost: 1E, Rate: 80%
#2: ◉[U] + △[U] + ~[U] + ⌐\_/¬[U]    → Cost: 2E, Rate: 60%
#3: ★[R] + ⚡[R] + ✦[L] + ☾\_/☽[L]   → Cost: 4E, Rate: 30%

Strategy A (safe merge fuel):
  Attempt 1: Catch #1 (1E, 80%) → success → 4E left, 2 attempts
  Attempt 2: Catch #2 (2E, 60%) → success → 2E left, 1 attempt
  Attempt 3: Can't afford #3 (4E). Done. Got 2 merge ingredients.

Strategy B (go big):
  Attempt 1: Try #3 (4E, 30%) → miss → 1E left, 2 attempts, +10% penalty
  Attempt 2: Try #1 (1E, 80%-10%=70%) → success → 0E, 1 attempt
  Attempt 3: 0 Energy, can't catch. Got 1 common creature.

Strategy C (balanced):
  Attempt 1: Catch #1 (1E, 80%) → success → 4E left, 2 attempts
  Attempt 2: Try #3 (4E, 30%) → miss → 0E, 1 attempt, +10% penalty
  Attempt 3: 0 Energy. Got 1 common creature.
```

## Merging

### Core Loop

- Player selects 2 creatures from their collection to merge
- **Both creatures are consumed** (removed from collection)
- Merge has a **chance to fail** — if it fails, both creatures are lost with no output
- If it succeeds, produces 1 new creature with traits derived from the parents

### Merge Success Rate

- Base merge success rate: 50%
- Modified by the sum of all merge modifiers from both parents' traits
- All-stable parents: ~50% + 30% + 30% = effectively capped (cap at 90%)
- All-volatile parents: ~50% - 70% - 70% = very low (floor at 5%)
- Mixed: somewhere in between
- Cap: 90% max, 5% min

### Trait Inheritance (Weighted Probability)

On a successful merge, each trait slot is resolved independently:

1. **Parent weight**: The rarer parent trait for that slot gets higher probability (55% rare vs 30% common for that slot)
2. **Mutation chance**: Small probability of the output trait being a different rarity than either parent
3. **Result**: A weighted random roll determines the output trait for each slot

**Mutation rates:**
- Base mutation chance: 8% per slot per merge
- Mutation up (trait becomes one rarity tier higher): 6%
- Mutation down (trait becomes one rarity tier lower): 2%
- Volatile traits increase mutation chance: +5% to +10% additional
- Stable traits decrease mutation chance: -3% to -5%

**Example — merging two creatures for the Eyes slot:**

```
Parent A: Common eyes + Parent B: Common eyes
  Common eyes:    90%
  Uncommon eyes:   8% (mutation up)
  Rare eyes:       2% (double mutation)

Parent A: Rare eyes + Parent B: Common eyes
  Rare eyes:      55% (rarer parent dominates)
  Common eyes:    30%
  Legendary eyes:  12% (mutation up, boosted by rare input)
  Uncommon eyes:   3% (mutation down)
```

This means:
- Two commons can still produce a rare (low chance — the "lottery ticket")
- Rarer inputs bias toward rarer outputs but don't guarantee them
- Every merge is a surprise — you can learn tendencies but never memorize outcomes

### Volatile vs Stable Tradeoff in Merging

This creates a meta-game around creature value:

- **All-stable creature**: High merge success rate (+30%), low mutation. Great "safe" ingredient. Boring traits but reliable.
- **All-volatile creature**: Very low merge success rate (-70%), high mutation. Terrible merge ingredient but if it somehow succeeds, wild results. Better as a trophy/collector piece.
- **Mixed creatures**: The interesting middle ground — some stable traits for safety, some volatile for potential.

## What This Replaces

| Current System | New System |
|---|---|
| 16 named creature species | 1 creature type with trait combos |
| Fragment-based evolution | Merge system (sacrifice 2 for 1) |
| 3 capture item types | Single Energy resource |
| 3 attempts per creature | 3 shared attempts per batch |
| No fail penalty | Escalating fail chance per batch |
| Species rarity determines value | Trait combo determines value |
| Deterministic evolution (collect N fragments) | Probabilistic merging with mutation |

## What Stays the Same

- Tick-based passive gameplay (activity → ticks → spawns)
- Slash command interface (/scan, /catch, /collection, /status)
- Session/streak tracking
- Notification system
- Renderer architecture (SimpleTextRenderer, future renderers)

## New Slash Commands

- `/merge <id1> <id2>` — Merge two creatures from collection. Shows probability preview, requires confirmation.
- Existing commands adapted:
  - `/scan` — Shows batch with traits, energy cost, shared attempts remaining
  - `/catch <index>` — Costs energy, uses shared attempt
  - `/collection` — Shows each creature with its traits and merge modifier summary
  - `/inventory` — Shows Energy count instead of multiple items
  - `/status` — Shows energy, merge count, rarest trait found, etc.

## State Changes

### New GameState Fields

- `energy: number` — Current energy count
- `lastEnergyGainAt: number` — Timestamp for passive energy drip
- `batchAttempts: number` — Shared attempts remaining for current batch
- `batchFailPenalty: number` — Accumulated fail penalty for current batch

### Modified: NearbyCreature

Add `traits` field — array of 4 trait objects, each with:
- `slotId: string` (eyes, mouth, tail, ears)
- `traitId: string` (specific trait variant)
- `rarity: Rarity`
- `mergeModifier: { type: "stable" | "volatile" | "catalyst", value: number }`

### Modified: CollectionEntry

Replace fragment-based tracking with individual creature instances:
- Each caught creature is a unique entry with its own trait combo
- `traits` field (same structure as NearbyCreature)
- Remove `fragments`, `evolved` fields
- Add `mergedFrom?: [creatureId, creatureId]` — lineage tracking
- Add `generation: number` — 0 for wild-caught, increments on merge

### Removed

- Multiple item types (ByteTrap, NetSnare, CoreLock, Shard, Prism)
- Evolution system (fragments + catalyst)
- Species-based creature definitions
- Per-creature attempt tracking (replaced by shared batch attempts)

## Config Changes

### New: traits.json (or section in balance.json)

Defines all trait variants per slot:
```json
{
  "slots": {
    "eyes": {
      "variants": [
        { "id": "dot", "rarity": "common", "art": "o.o", "mergeModifier": { "type": "stable", "value": 0.10 } },
        { "id": "wide", "rarity": "uncommon", "art": "◉.◉", "mergeModifier": { "type": "catalyst", "value": 0.15 } },
        { "id": "star", "rarity": "rare", "art": "★.★", "mergeModifier": { "type": "volatile", "value": -0.15 } },
        { "id": "void", "rarity": "legendary", "art": "⊙.⊙", "mergeModifier": { "type": "volatile", "value": -0.20 } }
      ]
    }
  }
}
```

### Modified: balance constants

- Remove: catch item multipliers, fragment costs, evolution catalyst requirements, passive drip item weights
- Add: energy gain interval, energy costs per rarity, batch size weights, shared attempt count, escalating fail penalty, base merge rate, mutation rates, merge modifier cap/floor

## Scope & Phasing

This is a large redesign. Suggested phasing:

### Phase 1: Core Mechanics
- Trait system (types, slots, rarity, config)
- Energy resource (replaces items)
- Batch spawning with shared attempts
- Escalating fail penalty
- Modified /scan and /catch

### Phase 2: Merging
- Merge engine (success rate, trait inheritance, mutation)
- /merge command
- Collection rework (individual instances with traits)
- Modified /collection display

### Phase 3: Art
- Design final axolotl art template
- Composable art regions per trait slot
- Renderer updates

### Phase 4: Polish
- Catalyst trait synergies
- Balance tuning
- Migration from old state format
