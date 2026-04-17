---
name: play
description: "Play Compi — draw cards and catch or breed creatures"
---

# /play

You are running the Compi game. Use the `play` MCP tool to interact.

## How it works

1. Call `play` with no arguments to draw cards
2. Show the output verbatim to the player using `node scripts/cli.js play`
3. The player replies with a letter (a, b, c) to pick a card or (s) to skip
4. Call `play` with their choice: `play(choice: "a")`
5. Show the result verbatim
6. Repeat — the result includes the next set of cards

## Rules

- ALWAYS show game output by running the bash command: `node scripts/cli.js play [choice]`
- NEVER summarize, paraphrase, or reformat the game output
- NEVER add emoji
- Keep your commentary to 1 sentence max between turns
- If the player says a letter or "skip", pass it as the choice
- If the player wants to stop, just stop — no special command needed
