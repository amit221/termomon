# Breeding Combination Rules v2

Rules for generating breeding recipes. Incorporates bloodline affinity, exclusive outputs, corrupt mechanic, and exponential scaling.

## Bloodline Assignment

Every trait belongs to one of: `bloodlineA`, `bloodlineB`, or `neutral`.

Per slot, bloodlines form upgrade chains:
- bloodlineA: common → uncommon → rare → epic → legendary → mythic (6 traits)
- bloodlineB: common → uncommon → rare → epic → legendary → mythic (6 traits)
- neutral: remaining traits across tiers (7 traits)

Bloodline assignments are defined in `trait-pool.csv` (bloodline column).

## Exclusive Traits

12 additional traits (3 per slot) obtainable ONLY through cross-bloodline breeding:

| Slot | Recipe | Exclusive Trait | Art | Rarity-equiv |
|------|--------|----------------|-----|-------------|
| eyes | Ring(A) × Core(B) | Eclipse Eyes | ◐●◐ | rare+ |
| eyes | Gem(A) × Spark(B) | Fractal Eyes | ✧◈✧ | epic+ |
| eyes | Star Sight(A) × Moon Eyes(B) | Cosmos Eyes | ☆◈☆ | legendary+ |
| mouth | Omega(A) × Swirl(B) | Vortex | ⊘ | rare+ |
| mouth | Prism(A) × Void(B) | Singularity | ⊕ | epic+ |
| mouth | Diamond(A) × Spark(B) | Resonance | ❋ | legendary+ |
| body | Crystal(A) × Pulse(B) | Flux | ▓∿ | rare+ |
| body | Shell(A) × Core(B) | Lattice | ◆⊙ | epic+ |
| body | Hex(A) × Star(B) | Nebula | ⬡✦ | legendary+ |
| tail | Bolt(A) × Ripple(B) | Spiral | ↯≋ | rare+ |
| tail | Lightning(A) × Infinity(B) | Phoenix | ⚡∞ | epic+ |
| tail | Comet(A) × Glitter(B) | Aurora | ☄✧ | legendary+ |

Exclusive traits count as neutral bloodline (can pair with either A or B).
Exclusive traits have a +5% bonus to NEW species chance when used in breeding.

## Recipe Algorithm v2

```
function generateRecipe(slotTraits, traitA, traitB, exclusives):
  tierA = rarityIndex(traitA)
  tierB = rarityIndex(traitB)
  maxTier = max(tierA, tierB)
  minTier = min(tierA, tierB)
  sameTrait = (traitA.id == traitB.id)
  bloodMatch = getBloodlineMatch(traitA, traitB)
    // 'same', 'neutral', 'cross'

  outcomes = []

  // ── 1. INHERIT ──
  if sameTrait:
    outcomes.push(traitA, INHERIT_SAME[maxTier])
  else:
    tierDiff = abs(tierA - tierB)
    weightA = BASE_INHERIT - tierDiff * TIER_PENALTY
    weightB = BASE_INHERIT + tierDiff * TIER_PENALTY
    // Higher tier gets more weight
    if tierA > tierB: swap(weightA, weightB)
    outcomes.push(traitA, clamp(weightA, 15, 50))
    outcomes.push(traitB, clamp(weightB, 15, 50))

  // ── 2. UPGRADE (along bloodline path) ──
  upgradeChance = UPGRADE_TABLE[maxTier][bloodMatch]
  if upgradeChance > 0:
    upgradeTrait = getNextInBloodline(traitA, slotTraits)
      OR getNextInBloodline(traitB, slotTraits)
      OR randomFromTier(maxTier + 1)
    if upgradeTrait exists:
      outcomes.push(upgradeTrait, upgradeChance)

  // ── 3. EXCLUSIVE (cross-bloodline only) ──
  if bloodMatch == 'cross':
    exclusive = findExclusive(traitA, traitB, exclusives)
    if exclusive exists:
      outcomes.push(exclusive, EXCLUSIVE_TABLE[maxTier])

  // ── 4. SIDEGRADE ──
  sidePool = traitsAtTier(tierA) excluding traitA, traitB
  if sidePool not empty:
    pick = deterministicPick(sidePool, hash(traitA.id, traitB.id))
    outcomes.push(pick, SIDEGRADE_WEIGHT)

  // ── 5. DOWNGRADE ──
  if minTier > 0:
    downPool = traitsAtTier(minTier - 1)
    pick = deterministicPick(downPool, hash(traitA.id, traitB.id))
    outcomes.push(pick, DOWNGRADE_TABLE[minTier])

  // ── 6. CORRUPT ──
  corruptChance = CORRUPT_TABLE[bloodMatch][tierDiff > 0 ? 'mixed' : 'same']
  if corruptChance > 0:
    outcomes.push(CORRUPT, corruptChance)

  // ── 7. NEW SPECIES ──
  newChance = NEW_TABLE[maxTier]
  if any parent is exclusive: newChance += 5
  if newChance > 0:
    outcomes.push(NEW, newChance)

  normalize(outcomes)
  return outcomes
```

## Weight Tables

### INHERIT_SAME (when both parents have identical trait)

| Max Tier | Weight |
|----------|--------|
| 0 (Common) | 78 |
| 1 (Uncommon) | 65 |
| 2 (Rare) | 55 |
| 3 (Epic) | 50 |
| 4 (Legendary) | 45 |
| 5 (Mythic) | 40 |

Higher tiers have lower inherit because more outcomes compete.

### BASE_INHERIT and TIER_PENALTY

- BASE_INHERIT = 35
- TIER_PENALTY = 5 per tier difference

### UPGRADE_TABLE[maxTier][bloodMatch]

| Max Tier | Same Blood | Neutral | Cross Blood |
|----------|-----------|---------|-------------|
| 0 (C→U) | 18 | 10 | 12 |
| 1 (U→R) | 15 | 8 | 10 |
| 2 (R→E) | 12 | 5 | 8 |
| 3 (E→L) | 8 | 3 | 5 |
| 4 (L→M) | 5 | 2 | 3 |
| 5 (M→?) | 0 | 0 | 0 |

### EXCLUSIVE_TABLE[maxTier] (cross-bloodline only)

| Max Tier | Exclusive % |
|----------|-------------|
| 2 (Rare×Rare cross) | 8 |
| 3 (Epic×Epic cross) | 10 |
| 4 (Leg×Leg cross) | 12 |
| Other cross combos | 0 |

Note: exclusives only trigger when BOTH parents are from the specific recipe pair.

### SIDEGRADE_WEIGHT

Fixed: **5**

### DOWNGRADE_TABLE[minTier]

| Min Tier | Weight |
|----------|--------|
| 0 | 0 |
| 1 | 4 |
| 2 | 5 |
| 3 | 6 |
| 4 | 7 |
| 5 | 8 |

### CORRUPT_TABLE[bloodMatch]

| Blood Match | Same Tier | Mixed Tier |
|-------------|-----------|------------|
| same | 0 | 0 |
| neutral | 2 | 2 |
| cross | 5 | 8 |

### NEW_TABLE[maxTier]

| Max Tier | NEW Weight |
|----------|-----------|
| 0 | 0 |
| 1 | 0 |
| 2 | 2 |
| 3 | 4 |
| 4 | 7 |
| 5 | 15 |

+5 if either parent has an exclusive trait.

## Outcome Count by Tier (Expected)

| Breeding Pair | Outcomes | Player Experience |
|---------------|----------|-------------------|
| C×C same blood | 3 | Simple. Learn the system. |
| C×C cross blood | 5 | First taste of complexity. |
| U×U same blood | 4-5 | Clear upgrade path visible. |
| U×U cross blood | 5-6 | Cross-breeding decisions begin. |
| R×R same blood | 5 | Strategic. Planning matters. |
| R×R cross blood | 8-10 | Deep zone. Exclusive prize, corrupt risk. |
| E×E same blood | 5 | High-value, focused. |
| E×E cross blood | 8-10 | Major decision point. Exclusive + NEW possible. |
| L×L cross blood | 8-9 | Peak complexity. Every outcome matters. |
| M×M same blood | 3-4 | Clean endgame. NEW is the prize. |
| M×M cross blood | 6-7 | Ultimate gamble. 20% NEW but 10% corrupt. |

## Deterministic Picks

Upgrade, sidegrade, and downgrade picks are seeded by trait pair hash:

```javascript
function deterministicPick(pool, traitAId, traitBId) {
  const key = [traitAId, traitBId].sort().join('+');
  let hash = 0;
  for (const ch of key) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return pool[Math.abs(hash) % pool.length];
}
```

Same pair always produces same recipe. Players can memorize and plan.
