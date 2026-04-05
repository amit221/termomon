# Compi MCP Server Design

## Problem

Skills invoke the CLI via Bash subprocess (`node dist/cli.js <command>`). Claude Code's Bash tool truncates large stdout output, cutting off ASCII art and creature displays.

## Solution

Expose game engine methods as MCP tools via a stdio-based MCP server. Skills become thin wrappers that instruct Claude to call MCP tools instead of running Bash commands.

## Architecture

```
User invokes /compi:scan
  → SKILL.md tells Claude: "call mcp__compi__scan tool"
  → Claude calls MCP tool (native tool call, no Bash)
  → mcp-server.ts receives request
  → Loads state from ~/.compi/state.json
  → Creates GameEngine, calls scan()
  → Renders result with SimpleTextRenderer
  → Saves state back to disk
  → Returns rendered text as tool result
  → Claude displays it to user
```

## New Files

### `src/mcp-server.ts`

MCP server using `@modelcontextprotocol/sdk` with stdio transport.

Load/save state per tool call (stateless — same pattern as CLI). This avoids stale state conflicts with the hook script which also writes to state.json.

**Tools exposed:**

| Tool | Input Schema | Description |
|------|-------------|-------------|
| `scan` | `{}` | Show nearby creatures |
| `catch` | `{ index: number, item?: string }` | Attempt to catch creature at 1-indexed position. Default item: bytetrap |
| `evolve` | `{ creatureId: string }` | Evolve a creature |
| `status` | `{}` | View player profile and stats |
| `collection` | `{}` | Browse caught creatures |
| `inventory` | `{}` | View items |
| `settings` | `{ key?: string, value?: string }` | View or change settings. No args = show all. Key only = show one. Key + value = update. |

Each tool:
1. Instantiates StateManager with the standard state path
2. Calls `stateManager.load()`
3. Creates `GameEngine(state)`
4. Calls the relevant engine method
5. Creates `SimpleTextRenderer()` and renders the result
6. Calls `stateManager.save(engine.getState())` for mutating operations
7. Returns `{ content: [{ type: "text", text: renderedOutput }] }`

### `.mcp.json`

Plugin MCP server registration at project root:

```json
{
  "mcpServers": {
    "compi": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dist/mcp-server.js"]
    }
  }
}
```

## Modified Files

### `skills/*/SKILL.md` (7 files, excluding `list`)

Each skill's instructions change from "run this Bash command" to "use the MCP tool."

Example for scan:
```markdown
---
name: scan
model: claude-haiku-4-5-20251001
description: Show nearby creatures that can be caught
---

Use the `mcp__compi__scan` tool to scan for nearby creatures.

Display the output exactly as returned — it contains ASCII art and creature information. Do not summarize or reformat.
```

Example for catch:
```markdown
---
name: catch
model: claude-haiku-4-5-20251001
description: Attempt to catch a nearby creature
---

Parse the arguments to determine:
- Which creature number (1-indexed) from the scan list
- Optionally which item to use (default: bytetrap)

Usage: `/catch [number]` or `/catch [number] --item=netsnare`

Use the `mcp__compi__catch` tool with the parsed arguments.

Display the output exactly as returned. If the catch succeeds, congratulate briefly. If it fails, let the user know they can try again.
```

### `package.json`

Add dependency:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

## Unchanged

- `src/engine/` — All game engine modules untouched
- `src/renderers/` — SimpleTextRenderer untouched
- `src/state/` — StateManager untouched
- `src/types.ts` — No type changes
- `src/config/` — No config changes
- `src/cli.ts` — Stays for hook script and standalone use
- `src/index.ts` — No changes
- `hooks/` — Hook system unchanged, still uses CLI
- `scripts/tick-hook.js` — Unchanged
- `tests/` — No test changes needed for existing code
- `skills/list/SKILL.md` — Static markdown, no CLI/MCP call

## New Tests

- `tests/mcp-server.test.ts` — Test that each MCP tool returns expected rendered output given a known game state. Mock StateManager to inject test state.

## Error Handling

- If state file is missing, StateManager already returns a default state — no special handling needed.
- If a tool receives invalid input (e.g., catch with bad index), return the error message from the engine/renderer as text content.
- MCP server process errors logged to stderr (won't interfere with stdio transport).
