---

name: repo-updating-workflows
description: Executes the GitHub Actions SHA pin cascade when a socket-registry action or workflow changes. Lands one layer at a time (direct push to main by default; PR only when the repo's branch protection requires it), waits for each layer's merge SHA, and propagates the final SHA to all consuming repos. Use when workflow files or actions change, or when asked to update workflows or cascade SHAs.
user-invocable: true
allowed-tools: Bash(pnpm:_), Bash(npm:_), Bash(git:_), Bash(node:_), Bash(rg:_), Bash(grep:_), Bash(find:_), Bash(ls:_), Bash(cat:_), Bash(head:_), Bash(tail:_), Bash(wc:_), Bash(diff:\*), Read, Grep, Glob, Edit---

# Updating Workflows

Executes the SHA pin cascade defined in [reference.md](reference.md).

## When to use

- After modifying any action in `.github/actions/`
- After modifying a reusable workflow (`ci.yml` or `provenance.yml`)
- When a dependency changes in an action (Node.js, pnpm, sfw binary)
- As part of the `/update-workflows` command

## Process

### Phase 1: Identify what changed

Determine which layer was modified (see [reference.md](reference.md) for layer definitions). The cascade starts from the layer **above** the change.

```
Progress:
- [ ] Identified changed layer
- [ ] Determined starting layer for cascade
```

### Phase 2: Land each layer in order

For each layer from the starting layer through Layer 3:

1. **Wait for the previous layer's commit to land on `main`** before starting the next layer — the new merge SHA is what the next layer pins to.
2. Get the **post-merge** SHA from main — NEVER use a SHA from a feature branch or PR head:
   ```bash
   git fetch origin main && git rev-parse origin/main
   ```
3. **Verify the SHA exists on GitHub** before writing it into any file:
   ```bash
   gh api repos/SocketDev/socket-registry/commits/<sha> --jq '.sha'
   ```
4. Replace old SHA with new SHA in all files at this layer only — direct edits on a checkout of `main`, no feature branch unless step 7 forces it.
5. Verify no stale refs: `grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<new-sha>"`
6. Don't clobber third-party SHAs (`actions/checkout`, etc.).
7. Commit: `chore(ci): bump socket-registry action refs to main (<short-sha>)`.
8. **Land it**:
   - **Default**: `git push origin main`. socket-registry follows the fleet "push direct → PR only on rejection" pattern from CLAUDE.md.
   - **If push is rejected** (branch protection denies direct push): create a branch, push, `gh pr create`, merge, then `git fetch origin main` to record the merge SHA.
9. **Record the resulting `origin/main` SHA** — that's what the next layer pins to.

After Layer 3 lands, record the merge SHA. This is the **propagation SHA**.

```
Progress:
- [ ] Layer 2a landed (if needed)
- [ ] Layer 2b landed (if needed)
- [ ] Layer 3 landed -> propagation SHA: ________
```

### Phase 2.5: GATE — the propagation SHA's OWN CI must be green 🛑

🚨 **DO NOT propagate a SHA whose CI is not green. This is a hard STOP, not a
recommendation.** A Layer 3 commit landing on `main` only means it merged — NOT
that it works. A merged-but-red propagation SHA (broken action, missing
`external-tools.json`, a malware-flagged dependency surfaced by the install
step, a lint/type regression) gets blasted to every consumer and breaks the
entire fleet's CI at once. **Why:** a shared-workflow SHA cascaded to a consumer
before its CI was confirmed can fail the consumer several ways at once — lint
debt the source layer carried, a `setup-and-install` path break, a malware flag
the install step surfaces on a transitive dep — all of which a CI-green check on
the propagation SHA catches before a single consumer is touched.

Confirm the propagation SHA's CI run concluded **success** before touching Layer 4
or any consumer:

```bash
# The propagation SHA must have a completed, successful CI run.
gh run list --repo SocketDev/socket-registry --commit <propagation-sha> \
  --json workflowName,status,conclusion \
  --jq '.[] | select(.workflowName == "⚡ CI") | {status, conclusion}'
```

- `status: "completed"` AND `conclusion: "success"` → gate passes, proceed.
- `conclusion: "failure"` / `"cancelled"` / `"timed_out"` → **STOP.** Fix the
  failure at the source layer, land a new Layer 3 commit, and restart from a new
  propagation SHA. Never propagate the failing one.
- `status: "in_progress"` / no run yet → **WAIT.** Poll until it concludes; do not
  propagate on an unfinished run. (If a run takes too long, that is still not a
  pass — wait or fix, never assume.)

This gate is mandatory even when the change "looks trivial" — a one-line action
edit can still pull a newly-malware-flagged transitive dep through the install
step. There is no bypass: a red propagation SHA is never propagated.

```
Progress:
- [ ] Propagation SHA CI run is completed + success (NOT just merged): ________
```

### Phase 3: Update Layer 4

Pin all `_local-not-for-reuse-*` workflows to the **propagation SHA** (Layer 3 merge SHA). Same land-direct-or-fall-back-to-PR pattern from Phase 2 step 8.

```
Progress:
- [ ] Layer 4 landed
```

### Phase 4: Propagate to external repos

All external repos pin to the **propagation SHA** (NOT the Layer 4 merge SHA).

Per the fleet "push direct → PR only on rejection" policy (CLAUDE.md), the default for every external consumer is `git push origin main`. Each repo's branch protection determines whether that succeeds; on rejection, fall back to a PR. The historical lists below record what's typically *expected* but the runtime authority is whether `git push` is accepted — don't pre-decide.

- **Direct push usually accepted**: socket-btm, sdxgen, ultrathink.
- **PR typically required** (branch protection): socket-cli, socket-lib, socket-sdk-js, socket-packageurl-js.

> **Note:** the `sdxgen` repo's local checkout lives at `../socket-sdxgen/` but the GitHub remote is `SocketDev/sdxgen`. Use the bare name for `gh` commands.

```
Progress:
- [ ] socket-btm
- [ ] socket-cli
- [ ] socket-lib
- [ ] socket-sdk-js
- [ ] socket-packageurl-js
- [ ] sdxgen
- [ ] ultrathink
```

### Phase 5: Verify

For each updated repo, confirm no stale SHAs remain:

```bash
grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<propagation-sha>"
```
