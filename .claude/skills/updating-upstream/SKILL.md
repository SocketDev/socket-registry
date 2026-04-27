---
name: updating-upstream
description: Bumps git submodules declared in `.gitmodules` to their latest stable upstream tag, for submodules NOT managed by an xport `version-pin` row. Reads the `# <name>-<version>` comment above each submodule as the current pin, finds the latest stable tag (excluding pre-releases), checks out, updates the comment, commits atomically. Invoked by the `updating` umbrella skill; can also be invoked standalone.
user-invocable: true
allowed-tools: Bash(pnpm:*), Bash(npm:*), Bash(git:*), Bash(node:*), Bash(rg:*), Bash(grep:*), Bash(find:*), Bash(ls:*), Bash(cat:*), Bash(head:*), Bash(tail:*), Bash(wc:*), Bash(diff:*), Read, Edit, Grep, Glob---

# updating-upstream

<task>
Bump every git submodule in `.gitmodules` that is NOT managed by an xport `version-pin` row, to its latest stable upstream tag. One atomic commit per submodule. Exits cleanly when the repo has no `.gitmodules` or when all submodules are owned by xport.
</task>

<context>
`.gitmodules` is the source of truth for which submodules exist. Each block may carry a version comment on the line immediately above:

```
# yoga-3.2.1
[submodule "packages/yoga/upstream/yoga"]
  path = packages/yoga/upstream/yoga
  url = https://github.com/facebook/yoga.git
  ignore = dirty
```

**Division of labor with xport:**
- If `xport.json` exists AND a submodule's path matches an `upstreams[<alias>].submodule` referenced by a `version-pin` row, it's owned by `updating-xport`. Skip it here.
- All other submodules are owned by this skill.

**Tag scheme detection** (in order of preference):
1. Existing `# <prefix>-<version>` comment — use that prefix to find the next tag
2. `v1.2.3` (v-prefixed semver)
3. `1.2.3` (bare semver)
4. Underscore style: `curl-8_19_0`, `liburing-2.14`
</context>

<constraints>
**Requirements:**
- Clean tree at start
- Conventional commit format: `chore(deps): bump <name> to <tag>`
- Update the `# <name>-<version>` comment line in `.gitmodules` (use Edit tool, not sed)
- Exclude pre-releases: `-rc`, `-alpha`, `-beta`, `-dev`, `-snapshot`, `-nightly`, `-preview`

**Forbidden:**
- Never bump a submodule managed by xport (defer to `updating-xport`)
- Never bump to a pre-release tag
- Never use `npx`, `pnpm dlx`, `yarn dlx`
- Never use sed to edit YAML/JSON (per CLAUDE.md) — use Edit tool

**CI mode** (`CI=true` / `GITHUB_ACTIONS`): skip per-bump test validation.
**Interactive mode**: `pnpm test` after each bump; roll back on test failure.
</constraints>

<instructions>

## Phase 1 — Pre-flight

```bash
test -f .gitmodules || { echo "no .gitmodules; skill n/a"; exit 0; }
git status --porcelain | grep -v '^??' && { echo "dirty tree; aborting"; exit 1; } || true
[ "$CI" = "true" ] || [ -n "$GITHUB_ACTIONS" ] && CI_MODE=true || CI_MODE=false
```

## Phase 2 — Discover submodules

List every submodule path:

```bash
git config --file .gitmodules --get-regexp path | awk '{print $2}'
```

For each path, check xport ownership:

```bash
if [ -f xport.json ]; then
  OWNED=$(jq --arg p "$SM_PATH" \
    '[.rows[] | select(.kind=="version-pin") | .upstream] as $pinned
     | .upstreams | to_entries
     | map(select(.key as $k | $pinned | index($k)))
     | map(select(.value.submodule == $p)) | length' xport.json)
  [ "$OWNED" -gt 0 ] && { echo "skipping $SM_PATH (owned by xport)"; continue; }
fi
```

## Phase 3 — Bump each unowned submodule

For each:

**3a. Read current version comment**

The comment lives directly above `[submodule "..."]` in `.gitmodules`:

```bash
LINE_NUM=$(grep -n "^\[submodule \"$SM_NAME\"\]" .gitmodules | cut -d: -f1)
COMMENT_LINE=$(sed -n "$((LINE_NUM - 1))p" .gitmodules)
# Parse: "# yoga-3.2.1" → PREFIX=yoga, OLD_VERSION=3.2.1
```

If no comment: use `git describe --tags` from the submodule's current HEAD as the baseline.

**3b. Find latest stable tag**

```bash
cd "$SM_PATH"
git fetch origin --tags --quiet
OLD_SHA=$(git rev-parse HEAD)

# Try each pattern until a match is found:
LATEST=$(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
[ -z "$LATEST" ] && LATEST=$(git tag --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
[ -z "$LATEST" ] && [ -n "$PREFIX" ] && LATEST=$(git tag --sort=-v:refname | grep -E "^${PREFIX}-[0-9]+\.[0-9]+\.[0-9]+$" | head -1)
[ -z "$LATEST" ] && [ -n "$PREFIX" ] && LATEST=$(git tag --sort=-v:refname | grep -E "^${PREFIX}_[0-9]+_[0-9]+_[0-9]+$" | head -1)
```

No match: skip this submodule with a log note.

**3c. Check out + update**

```bash
NEW_SHA=$(git rev-parse "$LATEST")
[ "$OLD_SHA" = "$NEW_SHA" ] && { cd -; continue; }
git checkout "$LATEST" --quiet
cd -
```

**3d. Update `.gitmodules` comment**

Use Edit tool to replace the comment line. If there was no prior comment, Edit to add one above the `[submodule "..."]` header.

**3e. Validate + commit**

```bash
if [ "$CI_MODE" = "false" ]; then
  pnpm test || {
    echo "tests failed after bump of $SM_NAME; rolling back"
    git checkout .gitmodules "$SM_PATH"
    continue
  }
fi

git add .gitmodules "$SM_PATH"
git commit -m "chore(deps): bump $SM_NAME to $LATEST"
```

## Phase 4 — Report

```
## updating-upstream report

**Bumped:** <N> submodule(s)
<list with OLD_TAG → NEW_TAG>

**Skipped (managed by xport):** <M> submodule(s)
<list>

**Skipped (no stable tag / already latest):** <K> submodule(s)
<list>
```

Emit HANDOFF block per `_shared/report-format.md`:

```
=== HANDOFF: updating-upstream ===
Status: {pass|fail}
Findings: {bumped: N, skipped_xport: M, skipped_other: K}
Summary: {one-line description}
=== END HANDOFF ===
```

</instructions>

## Success Criteria

- Every non-xport submodule bumped to latest stable (or skipped with explicit reason)
- One atomic commit per bumped submodule
- `.gitmodules` version comments synchronized
- No pre-release tags introduced
- `git submodule status` clean (all prefixed with space) at end

## When to use

- Invoked by the `updating` umbrella skill (weekly-update workflow)
- Standalone: `/updating-upstream` for a submodule-only sync
