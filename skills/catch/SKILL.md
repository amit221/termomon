---
name: catch
model: claude-haiku-4-5-20251001
description: Attempt to catch a nearby creature
---

Parse the arguments to determine:
- Which creature number (1-indexed) from the scan list
- Optionally which item to use (default: bytetrap)

Usage: `/catch [number]` or `/catch [number] --item=netsnare`

Use the `mcp__termomon__catch` tool with the parsed `index` (number) and optionally `item` (string).

CRITICAL: Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat. The output contains ASCII art that must be preserved exactly.

After the code block, if the catch succeeds congratulate briefly. If it fails, let the user know they can try again.
