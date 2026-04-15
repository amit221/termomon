---
name: create-species
description: Generate a new creature species using AI
---

You are creating a brand new creature species for Compi, a terminal creature collection game. You will generate EVERYTHING autonomously — the species concept, name, ASCII art, traits, and rarity distribution.

## Breed Mode (Hybrid Species)

If the player just bred a cross-species hybrid (you'll see a `<hybrid_species_context>` block in the conversation), you are in **breed mode**. In this case:
- The child creature already exists in the player's collection
- Use the parent species names and child traits from the context as inspiration for the new species
- The species ID should follow the pattern `hybrid_<speciesA>_<speciesB>` (e.g. `hybrid_compi_flikk`)
- Skip straight to Step 2 (species generation) — no need to ask what to make
- The art and traits should blend both parent aesthetics

## Step 1: Read existing species

Read all files in `config/species/` to understand what creatures already exist. Note their:
- Names and themes (avoid overlap)
- Art styles and silhouettes (yours must be visually distinct)
- Trait naming patterns

## Step 2: Generate a new species

Create a completely original species. Do NOT ask the user what to make — surprise them.

### Species concept
- Invent a unique creature concept that doesn't overlap with existing species
- Give it a short, punchy name (4-6 characters, lowercase ID)
- Write a one-sentence description capturing its personality

### ASCII art template (THIS IS CRITICAL)
Generate a 4-6 line ASCII art template. The art MUST:

- Have a **unique silhouette** — the outline alone should distinguish it from all other species
- Use a **varied pose** — NOT front-facing symmetric. Choose from: side view, 3/4 angle, mid-action (jumping/running/sleeping/stretching/curling), looking up/down, from behind
- Include **asymmetry** — avoid perfect left-right mirror symmetry
- Contain exactly these placeholders: `EE` (eyes), `MM` (mouth), `BB` (body), `TT` (tail)
- Each placeholder appears exactly once
- Stay within 4-6 lines and roughly 10-15 characters wide

Good examples (varied silhouettes):
```
Side view, walking:
    ___
/\_/ EE \
\  MM    >--
 \__BB_/
    TT

Curled up:
  _/\_
 / EE \___
 \__MM    \
   BB\__/
   TT

Leaping:
     /EE
   /MM  \
  BB     )~~
   \___/
  TT
```

Bad examples (too similar, all front-facing):
```
  ( EE )
  ( MM )
   BB
   TT
```

### Zones
Assign each art line to a slot zone: `"eyes"`, `"mouth"`, `"body"`, or `"tail"`.
This determines which slot's rarity color applies to that entire line.

### Trait pools
Generate exactly 17 traits per slot (eyes, mouth, body, tail):
- Trait art must match the placeholder character width exactly (EE = 2 chars, MM = 2 chars, etc.)
- Use creative Unicode characters and ASCII symbols
- Name each trait with a thematic word that fits the species personality
- Distribute spawn rates from common (~0.12) down to mythic (~0.003), summing to approximately 1.0
- Trait IDs follow: `<3-letter-prefix>_eye_01`, `<prefix>_mth_01`, `<prefix>_bod_01`, `<prefix>_tal_01`

### Spawn weight
Set `spawnWeight` between 5-12 (lower = rarer species).

## Step 3: Preview

Show the user:

1. The species name, ID, and description
2. The ASCII art with one example trait set filled in (show it in a code block)
3. The zone mapping (which line → which color)
4. A few sample traits from each slot

Format example:
```
Species: Pyrix (id: pyrix)
"A restless flame sprite, always mid-leap."
Spawn weight: 8

Art preview:
    ___          ← tail zone
/\_/ ◉◉ \        ← eyes zone
\  ~~    >--     ← mouth zone
 \__░░_/         ← body zone
    ∿∿           ← tail zone

Sample traits:
  Eyes: Ember (◉◉), Flicker (●●), Spark (◇◇), ...
  Mouth: Hiss (~~), Growl (><), Purr (∿∿), ...
  Body: Scales (░░), Ember (▓▓), Smoke (▒▒), ...
  Tail: Whip (∿∿), Curl (~~), Snap (//), ...
```

## Step 4: Iterate

Wait for user feedback. They may say:
- "looks good" / "ok" / "approve" → proceed to Step 5
- "make it face left" / "change the name" / "spookier traits" → regenerate with changes and show again
- "try again" / "new one" → generate a completely different species

## Step 5: Save

Once approved:

1. Write the species JSON to a temporary file:
   ```bash
   # Write to temp file (use the generated JSON)
   ```
2. Run the validation script:
   ```bash
   node scripts/validate-species.js /tmp/new-species.json
   ```
3. If validation passes, tell the user the species was saved to `config/species/<id>.json`
4. If validation fails, fix the errors and retry
5. Remind the user: to make this species appear in-game, they need to add the import to `src/config/species.ts` and rebuild:
   ```
   Add to src/config/species.ts:
     import <id>Data from "../../config/species/<id>.json";
   And add <id>Data to the SPECIES_DATA array.
   Then run: npm run bundle
   ```
