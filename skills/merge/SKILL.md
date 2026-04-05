---
name: merge
model: claude-haiku-4-5-20251001
description: Merge two creatures from your collection
---

Parse the arguments for two creature IDs to merge.

Usage: `/merge [id1] [id2]`

Use the `mcp__compi__merge` tool with `parentAId` (string) and `parentBId` (string).

CRITICAL: Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat. The output contains ASCII art that must be preserved exactly.

After the code block, briefly note the outcome. Both parents are consumed regardless — if it succeeded, mention the child. If it failed, both creatures are lost.
