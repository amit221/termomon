# AI Advisor & UX Design

**Date:** 2026-04-13
**Status:** DRAFT
**Depends on:** [Engagement Loop Redesign](2026-04-13-engagement-loop-redesign.md) (core mechanics, economy numbers)

## Problem

Players finish an action (catch, upgrade, merge) and stare at the terminal wondering "now what?" The game has deep mechanics but no guide. Meanwhile, Compi runs *inside Claude Code* -- the most powerful AI assistant on the planet is right there. We should use it.

## Solution: The AI Advisor Agent

After every game action, a dedicated AI agent analyzes the game state, renders graphics, and guides the player with narrator-style commentary. Two modes -- auto-pilot for trivial moments, advisor for real decisions.

---

## 1. Voice & Tone

The advisor speaks as a **game narrator** -- playful, enthusiastic, with personality. Not a help bot. Not a tutorial. A companion who knows the game deeply and gets excited about your progress.

### Good Examples

```
"Well well, a wild Compi with Crescent eyes! That's uncommon territory --
 worth grabbing before it drifts off."

"Your Flikk's Bolt tail is sitting at rank 6. One more upgrade pushes it
 to rare. That's 38g -- steep, but it'd bump your team power past 200."

"Two Glichs with complementary traits? Now we're talking. Merging these
 gives you a 70% shot at upgrading that Crystal body to epic range."

"Quest team's back! 47 gold in the pocket. Your Whiski earned its keep --
 that Hex body carried the power score."
```

### Bad Examples

```
"You caught a creature."                    // Boring, no personality
"I recommend upgrading the body trait."     // Corporate advisor voice
"Congratulations on your new Compi!"        // Generic, no game insight
"Would you like to see your options?"       // Unnecessary hedging
```

### Rules

- **2-3 sentences max** per suggestion. Punchy, not verbose.
- **Name creatures and traits specifically** -- "Your Compi's Ring Gaze" not "your creature's eye trait."
- **Explain the WHY** -- don't just say what to do, say why it matters. Rarity thresholds, power milestones, gold efficiency.
- **Match excitement to the moment** -- new species discovery gets hype, routine catch gets a quick nod.

---

## 2. Two Modes

### Auto-Pilot Mode

For obvious or trivial situations. The advisor acts, shows the result, and suggests what's next. No menu, no waiting.

**Triggers:**
- Quest returns with gold -- auto-collect, show summary
- Only one viable action available -- do it, show result
- Routine catch (all common traits, no merge available) -- quick summary
- Energy regenerated notification -- brief note

**Example: Quest Return**

```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚡ ████████░░ 16/20    💰 83g (+47)    Lv 8

  ✦ QUEST COMPLETE ✦

     ○w○                 Team returned safely!
    ( ω )                +47 gold earned
    ╱ ▓▓ ╲     ⭐ 74
     ≋≋

     ◐.◐
    ( ≈ )                Your Flikk's Bolt tail
    ╱ ▒▒ ╲     ⭐ 61    carried the power score.
     ↯↯

     ·.·
    ( ◡ )       ⭐ 38
    ╱ ░░ ╲
     ~~/

  "Nice haul! 47 gold from a solid squad. You've got enough
   to upgrade that Crystal body to rank 4 now."

  ──────────────────────────────────────────────────
  [1] Upgrade Compi's body (Crystal → rank 4, 15g)
  [2] Scan for new creatures
  [3] View collection
  ──────────────────────────────────────────────────
```

### Advisor Mode

For decisions with real tradeoffs. The advisor presents options, explains each one, and waits for the player to choose.

**Triggers:**
- Post-catch with merge available (same species in collection)
- Multiple good upgrade paths (several traits near a tier threshold)
- Merge available with meaningful upgrade/downgrade risk
- Expensive action where gold could be spent elsewhere
- Near a level-up or tier milestone
- Low energy with multiple possible actions
- New species discovered for the first time

**Example: Post-Catch with Merge Option**

```
  ⚡ ██████████ 19/20    💰 52g    Lv 6

  ✦ CAUGHT! ✦

     ◐.◐
    ( ∘ )       eyes  Half Moon [31]
    ╱ ░▒ ╲     mouth  Circle [31]
     ⌇⌇        body   Grain [31]
                tail   Zigzag [31]
                ⭐ 31

  "Ooh, a Compi with Half Moon eyes AND Grain body -- both uncommon.
   And look, you've already got a Compi with Ring Gaze eyes at rank 9.
   Merging these two could push a trait into rare territory."

  ──────────────────────────────────────────────────
  [1] Merge with Compi #3 (preview odds first, 1⚡ + 25g)
  [2] Upgrade Half Moon eyes → rank 4 (15g)
  [3] Keep catching -- 2 more in this batch
  ──────────────────────────────────────────────────
```

---

## 3. Trigger Matrix

| Game Event | Mode | Advisor Behavior |
|---|---|---|
| Post-catch, merge available | **Advisor** | Show merge option with odds preview |
| Post-catch, no merge, batch remaining | **Auto-pilot** | Quick note, suggest next catch |
| Post-catch, batch exhausted | **Auto-pilot** | Summary of batch, suggest upgrade/quest |
| Post-upgrade, near tier threshold | **Advisor** | "One more upgrade hits rare -- worth it?" |
| Post-upgrade, routine | **Auto-pilot** | Show result, suggest next action |
| Post-merge | **Advisor** | Show result with excitement, suggest next move |
| Quest return | **Auto-pilot** | Collect gold, summarize, suggest spend |
| Low energy (< 3), gold available | **Advisor** | "Send a quest team to earn while you wait?" |
| Low energy, no gold, no actions | **Auto-pilot** | "Rest up. Your creatures are regenerating." |
| New species discovered | **Advisor** | Full hype: "A species you've never seen!" |
| Level up | **Advisor** | Show unlocks, new trait caps, milestone |
| Collection full (12/12) | **Advisor** | "Time to merge or release to make room" |

---

## 4. Graphics Requirements

Every interaction renders graphics. Text-only responses are not acceptable.

### 4.1 Always Rendered

**Creature art** -- ASCII art from species templates with trait art substituted in, colored by rarity tier. This already works in the current renderer.

```
  Rarity colors (grey → red, matching current system):
  grey    (rank 0-1)   -- Common trash
  white   (rank 2-3)   -- Common decent
  green   (rank 4-5)   -- Uncommon
  cyan    (rank 6-7)   -- Uncommon high
  blue    (rank 8-9)   -- Rare
  magenta (rank 10-11) -- Rare high
  yellow  (rank 12-14) -- Epic
  red     (rank 15+)   -- Legendary/Mythic
```

**Side-by-side layout** -- Art on left, trait names + rarity scores on right. Current `renderCreatureSideBySide()` is the foundation.

```
     ◎.◎                eyes  Ring Gaze [50]
    ( ω )               mouth  Omega [50]
    ╱ ▓▓ ╲              body   Crystal [50]
     ≋≋                 tail   Ripple [50]
                         ⭐ 50
```

**Status bar** -- Persistent across all screens. Shows the essentials at a glance.

```
  ⚡ ████████░░ 16/20    💰 83g    📦 9/12    ⭐ Lv 8 (340/480 XP)
```

**Energy bar** -- Visual bar with current/max. Already implemented in `energyBar()`.

### 4.2 Screen-Specific Graphics

#### Scan View

All nearby creatures with art, traits, catch rate, and power score. Current `renderScan()` is the base.

```
  ⚡ ████████░░ 16/20    💰 83g    📦 9/12    ⭐ Lv 8

  [1] Compi (compi)  ⭐ 28
                     Rate: 96%  Cost: 1⚡
     ○.○                 eyes  Pebble Gaze [7]
    ( ~ )                mouth  Wave [7]
    ╱ ·· ╲               body   Light [7]
     \~\                 tail   Swish [7]

  [2] Flikk (flikk)  ⭐ 41
                     Rate: 91%  Cost: 1⚡
     ...

  [3] Compi (compi)  ⭐ 19
                     Rate: 98%  Cost: 1⚡
     ...

  "Fresh batch! That Flikk at ⭐41 is the pick of the litter --
   uncommon Shade body. The Compis are filler, but #1 has a
   Wave mouth you could merge into your main."

  ──────────────────────────────────────────────────
  [1] Catch Compi #1    [2] Catch Flikk #2
  [3] Catch Compi #3    [4] View collection
  ──────────────────────────────────────────────────
```

#### Catch Result

Big status banner with creature art.

```
  ✦ CAUGHT! ✦

     ◐.◐                eyes  Half Moon [31]
    ( ∘ )                mouth  Circle [31]
    ╱ ░▒ ╲              body   Grain [31]
     ⌇⌇                 tail   Zigzag [31]
                         ⭐ 31

  +10 XP   -1⚡
```

Escape/flee use the same layout but with `✦ ESCAPED ✦` (yellow) or `✦ FLED ✦` (red).

#### Upgrade Result -- Before/After

```
  ✦ UPGRADE ✦

  BEFORE                         AFTER
     ◎.◎                            ◎.◎
    ( ω )                           ( ω )
    ╱ ▒▒ ╲  body Shade [31]    →   ╱ ▓▓ ╲  body Crystal [50]
     ≋≋                             ≋≋

  -24g   +8 XP
  ──────────────────────────────────────────────────
```

The changed trait line highlights the color shift (e.g., cyan `Shade` to blue `Crystal`).

#### Merge Preview

Two parents side by side, inheritance odds below.

```
  MERGE PREVIEW

  Parent A (#3)                  Parent B (#7)
     ◎.◎            ⭐ 50          ◐.◐            ⭐ 31
    ( ω )                         ( ∘ )
    ╱ ▓▓ ╲                       ╱ ░▒ ╲
     ≋≋                           ⌇⌇

  Inheritance Odds:
    eyes   Ring Gaze [50] 85%  vs  Half Moon [31] 15%
    mouth  Omega [50] 80%      vs  Circle [31] 20%
    body   Crystal [50] 90%    vs  Grain [31] 10%
    tail   Ripple [50] 70%     vs  Zigzag [31] 30%

  Then: +1 random trait upgrade, 30% chance of -1 on another

  Cost: 25g + 1⚡    Both parents consumed.

  "This is a strong merge -- Crystal body at 90% inheritance is
   almost guaranteed. The random +1 could push it into rare.
   Only risk is the 30% downgrade hitting your Ripple tail."

  ──────────────────────────────────────────────────
  [1] Confirm merge (25g + 1⚡)
  [2] Cancel -- keep both parents
  ──────────────────────────────────────────────────
```

#### Merge Result

Child creature with highlights on what changed.

```
  ✦ MERGE SUCCESS ✦

     ◎.◎                eyes  Ring Gaze [50]  ← Parent A
    ( ω )                mouth  Omega [50]  ← Parent A
    ╱ ▓▓ ╲              body   Crystal [56] ★ UPGRADED (+1)
     ≋≋                 tail   Ripple [50]  ← Parent A
                         ⭐ 52

  "Jackpot! Crystal body upgraded to rank 10 -- that's rare territory!
   No downgrades either. This Compi is your new powerhouse."

  -25g   -1⚡   +25 XP
  ──────────────────────────────────────────────────
  [1] Send on quest (lock 2 sessions, ~31g reward)
  [2] Upgrade Ring Gaze eyes → rank 10 (38g)
  [3] Scan for more creatures
  ──────────────────────────────────────────────────
```

#### Quest Departure

```
  ✦ QUEST STARTED ✦

     ◎.◎         ◐.◐         ·.·
    ( ω )        ( ≈ )       ( ◡ )
    ╱ ▓▓ ╲      ╱ ▒▒ ╲      ╱ ░░ ╲
     ≋≋          ↯↯          ~~/

  Team power: 163    Est. reward: ~47g
  Returns in: 2 sessions

  "Strong squad. That Crystal body is carrying the power score.
   47 gold should fund two upgrades when they're back."

  ──────────────────────────────────────────────────
```

#### Collection View

Grid of all creatures, sorted by power.

```
  ⚡ ████████░░ 16/20    💰 83g    📦 9/12    ⭐ Lv 8

  Your creatures (9/12)

  1. Compi  ⭐ 52  Lv 3          2. Flikk  ⭐ 44  Lv 2
     ◎.◎    Ring Gaze [50]          >.>    Slit Gaze [28]
    ( ω )    Omega [50]            ( v )    Whisker [28]
    ╱ ▓▓ ╲   Crystal [56]         ╱ ## ╲   Mesh [33]
     ≋≋      Ripple [50]           ↯↯      Bolt [45]

  3. Compi  ⭐ 31  Lv 1          4. Glich  ⭐ 38  Lv 1
     ...                            ...

  ──────────────────────────────────────────────────
  🔒 On quest: Whiski #5, Compi #6, Jinx #8
  ──────────────────────────────────────────────────
```

#### Progress Indicators

Shown contextually when relevant (not on every screen).

```
  PROGRESS
  ├─ Next level: 140/480 XP (29%)  ████░░░░░░
  ├─ Best trait: Crystal body rank 10 → rank 11 needs merge
  ├─ Species unlocked: 4/6 (Jinx at Lv 7, Monu at Lv 10)
  └─ Team power: 163 → 200 milestone (+37 needed)
```

---

## 5. Action Menu Format

Every screen ends with a numbered menu. The player types a number to act.

### Rules

- **Max 5 options** per menu. More is overwhelming.
- **Most impactful option first** -- the advisor's recommendation is always [1].
- **Always include an escape hatch** -- "View collection" or "Scan" as a low-commitment option.
- **Show costs inline** -- "(15g)" or "(1⚡)" next to each option.
- **Contextual only** -- merge only appears if you have 2+ same species. Quest only if creatures are available.
- **Natural language also works** -- player can type "catch 2" or "merge 3 7" instead of a number.

### Standard Options by Context

| After... | Option 1 (recommended) | Option 2 | Option 3 | Option 4 |
|---|---|---|---|---|
| Scan | Catch best creature | Catch runner-up | View collection | -- |
| Catch (merge available) | Preview merge | Keep catching | Upgrade trait | View collection |
| Catch (no merge) | Catch next | Upgrade trait | Send quest | View collection |
| Upgrade | Next upgrade / merge | Scan | Send quest | View collection |
| Merge | Quest / upgrade child | Scan | View collection | -- |
| Quest return | Spend gold (upgrade) | Scan | View collection | -- |
| Collection full | Merge pair | Release weakest | View collection | -- |

---

## 6. Integration Architecture

### How the Advisor Agent Works

```
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Player      │     │  Game Engine  │     │  AI Advisor   │
  │  (types cmd) │────▶│  (pure logic) │────▶│  (narrator)   │
  │              │◀────│              │◀────│              │
  └──────────────┘     └──────────────┘     └──────────────┘
        │                     │                     │
        │  "catch 2"          │  CatchResult +      │  Narrator text +
        │                     │  GameState           │  Graphics +
        │                     │                     │  Numbered options
        ▼                     ▼                     ▼
```

**Flow:**

1. Player types a command or number (via MCP tool, CLI, or skill)
2. Game engine executes the action, returns structured result + full game state
3. Advisor agent receives: `{ action, result, gameState, playerHistory }`
4. Advisor analyzes: what's possible? what's optimal? what's exciting?
5. Advisor generates: narrator text + rendered graphics + numbered options
6. Output displayed to player
7. Player responds with number or natural language
8. Loop back to step 2

### Integration Points

**MCP tools** -- Each tool (`scan`, `catch`, `breed`, etc.) returns structured JSON. The advisor wraps the response with narrator commentary and graphics before returning to Claude Code.

**Skills** -- Slash commands (`/scan`, `/catch`, etc.) invoke MCP tools. The skill layer can include advisor instructions in the system prompt so Claude narrates naturally.

**Hooks** -- The `PostToolUse` hook fires after every MCP tool call. It can trigger advisor analysis for the next interaction.

### Implementation Options

**Option A: Skill-based advisor** -- Each skill's `SKILL.md` includes advisor instructions and rendering guidelines. Claude itself acts as the narrator, using the MCP tool response data. Lightweight, no new code.

**Option B: Engine-side advisor** -- A new `src/engine/advisor.ts` module that takes `(action, result, gameState)` and returns `{ mode, narratorText, options[] }`. The renderer then formats it. More structured, testable.

**Option C: Hybrid** -- The engine provides `getViableActions()` and `getProgressInfo()`, but the narrator voice comes from Claude via skill instructions. Best of both worlds.

**Recommended: Option C (Hybrid)**. The engine should expose structured analysis (viable actions, progress, merge previews) but the narrator voice should come from Claude's natural language ability via skill instructions. This keeps the engine pure and testable while leveraging Claude for the creative narration.

---

## 7. API Surface the Advisor Needs

The advisor agent requires these functions from the game engine. Some already exist; others need to be built.

### Existing (or trivially derived)

| Function | Returns | Status |
|---|---|---|
| `getGameState()` | Full state: collection, energy, gold, nearby, quests, level | Exists (`StateManager.load()`) |
| `getCreatureDisplay(creature)` | Rendered ASCII art with trait substitution | Exists (`renderCreatureSideBySide()`) |
| `getMergePreview(a, b)` | Inheritance odds per slot | Exists (`renderBreedPreview()`) |

### New (needed)

| Function | Returns | Purpose |
|---|---|---|
| `getViableActions(state)` | `Action[]` -- list of possible actions with costs, expected outcomes, and priority score | Core advisor input: what can the player do right now? |
| `getProgressInfo(state)` | `{ xpToNextLevel, nextUnlock, bestTraitDistance, teamPower, milestones[] }` | Progress indicators for contextual display |
| `getAdvisorMode(action, result, state)` | `"autopilot" \| "advisor"` | Determines which mode to use based on trigger matrix |
| `getSuggestedActions(action, result, state)` | `SuggestedAction[]` -- ranked list with narrator hints | Pre-computed menu options with reasoning |
| `getTraitUpgradePath(creature, slot)` | `{ currentRank, nextRank, cost, tierName, distanceToNextTier }` | How close is a specific trait to the next rarity tier? |
| `getTeamPowerBreakdown(state)` | `{ total, perCreature[], questEstimate }` | Power analysis for quest and milestone tracking |

### Action Type

```typescript
interface SuggestedAction {
  type: "catch" | "upgrade" | "merge" | "quest" | "scan" | "release";
  label: string;              // "Upgrade Crystal body → rank 4"
  cost: { gold?: number; energy?: number };
  priority: number;           // 1 = highest
  reasoning: string;          // "Pushes trait into rare tier"
  target?: {                  // creature/trait reference
    creatureIndex?: number;
    slotId?: SlotId;
  };
}
```

### ProgressInfo Type

```typescript
interface ProgressInfo {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpPercent: number;
  nextSpeciesUnlock: { species: string; level: number } | null;
  bestTrait: { creature: string; slot: SlotId; rank: number; tierName: string };
  nearestTierThreshold: { creature: string; slot: SlotId; currentRank: number; targetRank: number; method: "upgrade" | "merge" };
  teamPower: number;
  nextPowerMilestone: number;
  collectionSize: number;
  collectionMax: number;
}
```

---

## 8. New Species Discovery

First encounter with a species gets special treatment. This is a peak emotional moment.

```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✦ ✦ ✦  NEW SPECIES DISCOVERED  ✦ ✦ ✦

     >.>
    ( v )        GLICH
    ╱ ++ ╲       "A glitchy little sprite that
     ~~⌇         flickers between dimensions."

  "Whoa -- a Glich! You've never seen one of these before.
   They're known for their Bolt tails and Crystal bodies
   at higher ranks. This one's fresh, but it's a keeper
   for your collection."

  ──────────────────────────────────────────────────
  [1] Catch it! (1⚡, 94% rate)
  [2] Skip -- keep scanning
  ──────────────────────────────────────────────────
```

---

## Scope

### This spec covers:
1. AI advisor agent design -- voice, tone, personality rules
2. Two modes -- auto-pilot vs advisor, with trigger matrix
3. Graphics requirements -- what renders on every screen, with examples
4. Action menu format -- numbered options, contextual rules, standard layouts
5. Integration architecture -- how advisor connects to engine and Claude Code
6. API surface -- functions the advisor needs, with TypeScript interfaces

### This spec does NOT cover:
- Core game mechanics (see [Engagement Loop Redesign](2026-04-13-engagement-loop-redesign.md))
- Economy numbers and balance (see [Engagement Loop Redesign](2026-04-13-engagement-loop-redesign.md))
- Creature species definitions (see `config/species/`)
- Renderer implementation details (see `src/renderers/simple-text.ts`)
