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

- Start mode:
  - Read the `advisor_context` JSON block at the end of the tool response.
  - Narrate the quest departure in 1-2 sentences (e.g. "Your crew heads out into the unknown — come back with gold!").
  - Show the top suggested actions from `advisor_context.suggestedActions` (up to 3) as a short numbered list.
  - End with: "Press Ctrl+O to expand the output above. Your creatures are on their quest!"
- Check mode (complete):
  - Read the `advisor_context` JSON block at the end of the tool response.
  - Narrate the return in 1-2 sentences (e.g. celebrate the gold and XP earned).
  - End with: "Press Ctrl+O to expand the output above and see your rewards."
- Check mode (in progress): Report the in-progress message as-is.
- Error mode: Report the error message as-is.

Keep narrator commentary to 1-2 sentences. Do not describe the full tool output in your own words.
