<div align="center">

```
 ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║
██║     ██║   ██║██╔████╔██║██████╔╝██║
██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝
```

### Collect creatures while you code — without ever leaving your agent.

Your coding activity spawns unique ASCII creatures with randomized traits across 6 rarity tiers.
Scan to discover them. Catch the ones you want. Merge to upgrade. **15.6 billion possible combinations.**

Works with **Claude Code** | **Cursor** | **Codex** | and more coming soon

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/Tests-71_passing-brightgreen.svg)]()

</div>

---

<div align="center">
<img src="assets/compi-demo.gif" alt="Compi gameplay — scan, catch, and collect creatures in your terminal" width="680" />
</div>

## How It Works

```
1. Code normally        Your prompts, tool calls, and commits generate "ticks"
2. Creatures spawn      Every ~10 ticks, a batch of 3-5 creatures appears nearby
3. Scan & catch         Run /scan to see them, /catch to grab the ones you want
4. Merge & upgrade      Sacrifice one creature to boost another's rarity tier
```

Each creature is built from **4 trait slots** (eyes, mouth, body, tail) with individual rarity and unique ASCII art. Rarer traits glow in different colors — from gray commons to red mythics.

<div align="center">
<img src="assets/banner.svg" alt="compi creatures across rarity tiers" width="700" />
</div>

## Why Compi?

- **Zero context-switching** — the game lives inside your coding agent, not a separate app
- **Your work fuels the game** — creatures spawn from your actual coding activity
- **Real depth** — 6 rarity tiers, weighted catch rates, merge strategy, streaks, leveling
- **Every creature is unique** — 4 slots x 6 rarities x multiple variants = billions of combos
- **Lightweight** — hooks only, no background processes, no performance impact
- **Open source** — MIT licensed, community-driven

## Installation

### Claude Code

```bash
/plugin marketplace add amit221/compi
/plugin install compi@compi
```

Then enable auto-update so you always get the latest version:
1. Type `/plugin` to open the plugin manager
2. Go to the **Marketplaces** tab
3. Select **compi**
4. Enable **auto-update**

**Optional: add a dedicated `compi` alias**

For the best experience, add a shell alias that launches a lightweight Compi-only session (Haiku model, Compi tools + file/CLI access):

```bash
alias compi='claude --model haiku --verbose --allowedTools "mcp__plugin_compi_compi__*" "Read" "Write" "Edit" "Bash"'
```

Add it to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`). **PowerShell** users — add this to your profile (`$PROFILE`) instead:

```powershell
function compi { & claude.cmd --model haiku --verbose --allowedTools "mcp__plugin_compi_compi__*" "Read" "Write" "Edit" "Bash" @args }
```

Then just run `compi` to start a dedicated session.

### Cursor

> Requires **Cursor 2.5 or later** (plugins support was added in 2.5).

Compi isn't on the official Cursor Marketplace yet, but Cursor's `/add-plugin` command can install any plugin directly from a GitHub repository. In an Agent chat, type:

```
/add-plugin compi@https://github.com/amit221/compi
```

> `/add-plugin` won't appear in autocomplete — type the full command.

Then **restart Cursor** and verify it shows up under **Settings → Plugins**.

On Cursor, Compi runs as an HTTP MCP server on `localhost:3456` (auto-started by the `sessionStart` hook) and renders output as an HTML panel via MCP Apps. The slash commands (`/scan`, `/catch`, `/collection`, …) work the same as in Claude Code.

To change the port, set `COMPI_PORT` in your environment before Cursor launches and update the `url` in `.cursor-plugin/plugin.json` to match.

## Playing

**Option 1: Dedicated Compi session** (recommended for best experience)

- **Claude Code** — run the `compi` alias you set up above to open a lightweight Haiku-powered session focused on the game.
- **Cursor** — open a new chat dedicated to Compi and use the slash commands directly. Keeping it separate from your coding chats prevents the HTML panel output from cluttering your working context.

**Option 2: Play alongside your work**

Compi runs in the background of any Claude Code or Cursor session. Creatures spawn as you work — you'll see notifications and can interact with `/scan`, `/catch`, `/merge` at any time without interrupting your workflow.

## Commands

| Command | CLI | What it does |
|---------|-----|-------------|
| `/scan` | `compi scan` | Show nearby creatures with traits, catch rates, and energy costs |
| `/catch [n]` | `compi catch [n]` | Catch creature #N from the current batch |
| `/merge [a] [b]` | `compi merge [a] [b]` | Sacrifice creature B to upgrade creature A |
| `/collection` | `compi collection` | Browse your caught creatures and their traits |
| `/energy` | `compi energy` | Check your current energy level |
| `/status` | `compi status` | Player profile, stats, and progress |
| `/settings` | `compi settings` | Configure notifications and preferences |

## Contributing

Compi is open source and contributions are welcome! Found a bug, have an idea for a new trait variant, or want to suggest a balance tweak? **[Open an issue](https://github.com/amit221/compi/issues/new)** — that's the best place to start a conversation before sending a PR.

## Stay in the loop

- **Twitter/X:** follow [@compi_game](https://twitter.com/compi_game) for update announcements, new creatures, and release notes
- **Reddit:** join the community at [r/compi](https://reddit.com/r/compi) to share rare catches, swap strategies, and talk merge combos
- **GitHub:** [watch the repo](https://github.com/amit221/compi) to get notified on releases

<div align="center">

---

```
   ╭─────────────────────────────╮
   │  gotta catch 'em while you  │
   │          commit             │
   ╰─────────────────────────────╯
```

### Enjoying Compi? Help it grow.

[![Star on GitHub](https://img.shields.io/github/stars/amit221/compi?style=for-the-badge&logo=github&color=yellow&label=Star)](https://github.com/amit221/compi)
[![Follow on X](https://img.shields.io/badge/Follow-%40compi__game-black?style=for-the-badge&logo=x)](https://twitter.com/compi_game)
[![Join Reddit](https://img.shields.io/badge/Join-r%2Fcompi-FF4500?style=for-the-badge&logo=reddit&logoColor=white)](https://reddit.com/r/compi)

**⭐ Star** the repo so others can find it &nbsp;·&nbsp; **🐦 Follow** for new creatures and releases &nbsp;·&nbsp; **💬 Join** the community to show off rare catches

<sub>Built with ❤️ for the terminal. MIT licensed. No telemetry, no background processes, no bullshit.</sub>

</div>
