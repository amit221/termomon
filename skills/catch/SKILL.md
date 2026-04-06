---
name: catch
model: claude-haiku-4-5-20251001
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

Use the `mcp__plugin_compi_compi__catch` tool with the parsed `index` (number).

CRITICAL: Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat. The output contains ASCII art that must be preserved exactly.

After the code block, if the catch succeeds congratulate briefly. If it fails, let the user know they can try again.
