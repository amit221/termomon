# Engagement Loop Redesign

**Date:** 2026-04-13  
**Status:** BALANCED — numbers validated via deep Monte Carlo simulation (1000 sessions x 500 runs, 8 iterations) + economy validation against 5 proven game design models (sink/faucet, time-to-payoff, inflation curve, loss aversion, session value)

## Problem

The current game loop (scan -> catch -> wait) is too slow, has too few actions, gives no guidance on what to do next, and has UX friction (re-scanning after catch, etc.). Breeding takes days to reach. The game doesn't hook players into returning.

## Core Loop

```
Catch -> Upgrade -> Merge -> Quest -> Repeat
```

Every action feeds the next. After every action, a menu shows what to do next -- no typing commands from memory.

## Design Decisions

### 1. Catching

- Creatures **always start at low-tier traits** (capped by player level)
- Catching is frequent and easy -- 3 creatures per /scan batch
- After a catch (or batch exhausted), new batch auto-spawns immediately
- **Energy cost: 1 per attempt** (whether catch succeeds or fails)

**Catch rate formula:**
- Based on the traits of the creature (3-4 slots depending on species)
- Each trait contributes a catch chance: **100%** (rank 0) down to **50%** (max rank in pool)
- Final catch rate = average of per-trait chances
- Effective average catch rate: ~94%

Formula per trait:
```
traitCatchChance = 100% - (traitRank / maxRank) * 50%
```

Final rate:
```
catchRate = average(traitCatchChance for each slot)
```

**Trait rank caps by player level** (max rank that can appear on spawned creatures):

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|-------|---|---|---|---|---|---|---|---|---|----|----|----|----|-----|
| Cap   | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6  | 6  | 7  | 7  | 8   |

Trait spawns use a triangular distribution skewed toward lower ranks (most catches are rank 0-1).

### 2. Upgrading (Gold -> Trait Improvement)

- Spend gold to upgrade **individual traits**, one tier at a time
- Player **chooses** which trait to improve
- Upgrade has a **ceiling at rank 7** -- beyond that, must **merge** to improve
- Max 2 upgrades per session (to spread activity across sessions)
- Cost increases per tier:

| From -> To | Cost |
|-----------|------|
| Rank 0->1 | 3g   |
| Rank 1->2 | 5g   |
| Rank 2->3 | 9g   |
| Rank 3->4 | 15g  |
| Rank 4->5 | 24g  |
| Rank 5->6 | 38g  |
| Rank 6->7 | 55g  |

Total cost to max-upgrade one trait from 0 to 7: **149g**

### 3. Merging (Combine Two -> One Better)

- Merge two **same-species** creatures
- Both parents consumed, one child created
- Child takes the **best trait from either parent** per slot
- Then: **one random trait upgrades** one tier (+1)
- **30% chance** one other random trait **downgrades** one tier (-1)
- Before merging, player sees a **preview with % chances** per slot
- This is the only way to push past rank 7 into rare/epic/legendary territory
- **Cost: 10 + floor(childAvgRank * 5) gold + 1 energy** (scales with creature quality: 15g early, 60g endgame)

### 4. Quests (Gold Farming)

- Send up to **3 creatures** on a timed quest
- Gold reward = max(10g, floor(totalTeamPower * 0.6))
- Creatures are **locked for 2 sessions** while on quest
- Creates tension: send strong team for more gold vs keep them available for merging
- Quest is the primary gold income source

### 5. Leveling / Progression

- XP from all actions:
  - Catch: **10 XP**
  - Upgrade: **8 XP**
  - Merge: **25 XP**
  - Quest: **15 XP**

- Level thresholds (XP needed per level):

| Level Up | 1->2 | 2->3 | 3->4 | 4->5 | 5->6 | 6->7 | 7->8 | 8->9 | 9->10 | 10->11 | 11->12 | 12->13 | 13->14 |
|----------|------|------|------|------|------|------|------|------|-------|--------|--------|--------|--------|
| XP       | 30   | 50   | 80   | 120  | 170  | 240  | 340  | 480  | 680   | 960    | 1350   | 1900   | 2700   |

- Higher level -> catches start with higher trait rank caps (see catching table above)
- New species unlock at level milestones:
  - **Lv.1**: Compi, Flikk
  - **Lv.3**: Glich
  - **Lv.5**: Whiski
  - **Lv.7**: Jinx
  - **Lv.10**: Monu

### 6. Energy System

| Parameter | Value |
|-----------|-------|
| Maximum   | 20    |
| Starting  | 20    |
| Regen per session | 3 |
| Catch cost | 1    |
| Merge cost | 1    |

Energy regenerates +3 per session (a session = one /scan interaction). With 3 catches per batch costing 1 energy each plus 1 energy per merge, a full energy bar sustains extended play. Energy is rarely a binding constraint -- gold and merge pairs are the primary limiters.

### 7. Collection

- **12 slots** maximum
- With 6 species available, this means ~2 creatures per species on average
- Forces strategic merging: you must merge to make room for new catches
- Merging is the core progression mechanic, not hoarding

### 8. Economy

- **Starting gold: 10g**
- Gold income: primarily from quests (10-60g+ per quest depending on team power)
- Gold sinks: upgrades (3-55g per rank) and merges (10-85g scaling with creature quality)
- Merge cost formula: 10 + floor(childAvgRank * 5) -- 15g early, 25g mid, 60g endgame
- Gold stays tight throughout play -- buffer of 0.3-1.3x next affordable action
- Spend rate holds near 100% of income from S100 onward (validated via sink/faucet model)

### 9. Action Menu (UX)

- After **every action**, the game shows numbered options for what to do next
- No need to remember commands -- just type a number
- Options include: catch another, upgrade a trait, merge, send quest, view collection
- Contextual: only shows relevant options (e.g., merge only if you have 2+ same species)

### 10. Status Bar / HUD

- Persistent display showing: Gold, Energy, Collection size, XP, Level, Team Power
- Updates after every action

## Tier System

Trait ranks map to named tiers:

| Tier       | Rank Range | When Achievable |
|------------|-----------|-----------------|
| Common     | 0-4       | Immediately     |
| Uncommon   | 5-8       | Session ~20-50  |
| Rare       | 9-11      | Session ~75-125 |
| Epic       | 12-14     | Session ~137    |
| Legendary  | 15-16     | Session ~225    |
| Mythic     | 17-18     | Session ~300+   |

## Simulation Results (1000 sessions, 500 Monte Carlo runs)

### Key Milestones

| Milestone | Session | Notes |
|-----------|---------|-------|
| First merge | ~1 | Within first interaction |
| All 6 species unlocked | ~30 | Level 10 reached |
| First uncommon trait | ~20 | Via upgrades |
| First rare trait | ~75 | Via merges |
| First epic trait | ~133 | 100% of runs achieve this |
| First legendary trait | ~235 | 100% of runs achieve this |
| First mythic trait | ~377 | 100% of runs achieve this |

### Progression Snapshot

| Session | Level | Gold | Catches | Upgrades | Merges | Quests | Best Tier |
|---------|-------|------|---------|----------|--------|--------|-----------|
| 1       | 2     | 10   | 3       | 0        | 1      | 1      | Common    |
| 10      | 6     | 19   | 21      | 7        | 10     | 10     | Common    |
| 30      | 10    | 35   | 58      | 27       | 47     | 30     | Uncommon  |
| 50      | 11    | 47   | 87      | 60       | 76     | 50     | Uncommon  |
| 100     | 13    | 66   | 160     | 146      | 149    | 100    | Rare      |
| 150     | 15    | 78   | 233     | 237      | 222    | 149    | Epic      |
| 200     | 16    | 84   | 305     | 332      | 295    | 197    | Epic      |
| 300     | 19    | 93   | 450     | 526      | 440    | 287    | Legendary |
| 500     | 25    | 101  | 741     | 919      | 730    | 452    | Mythic    |
| 1000    | 39    | 107  | 1466    | 1903     | 1456   | 817    | Mythic    |

### Activity Distribution

Over 1000 sessions, a typical player performs:
- **1466 catches** (1.5 per session average)
- **1903 upgrades** (1.9 per session average)
- **1456 merges** (1.5 per session average)
- **817 quests** (0.8 per session average)
- **0 stuck sessions** (always something meaningful to do)

## Resolved Questions

- **Upgrade cost curve**: 3/5/9/15/24/38/55 -- validated via deep simulation
- **Quest duration and reward**: 2-session lock, 0.6x power with 10g floor
- **Energy regeneration**: +3 per session (was +1 per 30 min, now session-based)
- **Merge ceiling**: Upgrades cap at rank 7, merge is the only way past
- **Batch timing**: Instant respawn after batch exhausted
- **Collection size**: 12 slots (down from 20) -- forces strategic merging
- **Merge downgrade risk**: 30% (down from 38%) -- validated via loss aversion model (K&T 1979)
- **Merge cost scaling**: 10 + floor(childAvgRank * 5) -- validated via sink/faucet and inflation models

## Out of Scope (for now)

- Codex / trait discovery tracking
- Expeditions with narrative
- Creature AI personalities
- Idle gold income
