# Breed UX: Intuitive Selection Design

**Date:** 2026-04-11
**Status:** Draft

## Problem

The current `/breed` command requires users to supply raw creature IDs for two parents (`/breed [parentAId] [parentBId]`). This is unintuitive because:

1. **Users don't know which creatures can breed.** Breeding requires two creatures of the same species, but nothing in the game surfaces which of the user's creatures have a valid partner.
2. **Raw IDs are opaque.** Internal IDs like `lq8a3f_x7k2mp` are not visible anywhere intuitive, and users end up hunting for them.
3. **The pattern is inconsistent with `/catch`.** Catching feels effortless because `/scan` shows a numbered menu and `/catch 2` picks one. Breeding should follow the same pattern.

## Goal

Make breeding feel as intuitive as catching: the user sees a numbered menu of valid choices and picks numbers. No raw IDs.

## Design

### 1. `/collection` shows a stable 1-indexed number per creature

Every row in the collection listing gains a visible leading index:

```
  1.  Sparkmouse  sparkmouse  Lv 1  ⭐ 42
  2.  Flamecub    flamecub    Lv 2  ⭐ 58
  3.  Sparkmouse  sparkmouse  Lv 1  ⭐ 37
```

Indexes are 1-based and reflect the current collection array order. They are stable *within a single view* but may change across sessions as creatures are added/removed. That is acceptable — users pick indexes immediately after seeing them.

### 2. `/breed` becomes a progressive menu

The `breed` command supports three usage shapes, all index-based:

| Command | Behavior |
|---|---|
| `/breed` | **List mode.** Shows only creatures with ≥1 same-species partner. Each row uses its `/collection` index and shows partner count. Example row: `3. Sparkmouse  Lv 1  (2 partners)` |
| `/breed 3` | **Partner mode.** Shows creature #3 and lists its compatible partners with their collection index and the energy cost if bred. Example: `→ 7. Sparkmouse  Lv 2  (cost 4)` |
| `/breed 3 7` | **Preview mode.** Previews the breed result for parents at collection indexes 3 and 7 (reuses existing `previewBreed`). Response ends with: "Run `/breed 3 7 --confirm` to proceed." |
| `/breed 3 7 --confirm` | **Execute mode.** Runs `executeBreed` for parents #3 and #7. |

### 3. `/breedable` as a discoverability alias

A new slash command `/breedable` is a pure alias for `/breed` with no args. Users who don't think to type `/breed` alone can still discover the list via `/compi:list`.

### 4. MCP tool changes

The `breed` tool in `src/mcp-tools.ts` is restructured:

- **Input schema:**
  - `indexA?: number` — optional, 1-indexed
  - `indexB?: number` — optional, 1-indexed
  - `confirm?: boolean` — unchanged
- **Old `parentAId`/`parentBId` params are removed.** They were the source of the pain.
- **Modes resolve from which params are present:**
  - Neither → list mode (returns breedable-creatures view)
  - Only `indexA` → partner mode (returns creature + compatible partners view)
  - Both → preview or execute depending on `confirm`
- The tool resolves indexes to internal IDs by looking up `state.collection[index - 1]`, then calls the existing `previewBreed` / `executeBreed` engine functions unchanged.

### 5. Renderer additions

Three new renderer methods on `SimpleTextRenderer`:

- `renderBreedableList(breedables: BreedableCreature[]): string` — shows creatures with partner counts
- `renderBreedPartners(creature: CollectionCreature, partners: BreedablePartner[]): string` — shows selected creature + its compatible partners
- (Existing `renderBreedPreview` / `renderBreedResult` stay, but they should display the parents' collection indexes in a header so users can confirm they picked the right ones.)

### 6. Engine additions

Two new pure helper functions in `src/engine/breed.ts`:

- `listBreedable(state: GameState): Array<{ creatureIndex: number; creature: CollectionCreature; partnerCount: number }>`
- `listPartnersFor(state: GameState, creatureIndex: number): Array<{ partnerIndex: number; creature: CollectionCreature; energyCost: number }>`

Both take the `GameState` and return plain data — no I/O, consistent with the layered architecture in CLAUDE.md.

### 7. Errors

- `/breed 3` where #3 has no same-species partners → `"<name> #3 has no same-species partners. Run /breed to see breedable creatures."`
- `/breed 3 7` where species mismatch → existing `executeBreed` error message, prefixed with the two indexes so users see what they picked.
- `/breed` on empty breedables → `"No breedable pairs yet — you need 2+ creatures of the same species. Use /scan and /catch to find more."`
- `/breed 99` (out-of-range index) → `"No creature at index 99. You have <N> creatures — run /collection to see them."`

### 8. Skill (`skills/breed/SKILL.md`) rewrite

The skill prompt is updated to parse either zero, one, or two numeric positional args (plus `--confirm`) and call the `breed` tool with the matching `indexA`/`indexB` combination. A new `skills/breedable/SKILL.md` file is added as the alias.

## Scope

- Reuses existing `previewBreed` / `executeBreed` engine logic unchanged — only inputs and wrapping views change.
- `/collection` numbering is the one cross-cutting change, but it is purely additive.
- No changes to breeding math, energy costs, inheritance, or creature state shape.
- No changes to the Cursor plugin flow beyond the same tool-signature update.

## Testing

- Unit tests for `listBreedable` and `listPartnersFor` in `tests/engine/breed.test.ts` covering: empty collection, no same-species pairs, one pair, multiple pairs across multiple species, archived creatures excluded.
- Tool-layer tests (or integration tests) for the three modes of the `breed` tool: list, partner, preview.
- Renderer snapshot or golden-string tests for the new list/partner views.
- Regression: existing breed preview/execute tests keep passing after switching from ID params to index params.

## Out of scope

- Short stable IDs shown in `/collection` (considered and rejected — user preferred collection numbers).
- Grouping breedable list by species (considered and rejected — flat list is fine for expected collection sizes).
- Breeding across archived creatures (still blocked, same as today).
