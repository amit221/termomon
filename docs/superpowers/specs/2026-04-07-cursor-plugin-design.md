# Cursor Plugin Design

Add a Cursor IDE plugin to the Compi repo so the game works on both Claude Code and Cursor from a single codebase.

## Context

Compi currently integrates with Claude Code through:
- Plugin manifest (`.claude-plugin/plugin.json`)
- Hooks (`hooks/hooks.json`) — fires `tick-hook.js` on PostToolUse, Stop, SessionStart
- MCP server (`src/mcp-server.ts`) — exposes game tools via MCP protocol
- Skills (`skills/`) — slash commands that call MCP tools and display colored output

Cursor supports a nearly identical plugin model: `.cursor-plugin/plugin.json`, hooks, skills, and MCP servers. The engine, state, config, renderers, and MCP server require zero changes.

## Approach

Same repo, parallel platform files. The MCP server and game engine are shared. Each platform gets its own manifest, hooks config, and skills.

## New Files

### `.cursor-plugin/plugin.json`

Cursor plugin manifest. Only `name` is required per the [official schema](https://github.com/cursor/plugins/blob/main/schemas/plugin.schema.json).

```json
{
  "name": "compi",
  "displayName": "Compi",
  "version": "0.1.0",
  "description": "Terminal creature collection game — catch digital beings as you work",
  "author": { "name": "compi" },
  "repository": "https://github.com/amit221/compi",
  "license": "MIT",
  "keywords": ["game", "terminal", "creatures", "collection"],
  "category": "entertainment",
  "skills": "./cursor-skills/",
  "hooks": "./hooks/cursor-hooks.json",
  "mcpServers": {
    "compi": {
      "command": "node",
      "args": ["${CURSOR_PLUGIN_ROOT}/dist/mcp-server.js"],
      "env": {
        "COMPI_DISPLAY_FILE": "0"
      }
    }
  }
}
```

### `hooks/cursor-hooks.json`

Mirrors Claude Code hooks with Cursor event names.

```json
{
  "hooks": {
    "afterFileEdit": [
      {
        "command": "node \"${CURSOR_PLUGIN_ROOT}/scripts/tick-hook.js\""
      }
    ],
    "stop": [
      {
        "command": "node \"${CURSOR_PLUGIN_ROOT}/scripts/tick-hook.js\""
      }
    ],
    "sessionStart": [
      {
        "command": "node \"${CURSOR_PLUGIN_ROOT}/scripts/tick-hook.js\""
      }
    ]
  }
}
```

Event mapping:
| Claude Code | Cursor |
|---|---|
| PostToolUse | afterFileEdit |
| Stop | stop |
| SessionStart | sessionStart |
| UserPromptSubmit | beforeSubmitPrompt |

### `cursor-skills/`

Separate skills directory for Cursor. Initially written without the temp file display hack — MCP output rendered directly. If testing shows Cursor strips ANSI, these will be updated to use the same `COMPI_DISPLAY_FILE` approach.

Each skill follows the same `SKILL.md` frontmatter format as Claude Code skills but with platform-agnostic tool references (e.g., "call the compi `scan` MCP tool" instead of `mcp__plugin_compi_compi__scan`).

Skills to create (8 total):
- `cursor-skills/scan/SKILL.md`
- `cursor-skills/catch/SKILL.md`
- `cursor-skills/collection/SKILL.md`
- `cursor-skills/merge/SKILL.md`
- `cursor-skills/energy/SKILL.md`
- `cursor-skills/status/SKILL.md`
- `cursor-skills/settings/SKILL.md`
- `cursor-skills/list/SKILL.md`

### `scripts/cursor-install.sh`

Dev install script. Copies built plugin to `~/.cursor/plugins/compi/`, registers in `~/.claude/plugins/installed_plugins.json`, and enables in `~/.claude/settings.json`. Required because Cursor has no hot-reload or `--plugin-dir` flag for local dev.

Reference: [Local Cursor plugin testing guide](https://medium.com/@v.tajzich/how-to-write-and-test-cursor-plugins-locally-the-part-the-docs-dont-tell-you-4eee705d7f76)

## Modified Files

### `scripts/tick-hook.js`

Add Cursor event name compatibility for the scan notification check:

```js
// Before
if (data.hook_event_name === "UserPromptSubmit") {

// After
if (data.hook_event_name === "UserPromptSubmit" ||
    data.hook_event_name === "beforeSubmitPrompt") {
```

### `package.json`

Add `.cursor-plugin/` and `cursor-skills/` to the `files` array.

## Unchanged

- Engine (`src/engine/`) — zero changes
- State (`src/state/`) — zero changes
- Config (`config/`) — zero changes
- Renderers (`src/renderers/`) — zero changes
- MCP server (`src/mcp-server.ts`) — zero changes
- Claude Code plugin files (`.claude-plugin/`, `hooks/hooks.json`, `skills/`) — zero changes

## Testing Plan

1. `npm run build`
2. Run `scripts/cursor-install.sh` to copy plugin to `~/.cursor/plugins/compi/`
3. Restart Cursor
4. Verify plugin appears in Settings > Plugins
5. Verify hooks fire — check `~/.compi/compi.log` for tick entries after editing a file
6. Run `/scan` in Cursor agent chat
7. Check if ANSI colors render in MCP output
   - **If yes:** cursor-skills stay as-is, `COMPI_DISPLAY_FILE=0`
   - **If no:** update cursor-skills to use temp file + cat, set `COMPI_DISPLAY_FILE=1`

## Open Questions

- Exact env var name for plugin root in Cursor (`${CURSOR_PLUGIN_ROOT}` assumed — needs verification)
- Whether Cursor's stdin JSON for hooks uses the same field names as Claude Code (`session_id`, `hook_event_name`)
- Whether Cursor renders ANSI in MCP text responses (determines skill approach)
