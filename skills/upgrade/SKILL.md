---
name: upgrade
model: claude-haiku-4-5-20251001
description: Upgrade a creature's trait slot using gold
---

Parse the arguments for which creature to upgrade and which slot.

Usage: `/upgrade <creatureId> <slotId>`

- `creatureId`: The ID of the creature (from /collection)
- `slotId`: One of `eyes`, `mouth`, `body`, or `tail`

1. Call the `mcp__plugin_compi_compi__upgrade` tool with `creatureId` and `slotId`.
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, respond with ONLY:
"Press Ctrl+O to expand the output above and see the result."

If the tool returns an error (e.g., not enough gold, max rank reached, session cap), report the error message as-is.

Do NOT describe the upgrade result in your own words.
