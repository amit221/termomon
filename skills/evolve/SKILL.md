---
name: evolve
model: claude-haiku-4-5-20251001
description: Evolve a creature that has enough fragments
---

Parse the argument for the creature ID. The creature name should be lowercased (e.g., "mousebyte", not "Mousebyte").

Usage: `/evolve [creature-name]`

Use the `mcp__termomon__evolve` tool with the parsed `creatureId` (string).

CRITICAL: Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat. The output contains ASCII art that must be preserved exactly.
