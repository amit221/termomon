---
name: settings
model: claude-haiku-4-5-20251001
description: View or change game settings (renderer, notifications)
---

View or change compi settings.

Usage:
- `/settings` — view current settings
- `/settings renderer [rich|simple|browser|terminal]` — change renderer
- `/settings notifications [minimal|moderate|off]` — change notification level

Parse the arguments to determine `key` and `value` (both optional strings).

Use the `mcp__compi__settings` tool with the parsed arguments.

CRITICAL: Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat.
