# Trait Relationships & Breeding Paths

Each trait has an AFFINITY GROUP — traits in the same group breed well together (better upgrade odds, exclusive outputs). Traits from opposing groups produce corrupt results.

## Affinity Groups

Traits are split into 3 affinity groups per slot. Think of them as "bloodlines" — each leads to a different mythic endgame trait.

### Eyes — 3 Bloodlines

```
KEEN bloodline (observation/precision):
  Pebble(C) → Half Moon(U) → Ring(R) → Gem(E) → Star Sight(L) → Void Gaze(M)

WILD bloodline (nature/instinct):
  Pip Vision(C) → Owl Sight(U) → Core Eyes(R) → Spark Eyes(E) → Moon Eyes(L) → Prism Eyes(M)

NEUTRAL (no bloodline, bridges):
  Dash Sight(C), Bead Eyes(C), Crescent(U), Slit Gaze(U), Dot Sight(R), Star Dust(E)
```

**Keen × Keen**: clean upgrades along Keen path
**Wild × Wild**: clean upgrades along Wild path
**Keen × Wild**: CROSS-BREED — produces Neutral traits OR exclusive cross-outputs
**Neutral × any**: flexible, can go either direction, moderate upgrade odds

### Mouth — 3 Bloodlines

```
CALM bloodline (steady/structured):
  Flat Line(C) → Circle(U) → Omega(R) → Prism(E) → Diamond(L) → Core(M)

FLOW bloodline (fluid/chaotic):
  Wave(C) → Ripple(U) → Swirl(R) → Void(E) → Spark(L) → Nova(M)

NEUTRAL:
  Smile(C), Dot(C), Underline(C), Curve(U), Whisker(U), Triangle(R), Gem(E)
```

### Body — 3 Bloodlines

```
SOLID bloodline (dense/structured):
  Dots(C) → Shade(U) → Crystal(R) → Shell(E) → Hex(L) → Prism(M)

FLUID bloodline (flowing/ethereal):
  Light(C) → Grain(U) → Pulse(R) → Core(E) → Star(L) → Void(M)

NEUTRAL:
  Plain(C), Thin(C), Faint(C), Mesh(U), Cross(U), Wave(R), Facet(E)
```

### Tail — 3 Bloodlines

```
SWIFT bloodline (speed/energy):
  Curl(C) → Zigzag(U) → Bolt(R) → Lightning(E) → Comet(L) → Supernova(M)

STEADY bloodline (calm/enduring):
  Stub(C) → Drift(U) → Ripple(R) → Infinity(E) → Glitter(L) → Eternal(M)

NEUTRAL:
  Swish(C), Droop(C), Flick(C), Whirl(U), Wag(U), Fork(R), Shimmer(E)
```

## Exclusive Outputs (Can ONLY come from specific combos)

These traits cannot be obtained through normal upgrade paths. They require cross-bloodline breeding.

### Eyes Exclusives
| Recipe | Exclusive Output | Chance | Why it's special |
|--------|-----------------|--------|------------------|
| Ring(R,Keen) × Core(R,Wild) | **Eclipse Eyes** ◐●◐ | 8% | Only from Keen×Wild rare cross |
| Gem(E,Keen) × Spark(E,Wild) | **Fractal Eyes** ✧◈✧ | 10% | Epic cross — bridge to both mythics |
| Star Sight(L,Keen) × Moon Eyes(L,Wild) | **Cosmos Eyes** ☆◈☆ | 12% | Legendary cross — near-mythic power |

### Mouth Exclusives
| Recipe | Exclusive Output | Chance |
|--------|-----------------|--------|
| Omega(R,Calm) × Swirl(R,Flow) | **Vortex** ⊘ | 8% |
| Prism(E,Calm) × Void(E,Flow) | **Singularity** ⊕ | 10% |
| Diamond(L,Calm) × Spark(L,Flow) | **Resonance** ✧ | 12% |

### Body Exclusives
| Recipe | Exclusive Output | Chance |
|--------|-----------------|--------|
| Crystal(R,Solid) × Pulse(R,Fluid) | **Flux** ▓∿ | 8% |
| Shell(E,Solid) × Core(E,Fluid) | **Lattice** ◆⊙ | 10% |
| Hex(L,Solid) × Star(L,Fluid) | **Nebula** ⬡✦ | 12% |

### Tail Exclusives
| Recipe | Exclusive Output | Chance |
|--------|-----------------|--------|
| Bolt(R,Swift) × Ripple(R,Steady) | **Spiral** ↯≋ | 8% |
| Lightning(E,Swift) × Infinity(E,Steady) | **Phoenix** ⚡∞ | 10% |
| Comet(L,Swift) × Glitter(L,Steady) | **Aurora** ☄✧ | 12% |

## Corrupt Mechanic

When breeding cross-bloodline traits at uncommon+ tier, there's a chance of CORRUPT (💀):
- Same bloodline: 0% corrupt
- Cross bloodline (same tier): 5% corrupt  
- Cross bloodline (different tier): 8% corrupt
- Neutral × bloodline: 2% corrupt

A corrupt slot shows 💀, has NO trait, and passes 50% chance of corrupt to offspring. Corrupt slots can be "healed" by breeding with a strong same-bloodline partner (the bloodline trait replaces corrupt at 40% chance).

## Color/Rarity Calculation (Revised)

Instead of "highest trait," use a WEIGHTED score:

```
rarityScore = sum of all 4 trait rarity indices / 4
  0.0 - 0.4 → grey (common)
  0.5 - 1.4 → white (uncommon)
  1.5 - 2.4 → cyan (rare)
  2.5 - 3.4 → magenta (epic)
  3.5 - 4.4 → yellow (legendary)
  4.5 - 5.0 → red (mythic)
```

This means:
- 4 commons (avg 0) = grey
- 3 commons + 1 rare (avg 0.5) = white
- 2 commons + 2 rares (avg 1.0) = white
- 4 rares (avg 2.0) = cyan
- 2 epics + 2 rares (avg 2.5) = magenta
- 4 legendaries (avg 4.0) = yellow
- 4 mythics (avg 5.0) = red

Now color communicates OVERALL quality, not just the best trait.

## Breeding Chains (Complete Examples)

### Fastest Path to Void Gaze (Keen Mythic Eyes) — 5 Generations

```
Gen 0: Catch Pebble(C,Keen) + Catch Dash(C,Neutral)
Gen 1: Breed Pebble × Pebble → Half Moon(U,Keen) [18% chance]
Gen 2: Breed Half Moon × Half Moon → Ring(R,Keen) [15% chance]  
Gen 3: Breed Ring × Ring → Gem(E,Keen) [12% chance]
Gen 4: Breed Gem × Gem → Star Sight(L,Keen) [8% chance]
Gen 5: Breed Star Sight × Star Sight → Void Gaze(M,Keen) [5% chance]
```

Expected attempts per step (accounting for probability):
- Gen 1: ~6 breeds (18% = 1/5.5)
- Gen 2: ~7 breeds (15% = 1/6.7)
- Gen 3: ~8 breeds (12% = 1/8.3)
- Gen 4: ~13 breeds (8% = 1/12.5)
- Gen 5: ~20 breeds (5% = 1/20)

Total: ~54 breeds across 5 generations. At 1-3 breeds per session, that's 18-54 sessions. Deep endgame.

### Shortcut via Cross-Bloodline

```
Gen 0: Catch Pebble(C,Keen) + Catch Pip Vision(C,Wild)
Gen 1: Breed Pebble × Pebble → Half Moon(U,Keen) [18%]
Gen 2: Breed Pip × Pip → Owl Sight(U,Wild) [18%]
Gen 3: Breed Half Moon × Owl → ??? 
  → Ring(Keen) 12% OR Core(Wild) 12% OR Crescent(Neutral) 8%
Gen 4: Get both Ring AND Core (takes multiple attempts)
Gen 5: Breed Ring × Core → Eclipse Eyes(EXCLUSIVE) [8%] 
  OR Gem(Keen) 10% OR Spark(Wild) 10%
```

The cross-bloodline path is RISKIER (more possible outcomes, corrupt chance) but can produce EXCLUSIVE traits that pure-bloodline can't.

### New Species Creation Path

```
Gen 5+: Breed Void Gaze(M) × Prism Eyes(M) → NEW SPECIES [16%]
  OR: Breed Cosmos Eyes(L,Exclusive) × any Mythic → NEW SPECIES [20%]
```

Exclusive traits have HIGHER new species chances because they represent genetic diversity.
