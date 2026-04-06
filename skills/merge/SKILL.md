---
name: merge
model: claude-haiku-4-5-20251001
description: Merge two creatures from your collection
---

Parse the arguments for target and food creature IDs.

Usage: `/merge [targetId] [foodId]`

First call `mcp__plugin_compi_compi__merge` with `targetId` and `foodId` (no `confirm`) to show the merge preview.

CRITICAL: Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat. The output contains colored ASCII art that must be preserved exactly.

After showing the preview, ask the user if they want to proceed. If yes, call `mcp__plugin_compi_compi__merge` again with `targetId`, `foodId`, and `confirm: true`.
