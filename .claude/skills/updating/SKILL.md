---
name: updating
description: Umbrella update skill. Runs `pnpm run update` (npm), then delegates to `updating-xport` (if `xport.json` exists), `updating-upstream` (if `.gitmodules` exists), and `updating-workflows` (if SHA pins are stale). Triggers when user asks to "update dependencies", "update packages", "update everything", or prepare for a release.
user-invocable: true
allowed-tools: Skill, Bash, Read, Grep, Glob, Edit
---

# updating

<task>
Updates all npm dependencies to their latest versions, checks for stale workflow
SHA pins, and ensures all builds and tests pass.
</task>

<context>
**What is this?**
The umbrella update skill. Runs `pnpm run update` for npm deps, then delegates to sub-skills based on what the repo has:

**Update Targets:**
- **npm packages** — via `pnpm run update` (every Socket repo has this script)
- **xport-managed upstreams** — via the `updating-xport` skill if `xport.json` exists (manifest-managed submodules + advisory drift)
- **Other submodules** — via the `updating-upstream` skill if `.gitmodules` has submodules not claimed by xport
- **Workflow SHA pins** — via the `updating-workflows` skill (when stale)

Sub-skills are invoked only when applicable — this umbrella reads repo state (presence of `xport.json`, `.gitmodules`) to discover what to run.
</context>

<constraints>
**Requirements:**
- Start with clean working directory (no uncommitted changes)

**CI Mode** (detected via `CI=true` or `GITHUB_ACTIONS`):
- Create atomic commits, skip build validation (CI validates separately)
- Workflow handles push and PR creation

**Interactive Mode** (default):
- Validate updates with build/tests before proceeding
- Report validation results to user

**Actions:**
- Update npm packages
- Create atomic commits
- Report summary of changes
</constraints>

<instructions>

## Process

### Phase 1: Validate Environment

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

Follow `_shared/env-check.md` to validate the environment and initialize a queue run entry for `updating`.

---

### Phase 2: Update npm Packages

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Run pnpm run update to update npm dependencies:
</action>

```bash
# Update npm packages
pnpm run update

# Check if there are changes
if [ -n "$(git status --porcelain)" ]; then
  git add pnpm-lock.yaml pnpm-workspace.yaml package.json packages/npm/*/package.json
  git commit -m "chore: update npm dependencies

Updated npm packages via pnpm run update."
  echo "npm packages updated"
else
  echo "npm packages already up to date"
fi
```

---

### Phase 2.5: xport-managed upstreams (if applicable)

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

If `xport.json` exists at repo root, invoke the `updating-xport` skill:

```
<Skill tool invocation>
skill: updating-xport
</Skill tool invocation>
```

The sub-skill auto-bumps `version-pin` rows per their `upgrade_policy` and emits advisory notes for `file-fork` / `feature-parity` / `spec-conformance` / `lang-parity` findings. Capture its HANDOFF block for the final summary.

If `xport.json` does NOT exist, skip this phase.

---

### Phase 2.75: Remaining submodules (if applicable)

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

If `.gitmodules` exists, invoke the `updating-upstream` skill:

```
<Skill tool invocation>
skill: updating-upstream
</Skill tool invocation>
```

The sub-skill automatically skips submodules claimed by xport's `version-pin` rows. It bumps the rest to their latest stable tags.

If no `.gitmodules`, skip this phase.

---

### Phase 3: Check Workflow SHA Pins

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

Check if any workflow SHA pins are stale:

```bash
# Get the current pinned SHA from any workflow file
PINNED_SHA=$(grep -ohP '(?<=@)[0-9a-f]{40}' .github/workflows/_local-not-for-reuse-ci.yml | head -1)
MAIN_SHA=$(git rev-parse origin/main)

if [ "$PINNED_SHA" != "$MAIN_SHA" ]; then
  echo "Workflow SHA pins are stale: $PINNED_SHA (pinned) vs $MAIN_SHA (main)"
  echo "Run /update-workflows to cascade"
else
  echo "Workflow SHA pins are up to date"
fi
```

If stale, inform the user and offer to run the `updating-workflows` skill.

3b. **Update Security Tools** - Run `node .claude/hooks/setup-security-tools/update.mts` to check for new zizmor/sfw releases. Respects pnpm `minimumReleaseAge` cooldown for third-party tools (zizmor) but updates Socket tools (sfw) immediately. Updates embedded checksums in the setup hook.
3b-root. **Update Root External Tools** - Run `pnpm run update:external-tools` to check for new pnpm/zizmor releases and refresh the repo-root `external-tools.json` (consumed by `setup/action.yml` for CI and by `scripts/setup.mts` for local dev). Respects the same `minimumReleaseAge` cooldown. If a tool is bumped, every listed platform's sha256 is recomputed before the file is rewritten.
3c. **Sync Claude Code version** - Run `claude --version` to get the installed version. If it's newer than the `@anthropic-ai/claude-code` entry in `pnpm-workspace.yaml` catalog, update both the catalog entry AND the `minimumReleaseAgeExclude` pinned version. This bypasses cooldown since we're the ones running it. Then run `pnpm install` to update the lockfile.

---

### Phase 4: Final Validation

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

Follow `_shared/verify-build.md` for build validation.

---

### Phase 5: Report Summary

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Generate update report:
</action>

```
## Update Complete

### Updates Applied:

| Category | Status |
|----------|--------|
| npm packages | Updated/Up to date |
| xport upstreams | N version-pin rows bumped, M advisory (or n/a if no `xport.json`) |
| Other submodules | K bumped (or n/a if no `.gitmodules`) |
| Workflow SHA pins | Up to date/Stale (run /update-workflows) |

### Commits Created:
- [list commits if any]

### Validation:
- Build: SUCCESS/SKIPPED (CI mode)
- Tests: PASS/SKIPPED (CI mode)

### Next Steps:
**Interactive mode:**
1. Review changes: `git log --oneline -N`
2. Push to remote: `git push origin main`

**CI mode:**
1. Workflow will push branch and create PR
2. CI will run full build/test validation
3. Review PR when CI passes
```

### Completion

Output a HANDOFF block per `_shared/report-format.md`:

```
=== HANDOFF: updating ===
Status: {pass|fail}
Findings: {packages_updated: N}
Summary: {one-line description of what was updated}
=== END HANDOFF ===
```

Update queue: `status: done`, write completion timestamp.

</instructions>

## Success Criteria

- All npm packages checked for updates
- Full build and tests pass (interactive mode)
- Summary report generated

## Context

This skill is useful for:

- Weekly maintenance (automated via weekly-update.yml)
- Security patch rollout
- Pre-release preparation

**Safety:** Updates are validated before committing. Failures stop the process.
