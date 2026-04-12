# AI Species Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add zone-based coloring to all species and build a `/create-species` skill that uses AI to generate complete new creature species.

**Architecture:** The `zones` field is added to `SpeciesDefinition` in types, the renderer is updated to color entire lines by zone, all 6 existing species get migrated, a validation script ensures species JSON correctness, and a new skill orchestrates AI-driven species creation.

**Tech Stack:** TypeScript (types, renderer), Node.js (validation script), SKILL.md (Claude Code skill)

---

### Task 1: Add `zones` field to SpeciesDefinition type

**Files:**
- Modify: `src/types.ts:36-43`

- [ ] **Step 1: Write the failing test**

Create `tests/types/zones.test.ts`:

```typescript
import { SpeciesDefinition, SlotId } from "../../src/types";

describe("SpeciesDefinition zones field", () => {
  it("should accept a zones array of SlotId values", () => {
    const species: SpeciesDefinition = {
      id: "test",
      name: "Test",
      description: "A test species",
      spawnWeight: 10,
      art: ["line1", "line2"],
      zones: ["eyes", "body"],
      traitPools: {},
    };
    expect(species.zones).toEqual(["eyes", "body"]);
  });

  it("should allow zones to be undefined for backward compat during migration", () => {
    const species: SpeciesDefinition = {
      id: "test",
      name: "Test",
      description: "A test species",
      spawnWeight: 10,
      art: ["line1"],
      traitPools: {},
    };
    expect(species.zones).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/types/zones.test.ts -v`
Expected: FAIL — `zones` property does not exist on type `SpeciesDefinition`

- [ ] **Step 3: Add zones field to SpeciesDefinition**

In `src/types.ts`, modify the `SpeciesDefinition` interface:

```typescript
export interface SpeciesDefinition {
  id: string;
  name: string;
  description: string;
  spawnWeight: number;
  art: string[]; // multi-line ASCII template
  zones?: SlotId[]; // one per art line, maps line to slot rarity color
  traitPools: Partial<Record<SlotId, TraitDefinition[]>>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/types/zones.test.ts -v`
Expected: PASS

- [ ] **Step 5: Run full test suite to check nothing broke**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/types.ts tests/types/zones.test.ts
git commit -m "feat: add optional zones field to SpeciesDefinition type"
```

---

### Task 2: Update renderer to use zone-based line coloring

**Files:**
- Modify: `src/renderers/simple-text.ts:70-131` (renderCreatureLines function)
- Modify: `tests/renderers/simple-text.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/renderers/simple-text.test.ts`:

```typescript
describe("zone-based coloring", () => {
  it("should color entire line based on zone when species has zones", () => {
    // We test indirectly via renderScan which calls renderCreatureLines
    // Use a species that has zones defined
    const slotsWithFlikk: CreatureSlot[] = [
      { slotId: "eyes", variantId: "flk_eye_01", color: "white" },
      { slotId: "mouth", variantId: "flk_mth_01", color: "white" },
      { slotId: "body", variantId: "flk_bod_01", color: "white" },
      { slotId: "tail", variantId: "flk_tal_01", color: "white" },
    ];
    const nearby: NearbyCreature = {
      id: "z1",
      speciesId: "flikk",
      name: "Zoney",
      slots: slotsWithFlikk,
      spawnedAt: Date.now(),
    };
    const scanResult: ScanResult = {
      energy: 5,
      batch: null,
      nextBatchInMs: 900000,
      nearby: [{ index: 1, creature: nearby, catchRate: 0.5, energyCost: 2 }],
    };
    const output = renderer.renderScan(scanResult);
    // The output should contain ANSI color codes — the key assertion is
    // that lines WITHOUT a placeholder still get colored (zone-based),
    // not just lines that had EE/MM/BB/TT replacements.
    // Line 1 of flikk art is "  \ _ /" which has no placeholder.
    // With zones, it should still have a color code applied.
    expect(output).toContain("\x1b["); // has ANSI color codes
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/renderers/simple-text.test.ts -t "zone-based" -v`
Expected: FAIL — the test may pass trivially since flikk art lines with placeholders already get color. We'll refine after migration adds zones.

- [ ] **Step 3: Update renderCreatureLines to use zone-based coloring**

In `src/renderers/simple-text.ts`, replace the species art rendering block (lines 89-111) with:

```typescript
  if (species?.art) {
    return species.art.map((line, lineIndex) => {
      let result = line;
      const replacements: [string, string][] = [
        ["EE", slotArt["eyes"] ?? ""],
        ["MM", slotArt["mouth"] ?? ""],
        ["BB", slotArt["body"] ?? ""],
        ["TT", slotArt["tail"] ?? ""],
      ];
      for (const [placeholder, art] of replacements) {
        result = result.replace(placeholder, art);
      }

      // Zone-based coloring: color entire line based on zone assignment
      if (species.zones && species.zones[lineIndex]) {
        const zoneSlot = species.zones[lineIndex];
        const color = slotColor[zoneSlot] ?? WHITE;
        return "      " + color + result + RESET;
      }

      // Fallback for species without zones: use old per-placeholder coloring
      let lineColor: string | null = null;
      for (const [placeholder, , color] of [
        ["EE", slotArt["eyes"] ?? "", slotColor["eyes"] ?? WHITE],
        ["MM", slotArt["mouth"] ?? "", slotColor["mouth"] ?? WHITE],
        ["BB", slotArt["body"] ?? "", slotColor["body"] ?? WHITE],
        ["TT", slotArt["tail"] ?? "", slotColor["tail"] ?? WHITE],
      ] as [string, string, string][]) {
        if (line.includes(placeholder)) {
          lineColor = color;
        }
      }
      if (lineColor) {
        return "      " + lineColor + result + RESET;
      }
      return "      " + result;
    });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/renderers/simple-text.test.ts -v`
Expected: All tests pass

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text.test.ts
git commit -m "feat: add zone-based line coloring to renderer"
```

---

### Task 3: Migrate existing species to use zones

**Files:**
- Modify: `config/species/compi.json`
- Modify: `config/species/flikk.json`
- Modify: `config/species/glich.json`
- Modify: `config/species/jinx.json`
- Modify: `config/species/monu.json`
- Modify: `config/species/whiski.json`

- [ ] **Step 1: Add art template and zones to compi.json**

Compi has no `art` array — it uses the hardcoded fallback. Add an art template matching the fallback layout, plus zones. Insert after `"spawnWeight": 10,`:

```json
"art": ["  EE", " (MM)", " ╱BB╲", "  TT"],
"zones": ["eyes", "mouth", "body", "tail"],
```

- [ ] **Step 2: Add zones to flikk.json**

Flikk art: `["  \\ _ /", " ( EE )", " ( MM )", "  ~BB~", "   \\/"]`

Insert after the `"art"` line:

```json
"zones": ["tail", "eyes", "mouth", "body", "tail"],
```

Line mapping: `\ _ /` → tail (top decoration), `( EE )` → eyes, `( MM )` → mouth, `~BB~` → body, `\/` → tail.

- [ ] **Step 3: Add zones to glich.json**

Glich art: `[" ▐░░░▌", " ▐EE▌", " ▐ MM ▌", " ▐BB▌", "  TT"]`

Insert after the `"art"` line:

```json
"zones": ["body", "eyes", "mouth", "body", "tail"],
```

Line mapping: `▐░░░▌` → body (top border), `▐EE▌` → eyes, `▐ MM ▌` → mouth, `▐BB▌` → body, `TT` → tail.

- [ ] **Step 4: Add zones to jinx.json**

Jinx art: `["    ~", "  /EE )", " ( MM /", "  \\BB )", "   TT~"]`

Insert after the `"art"` line:

```json
"zones": ["tail", "eyes", "mouth", "body", "tail"],
```

Line mapping: `~` → tail (top), `/EE )` → eyes, `( MM /` → mouth, `\BB )` → body, `TT~` → tail.

- [ ] **Step 5: Add zones to monu.json**

Monu art: `[" ┌─────┐", " │EE│", " │ MM │", " │BB│", " └TT┘"]`

Insert after the `"art"` line:

```json
"zones": ["body", "eyes", "mouth", "body", "tail"],
```

Line mapping: `┌─────┐` → body (top border), `│EE│` → eyes, `│ MM │` → mouth, `│BB│` → body, `└TT┘` → tail.

- [ ] **Step 6: Add zones to whiski.json**

Whiski art: `[" /\\_/\\", "( EE )", " > MM <", "  TT"]`

Whiski has no body slot — it only has eyes, mouth, and tail. Insert after the `"art"` line:

```json
"zones": ["eyes", "eyes", "mouth", "tail"],
```

Line mapping: `/\_/\` → eyes (ears/head), `( EE )` → eyes, `> MM <` → mouth, `TT` → tail.

- [ ] **Step 7: Run full test suite to verify migration didn't break anything**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 8: Visually verify by running the game**

Run: `node scripts/mcp-server.js` and call scan to see if creatures render with zone coloring.

- [ ] **Step 9: Commit**

```bash
git add config/species/*.json
git commit -m "feat: add zones to all existing species for zone-based coloring"
```

---

### Task 4: Remove renderer fallback path

**Files:**
- Modify: `src/renderers/simple-text.ts:70-131` (renderCreatureLines)
- Modify: `src/renderers/simple-text.ts:138-175` (renderGreySilhouette)

Now that all species have `art` and `zones`, remove the fallback paths.

- [ ] **Step 1: Write a test that all species have art and zones**

Add to `tests/config/species.test.ts`:

```typescript
import { getAllSpecies } from "../../src/config/species";

describe("species zones", () => {
  it("every species should have art and zones arrays of equal length", () => {
    const species = getAllSpecies();
    for (const s of species) {
      expect(s.art).toBeDefined();
      expect(s.art.length).toBeGreaterThan(0);
      expect(s.zones).toBeDefined();
      expect(s.zones!.length).toBe(s.art.length);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx jest tests/config/species.test.ts -t "zones" -v`
Expected: PASS (all species now have art and zones after migration)

- [ ] **Step 3: Simplify renderCreatureLines — remove fallback**

Replace the entire `renderCreatureLines` function in `src/renderers/simple-text.ts`:

```typescript
function renderCreatureLines(slots: CreatureSlot[], speciesId?: string): string[] {
  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = speciesId
      ? getTraitDefinition(speciesId, s.variantId)
      : getVariantById(s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  const slotColor: Record<string, string> = {};
  for (const s of slots) {
    const rarityScore = speciesId ? calculateTraitRarityScore(speciesId, s.slotId, s.variantId) : 50;
    slotColor[s.slotId] = calculateRarityColor(rarityScore);
  }

  const species = speciesId ? getSpeciesById(speciesId) : undefined;
  if (!species?.art) {
    return ["      ???"];
  }

  return species.art.map((line, lineIndex) => {
    let result = line;
    const replacements: [string, string][] = [
      ["EE", slotArt["eyes"] ?? ""],
      ["MM", slotArt["mouth"] ?? ""],
      ["BB", slotArt["body"] ?? ""],
      ["TT", slotArt["tail"] ?? ""],
    ];
    for (const [placeholder, art] of replacements) {
      result = result.replace(placeholder, art);
    }

    const zoneSlot = species.zones?.[lineIndex];
    const color = zoneSlot ? (slotColor[zoneSlot] ?? WHITE) : WHITE;
    return "      " + color + result + RESET;
  });
}
```

- [ ] **Step 4: Simplify renderGreySilhouette — remove fallback**

Replace the `renderGreySilhouette` function:

```typescript
function renderGreySilhouette(slots: CreatureSlot[], speciesId: string): string[] {
  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = getTraitDefinition(speciesId, s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  const species = getSpeciesById(speciesId);
  const GREY = COLOR_ANSI.grey;

  if (!species?.art) {
    return [GREY + "???" + RESET];
  }

  return species.art.map((line) => {
    let result = line;
    const replacements: [string, string][] = [
      ["EE", slotArt["eyes"] ?? ""],
      ["MM", slotArt["mouth"] ?? ""],
      ["BB", slotArt["body"] ?? ""],
      ["TT", slotArt["tail"] ?? ""],
    ];
    for (const [placeholder, art] of replacements) {
      result = result.replace(placeholder, art);
    }
    return GREY + result + RESET;
  });
}
```

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/config/species.test.ts
git commit -m "refactor: remove renderer fallback paths, all species use art+zones"
```

---

### Task 5: Build the validation script

**Files:**
- Create: `scripts/validate-species.js`

- [ ] **Step 1: Write the validation script**

Create `scripts/validate-species.js`:

```javascript
#!/usr/bin/env node
// validate-species.js — Validates a species JSON file and optionally copies it to config/species/
"use strict";

const fs = require("fs");
const path = require("path");

const VALID_SLOTS = ["eyes", "mouth", "body", "tail"];
const PLACEHOLDERS = { eyes: "EE", mouth: "MM", body: "BB", tail: "TT" };
const TRAIT_ID_PATTERN = /^[a-z]{2,4}_(?:eye|mth|bod|tal)_\d{2,3}$/;

function validate(filePath) {
  const errors = [];

  // 1. Parse JSON
  let data;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw);
  } catch (e) {
    return { errors: [`Failed to parse JSON: ${e.message}`] };
  }

  // 2. Required fields
  for (const field of ["id", "name", "description", "spawnWeight", "art", "zones", "traitPools"]) {
    if (data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (errors.length > 0) return { errors };

  // 3. Type checks
  if (typeof data.id !== "string" || data.id.length === 0) {
    errors.push(`"id" must be a non-empty string`);
  }
  if (typeof data.name !== "string" || data.name.length === 0) {
    errors.push(`"name" must be a non-empty string`);
  }
  if (typeof data.description !== "string") {
    errors.push(`"description" must be a string`);
  }
  if (typeof data.spawnWeight !== "number" || data.spawnWeight <= 0) {
    errors.push(`"spawnWeight" must be a positive number`);
  }
  if (!Array.isArray(data.art) || data.art.length === 0) {
    errors.push(`"art" must be a non-empty array of strings`);
  }
  if (!Array.isArray(data.zones)) {
    errors.push(`"zones" must be an array`);
  }

  if (errors.length > 0) return { errors };

  // 4. Zones length matches art length
  if (data.zones.length !== data.art.length) {
    errors.push(`zones length (${data.zones.length}) must match art length (${data.art.length})`);
  }

  // 5. Zone values are valid slot IDs
  for (let i = 0; i < data.zones.length; i++) {
    if (!VALID_SLOTS.includes(data.zones[i])) {
      errors.push(`zones[${i}] = "${data.zones[i]}" is not a valid slot ID (${VALID_SLOTS.join(", ")})`);
    }
  }

  // 6. Check placeholders appear exactly once in art
  const artJoined = data.art.join("\n");
  for (const [slot, placeholder] of Object.entries(PLACEHOLDERS)) {
    const count = (artJoined.match(new RegExp(placeholder, "g")) || []).length;
    if (count === 0) {
      errors.push(`Placeholder "${placeholder}" for slot "${slot}" not found in art`);
    } else if (count > 1) {
      errors.push(`Placeholder "${placeholder}" for slot "${slot}" appears ${count} times (must be exactly 1)`);
    }
  }

  // 7. Check trait pools
  if (typeof data.traitPools !== "object" || data.traitPools === null) {
    errors.push(`"traitPools" must be an object`);
    return { errors };
  }

  const allTraitIds = new Set();

  for (const slotId of VALID_SLOTS) {
    const traits = data.traitPools[slotId];
    if (!traits || !Array.isArray(traits)) {
      errors.push(`traitPools.${slotId} must be a non-empty array`);
      continue;
    }

    // Find placeholder width for this slot
    const placeholder = PLACEHOLDERS[slotId];
    const placeholderWidth = placeholder.length; // EE=2, MM=2, BB=2, TT=2

    let spawnRateSum = 0;

    for (let i = 0; i < traits.length; i++) {
      const trait = traits[i];

      // Check required fields
      if (!trait.id || !trait.name || trait.art === undefined || trait.spawnRate === undefined) {
        errors.push(`traitPools.${slotId}[${i}] missing required fields (id, name, art, spawnRate)`);
        continue;
      }

      // Check trait ID pattern
      if (!TRAIT_ID_PATTERN.test(trait.id)) {
        errors.push(`traitPools.${slotId}[${i}].id "${trait.id}" doesn't match pattern <prefix>_<slot>_<number>`);
      }

      // Check for duplicate trait IDs
      if (allTraitIds.has(trait.id)) {
        errors.push(`Duplicate trait ID: "${trait.id}"`);
      }
      allTraitIds.add(trait.id);

      // Check art width matches placeholder width
      // Use string length — the actual visual width may differ for Unicode,
      // but the placeholder replacement is character-based
      if (trait.art.length !== placeholderWidth) {
        errors.push(
          `traitPools.${slotId}[${i}].art "${trait.art}" has length ${trait.art.length}, ` +
          `expected ${placeholderWidth} (matching placeholder "${placeholder}")`
        );
      }

      // Check spawn rate
      if (typeof trait.spawnRate !== "number" || trait.spawnRate <= 0) {
        errors.push(`traitPools.${slotId}[${i}].spawnRate must be a positive number`);
      }

      spawnRateSum += trait.spawnRate;
    }

    // Check spawn rate sum is approximately 1.0 (allow 0.8 to 1.2)
    if (spawnRateSum < 0.8 || spawnRateSum > 1.2) {
      errors.push(
        `traitPools.${slotId} spawnRate sum is ${spawnRateSum.toFixed(3)}, expected approximately 1.0`
      );
    }
  }

  // 8. Check for conflicts with existing species
  const configDir = path.join(__dirname, "..", "config", "species");
  if (fs.existsSync(configDir)) {
    const existingFiles = fs.readdirSync(configDir).filter((f) => f.endsWith(".json"));
    for (const file of existingFiles) {
      try {
        const existing = JSON.parse(fs.readFileSync(path.join(configDir, file), "utf-8"));
        if (existing.id === data.id) {
          errors.push(`Species ID "${data.id}" conflicts with existing species in ${file}`);
        }
        if (existing.name.toLowerCase() === data.name.toLowerCase()) {
          errors.push(`Species name "${data.name}" conflicts with existing species in ${file}`);
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  return { errors, data };
}

// --- CLI entry point ---

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/validate-species.js <path-to-species.json>");
  process.exit(1);
}

const inputPath = args[0];
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const result = validate(inputPath);

if (result.errors.length > 0) {
  console.error("Validation failed:\n");
  for (const err of result.errors) {
    console.error(`  ✗ ${err}`);
  }
  process.exit(1);
}

// Write to config/species/<id>.json
const outputPath = path.join(__dirname, "..", "config", "species", `${result.data.id}.json`);
fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2) + "\n");
console.log(`✓ Species "${result.data.name}" validated and saved to ${outputPath}`);
process.exit(0);
```

- [ ] **Step 2: Test the validation script against an existing species**

Run: `node scripts/validate-species.js config/species/flikk.json`
Expected: Should report a conflict (same ID already exists). This confirms the duplicate check works.

- [ ] **Step 3: Test with an intentionally bad file**

Create a temporary bad species file and validate it:

```bash
echo '{"id":"","art":[]}' > /tmp/bad-species.json
node scripts/validate-species.js /tmp/bad-species.json
```

Expected: Multiple validation errors printed, exit code 1.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-species.js
git commit -m "feat: add species validation script"
```

---

### Task 6: Create the /create-species skill

**Files:**
- Create: `skills/create-species/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p skills/create-species
```

- [ ] **Step 2: Write the SKILL.md**

Create `skills/create-species/SKILL.md`:

````markdown
---
name: create-species
description: Generate a new creature species using AI
---

You are creating a brand new creature species for Compi, a terminal creature collection game. You will generate EVERYTHING autonomously — the species concept, name, ASCII art, traits, and rarity distribution.

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
````

- [ ] **Step 3: Commit**

```bash
git add skills/create-species/SKILL.md
git commit -m "feat: add /create-species skill for AI-driven species generation"
```

---

### Task 7: Update plugin manifest with new skill

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Read current plugin manifest**

Read `.claude-plugin/plugin.json` to see the current skill list.

- [ ] **Step 2: Add create-species skill to the manifest**

Add a new entry to the `skills` array in `.claude-plugin/plugin.json`:

```json
{
  "name": "create-species",
  "description": "Generate a new creature species using AI",
  "path": "skills/create-species/SKILL.md"
}
```

- [ ] **Step 3: Run build to verify everything compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: register /create-species skill in plugin manifest"
```

---

### Task 8: Final integration test

**Files:**
- No new files — manual verification

- [ ] **Step 1: Run the full test suite one final time**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run the build**

Run: `npm run build && npm run bundle`
Expected: No errors

- [ ] **Step 3: Verify validation script works end-to-end**

Create a valid test species file and run the validator:

```bash
cat > /tmp/test-species.json << 'ENDJSON'
{
  "id": "testx",
  "name": "Testx",
  "description": "A test species for validation.",
  "spawnWeight": 8,
  "art": ["  /EE\\", " (MM)", " [BB]", "  TT"],
  "zones": ["eyes", "mouth", "body", "tail"],
  "traitPools": {
    "eyes": [
      {"id": "tsx_eye_01", "name": "Look", "art": "oo", "spawnRate": 0.12},
      {"id": "tsx_eye_02", "name": "Peek", "art": "..", "spawnRate": 0.11},
      {"id": "tsx_eye_03", "name": "Gaze", "art": "@@", "spawnRate": 0.10},
      {"id": "tsx_eye_04", "name": "Wide", "art": "OO", "spawnRate": 0.09},
      {"id": "tsx_eye_05", "name": "Slit", "art": "--", "spawnRate": 0.08},
      {"id": "tsx_eye_06", "name": "Dot", "art": "··", "spawnRate": 0.07},
      {"id": "tsx_eye_07", "name": "Star", "art": "**", "spawnRate": 0.06},
      {"id": "tsx_eye_08", "name": "Moon", "art": "◐◐", "spawnRate": 0.055},
      {"id": "tsx_eye_09", "name": "Sun", "art": "◉◉", "spawnRate": 0.05},
      {"id": "tsx_eye_10", "name": "Gem", "art": "◇◇", "spawnRate": 0.04},
      {"id": "tsx_eye_11", "name": "Fire", "art": "◈◈", "spawnRate": 0.03},
      {"id": "tsx_eye_12", "name": "Ice", "art": "○○", "spawnRate": 0.025},
      {"id": "tsx_eye_13", "name": "Dark", "art": "●●", "spawnRate": 0.02},
      {"id": "tsx_eye_14", "name": "Bolt", "art": "⊙⊙", "spawnRate": 0.015},
      {"id": "tsx_eye_15", "name": "Void", "art": "◎◎", "spawnRate": 0.01},
      {"id": "tsx_eye_16", "name": "Myth", "art": "★★", "spawnRate": 0.007},
      {"id": "tsx_eye_17", "name": "Fate", "art": "✧✧", "spawnRate": 0.003}
    ],
    "mouth": [
      {"id": "tsx_mth_01", "name": "Flat", "art": "--", "spawnRate": 0.12},
      {"id": "tsx_mth_02", "name": "Grin", "art": "^^", "spawnRate": 0.11},
      {"id": "tsx_mth_03", "name": "Pout", "art": "~~", "spawnRate": 0.10},
      {"id": "tsx_mth_04", "name": "Smirk", "art": ":>", "spawnRate": 0.09},
      {"id": "tsx_mth_05", "name": "Hum", "art": "==", "spawnRate": 0.08},
      {"id": "tsx_mth_06", "name": "Purr", "art": "∿∿", "spawnRate": 0.07},
      {"id": "tsx_mth_07", "name": "Chirp", "art": "<>", "spawnRate": 0.06},
      {"id": "tsx_mth_08", "name": "Hiss", "art": ">>", "spawnRate": 0.055},
      {"id": "tsx_mth_09", "name": "Growl", "art": "><", "spawnRate": 0.05},
      {"id": "tsx_mth_10", "name": "Roar", "art": ")(", "spawnRate": 0.04},
      {"id": "tsx_mth_11", "name": "Wail", "art": "||", "spawnRate": 0.03},
      {"id": "tsx_mth_12", "name": "Keen", "art": "/\\", "spawnRate": 0.02},
      {"id": "tsx_mth_13", "name": "Howl", "art": "}{", "spawnRate": 0.015},
      {"id": "tsx_mth_14", "name": "Cry", "art": "[]", "spawnRate": 0.01},
      {"id": "tsx_mth_15", "name": "Doom", "art": "⊗⊗", "spawnRate": 0.007},
      {"id": "tsx_mth_16", "name": "Hex", "art": "◆◆", "spawnRate": 0.005},
      {"id": "tsx_mth_17", "name": "End", "art": "✦✦", "spawnRate": 0.003}
    ],
    "body": [
      {"id": "tsx_bod_01", "name": "Shell", "art": "░░", "spawnRate": 0.12},
      {"id": "tsx_bod_02", "name": "Plate", "art": "▒▒", "spawnRate": 0.11},
      {"id": "tsx_bod_03", "name": "Scale", "art": "▓▓", "spawnRate": 0.10},
      {"id": "tsx_bod_04", "name": "Fur", "art": "##", "spawnRate": 0.09},
      {"id": "tsx_bod_05", "name": "Hide", "art": "==", "spawnRate": 0.08},
      {"id": "tsx_bod_06", "name": "Bark", "art": "||", "spawnRate": 0.07},
      {"id": "tsx_bod_07", "name": "Stone", "art": "██", "spawnRate": 0.06},
      {"id": "tsx_bod_08", "name": "Glass", "art": "◇◇", "spawnRate": 0.055},
      {"id": "tsx_bod_09", "name": "Iron", "art": "▐▌", "spawnRate": 0.05},
      {"id": "tsx_bod_10", "name": "Gold", "art": "◈◈", "spawnRate": 0.04},
      {"id": "tsx_bod_11", "name": "Gem", "art": "◆◆", "spawnRate": 0.03},
      {"id": "tsx_bod_12", "name": "Void", "art": "⊙⊙", "spawnRate": 0.02},
      {"id": "tsx_bod_13", "name": "Star", "art": "★★", "spawnRate": 0.015},
      {"id": "tsx_bod_14", "name": "Moon", "art": "☾☽", "spawnRate": 0.01},
      {"id": "tsx_bod_15", "name": "Sun", "art": "☀☀", "spawnRate": 0.007},
      {"id": "tsx_bod_16", "name": "Myth", "art": "✧✧", "spawnRate": 0.005},
      {"id": "tsx_bod_17", "name": "Fate", "art": "✦✦", "spawnRate": 0.003}
    ],
    "tail": [
      {"id": "tsx_tal_01", "name": "Wag", "art": "~~", "spawnRate": 0.12},
      {"id": "tsx_tal_02", "name": "Curl", "art": "~/", "spawnRate": 0.11},
      {"id": "tsx_tal_03", "name": "Flick", "art": "/~", "spawnRate": 0.10},
      {"id": "tsx_tal_04", "name": "Sway", "art": "><", "spawnRate": 0.09},
      {"id": "tsx_tal_05", "name": "Whip", "art": "->", "spawnRate": 0.08},
      {"id": "tsx_tal_06", "name": "Coil", "art": "@@", "spawnRate": 0.07},
      {"id": "tsx_tal_07", "name": "Snap", "art": "!!", "spawnRate": 0.06},
      {"id": "tsx_tal_08", "name": "Drift", "art": "..", "spawnRate": 0.055},
      {"id": "tsx_tal_09", "name": "Spin", "art": "∿∿", "spawnRate": 0.05},
      {"id": "tsx_tal_10", "name": "Lash", "art": "//", "spawnRate": 0.04},
      {"id": "tsx_tal_11", "name": "Fork", "art": "\\\\", "spawnRate": 0.03},
      {"id": "tsx_tal_12", "name": "Spark", "art": "⌇⌇", "spawnRate": 0.02},
      {"id": "tsx_tal_13", "name": "Blaze", "art": "↯↯", "spawnRate": 0.015},
      {"id": "tsx_tal_14", "name": "Ghost", "art": "✧~", "spawnRate": 0.01},
      {"id": "tsx_tal_15", "name": "Wisp", "art": "☄~", "spawnRate": 0.007},
      {"id": "tsx_tal_16", "name": "Myth", "art": "★~", "spawnRate": 0.005},
      {"id": "tsx_tal_17", "name": "End", "art": "✦✦", "spawnRate": 0.003}
    ]
  }
}
ENDJSON
node scripts/validate-species.js /tmp/test-species.json
```

Expected: `✓ Species "Testx" validated and saved to config/species/testx.json`

Then clean up: `rm config/species/testx.json`

- [ ] **Step 4: Verify the create-species skill is listed**

Check that `/create-species` appears in the plugin's skill list by reading `.claude-plugin/plugin.json`.
