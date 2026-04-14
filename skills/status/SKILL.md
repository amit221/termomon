---
name: status
model: claude-haiku-4-5-20251001
description: View your player profile and game stats
---

1. Call the `mcp__plugin_compi_compi__status` tool to view player stats.
2. Then run this Bash command to display it with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, add a single narrator line that gives a flavourful read on the player's current standing — for example, comment on their streak, level, or activity. Keep it to one short sentence. Then add: "Press Ctrl+O to expand the output above."
