# Terminal Creature Collection Game — Design Spec

## Overview

A creature collection game inspired by Pokemon Go that runs as a CLI plugin. Instead of traveling in the real world, the user's terminal activity drives gameplay. Creatures spawn passively as the user works, and the user interacts with the game through slash commands when they choose to.

The game is passive-first: it never interrupts workflow. Hooks track activity silently, creatures spawn in the background, and the user pulls information when curious.

**POC scope:** Single player, Claude Code plugin, ~20-30 creatures, local state only.

---

## Architecture

Four layers, fully decoupled:

```
+-------------------------------------+
|         Platform Adapters           |
|  (Claude Code plugin, future: etc.) |
+-------------------------------------+
|         Rendering Layer             |
|  Rich Terminal | Simple Text |      |
|  Browser | Dedicated Terminal       |
+-------------------------------------+
|          Game Engine                |
|  Spawning, Catching, Inventory,    |
|  Evolution, Items, Progression     |
+-------------------------------------+
|          Activity Tracker           |
|  Hooks, tick counting, spawn       |
|  checks, event accumulation        |
+-------------------------------------+
|          Local State (JSON)         |
+-------------------------------------+
```

- **Activity Tracker** — hooks fire silently, recording ticks (timestamps + minimal metadata) to a local state file. No rendering, no processing beyond logging.
- **Game Engine** — pure logic. Processes ticks, runs spawn algorithms, resolves catches, manages inventory/collection. No I/O. Returns data objects.
- **Rendering Layer** — pluggable renderers that take game state data and display it. Auto-detects platform or user-configured.
- **Platform Adapters** — thin integration layers. For POC: Claude Code slash commands + hooks.

**Key principle:** Game logic is completely decoupled from display. The engine returns data objects, renderers decide how to show them.

---

## Activity Tracking

### Data Model

The most portable signal: **the hook fired.** Each hook invocation = 1 tick. The game doesn't need to know what the user did, only that activity happened.

Each tick records:
- Timestamp
- Session ID (if available from platform)
- Event type (if available — e.g., PostToolUse, UserPromptSubmit, Stop)

From timestamps alone the engine derives:
- Steps (tick count)
- Session boundaries (gap > X minutes = new session)
- Time of day
- Activity frequency
- Daily streaks

### Claude Code Integration

Hook events to listen to:
- `PostToolUse` — fires after every tool call
- `UserPromptSubmit` — fires every time the user sends a message
- `Stop` — fires when Claude finishes responding
- `SessionStart` — session begins (streak tracking)

Bonus data available from Claude Code (enriches gameplay but not required):
- `cwd` — current working directory
- `session_id` — unique session identifier
- `transcript_path` — can read token usage from transcript JSONL

### Portability

Other CLI platforms only need to provide: "a hook fired" + a timestamp. Everything else is optional enrichment. The game engine's spawn algorithm works with ticks + timestamps alone.

---

## Spawning

### Algorithm

```
ticks accumulate -> every N ticks, run spawn check
spawn check: random roll against spawn probability
if spawn succeeds: pick creature from rarity-weighted table
  - time-of-day influences which creatures can appear
  - randomness core to prevent deterministic feel
spawned creature lingers for configurable window (default: 30 min)
multiple creatures can be nearby (cap: 5)
if not caught within window: creature despawns
```

### Spawn Weights by Rarity

- Common — ~45% of spawns
- Uncommon — ~25% of spawns
- Rare — ~15% of spawns
- Epic — ~10% of spawns
- Legendary — ~5% of spawns

---

## Creature System

### Design

All creature data lives in a JSON config file. Adding, removing, or tweaking creatures is a data change, no code changes required.

**Theme:** Abstract/digital beings — glitch entities, pixel spirits, ASCII lifeforms. Native to the terminal world. Slightly eerie/whimsical tone.

**Rarity tiers (5 levels):**
- Common (1 star)
- Uncommon (2 stars)
- Rare (3 stars)
- Epic (4 stars)
- Legendary (5 stars)

### Creature Data Shape

Each creature has:
- Unique ID, name, description
- Rarity tier
- Visual art per renderer (Tamagotchi art for rich terminal, simple ASCII for text-only, sprites for browser)
- Base catch rate (inversely proportional to rarity)
- Evolution target + fragment cost
- Spawn conditions (time-of-day preference, minimum tick threshold)

### Evolution

- Catching a duplicate creature earns fragments for that creature
- Evolution costs X fragments (scaled by rarity: common ~5, uncommon ~7, rare ~10, epic ~15)
- Some evolutions also require a catalyst item
- 2-stage only for POC: base form -> evolved form
- Evolved forms get new art, name, and description
- Collection shows each creature once with fragment count and evolution status

### Example Roster (thematic direction)

| Name | Rarity | Description |
|------|--------|-------------|
| Glitchlet | Common | A flickering pixel that can't decide what shape it is |
| Nullbyte | Common | Exists in the gaps between your data |
| Hexashade | Uncommon | A shadow made of shifting hex values |
| Voidmoth | Rare | Drawn to the glow of active terminals |
| Phantomcursor | Epic | The ghost of every misplaced caret |
| Overflux | Legendary | A cascade of raw energy from the edge of memory |

Full roster (~20-30 creatures) designed during implementation. This table defines the tone.

---

## Encounters & Catching

- When a creature spawns, it lingers nearby for a configurable window
- User runs `/scan` to see all nearby creatures (up to 5)
- User runs `/catch [number]` to choose which creature to attempt
- Catching costs a capture item (tiered by quality)
- Outcome is probability-based: `catch_rate * item_multiplier + bonuses`
- Failed attempt consumes the item
- Creature may flee after X failed attempts
- Successful catch awards: fragments for that creature, XP, small chance of bonus item drop

---

## Items & Economy

### Capture Items

| Item | Effect | Source |
|------|--------|--------|
| ByteTrap | Basic capture, 1x multiplier | Passive drip, common drop |
| NetSnare | Better capture, 1.5x multiplier | Uncommon drop, milestones |
| CoreLock | High capture, 2x multiplier | Rare drop, milestone reward |

### Catalyst Items

| Item | Effect | Source |
|------|--------|--------|
| Shard | Required for common/uncommon evolution | Activity rewards |
| Prism | Required for rare+ evolution | Milestone rewards |

### Item Sources

- **Passive drip** — every N ticks, a small item drop (mostly ByteTraps)
- **Milestones** — streak bonuses (3-day, 7-day, 30-day), catch count milestones, evolution milestones yield better items
- **Session rewards** — completing a session gives a small item bundle

### Inventory

- Simple list with counts
- No inventory limit for POC

All item definitions in a config file, easy to rebalance.

---

## Notifications

**Default level: moderate.** Configurable: `minimal` | `moderate` | `off`.

Examples:
- Creature nearby: `Something flickering nearby...`
- Rare spawn: `Rare signal detected!`
- Creature despawned: `A creature slipped away...`
- Milestone reward: `Streak bonus! +3 ByteTraps`
- Evolution ready: `Glitchlet has enough fragments to evolve!`

Always one line. Never interrupts command output. Special events (rare spawn, evolution ready) notify on all levels except `off`.

### Delivery Mechanism

Notification delivery depends on the platform adapter:
- **Claude Code:** Hooks inject `additionalContext` which appears in Claude's response context. The notification text is included as context that Claude surfaces naturally.
- **Rich Terminal / Dedicated Terminal:** Print directly to stdout after the current command completes.
- **Browser:** Push notification to the open localhost page.

Each platform adapter implements its own notification delivery. The game engine just emits notification events.

---

## Rendering Layer

Four renderers, all consuming the same game state data through a shared `Renderer` interface.

**No colors.** All renderers are monochrome. Contrast comes from character density and whitespace.

### Renderer Interface

Each renderer implements:
- `renderScan(creatures)` — display nearby creatures
- `renderCatch(result)` — catch attempt outcome
- `renderCollection(collection)` — browse caught creatures
- `renderInventory(items)` — view items
- `renderEvolve(result)` — evolution sequence
- `renderStatus(profile)` — player stats
- `renderNotification(event)` — inline notification

### 1. Rich Terminal

- Tamagotchi-style pixel art using box-drawing + Unicode characters
- Monochrome, no ANSI colors
- Animations: catch sequence, evolution, idle creature movement
- Libraries: blessed or ink (Node.js)
- Used by: standalone CLI, capable platforms

### 2. Simple Text

- Markdown-formatted output
- Small ASCII art in code blocks
- No animation, no color
- Compact to avoid output collapsing
- Used by: Claude Code slash commands, constrained platforms

### 3. Browser

- Opens localhost page
- Full HTML/CSS rendering, real pixel art, smooth animations
- Richest experience, user opt-in
- Local server (similar to superpowers visual companion)

### 4. Dedicated Terminal

- Spawns a separate terminal window
- Runs the rich terminal renderer in that window
- User's main workflow stays uninterrupted
- User opt-in

### Configuration

- Auto-detects platform on install (Claude Code -> simple text default)
- User override in config: `"renderer": "rich" | "simple" | "browser" | "terminal"`
- Changeable at any time via `/settings`
- Per-command override: any command accepts an optional `--browser` or `--terminal` flag to open that specific view in the browser or a dedicated terminal window, regardless of the global setting (e.g., `/collection --browser`)

---

## Commands

| Command | Description |
|---------|-------------|
| `/scan` | Show all nearby creatures with art, rarity, catch rate |
| `/catch [number]` | Attempt to catch creature #N from scan list |
| `/collection` | Browse caught creatures, fragments, evolution status |
| `/inventory` | View items |
| `/evolve [name]` | Evolve a creature if requirements are met |
| `/status` | Player profile: total catches, streak, ticks, level |
| `/settings` | Configure renderer, notification level |

---

## Data Persistence

All game state stored in a single local JSON file at `~/.termomon/state.json` (name TBD).

State includes:
- Player profile (level, XP, streaks, stats)
- Collection (creatures caught, fragment counts, evolution status)
- Inventory (item counts)
- Nearby creatures (spawned, pending catch/despawn)
- Tick history (recent ticks for spawn calculations, pruned periodically)
- Settings (renderer preference, notification level)

No server, no cloud sync for POC. Designed so the data model can accommodate sync later without restructuring.

---

## Technology

- **Language:** TypeScript
- **Runtime:** Node.js
- **Distribution:** Claude Code plugin (POC)
- **Rich terminal UI:** blessed or ink
- **State:** Local JSON file
- **Creature/item data:** JSON config files (easy to modify without code changes)

---

## Future Considerations (out of POC scope)

- Multiplayer: trading, leaderboards, battles
- Cloud sync for cross-device play
- Additional platform adapters (Cursor, other CLI tools)
- Expanded creature roster
- Breeding / combining mechanics
- Achievements system
- Seasonal events / limited-time creatures
