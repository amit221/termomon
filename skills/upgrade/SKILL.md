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

After both steps:
- Read the `advisor_context` JSON block at the end of the tool response.
- Narrate the upgrade in 1-2 sentences with game personality (e.g. comment on the new rank, whether it crossed a tier boundary, or hype the creature's improvement).
- If `advisor_context.mode` is `"advisor"`, show the top suggested actions from `advisor_context.suggestedActions` (up to 3) as a short numbered list with their labels.
- End with: "Press Ctrl+O to expand the output above and see the result."

If the tool returns an error (e.g., not enough gold, max rank reached, session cap), report the error message as-is.

Keep narrator commentary to 1-2 sentences. Do NOT describe the upgrade result in detail.
