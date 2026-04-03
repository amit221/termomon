# Termomon

A terminal creature collection game inspired by Pokemon Go. Instead of traveling in the real world, your terminal activity spawns digital creatures you can catch, collect, and evolve.

The game runs passively in the background — hooks track your activity, creatures appear, and you interact through slash commands when you choose to. It never interrupts your workflow.

## Installation

### As a Claude Code Plugin

```bash
# Clone the repo
git clone <repo-url> termomon
cd termomon

# Install dependencies and build
npm install
npm run build

# Launch Claude Code with the plugin loaded
claude --plugin-dir ./claude-plugin
```

The `--plugin-dir` flag loads the plugin for that session. Hooks will automatically track your activity and slash commands (`/scan`, `/catch`, etc.) become available.

To reload after making changes, run `/reload-plugins` inside the Claude Code session.

### Standalone CLI (any terminal)

```bash
git clone <repo-url> termomon
cd termomon
npm install
npm run build

# Run commands directly
node dist/cli.js status
node dist/cli.js scan
```

You can also link it globally:

```bash
npm link
termomon status
termomon scan
```

## How It Works

1. **You work normally** in your terminal / Claude Code
2. **Hooks fire silently** on your activity, accumulating "ticks"
3. **Creatures spawn** in the background based on your activity
4. **You check in when curious** — run `/scan` to see what's nearby, `/catch` to grab it

## Creatures

30 digital beings across 5 rarity tiers:

| Rarity | Stars | Spawn Rate | Examples |
|--------|-------|------------|---------|
| Common | * | ~45% | Glitchlet, Nullbyte, Blinkbit, Dustmote |
| Uncommon | ** | ~25% | Hexashade, Loopwyrm, Driftpixel, Staticling |
| Rare | *** | ~15% | Voidmoth, Flickerjack |
| Epic | **** | ~10% | Phantomcursor |
| Legendary | ***** | ~5% | Overflux |

Each creature has a base form and an evolved form. Catch duplicates to earn fragments, then evolve.

## Commands

| Command | Description |
|---------|-------------|
| `/scan` | Show nearby creatures with art, rarity, catch rate |
| `/catch [number]` | Catch creature #N from the scan list |
| `/collection` | Browse your creatures, fragments, evolution progress |
| `/inventory` | View your items |
| `/evolve [creature-id]` | Evolve a creature with enough fragments |
| `/status` | Your profile — level, catches, streak, ticks |
| `/settings` | Configure renderer and notification level |

## Items

**Capture items** (used to catch creatures):
- **ByteTrap** — 1x catch rate, common drop
- **NetSnare** — 1.5x catch rate, uncommon
- **CoreLock** — 2x catch rate, rare

**Catalysts** (used for evolution):
- **Shard** — needed for rare evolutions
- **Prism** — needed for epic evolutions

Items come from passive activity drip, milestone rewards, and session completion.

## Standalone CLI

You can also run Termomon directly from your terminal:

```bash
# Build first
npm run build

# Then use the CLI
node dist/cli.js status
node dist/cli.js tick
node dist/cli.js scan
node dist/cli.js catch 1
node dist/cli.js collection
node dist/cli.js inventory
node dist/cli.js evolve glitchlet
node dist/cli.js settings

# JSON output for scripting
node dist/cli.js scan --json
```

Game state is saved to `~/.termomon/state.json`. Override with `TERMOMON_STATE_PATH` env var.

## Development

```bash
npm install
npm test            # Run 63 tests
npm run build       # Compile TypeScript
npm run test:watch  # Watch mode
```

## Architecture

```
Platform Adapters  (Claude Code hooks + skills)
       |
  Rendering Layer  (Simple Text for now, pluggable)
       |
    Game Engine    (Pure logic, no I/O)
       |
  Activity Tracker (Tick recording)
       |
   Local State     (~/.termomon/state.json)
```

The game engine is fully decoupled from rendering. Adding new renderers (rich terminal with animations, browser, dedicated terminal window) requires no engine changes.

## Project Structure

```
src/
  types.ts              All TypeScript types
  config/               Game data (creatures, items, balance constants)
  state/                State persistence (JSON file)
  engine/               Game logic (ticks, spawn, catch, evolve, inventory)
  renderers/            Display layer (simple text renderer)
  cli.ts                CLI entry point
scripts/
  tick-hook.js          Claude Code hook script
claude-plugin/
  manifest.json         Plugin metadata
  hooks.json            Hook event configuration
  skills/               Slash command definitions
tests/                  63 tests covering all modules
```

## License

MIT
