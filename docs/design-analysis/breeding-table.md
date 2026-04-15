# Breeding Combination Table — Eyes Slot

Reference table for the eyes trait breeding system. Other slots (mouth, body, tail) follow the same pattern structure.

## Core Rules

- **Color = Rarity**: Grey(common), White(uncommon), Cyan(rare), Magenta(epic), Yellow(legendary), Red(mythic)
- **Traits = Cosmetics + Recipe Key**: the specific trait determines what outcomes are possible
- **Table is public**: players can look up any combination
- **Complexity scales with rarity**: common breeds have 2-3 outcomes, rare+ have 5-7
- **Color modifies odds**: higher rarity parents shift odds toward upgrades

## Eyes Trait Pool

| Trait | Symbol | Rarity |
|-------|--------|--------|
| Pebble | `·.·` | Common |
| Dash | `-.–` | Common |
| Moon | `◐.◐` | Uncommon |
| Owl | `○w○` | Uncommon |
| Ring | `◎.◎` | Rare |
| Core | `●_●` | Rare |
| Gem | `◆.◆` | Epic |
| Star | `★w★` | Epic |
| Prism | `◈_◈` | Mythic |

## Breeding Paths (Summary)

```
Pebble ──→ Moon ──→ Ring ──→ Gem ──┐
                                    ├──→ Prism ──→ NEW SPECIES
Dash ────→ Owl ───→ Core ──→ Star ─┘
```

Multiple paths exist. The fastest path to Prism is Gem + Star (30%).

## Combination Table

### Tier 1: Common × Common (2-3 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Pebble | Pebble | Pebble 85%, Moon 10%, Dash 5% |
| Pebble | Dash | Pebble 40%, Dash 40%, Moon 12%, Owl 8% |
| Dash | Dash | Dash 85%, Owl 10%, Pebble 5% |

Simple. Low risk. The uncommon upgrades (Moon, Owl) are the first stepping stone.

### Tier 2: Common × Uncommon (3-4 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Pebble | Moon | Moon 50%, Pebble 30%, Owl 12%, Ring 8% |
| Pebble | Owl | Owl 50%, Pebble 30%, Moon 12%, Core 8% |
| Dash | Moon | Moon 50%, Dash 30%, Ring 12%, Pebble 8% |
| Dash | Owl | Owl 50%, Dash 30%, Core 12%, Moon 8% |

The uncommon parent dominates inheritance. Small rare chance appears.

### Tier 3: Uncommon × Uncommon (4-5 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Moon | Moon | Moon 55%, **Ring 25%**, Owl 10%, Pebble 5%, Core 5% |
| Moon | Owl | Moon 30%, Owl 30%, Ring 15%, Core 15%, Dash 10% |
| Owl | Owl | Owl 55%, **Core 25%**, Moon 10%, Dash 5%, Ring 5% |

**Key breeding pairs:**
- Moon+Moon → best path to **Ring** (25%)
- Owl+Owl → best path to **Core** (25%)
- Moon+Owl → balanced path to either (15% each)

### Tier 4: Uncommon × Rare (5-6 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Moon | Ring | Ring 45%, Moon 25%, **Gem 15%**, Core 10%, Star 5% |
| Moon | Core | Core 40%, Moon 25%, **Star 15%**, Ring 10%, Gem 5% |
| Owl | Ring | Ring 40%, Owl 25%, **Gem 15%**, Star 10%, Core 5% |
| Owl | Core | Core 45%, Owl 25%, **Star 15%**, Ring 10%, Gem 5% |

Epic traits (Gem, Star) start appearing! 15% chance with the right pair.

### Tier 5: Rare × Rare (5-7 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Ring | Ring | Ring 40%, **Gem 30%**, Star 10%, Moon 10%, *Prism 5%*, Core 5% |
| Ring | Core | Ring 25%, Core 25%, **Gem 15%**, **Star 15%**, *Prism 10%*, Moon 5%, Owl 5% |
| Core | Core | Core 40%, **Star 30%**, Gem 10%, Owl 10%, *Prism 5%*, Ring 5% |

**The strategy zone.** 7 possible outcomes for Ring+Core. Prism (mythic!) first appears here.

**Key insight:**
- Ring+Ring → best for **Gem** (30%) but low Prism (5%)
- Core+Core → best for **Star** (30%) but low Prism (5%)
- Ring+Core → balanced, **highest Prism chance (10%)** but most variance

### Tier 6: Rare × Epic (5-6 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Ring | Gem | Gem 40%, Ring 20%, **Prism 15%**, Star 15%, Moon 5%, Core 5% |
| Ring | Star | Star 35%, Ring 20%, Gem 15%, **Prism 15%**, Core 10%, Moon 5% |
| Core | Gem | Gem 35%, Core 20%, Star 15%, **Prism 15%**, Ring 10%, Owl 5% |
| Core | Star | Star 40%, Core 20%, **Prism 20%**, Gem 10%, Ring 5%, Owl 5% |

Prism chances rising. Core+Star = **20% Prism** — strong path.

### Tier 7: Epic × Epic (4-5 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Gem | Gem | Gem 45%, **Prism 25%**, Star 15%, Ring 10%, Core 5% |
| **Gem | Star** | **Gem 25%, Star 25%, Prism 30%**, Ring 10%, Core 10% |
| Star | Star | Star 45%, **Prism 25%**, Gem 15%, Core 10%, Ring 5% |

**Gem + Star = 30% PRISM.** This is THE endgame breeding pair for eyes.

### Tier 8: Epic × Mythic (4 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Gem | Prism | Prism 50%, Gem 20%, Star 15%, *NEW? 10%*, Ring 5% |
| Star | Prism | Prism 50%, Star 20%, Gem 15%, *NEW? 10%*, Core 5% |

10% chance of a **new trait** — AI-generated, unique to your game.

### Tier 9: Mythic × Mythic (3 outcomes)

| Parent A | Parent B | Outcomes |
|----------|----------|----------|
| Prism | Prism | Prism 60%, **NEW SPECIES 25%**, Star 10%, Gem 5% |

**The ultimate breed.** 25% chance of creating something that doesn't exist.

## Color Modifier

The base table above assumes same-rarity parents. When parent colors (rarities) differ:

- **Both same color**: use table as-is
- **One color higher**: upgrade outcomes get +5%, downgrade outcomes get -5%
- **Two+ colors higher**: upgrade outcomes get +10%, downgrade -10%

Example: a Cyan Ring + Grey Ring uses the Ring+Ring table but with slightly worse upgrade odds than Cyan Ring + Cyan Ring.

## Design Notes

- Every trait is reachable from commons through breeding chains
- The fastest path to any trait is 3-5 generations
- Multiple paths exist (breadth of strategy)
- Higher tiers have more outcomes = more variance = more risk
- New species creation is the endgame carrot
- The table is the same for all players — strategy comes from execution, not secrets
