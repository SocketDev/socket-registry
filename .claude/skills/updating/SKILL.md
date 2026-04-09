---
name: updating
description: Updates all npm dependencies and workflow SHA pins. Triggers when user asks to "update dependencies", "update packages", "update everything", or prepare for a release.
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob, Edit
---

# updating

<task>
Your task is to update all npm dependencies to their latest versions, check for
stale workflow SHA pins, and ensure all builds and tests pass.
</task>

<context>
**What is this?**
This skill updates npm packages and checks workflow SHA pins.

**Update Targets:**
- npm packages via `pnpm run update`
- Workflow SHA pins via the `updating-workflows` skill (when stale)
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
