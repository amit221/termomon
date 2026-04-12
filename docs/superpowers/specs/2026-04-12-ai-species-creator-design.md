# AI Species Creator — Design Spec

## Overview

A Claude Code skill (`/create-species`) that uses AI to generate complete new creature species for Compi. The AI autonomously creates the species name, description, ASCII art template (with varied poses and silhouettes), color zones, trait pools, and rarity distribution. A validation script ensures correctness before writing to config.

## Problem

Current creature art uses a template + placeholder system where each species has a fixed frame and 4 swappable slots (eyes, mouth, body, tail) limited to ~3 characters each. This produces creatures that look very similar within a species — same pose, same symmetry, same silhouette. Additionally, only the placeholder characters receive rarity-based coloring, leaving most of the art uncolored.

## Goals

- AI generates unique species with distinct silhouettes, poses, and angles (not all forward-facing/symmetric)
- Each species gets a full ASCII art template (4-6 lines) with placeholder slots for trait variation
- Color zones: entire lines of the art get colored by slot rarity, not just placeholder chars
- Ping-pong review workflow: AI generates, user reviews, iterates until approved
- Validation script prevents malformed or duplicate species from entering config
- Migrate existing 6 species to use the new color zone system

## Species JSON Schema

New species files follow this format in `config/species/<id>.json`:

```json
{
  "id": "pyrix",
  "name": "Pyrix",
  "description": "A restless flame sprite, always mid-leap.",
  "spawnWeight": 8,
  "art": [
    "   /\\___",
    "  ( EE  >",
    " <  MM /",
    "  \\BB/",
    "   TT"
  ],
  "zones": ["tail", "eyes", "mouth", "body", "tail"],
  "traitPools": {
    "eyes": [
      { "id": "pyx_eye_01", "name": "Ember", "art": "◉◉", "spawnRate": 0.12 },
      ...
    ],
    "mouth": [ ... ],
    "body": [ ... ],
    "tail": [ ... ]
  }
}
```

### Key fields

- **`art`**: Array of strings forming the ASCII art template. Contains placeholders `EE`, `MM`, `BB`, `TT` for eyes, mouth, body, tail slots respectively.
- **`zones`**: Array of slot IDs (`"eyes"`, `"mouth"`, `"body"`, `"tail"`), one per art line. Determines which slot's rarity color applies to the entire line at render time.
- **`traitPools`**: Object with keys for each slot containing ~17 trait variants. Each trait has an `id`, `name`, `art` string, and `spawnRate`.

### Constraints

- `zones` array length must equal `art` array length.
- Each placeholder (`EE`, `MM`, `BB`, `TT`) must appear exactly once across all art lines.
- All trait art variants for a slot must have the same character width as their placeholder (e.g., `EE` = 2 chars, so all eye art is 2 chars).
- Trait IDs follow the `<prefix>_<slot>_<number>` convention (e.g., `pyx_eye_01`).
- Spawn rates per slot should sum to approximately 1.0.

## Renderer Changes

### `renderCreatureLines()` in `src/renderers/simple-text.ts`

After placeholder replacement, the renderer checks for the `zones` array on the species:

```
for each line in art:
  zone = species.zones[lineIndex]   // e.g. "eyes"
  color = rarity color of that slot
  apply color to the entire line
```

This replaces the current per-character placeholder coloring logic. The `renderGreySilhouette()` function is unchanged (everything renders grey regardless of zones).

## Validation Script

`scripts/validate-species.js` — a Node script that validates a species JSON file before writing it to config. Checks:

1. Valid JSON matching the species schema (all required fields present and typed correctly)
2. `id` and `name` don't conflict with any existing species in `config/species/`
3. `zones` array length matches `art` array length
4. Each zone value is a valid slot ID (`eyes`, `mouth`, `body`, `tail`)
5. Every placeholder (`EE`, `MM`, `BB`, `TT`) appears exactly once in the art
6. Each trait variant's art width matches its placeholder width
7. Trait IDs follow the `<prefix>_<slot>_<number>` convention
8. Spawn rates per slot sum to approximately 1.0
9. No duplicate trait IDs within or across slots

Usage: `node scripts/validate-species.js <path-to-species.json>`

On success: writes the validated file to `config/species/<id>.json` and exits 0.
On failure: prints validation errors and exits 1.

## Skill: `/create-species`

A `SKILL.md` file in `skills/create-species/` that instructs Claude to:

1. **Read existing species**: Read all files in `config/species/` to understand what creatures already exist — avoid duplicating concepts, names, or visual styles.
2. **Generate a new species**: Autonomously create:
   - A unique species concept (not overlapping with existing ones)
   - Species name, ID, and description
   - ASCII art template (4-6 lines) with a **distinctive silhouette and pose** — varied angles (side view, 3/4, curled up, mid-action), asymmetry encouraged, not all forward-facing
   - Placeholders (`EE`, `MM`, `BB`, `TT`) embedded in the art
   - Zone assignments per line
   - `spawnWeight` based on how rare/common the species should feel
   - ~17 trait variants per slot with names, art (matching placeholder width), and rarity-distributed spawn rates
3. **Preview**: Show the complete creature — rendered art with an example trait set, plus the trait list and zone mapping.
4. **Ping-pong loop**: User reviews and requests changes ("make it face left", "different name", "spookier traits"). Claude regenerates and shows again. Repeat until approved.
5. **Save**: Run `node scripts/validate-species.js` on the generated JSON. If validation passes, the file is written to `config/species/<id>.json`. If validation fails, fix the issues and retry.

### Prompt guidance for art quality

The skill prompt should emphasize:
- **Varied poses**: sitting, jumping, sleeping, walking, stretching, pouncing, curled up
- **Different angles**: front, side, 3/4 view, from behind, looking up/down
- **Unique silhouettes**: the outline alone should distinguish each species
- **Asymmetry**: not everything centered and mirrored
- **Character**: the pose should convey the creature's personality

## Migration: Existing Species

Add `zones` arrays to all 6 existing species files:

- `compi.json` — uses fallback layout (no `art` array), needs an art template + zones added
- `flikk.json` — has art, needs zones
- `glich.json` — has art, needs zones
- `jinx.json` — has art, needs zones
- `monu.json` — has art, needs zones
- `whiski.json` — has art, needs zones

For each species, inspect the art template and assign each line to the slot it visually represents. The renderer code is updated to require zones on all species (no fallback path).

## Type Changes

In `src/types.ts`, the `SpeciesDefinition` type (or equivalent) needs a `zones` field:

```typescript
zones: SlotId[];  // one per art line, maps line to slot color
```

## Files Changed

| File | Change |
|------|--------|
| `skills/create-species/SKILL.md` | New — skill definition |
| `scripts/validate-species.js` | New — validation script |
| `src/renderers/simple-text.ts` | Update — zone-based line coloring |
| `src/types.ts` | Update — add `zones` to species type |
| `config/species/*.json` | Update — add `zones` to all 6 species |
| `src/config/species.ts` | May need update if species loading needs changes |
