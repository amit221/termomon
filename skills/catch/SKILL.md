---
name: catch
model: claude-haiku-4-5-20251001
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

1. Call the `mcp__plugin_compi_compi__catch` tool with the parsed `index` (number).
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps:
- Read the `advisor_context` JSON block at the end of the tool response.
- Narrate what happened in 1-2 sentences with game personality (e.g. for a successful catch: excitement about the creature; for a flee: commiserate briefly).
- If `advisor_context.mode` is `"advisor"`, list the top suggested actions from `advisor_context.suggestedActions` (up to 3) as a short numbered list with their labels.
- End with: "Press Ctrl+O to expand the output above and see the result."

Example narrator lines:
- Caught: "Nailed it! [Name] is now yours — check those traits."
- Escaped: "[Name] slipped away! You've still got attempts left."
- Fled: "Gone for good. The wilds can be cruel."
- New species: "First [species] ever! A new page in your Compidex."
- Merge available: "You've got two [species] now — a merge is possible."

Keep narrator commentary to 1-2 sentences. Do NOT reproduce the full ANSI output in text.
