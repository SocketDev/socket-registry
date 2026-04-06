---
name: ci-cascade
description: Execute the GitHub Actions SHA pin cascade when a socket-registry action changes. Creates PRs in dependency order, waits for merges, and propagates the final SHA to all consuming repos.
---

# CI SHA Pin Cascade

Implements the cascade procedure defined in CLAUDE.md § "GitHub Actions SHA Pin Cascade (CRITICAL)".

## When to Use

- After modifying any GitHub Action in `.github/actions/`
- After modifying a reusable workflow in `.github/workflows/ci.yml` or `provenance.yml`
- When a dependency (Node.js version, pnpm version, sfw-free) changes in an action

## Procedure

Follow `_shared/env-check.md` to initialize a queue run entry for `ci-cascade`.

Follow the layer order exactly. Each layer gets its own PR. Never combine layers.

### Phase 1: Identify what changed

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

Determine which layer was modified:
- Layer 1 (leaf actions): checkout, install, debug, setup-git-signing, cleanup-git-signing, run-script, artifacts, cache-npm-packages
- Layer 2a (setup): references debug
- Layer 2b (setup-and-install): references checkout, setup, install
- Layer 3 (reusable workflows): ci.yml, provenance.yml
- Layer 4 (local wrappers): _local-not-for-reuse-*

### Phase 2: Create PRs in order

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

Starting from the layer above the change, create a PR for each layer:

1. **Get current SHA**: `git fetch origin main && git rev-parse origin/main`
2. **Create branch**: `git checkout -b chore/ci-cascade-layer-N`
3. **Update refs**: Replace old SHA with new SHA in all files at this layer
4. **Verify**: `grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<new-sha>"`
5. **Don't clobber**: Never replace third-party SHAs (actions/checkout, actions/upload-artifact, etc.)
6. **Commit**: `chore(ci): bump socket-registry action refs to main (<short-sha>)`
7. **Push and create PR**
8. **Wait for merge** before proceeding to next layer

### Phase 3: Update Layer 4 (local wrappers)

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

After Layer 3 merges, get the **propagation SHA** (Layer 3 merge SHA). Update the `_local-not-for-reuse-*` workflows to pin to this SHA. Create a PR, merge it.

The Layer 4 merge SHA is NOT used for external pinning — external repos pin to the Layer 3 SHA because that's where the reusable workflows (ci.yml, provenance.yml) were updated.

### Phase 4: Propagate to external repos

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

All external repos pin to the **propagation SHA** (Layer 3 merge SHA).

For each repo:
1. Update all `SocketDev/socket-registry/.github/` refs to the propagation SHA
2. Push directly to main where allowed (socket-btm, socket-sbom-generator, ultrathink)
3. Create PRs where branch protection requires it (socket-cli, socket-lib, socket-sdk-js, socket-packageurl-js)

### Phase 5: Verify

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

For each updated repo, confirm no old SHAs remain:
```bash
grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<propagation-sha>"
```

### Completion

Output a HANDOFF block per `_shared/report-format.md`:

```
=== HANDOFF: ci-cascade ===
Status: {pass|fail}
Summary: {one-line: "Propagated SHA XXXXX to N repos"}
=== END HANDOFF ===
```

Update queue: `status: done`, write completion timestamp.
