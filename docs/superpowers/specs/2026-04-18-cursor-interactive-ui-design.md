# Cursor Interactive UI — Design Spec

**Date:** 2026-04-18
**Status:** Draft

## Problem

The Cursor MCP App iframe currently renders ANSI terminal text inside a `<pre>` block on a black background. This wastes the iframe's full browser capabilities — HTML, CSS animations, mouse interactions, and dynamic state updates. The game looks like a terminal emulator when it could look and feel like an actual game.

## Goal

Replace the terminal-in-a-browser rendering with a native HTML game UI. Cards are clickable, catches animate, creatures have visual personality, and the player never needs to type `a/b/c` in chat — they click directly in the iframe.

No sound. No external assets. Everything is self-contained HTML/CSS/JS.

## Architecture

### Current flow

```
MCP tool call → GameEngine → SimpleTextRenderer (ANSI) → ansiToHtml() → <pre> in iframe
```

### New flow

```
MCP tool call → GameEngine → HtmlAppRenderer (HTML) → iframe with interactive JS
    ↑                                                        │
    └── HTTP sidecar ←── fetch("/action?choice=a") ──────────┘
```

### Key change: HTTP sidecar for iframe interactivity

The MCP server is stdio-based — the iframe can't call MCP tools directly. To make clicks inside the iframe trigger game actions without the user typing in chat, we add a lightweight HTTP server alongside the MCP server.

**Sidecar responsibilities:**
- Listens on `127.0.0.1` with a random available port
- Serves one endpoint: `GET /action?choice=a|b|c|s`
- On request: loads game state, runs the engine, renders HTML, returns the new page
- The iframe replaces its own content with the response (no page reload, just innerHTML swap with a transition)

**The MCP tool still works.** If the user (or AI) calls the `play` tool via chat, the normal MCP flow runs and returns HTML. The sidecar is an *additional* input path, not a replacement. Both paths use the same engine + renderer.

**Port discovery:** The sidecar writes its port to `~/.compi/cursor-port`. The HtmlAppRenderer reads this file and embeds the port in the iframe's JavaScript. If the file is missing (sidecar not running), cards fall back to displaying choice labels ("Pick A/B/C in chat").

### New renderer: `HtmlAppRenderer`

Implements the existing `Renderer` interface (returns `string` — the string is HTML instead of ANSI). This means zero changes to `mcp-tools.ts` or the engine.

**Location:** `src/renderers/html-app.ts`

The renderer outputs self-contained HTML documents with embedded `<style>` and `<script>`. No external dependencies, no CDN links.

### File changes summary

| File | Change |
|------|--------|
| `src/renderers/html-app.ts` | **New** — HtmlAppRenderer class |
| `src/renderers/html-templates.ts` | **New** — HTML/CSS/JS template strings |
| `src/mcp-server-cursor.ts` | Use HtmlAppRenderer instead of SimpleTextRenderer + ansiToHtml |
| `src/mcp-tools.ts` | No changes (renderer is injected, interface unchanged) |
| `src/types.ts` | No changes (Renderer interface unchanged) |
| `src/renderers/ansi-to-html.ts` | Kept for backward compat, no longer used by Cursor server |

## UI Components

### 1. Card Draw Screen (`renderCardDraw`)

The main game screen. Shows 1-3 cards the player can interact with.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  ⚡ 24/30          Lv.5  ████████░░ 340 XP  │  ← status bar (sticky top)
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│   │ CATCH   │  │ CATCH   │  │  BREED  │    │
│   │         │  │         │  │         │    │
│   │ (art)   │  │ (art)   │  │ ♥       │    │
│   │         │  │         │  │(parent) │    │
│   │ Pyrax   │  │ Compi   │  │   +     │    │
│   │ ⚡2     │  │ ⚡1     │  │(parent) │    │
│   │ 72%     │  │ 89%     │  │ ⚡5     │    │
│   │         │  │         │  │         │    │
│   │  [ A ]  │  │  [ B ]  │  │  [ C ]  │    │
│   └─────────┘  └─────────┘  └─────────┘    │
│                                             │
│          [ Skip Turn — ⚡1 ]                │
│                                             │
└─────────────────────────────────────────────┘
```

**Card details:**

- **Catch cards** show: creature ASCII art (colorized via CSS), species name, trait list with rarity colors, energy cost, catch rate as a percentage badge
- **Breed cards** show: both parents side-by-side (smaller art), slot comparison with upgrade chance percentages, energy cost
- **Hover:** Cards lift with a subtle shadow + scale(1.02) transform
- **Click:** Card flips or pulses, then the action resolves (see Animations below)
- **Skip button** at the bottom, dimmer styling

**Catch card trait display:**
Each trait shown as a pill/badge with the rarity color as background:
```html
<span class="trait rare">Gleaming Eye</span>
<span class="trait epic">Spark Grin</span>
```

### 2. Action Result Screen (`renderPlayResult`)

Shown after clicking a card. Displays the outcome, then the next hand of cards.

**Catch success:**
- Creature art scales up to center with a burst animation (CSS radial gradient keyframe)
- "CAUGHT!" text with glow effect
- Trait list fades in below
- XP gain and energy cost shown
- After 2s, next hand of cards slides in from below

**Catch failure:**
- Card shakes (CSS shake keyframe), creature art fades to 30% opacity
- "Escaped..." or "Fled!" text
- Brief pause, then next hand slides in

**Breed result:**
- Parents slide to sides, baby creature fades in at center
- Upgraded traits flash with their rarity color
- If hybrid: special "NEW SPECIES" banner with shimmer animation

### 3. Collection Screen (`renderCollection`)

Visual grid of all caught creatures.

**Layout:**
- Grid of creature cards (responsive, 2-4 columns depending on iframe width)
- Each card shows: art (colorized), name, species, 4 trait pills
- Cards are display-only (no click actions needed here)
- Sort: newest first (default)

### 4. Status Bar (persistent top bar)

Present on every screen:
- Energy: lightning bolt icon + `24/30` with a thin colored bar underneath
- Level + XP bar: `Lv.5` with a small progress bar
- Collection count: small creature icon + number

### 5. Register Hybrid Result

After AI registers a hybrid species:
- Art revealed with a shimmer/unveil animation (clip-path wipe)
- Species name + description fade in
- "Added to species index" confirmation

## Visual Design

### Color palette

Dark theme, consistent with current terminal aesthetic but polished:

```css
--bg-primary: #0a0a0f;        /* deep dark, not pure black */
--bg-card: #14141f;            /* card backgrounds */
--bg-card-hover: #1a1a2e;     /* card hover state */
--border-card: #2a2a3e;       /* subtle card borders */
--text-primary: #e0e0e8;      /* main text */
--text-secondary: #8888a0;    /* secondary/dim text */
--accent: #7c5cff;            /* buttons, highlights */

/* Rarity colors (from existing palette, slightly adjusted for contrast on dark bg) */
--rarity-common: #9e9e9e;
--rarity-uncommon: #ffffff;
--rarity-rare: #00e676;
--rarity-superior: #00e5ff;
--rarity-elite: #448aff;
--rarity-epic: #d500f9;
--rarity-legendary: #ffea00;
--rarity-mythic: #ff1744;
```

### Typography

```css
font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
```

Keep monospace for the game aesthetic. Creature art requires it. Body text can be slightly larger (15-16px) than the current 14px for readability.

### Creature art rendering

The existing ASCII art templates (4-5 lines, ~13 chars wide) are rendered as styled `<pre>` blocks inside cards, but each line is colorized according to the creature's slot rarity:

```html
<pre class="creature-art">
<span style="color: var(--rarity-epic)">  /◊◊\  </span>
<span style="color: var(--rarity-rare)">  {○○}  </span>
<span style="color: var(--rarity-legendary)"> /████\ </span>
<span style="color: var(--rarity-common)">  ~\/~  </span>
</pre>
```

The `zones` array on each species maps art lines to slots, which map to rarity colors. This is exactly how `SimpleTextRenderer` does it — we just use CSS colors instead of ANSI codes.

### Card styling

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-width: 180px;
}
.card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(124, 92, 255, 0.15);
  border-color: var(--accent);
}
```

## Animations

All CSS-only, no JS animation libraries.

| Animation | Trigger | CSS technique |
|-----------|---------|---------------|
| Card hover lift | Mouse hover | `transform: translateY(-4px)` with transition |
| Card select pulse | Click | `@keyframes pulse` — brief scale(1.05) + border glow |
| Catch burst | Successful catch | `@keyframes burst` — radial gradient expanding from center, opacity fade |
| Catch shake | Failed catch | `@keyframes shake` — translateX oscillation |
| Creature fade-in | Result display | `@keyframes fadeInUp` — opacity 0→1, translateY 10px→0 |
| Breed merge | Breed result | Parents `translateX(±50px)`, baby `opacity 0→1` at center |
| Trait upgrade flash | Rarity upgrade | `@keyframes flash` — brief white overlay on the trait pill |
| New species shimmer | Hybrid registered | `@keyframes shimmer` — linear-gradient moving across text |
| Cards slide in | Next hand ready | `@keyframes slideUp` — translateY(30px)→0 with staggered delay per card |
| XP bar fill | XP gained | `transition: width 0.5s ease` on the bar fill element |
| Skip button | Always visible | Dim opacity, brightens on hover |

## Interaction Flow

### Click-to-play flow (sidecar available)

1. `/play` MCP tool is called → HtmlAppRenderer returns card draw HTML with sidecar port embedded
2. User sees cards in iframe, clicks card B
3. Iframe JS: card B plays a "selected" animation, then `fetch("http://127.0.0.1:PORT/action?choice=b")`
4. Sidecar: loads engine, runs `playCard(state, 1, Math.random)`, renders result with HtmlAppRenderer, returns HTML
5. Iframe JS: receives HTML, crossfades old content → new content (result + next hand)
6. User clicks next card... loop continues

The user plays entirely within the iframe. No chat interaction needed until they're done.

### Fallback flow (no sidecar)

1. `/play` MCP tool returns cards with labels "A", "B", "C"
2. Cards are display-only (no click handlers)
3. User types choice in chat → AI calls `play` tool with `choice: "b"` → new HTML returned
4. Same as current behavior, just prettier

### Race condition handling

The sidecar holds a file lock on `state.json` during read-modify-write to prevent the MCP tool and sidecar from corrupting state if called simultaneously. The lock is held briefly (<50ms for a typical action).

## Sidecar HTTP Server Detail

**Location:** `src/cursor-sidecar.ts`

**Startup:** Launched by `mcp-server-cursor.ts` as a child process on server init. Writes port to `~/.compi/cursor-port`.

**Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/action` | GET | `?choice=a\|b\|c\|s` — execute a card play, return full HTML page |
| `/health` | GET | Returns `200 OK` — used by iframe to check if sidecar is alive |

**Lifecycle:** Sidecar exits when the parent MCP server process exits (listens for parent disconnect).

**Security:** Binds to `127.0.0.1` only. No auth needed — it's localhost-only and the worst case is someone on the same machine plays your creature game.

## Scope

### In scope
- `HtmlAppRenderer` implementing full `Renderer` interface
- HTTP sidecar for click-to-play
- CSS animations for all game events
- Card draw, play result, collection, and hybrid registration screens
- Status bar with energy/XP/level

### Out of scope
- Sound/audio
- Drag-and-drop breeding (click-based is sufficient)
- Persistent WebSocket connection (fetch per action is fine)
- Mobile/touch optimization (Cursor is desktop)
- Species index screen in HTML (low priority, can stay text)
- Settings/configuration UI

## Testing

- `HtmlAppRenderer` unit tests: verify HTML output contains expected elements/classes for each render method
- Sidecar integration test: start sidecar, send `/action?choice=a`, verify valid HTML response and state mutation
- Manual testing in Cursor for visual verification (animations, layout, click flow)
