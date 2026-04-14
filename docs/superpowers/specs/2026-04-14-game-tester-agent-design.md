# Game Tester Agent Design

**Date:** 2026-04-14
**Status:** Approved

## Overview

A hybrid testing system that combines a high-volume programmatic simulator with a Claude agent UX tester to find bugs, analyze balance, test MCP integration, and evaluate onboarding/UX friction.

## Architecture

Four modules share a core `GameSimulator`, plus a CLI wrapper:

```
src/simulation/
  game-simulator.ts      — Core simulator + player strategies
  bug-hunter.ts          — Invariant checker (1,000+ runs)
  balance-analyzer.ts    — Stats collector (1,000+ runs)
  mcp-smoke.ts           — MCP integration tester (~10 runs)
  scenarios.ts           — UX scenario definitions + Claude agent prompts
  report.ts              — Shared output formatting (terminal + JSON)
  cli.ts                 — CLI entry point
  index.ts               — Barrel export

reports/                 — JSON output directory (gitignored)
```

## Module 1: Game Simulator

`src/simulation/game-simulator.ts`

Core engine that plays through complete game sessions programmatically.

**SimulationConfig:**
- `runs`: number of games to simulate (default 1,000)
- `seed`: RNG seed for reproducibility
- `ticksPerGame`: how many player interactions per game (default 200)
- `strategy`: "random" | "greedy" | "passive"

**How it works:**
- Creates fresh `GameState` + `GameEngine` per run
- Each tick: advances simulated time by 30min, processes energy gain, spawns batches, then makes a decision based on strategy
- Strategies are decision functions `(state) => Action`:
  - **random** — picks any valid action at random (best for finding edge cases)
  - **greedy** — always catches rarest creature, upgrades best trait, breeds highest-score pair
  - **passive** — only scans and catches, never breeds/upgrades/quests
- Uses engine modules directly (no MCP, no I/O)
- RNG is seeded — failing runs are exactly reproducible
- Returns `SimulationResult`: action log, final state, invariant violations

## Module 2: Bug Hunter

`src/simulation/bug-hunter.ts`

Runs the simulator across all three strategies, checking invariants after every action.

**Invariants:**
- Energy: never negative, never exceeds maxEnergy (30)
- Gold: never negative
- Collection: never exceeds 15 active creatures
- Catch: energy deducted on attempt, XP granted only on success, nearby list updated
- Breed: both parents same species, child gets generation+1, gold deducted
- Upgrade: rank never exceeds cap for player level, gold cost matches balance.json, session cap of 2 respected
- Quest: locked creatures can't be bred/released/archived, completes after 2 sessions, reward matches formula
- Progression: XP thresholds match config, level never decreases
- State consistency: no duplicate creature IDs, archived creatures not in active collection, discoveredSpecies matches actual catches
- Batch: never more than 5 nearby, attempts never exceed 3, despawns after linger window

**Output:**
- Terminal: `1,000 runs, 0 violations` or `3 violations found` with seed, tick number, and description
- JSON: full violation records with state snapshots for debugging

## Module 3: Balance Analyzer

`src/simulation/balance-analyzer.ts`

Runs the simulator and collects statistics across all runs.

**Stats collected:**

*Economy:*
- Gold earned vs. spent distribution
- Average gold at each level
- Ticks to afford each upgrade rank (3, 5, 9, 15, 24, 38, 55)

*Catch rates:*
- Actual catch success rate by rarity tier (common through mythic)
- Energy spent per successful catch by tier
- Frequency of running out of energy with creatures nearby

*Progression:*
- Ticks to reach each level (1-14)
- XP sources breakdown (catches vs. quests vs. upgrades vs. discovery)
- Sessions to unlock each trait rank cap

*Collection:*
- Frequency of hitting 15-creature cap
- Species discovery rate (ticks to find all 7)
- Average creature score over time

*Breeding:*
- Inheritance outcomes vs. expected rates
- Generations reached in breed chains

*Quests:*
- Average reward vs. opportunity cost
- Quest frequency

**Output:**
- Terminal: key highlights (e.g., "Gold wall at rank 4", "Mythic effective catch rate 3%", "450 ticks to level 10")
- JSON: full stat tables for cross-run comparison

## Module 4: MCP Smoke Tester

`src/simulation/mcp-smoke.ts`

Runs ~10 complete game sessions through the actual MCP tool interface (`runCommand` from `src/mcp-tools.ts`).

**What it checks:**
- Every MCP tool returns valid output (no crashes, no undefined)
- Parameter edge cases: catch with out-of-range index, breed with invalid IDs, upgrade when broke, quest with locked creatures
- Response format: advisor_context JSON always valid and present
- Error messages: bad inputs produce helpful errors, not stack traces
- Display file: ANSI output written for each command

**Output:** Same format as bug hunter.

## Module 5: UX Scenario Agent

`src/simulation/scenarios.ts`

Defines scenario configs that a Claude agent plays through via MCP tools, narrating its experience.

**Scenarios:**

1. **first-10-minutes** — New player, no context. Tries to figure out what to do. Flags: unclear commands, missing guidance, discoverability gaps.

2. **energy-wall** — 0 energy, creatures nearby. Tries to play. Flags: clarity of why you can't act, guidance on what to do next.

3. **first-breed** — 2 same-species creatures. Tries to breed. Flags: command syntax clarity, inheritance preview understandability.

4. **full-collection** — 15 creatures, new spawn. Tries to manage. Flags: is archive/release obvious, is the decision meaningful.

5. **quest-flow** — Tries to start and complete a quest. Flags: lock mechanic clarity, reward worth.

6. **returning-player** — Existing state with progress. Picks up cold. Flags: can you tell what happened, what to do next.

7. **gold-decision** — Enough gold for one upgrade OR one breed. Weighs options. Flags: trade-off clarity, decision support.

**Output per scenario:**
- Friction points: what was confusing or unclear
- Dead ends: moments with no good action
- Missing information: things needed but not shown
- Suggestions: concrete improvements

**Execution:** Each scenario has a prompt template. Launched via `claude -p` with the scenario prompt and appropriate starting state.

## CLI Interface

`src/simulation/cli.ts`

```bash
# Bug hunting — 1,000 runs, all strategies
npx ts-node src/simulation/cli.ts bugs [--runs=1000] [--seed=42]

# Balance analysis
npx ts-node src/simulation/cli.ts balance [--runs=1000] [--seed=42]

# MCP smoke test
npx ts-node src/simulation/cli.ts smoke [--runs=10]

# UX scenarios — launches Claude agent per scenario
npx ts-node src/simulation/cli.ts ux [--scenario=first-10-minutes]

# Run everything
npx ts-node src/simulation/cli.ts all
```

**npm scripts:**
```json
"test:sim": "ts-node src/simulation/cli.ts all",
"test:bugs": "ts-node src/simulation/cli.ts bugs",
"test:balance": "ts-node src/simulation/cli.ts balance"
```

## Output

All modules write:
- **Terminal:** human-readable summary with highlights
- **JSON:** `reports/<module>-<timestamp>.json` for comparison across runs

The `reports/` directory is gitignored.

## Design Decisions

- **Direct engine calls for volume testing** — 1,000+ runs need to complete in seconds. MCP overhead (process spawning, serialization) makes this impractical through the tool interface.
- **MCP smoke tester for integration coverage** — The MCP layer is thin but real bugs live there (parameter parsing, error formatting). 10 runs is enough to catch wiring issues.
- **Scenario-based UX over personas** — Scenarios target specific friction moments rather than simulating vague player types. More actionable findings.
- **Seeded RNG** — Every failing run can be exactly replayed for debugging.
- **Three strategies** — Random finds edge cases, greedy tests optimal play, passive tests minimal engagement. Together they cover the action space.
