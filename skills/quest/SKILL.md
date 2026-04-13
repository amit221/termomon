---
name: quest
model: claude-haiku-4-5-20251001
description: Send creatures on a quest or check quest progress
---

Parse the arguments. The command supports two shapes:

- `/quest start <creatureId1> [creatureId2] [creatureId3]` — send 1-3 creatures on a quest
- `/quest check` — check if the active quest is complete and collect rewards

Flow:

1. If the subcommand is `start`:
   - Parse the creature IDs from the arguments (1-3 IDs)
   - Call `mcp__plugin_compi_compi__quest_start` with `creatureIds` array
2. If the subcommand is `check` (or no subcommand given):
   - Call `mcp__plugin_compi_compi__quest_check` with no arguments

After the tool call, run this Bash command to display the result with colors:

```
_t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
```

Then respond based on which mode was used:

- Start mode: "Press Ctrl+O to expand the output above. Your creatures are on their quest!"
- Check mode (complete): "Press Ctrl+O to expand the output above and see your rewards."
- Check mode (in progress): Report the in-progress message as-is.
- Error mode: Report the error message as-is.

Do not describe the tool output in your own words.
