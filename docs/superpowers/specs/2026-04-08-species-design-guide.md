# Species Design Guide

How to design and add a new creature species to Compi. Each species is a self-contained JSON file — just drop it in `config/species/` and it works.

---

## Reference File

Use `config/species/compi.json` as the reference template. It has the complete structure with 76 traits across 4 slots.

---

## Species JSON Structure

```json
{
  "id": "species_id",
  "name": "Display Name",
  "description": "One-line flavor text describing the creature.",
  "spawnWeight": 10,
  "art": [
    "  line1",
    "  line2",
    "  line3",
    "  line4"
  ],
  "traitPools": {
    "eyes": [ ...trait definitions... ],
    "mouth": [ ...trait definitions... ],
    "body": [ ...trait definitions... ],
    "tail": [ ...trait definitions... ]
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique lowercase identifier (e.g., "drakon", "felith"). Used in code and state. |
| `name` | string | Display name shown to players (e.g., "Drakon", "Felith") |
| `description` | string | Short flavor text for the species catalog |
| `spawnWeight` | number | Relative spawn weight. Currently all species use 10 (equal probability). Adjust to make some species rarer. |
| `art` | string[] | Multi-line ASCII art template (see ASCII Art section below) |
| `traitPools` | object | 4 keys: `eyes`, `mouth`, `body`, `tail`. Each is an array of TraitDefinition objects. |

---

## Trait Definition

Each trait in a slot pool:

```json
{
  "id": "drk_eye_01",
  "name": "Flame Gaze",
  "art": "🔥.🔥",
  "spawnRate": 0.12
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Globally unique ID. Convention: `{species_prefix}_{slot}_{number}` (e.g., `drk_eye_01` for Drakon eyes #1) |
| `name` | string | Display name for the trait |
| `art` | string | ASCII art fragment that gets placed into the species' art template |
| `spawnRate` | number | Probability of this trait spawning (0.003 to 0.12). See distribution below. |

### Trait ID Convention

```
{3-letter species prefix}_{slot prefix}_{2-digit number}

Slot prefixes: eye, mth, bod, tal

Examples:
  drk_eye_01  (Drakon, eyes, #1)
  fel_mth_15  (Felith, mouth, #15)
  gln_bod_03  (Gloon, body, #3)
```

Compi uses the legacy prefix pattern (`eye_c01`, `mth_u02`, etc.) — new species should use the new convention.

---

## Trait Count Per Slot

**Traits per slot do NOT need to be equal** — either across slots or across species.

- Minimum: 5 traits per slot (enough variety)
- Maximum: no hard limit, but 20+ per slot gets unwieldy
- Different slots can have different counts (e.g., 12 eye traits, 8 mouth traits, 15 body traits, 6 tail traits)
- Different species can have different total trait counts

The Compi reference has 19 per slot (76 total). A simpler species could have 8-10 per slot. A complex species could have 20+.

---

## Spawn Rate Distribution

Spawn rates within each slot must sum to approximately 1.0 (100%).

### Recommended Distribution

Use a gentle curve from common to rare. The Compi distribution:

```
0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.065, 0.06, 0.055, 0.05,
0.045, 0.04, 0.03, 0.025, 0.02, 0.015, 0.01, 0.007, 0.003
```

For fewer traits, compress the curve. Example for 10 traits:

```
0.18, 0.15, 0.13, 0.12, 0.10, 0.09, 0.08, 0.06, 0.05, 0.04
```

For 8 traits:

```
0.20, 0.17, 0.15, 0.13, 0.12, 0.10, 0.08, 0.05
```

### Rules

- Rates per slot must sum to ~1.0 (0.98-1.02 acceptable due to rounding)
- Most common trait: 0.12-0.20 range
- Rarest trait: 0.003-0.05 range
- The gap between common and rare should be meaningful but not extreme (max ~40:1 ratio)

---

## ASCII Art Template

### Size

- Width: 8-16 characters
- Height: 4-8 lines
- Use monospace characters

### Slot Placement

The `art` field in the species definition is a visual template. Trait art fragments get inserted into the creature display. The 4 slots render as stacked lines:

```
Line 1: eyes art      (e.g., "○.○")
Line 2: mouth art     (e.g., " ~ ")
Line 3: body art      (e.g., " ░░ ")
Line 4: tail art      (e.g., "~~/")
```

The species art template shows the creature's overall shape, and the renderer places trait art within it. Each trait's `art` string should be designed to look good within that species' body shape.

### Design Principles

- Each species should have a **clearly different silhouette** from others
- The shape should evoke the creature type (dragon = angular/horns, cat = ears, blob = round)
- Use Unicode characters freely (boxes, circles, arrows, stars, etc.)
- Trait art fragments should fit naturally within the species' body shape
- Test how traits look inside the template — some Unicode chars may not align well

### Examples

**Dragon-like (angular, fierce):**
```
  /\ /\
 { EE }
  \ MM /
   \BB/
   TT
```

**Cat-like (ears, curved):**
```
 /\_/\
( EE )
 > MM <
 /BB\
  TT
```

**Blob (round, simple):**
```
  ___
 (EE)
  MM
 (BB)
  TT
```

**Crystal (geometric):**
```
  /\
 /EE\
 |MM|
 \BB/
  TT
```

Where EE = eyes art, MM = mouth art, BB = body art, TT = tail art.

---

## Trait Naming Conventions

Traits should match the species' personality/theme:

| Species Theme | Eyes Examples | Mouth Examples | Body Examples | Tail Examples |
|--------------|-------------|---------------|--------------|--------------|
| Dragon/fire | Ember Gaze, Slit Watch | Fang, Snarl | Scale, Plate | Spike, Whip |
| Cat/stealth | Slit Eyes, Moon Watch | Purr, Hiss | Fur, Stripe | Swish, Curl |
| Crystal/light | Facet Eyes, Prism Look | Gleam, Shine | Crystal, Gem | Spark, Trail |
| Ghost/ethereal | Hollow Gaze, Fade Eye | Whisper, Wail | Mist, Shadow | Wisp, Fade |
| Blob/cute | Bead Eyes, Wide Look | Smile, Blob | Jelly, Bounce | Drip, Puddle |

Rarer traits should have more dramatic/impressive names. Common traits are simple.

---

## Visual Review Process

Before adding a species to the game, verify it looks good:

1. Create the JSON file in `config/species/`
2. Ask Claude to render sample creatures in the browser (HTML preview)
3. Check that:
   - The ASCII art template is recognizable and distinct from other species
   - Trait art fragments look good inside the template
   - Different trait combinations produce visually distinct creatures
   - Rare traits look noticeably different from common ones
   - The creature looks good at terminal font sizes
4. Iterate on art until satisfied
5. Verify with `npm test` that the species loads correctly

---

## Adding the Species

1. Create `config/species/{id}.json` with the full definition
2. Run `npm test` — all tests should still pass (the species loader auto-discovers JSON files in the directory)
3. The species will immediately appear in spawn rotation

No code changes needed. The species config loader (`src/config/species.ts`) reads all `.json` files from `config/species/` at startup.

---

## Validation Checklist

Before finalizing a species:

- [ ] `id` is unique lowercase, no spaces
- [ ] `name` is capitalized display name
- [ ] `description` is one line of flavor text
- [ ] `spawnWeight` is set (10 for equal probability)
- [ ] `art` template is 4-8 lines, recognizable silhouette
- [ ] All 4 slots (eyes, mouth, body, tail) have trait pools
- [ ] Each slot has 5+ traits
- [ ] Spawn rates per slot sum to ~1.0
- [ ] Trait IDs follow `{prefix}_{slot}_{number}` convention
- [ ] Trait IDs are globally unique (don't collide with other species)
- [ ] Trait names match the species theme
- [ ] Trait art fragments look good inside the template
- [ ] `npm test` passes
- [ ] Visual review completed (HTML preview)

---

## Species Planned for Design

| Species | Theme | Status |
|---------|-------|--------|
| Compi | Axolotl, digital | Done (config/species/compi.json) |
| Drakon | Dragon, fierce | Not started |
| Felith | Cat, stealthy | Not started |
| Orbix | Geometric orb | Not started |
| Thornyx | Plant/thorn | Not started |
| Gloon | Blob/slime | Not started |
| Spectra | Ghost/wisp | Not started |
| Craggor | Rock golem | Not started |
| Zephyx | Bird/wind | Not started |
| Luminos | Crystal/light | Not started |

Each can be designed independently and in parallel.
