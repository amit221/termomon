# Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land an automated release pipeline on master so that conventional commits automatically produce version bumps (across 4 JSON files), a maintained `CHANGELOG.md`, and git tags — with zero manual version math.

**Architecture:** A single GitHub Actions workflow (`.github/workflows/release.yml`) runs `googleapis/release-please-action@v4` on every push to master. Release-please reads two config files in the repo root, parses Conventional Commit messages since the last tag, opens (or updates) a "Release PR" with the version bumps and changelog diff, and — when that PR is merged — creates a `vX.Y.Z` tag. No runtime code is added; no external secrets or tokens are needed beyond the auto-provided `GITHUB_TOKEN`.

**Tech Stack:** GitHub Actions, release-please v4, Conventional Commits. Node is present but not used by the pipeline (the action runs in its own container). Repo uses master (not main) as the default branch.

**Reference:** Full design spec is at `docs/superpowers/specs/2026-04-11-release-pipeline-design.md`. Read it first if anything below is unclear.

**Important context for the executor:**
- The user's commit style has historically been mixed (`update:`, `enhance:`, etc.). Going forward, **every commit in this plan MUST use Conventional Commits**.
- The repo has NO `.github/` directory yet — you will create it.
- Four JSON files currently hold the version, all at `0.1.0`: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (nested at `plugins[0].version`!), `.cursor-plugin/plugin.json`.
- The `marketplace.json` version is **nested inside an array**, which is the one tricky part of the config. Task 1 resolves the exact syntax before writing the config file.
- The repo is on Windows (the user's machine) but GitHub Actions runs on `ubuntu-latest`. Use forward slashes in paths. Do not rely on any OS-specific tooling.
- The user works directly on master (no feature branches for this work). All commits in this plan land on master directly.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `.github/workflows/release.yml` | Create | GitHub Actions workflow; invokes release-please on push to master |
| `release-please-config.json` | Create | release-please behavior config: version scheme, changelog target, multi-file bumps |
| `.release-please-manifest.json` | Create | release-please state: current released version (seeds at `0.1.0`) |
| `CHANGELOG.md` | Create | Auto-maintained changelog; manually seeded with the `0.1.0` baseline entry |
| `CLAUDE.md` | Modify | Add a "Commit Messages" section documenting the Conventional Commits rule |

No source code under `src/` is touched. No dependencies are added to `package.json`. No tests under `tests/` are added — this is CI/config only.

---

## Task 1: Research and lock in release-please v4 config syntax

**Why this task exists:** The design spec has one unresolved implementation-time question: how release-please v4 addresses a **nested** JSON version field (the one inside `.claude-plugin/marketplace.json`'s `plugins[0]`). We need to confirm the exact syntax before writing the config, because if we guess wrong, the pipeline will appear to work but silently skip updating that file.

**Files:** None created in this task. Research only.

- [ ] **Step 1: Fetch the release-please-action README (v4)**

Run:
```bash
# No local command; use WebFetch tool.
```

Use WebFetch on: `https://github.com/googleapis/release-please-action`

Prompt: "What are the v4 inputs for this GitHub Action? Specifically I need: (1) the name of the input that selects the target branch (is it `target-branch`?), (2) the names of the inputs for `config-file` and `manifest-file`, and (3) any required workflow permissions."

Expected: confirmation that `target-branch`, `config-file`, and `manifest-file` are valid inputs, and that the required permissions are `contents: write` and `pull-requests: write`.

- [ ] **Step 2: Fetch the release-please customization docs for `extra-files`**

Use WebFetch on: `https://github.com/googleapis/release-please/blob/main/docs/customizing.md`

Prompt: "How do I configure `extra-files` in `release-please-config.json` to update a version field that is nested inside a JSON array? Specifically, I have a file `.claude-plugin/marketplace.json` where the version lives at `plugins[0].version` (not at the top level). What is the exact JSON syntax for the `extra-files` entry? If JSONPath is supported, show the exact key name. If not, what is the recommended alternative (e.g., an `x-release-please-version` annotation with `type: generic`)?"

Expected: one of two outcomes:
- **Outcome A (preferred):** `extra-files` supports an object with `type: json` and `jsonpath: "$.plugins[0].version"`. If so, we will use this syntax in Task 3.
- **Outcome B (fallback):** JSONPath is not supported for `extra-files`. In this case, the recommended approach is to add an annotation comment (`// x-release-please-version` or equivalent) next to the version field and use `type: generic`. JSON does not allow comments, so this requires either using JSON5, or a different workaround (e.g., handling `marketplace.json` via a small post-release script, or moving to a `plugins` config with `package-name` overrides).

- [ ] **Step 3: Record the decision**

Write a short note in a scratch file (NOT committed) at `C:/Users/97254/compi/.release-research-notes.md` capturing:
- Which outcome you got (A or B).
- The exact `extra-files` syntax you will use in Task 3 for `marketplace.json`.
- If Outcome B, which workaround you picked and why.

This file is for your own reference during the next task. Delete it before finishing the plan.

- [ ] **Step 4: No commit**

This task produces no repo changes. Do NOT commit. Move straight to Task 2.

---

## Task 2: Create the baseline `CHANGELOG.md`

**Files:**
- Create: `C:/Users/97254/compi/CHANGELOG.md`

- [ ] **Step 1: Create the file**

Write `CHANGELOG.md` at the repo root with these exact contents:

```markdown
# Changelog

All notable changes to this project are documented in this file. This file is maintained automatically by [release-please](https://github.com/googleapis/release-please) based on [Conventional Commits](https://www.conventionalcommits.org/).

## 0.1.0

- Initial release.
```

- [ ] **Step 2: Verify the file exists**

Run:
```bash
ls -la C:/Users/97254/compi/CHANGELOG.md
```

Expected: file exists, non-zero size.

- [ ] **Step 3: Do not commit yet**

Leave `CHANGELOG.md` staged for a combined commit in Task 5. Do not run `git commit` now.

---

## Task 3: Create `release-please-config.json`

**Files:**
- Create: `C:/Users/97254/compi/release-please-config.json`

- [ ] **Step 1: Write the config**

Create `release-please-config.json` at the repo root. Use this template, but **adapt the `extra-files` entry for `marketplace.json`** based on the outcome of Task 1:

**If Task 1 Outcome A (JSONPath supported):**

```json
{
  "release-type": "node",
  "include-v-in-tag": true,
  "packages": {
    ".": {
      "package-name": "compi",
      "changelog-path": "CHANGELOG.md",
      "draft": false,
      "prerelease": false,
      "extra-files": [
        ".claude-plugin/plugin.json",
        ".cursor-plugin/plugin.json",
        {
          "type": "json",
          "path": ".claude-plugin/marketplace.json",
          "jsonpath": "$.plugins[0].version"
        }
      ]
    }
  }
}
```

**If Task 1 Outcome B (JSONPath NOT supported):**

Use the workaround identified in Task 1. Most likely this means:
- Include `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json` as plain string entries in `extra-files` (top-level `"version"` is handled by the default JSON strategy).
- Handle `.claude-plugin/marketplace.json` via a `"type": "generic"` extra-file entry *if* you can add an annotation comment, OR mark it as a known gap and add a follow-up task to the plan to handle it in a post-release step.

**Whichever outcome applies, write the final config file with no placeholders. The file must be valid JSON.**

- [ ] **Step 2: Validate the JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('C:/Users/97254/compi/release-please-config.json','utf8')); console.log('ok')"
```

Expected output:
```
ok
```

If you get a `SyntaxError`, fix the file and re-run.

- [ ] **Step 3: Do not commit yet**

Leave staged for the combined commit in Task 5.

---

## Task 4: Create `.release-please-manifest.json` and the workflow

**Files:**
- Create: `C:/Users/97254/compi/.release-please-manifest.json`
- Create: `C:/Users/97254/compi/.github/workflows/release.yml`

- [ ] **Step 1: Create the manifest**

Write `.release-please-manifest.json` at the repo root with this exact content:

```json
{
  ".": "0.1.0"
}
```

- [ ] **Step 2: Validate the manifest JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('C:/Users/97254/compi/.release-please-manifest.json','utf8')); console.log('ok')"
```

Expected output:
```
ok
```

- [ ] **Step 3: Confirm `.github/workflows/` does not yet exist**

Run:
```bash
ls -la C:/Users/97254/compi/.github 2>&1
```

Expected: `No such file or directory` (or similar). If it DOES exist and has contents, STOP and ask the user — there may be other workflows you need to preserve.

- [ ] **Step 4: Create the workflow directory and file**

Using the Write tool, create `C:/Users/97254/compi/.github/workflows/release.yml` with this exact content:

```yaml
name: release
on:
  push:
    branches:
      - master
permissions:
  contents: write
  pull-requests: write
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
          target-branch: master
```

**Note:** If Task 1 Step 1 revealed that the input name is NOT `target-branch` in v4, use the correct input name. If v4 defaults to the workflow's triggering branch and no explicit input is needed, remove the `target-branch` line entirely.

- [ ] **Step 5: Verify the file exists**

Run:
```bash
ls -la C:/Users/97254/compi/.github/workflows/release.yml
```

Expected: file exists.

- [ ] **Step 6: Basic YAML sanity check**

Run:
```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('C:/Users/97254/compi/.github/workflows/release.yml','utf8'); if(!s.includes('release-please-action@v4')){throw new Error('missing action reference')}; if(!s.includes('branches:')){throw new Error('missing branches')}; console.log('ok')"
```

Expected output:
```
ok
```

(This is a smoke test, not full YAML validation. GitHub's Actions runner will do the real parsing once we push.)

- [ ] **Step 7: Do not commit yet**

All pipeline files are now on disk. Task 5 commits them together.

---

## Task 5: Commit the pipeline foundation

**Files:**
- Stage: `CHANGELOG.md`, `release-please-config.json`, `.release-please-manifest.json`, `.github/workflows/release.yml`

- [ ] **Step 1: Stage the files explicitly**

Run:
```bash
cd C:/Users/97254/compi && git add CHANGELOG.md release-please-config.json .release-please-manifest.json .github/workflows/release.yml
```

**Do NOT use `git add .` or `git add -A`.** You want a surgical commit containing only these four files.

- [ ] **Step 2: Verify what is staged**

Run:
```bash
cd C:/Users/97254/compi && git status
```

Expected: exactly four new files staged, nothing else:
```
new file:   .github/workflows/release.yml
new file:   .release-please-manifest.json
new file:   CHANGELOG.md
new file:   release-please-config.json
```

If anything else is staged (e.g., `.release-research-notes.md`), unstage it with `git restore --staged <file>` and delete the scratch file.

- [ ] **Step 3: Commit**

Run:
```bash
cd C:/Users/97254/compi && git commit -m "$(cat <<'EOF'
ci: add release-please pipeline

Adds a GitHub Actions workflow that runs release-please on every push
to master. It parses Conventional Commits, opens/updates a Release PR
with version bumps across package.json, .claude-plugin/plugin.json,
.claude-plugin/marketplace.json, and .cursor-plugin/plugin.json, and
maintains CHANGELOG.md. Merging the Release PR creates a vX.Y.Z tag.

See docs/superpowers/specs/2026-04-11-release-pipeline-design.md.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds. Note the short SHA — you will need it in Task 7.

- [ ] **Step 4: Confirm the commit**

Run:
```bash
cd C:/Users/97254/compi && git log --oneline -3
```

Expected: top line is the new commit `ci: add release-please pipeline`.

---

## Task 6: Update `CLAUDE.md` with commit convention rules

**Files:**
- Modify: `C:/Users/97254/compi/CLAUDE.md` (append a new section at the end of the file)

- [ ] **Step 1: Read the current file**

Read `C:/Users/97254/compi/CLAUDE.md` to confirm its current structure. As of this plan's writing, the last section is `## Testing` ending at line 50 with "Tests mirror the `src/` structure..."

- [ ] **Step 2: Append the new section**

Using the Edit tool, append a new section immediately after the existing `## Testing` section. Find the end of the Testing section (the line starting with "Tests mirror...") and add this directly after it (with one blank line separating):

```markdown

## Commit Messages

All commits MUST follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature (triggers minor version bump)
- `fix:` — bug fix (triggers patch version bump)
- `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `ci:`, `build:`, `perf:` — no version bump
- Breaking changes: add `!` after the type (e.g. `feat!: ...`) or include `BREAKING CHANGE:` in the commit body (triggers major version bump)

Do **not** use `update:` or `enhance:` — these are not valid Conventional Commits and will be silently ignored by the release pipeline.

Releases are fully automated by `release-please` on push to master. See `docs/superpowers/specs/2026-04-11-release-pipeline-design.md` for the design and `.github/workflows/release.yml` for the workflow.
```

To perform the edit, use the Edit tool with:
- `old_string`: `Tests mirror the \`src/\` structure under \`tests/\`. Jest uses \`ts-jest\` preset, test root is \`tests/\`, pattern is \`**/*.test.ts\`.`
- `new_string`: the line above, followed by the new section exactly as written above.

- [ ] **Step 3: Verify the edit**

Run:
```bash
cd C:/Users/97254/compi && git diff CLAUDE.md
```

Expected: a diff showing the new section added after the Testing section. No other changes.

- [ ] **Step 4: Stage and commit**

Run:
```bash
cd C:/Users/97254/compi && git add CLAUDE.md && git commit -m "$(cat <<'EOF'
docs: require conventional commits in CLAUDE.md

Documents the Conventional Commits rule so future Claude Code sessions
enforce it automatically. The release-please pipeline ignores commits
that do not match the convention.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

- [ ] **Step 5: Confirm**

Run:
```bash
cd C:/Users/97254/compi && git log --oneline -3
```

Expected: the top two commits are `docs: require conventional commits in CLAUDE.md` and `ci: add release-please pipeline`.

---

## Task 7: Push to master and verify the dormant run

**Files:** None. This task pushes and observes.

**⚠️ Confirm with the user before pushing.** This is the first push of the release pipeline to master. Even though the pipeline is designed to be dormant on this push (both commits are `ci:` / `docs:`, neither triggers a bump), you should ask the user for explicit go-ahead before running `git push`.

- [ ] **Step 1: Ask the user to confirm the push**

Message the user: "Ready to push the pipeline to master. The first push should be dormant (no Release PR, no tag) because both commits are `ci:` and `docs:`. Shall I push?"

Wait for explicit confirmation.

- [ ] **Step 2: Push**

Run:
```bash
cd C:/Users/97254/compi && git push origin master
```

Expected: push succeeds.

- [ ] **Step 3: Wait for the workflow to run**

Run:
```bash
gh run list --workflow=release.yml --limit=1
```

If `gh` is not installed or not authenticated, ask the user to check `https://github.com/amit221/compi/actions` manually.

Expected: one run for the `release` workflow, status `completed`, conclusion `success`. If it's still `in_progress`, wait a short time and re-run the command. If it's `failure`, STOP and investigate the logs:
```bash
gh run view --log-failed
```

- [ ] **Step 4: Verify no Release PR was opened**

Run:
```bash
gh pr list --state open --search "chore(main): release"
```

Expected: empty output (no PR). This confirms the dormant behavior — release-please saw only `ci:` and `docs:` commits and did nothing.

If a Release PR WAS opened, something is wrong (one of the commits was probably mis-parsed as `feat:` or `fix:`). STOP and investigate.

- [ ] **Step 5: Verify no tag was created**

Run:
```bash
cd C:/Users/97254/compi && git fetch --tags && git tag -l
```

Expected: empty (or whatever tags existed before — there should be none new).

- [ ] **Step 6: Report success to user**

Tell the user: "Pipeline is live and dormant as expected. Ready to do the live-run test with a throwaway `fix:` commit."

---

## Task 8: Trigger a live run with a test `fix:` commit

**Files:**
- Modify: `C:/Users/97254/compi/CHANGELOG.md` (add a trivial whitespace change, or similar)

**⚠️ Confirm with the user before this task.** This task deliberately publishes a `0.1.1` release to exercise the pipeline end-to-end. Ask the user: "This next step will deliberately create a `0.1.1` release to verify the pipeline. Okay to proceed?"

- [ ] **Step 1: Make a trivial content change**

Use the Edit tool to change `CHANGELOG.md`:
- `old_string`: `- Initial release.`
- `new_string`: `- Initial release. (pipeline bootstrap)`

This is a minor, harmless edit that gives us something to commit. Alternatively, fix a real trivial issue you noticed elsewhere — any small legitimate fix is fine.

- [ ] **Step 2: Commit with a `fix:` message**

Run:
```bash
cd C:/Users/97254/compi && git add CHANGELOG.md && git commit -m "$(cat <<'EOF'
fix: clarify initial release entry in changelog

Trivial edit to exercise the release-please pipeline end-to-end.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

- [ ] **Step 3: Push**

Run:
```bash
cd C:/Users/97254/compi && git push origin master
```

Expected: push succeeds.

- [ ] **Step 4: Wait for the workflow to run**

Run:
```bash
gh run list --workflow=release.yml --limit=1
```

Expected: latest run has conclusion `success`. Wait and retry if `in_progress`.

- [ ] **Step 5: Verify a Release PR was opened**

Run:
```bash
gh pr list --state open --search "chore(main): release"
```

Expected: one PR, likely titled `chore(main): release 0.1.1`. Capture its number (e.g. `#2`) for the next task.

If no PR appears, STOP and check the workflow logs:
```bash
gh run view --log
```

---

## Task 9: Audit the Release PR diff

**Files:** None modified. Inspection only.

- [ ] **Step 1: Fetch the PR diff**

Run (replace `<N>` with the PR number from Task 8):
```bash
gh pr diff <N>
```

- [ ] **Step 2: Verify `package.json` bump**

In the diff, confirm:
```diff
-  "version": "0.1.0",
+  "version": "0.1.1",
```
inside `package.json`.

- [ ] **Step 3: Verify `.claude-plugin/plugin.json` bump**

Same expected diff inside `.claude-plugin/plugin.json`.

- [ ] **Step 4: Verify `.cursor-plugin/plugin.json` bump**

Same expected diff inside `.cursor-plugin/plugin.json`.

- [ ] **Step 5: Verify `.claude-plugin/marketplace.json` bump (the tricky one)**

Confirm the diff shows `0.1.0 → 0.1.1` inside the `plugins[0]` object (NOT at the top level, NOT duplicated, NOT missing). The diff should look something like:
```diff
     "description": "...",
-    "version": "0.1.0"
+    "version": "0.1.1"
   }
 ]
```

**If this file is NOT updated in the diff, the config from Task 3 needs fixing.** This is the most likely failure point. Options:
- Close the Release PR without merging.
- Update `release-please-config.json` to use the correct syntax (re-run the Task 1 research).
- Force release-please to regenerate the PR by pushing an empty commit: `git commit --allow-empty -m "chore: retrigger release-please" && git push`.
- Re-audit.

Do not proceed to Task 10 until all 4 JSON files are correctly updated.

- [ ] **Step 6: Verify `.release-please-manifest.json` bump**

Confirm:
```diff
-  ".": "0.1.0"
+  ".": "0.1.1"
```

- [ ] **Step 7: Verify `CHANGELOG.md` has a new entry**

Confirm a new `## [0.1.1]` (or `## 0.1.1`) section was prepended, containing the `fix:` commit message under a `### Bug Fixes` heading (or similar).

- [ ] **Step 8: Report the audit result**

If all 6 checks pass, tell the user: "Release PR audit passed. All 4 version files + manifest + changelog are correctly updated. Ready to merge."

---

## Task 10: Merge the Release PR and verify the release

**Files:** None directly. Post-merge verification.

**⚠️ This task publishes a real release.** Ask the user before merging: "Ready to merge the Release PR and publish `v0.1.1`?"

- [ ] **Step 1: Merge the Release PR**

Run (replace `<N>` with the PR number):
```bash
gh pr merge <N> --squash
```

Or if the user prefers, they can click "Merge" in the GitHub UI. Confirm with the user which they prefer.

**Do NOT use `--auto`** — that flag requires branch protection to be enabled and will hang otherwise. Plain `--squash` merges immediately.

Expected: merge succeeds.

- [ ] **Step 2: Wait for the post-merge workflow run**

Run:
```bash
gh run list --workflow=release.yml --limit=1
```

Expected: a new run triggered by the merge commit, conclusion `success`.

- [ ] **Step 3: Verify the tag was created**

Run:
```bash
cd C:/Users/97254/compi && git fetch --tags && git tag -l
```

Expected output includes:
```
v0.1.1
```

- [ ] **Step 4: Pull master and verify file contents**

Run:
```bash
cd C:/Users/97254/compi && git pull origin master
```

Then verify each file:
```bash
node -e "console.log(require('C:/Users/97254/compi/package.json').version)"
node -e "console.log(require('C:/Users/97254/compi/.claude-plugin/plugin.json').version)"
node -e "console.log(require('C:/Users/97254/compi/.cursor-plugin/plugin.json').version)"
node -e "console.log(require('C:/Users/97254/compi/.claude-plugin/marketplace.json').plugins[0].version)"
node -e "console.log(require('C:/Users/97254/compi/.release-please-manifest.json')['.'])"
```

Expected: every command outputs `0.1.1`.

- [ ] **Step 5: Verify `CHANGELOG.md`**

Read `CHANGELOG.md` and confirm it now has a `## [0.1.1]` (or `## 0.1.1`) section near the top, with the `fix:` commit listed.

- [ ] **Step 6: Clean up scratch notes**

If a scratch file from Task 1 Step 3 still exists, delete it:
```bash
rm -f C:/Users/97254/compi/.release-research-notes.md
```

Confirm it does not appear in `git status`.

- [ ] **Step 7: Report Definition of Done**

Tell the user:

> **Release pipeline is live and verified.** The following are now true on master:
> - All 5 config/doc files are committed (`release.yml`, `release-please-config.json`, `.release-please-manifest.json`, `CHANGELOG.md`, `CLAUDE.md` updates)
> - The dormant run on the `ci:` commit did nothing (as expected)
> - A live `fix:` commit produced a Release PR with correct bumps across all 4 JSON files + manifest + changelog
> - Merging the Release PR created the `v0.1.1` git tag
> - All 4 JSON files + manifest now read `0.1.1` on master
>
> Going forward, every `feat:` / `fix:` / `feat!:` commit pushed to master will update a Release PR automatically. Merge it whenever you want to ship.
