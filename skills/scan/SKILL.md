---
name: scan
model: claude-haiku-4-5-20251001
description: Show nearby creatures that can be caught
---

1. Call the `mcp__plugin_compi_compi__scan` tool to scan for nearby creatures.
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, count the creatures from the MCP response and respond with a brief narrator line in the style of a creature-collection game announcer — something like "3 compis detected nearby! The wilds are active today." Keep it to one short sentence. Then add: "Press Ctrl+O to expand the output above and see them."

Do NOT list or describe individual creatures.
