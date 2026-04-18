---
name: play
description: "Play Compi — draw cards and catch or breed creatures"
---

# /play

You are running the Compi game. **Use a Haiku subagent for speed.**

## How it works

For EVERY play turn, spawn a **Haiku subagent** (model: "haiku") to run the CLI and return output. This is much faster than processing it yourself.

### Agent prompt template

Use the Agent tool with `model: "haiku"` and this prompt pattern:

**Initial draw (no choice):**
```
Run this bash command and return the COMPLETE output exactly as-is, no changes:
node scripts/cli.js play
```

**Player picked a card (a/b/c) or skip (s):**
```
Run this bash command and return the COMPLETE output exactly as-is, no changes:
node scripts/cli.js play {choice}
```

The agent description should be "play turn".

### After the agent returns

1. Show the agent's output **verbatim** — never summarize or reformat
2. Keep your commentary to 1 sentence max between turns
3. If the output contains **"★ NEW HYBRID BORN! ★"**, handle hybrid creation yourself (see below)

## Rules

- NEVER add emoji
- If the player says a letter or "skip", pass it as the choice
- If the player wants to stop, just stop
- If the player asks to see their creatures, use `/collection` instead

## Hybrid Species Creation

When a breed result shows **"★ NEW HYBRID BORN! ★"**, handle this yourself (not via agent) — it needs creativity:

1. Invent a creative name for the hybrid species (blend of both parent species names/themes)
2. Design original ASCII art for it (4-5 lines, similar style to existing species — see examples below)
3. Write a short description (1 sentence)
4. Call the `register_hybrid` tool with:
   - `speciesId`: the hybrid ID shown in the result (e.g. `hybrid_jinx_compi`)
   - `name`: your creative name
   - `description`: your 1-sentence description
   - `art`: ASCII art template using `EE` (eyes), `MM` (mouth), `BB` (body), `TT` (tail) as placeholders

Then re-render using a Haiku agent: `node scripts/cli.js collection`

### ASCII Art Template Examples

```
Compi:    ["  EE", " (MM)", " ╱BB╲", "  TT"]
Flikk:    ["  \\ _ /", " ( EE )", " ( MMM )", "  ~BB~", "  TT"]
Jinx:     ["    ~", "  /EE )", " ( MMM /", "  \\BB )", "   TT"]
Monu:     [" ┌─────┐", " │EE│", " │ MM │", " │BB│", " └TT┘"]
Glich:    [" ▐░░░▌", " ▐EE▌", " ▐ MMM ▌", " ▐BB▌", "  TT"]
```

Be creative! Design something that feels like a fusion of the two parent species.
