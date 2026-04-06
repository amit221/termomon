---
name: merge
model: claude-haiku-4-5-20251001
description: Merge two creatures from your collection
---

Parse the arguments for target and food creature IDs.

Usage: `/merge [targetId] [foodId]`

1. Call `mcp__plugin_compi_compi__merge` with `targetId` and `foodId` (no `confirm`) to get the preview.
2. Then run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
3. Respond with: "Press Ctrl+O to expand the merge preview above. Proceed with /merge [targetId] [foodId] --confirm"

If `--confirm` is in the arguments:
1. Call `mcp__plugin_compi_compi__merge` with `targetId`, `foodId`, and `confirm: true`.
2. Run the same Bash cat+rm command.
3. Respond with: "Press Ctrl+O to expand the merge result above."
