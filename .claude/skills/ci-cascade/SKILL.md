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

Follow the layer order exactly. Each layer gets its own PR. Never combine layers.

### Phase 1: Identify what changed

Determine which layer was modified:
- Layer 1 (leaf actions): checkout, install, debug, setup-git-signing, cleanup-git-signing, run-script, artifacts, cache-npm-packages
- Layer 2a (setup): references debug
- Layer 2b (setup-and-install): references checkout, setup, install
- Layer 3 (reusable workflows): ci.yml, provenance.yml
- Layer 4 (local wrappers): _local-not-for-reuse-*

### Phase 2: Create PRs in order

Starting from the layer above the change, create a PR for each layer:

1. **Get current SHA**: `git fetch origin main && git rev-parse origin/main`
2. **Create branch**: `git checkout -b chore/ci-cascade-layer-N`
3. **Update refs**: Replace old SHA with new SHA in all files at this layer
4. **Verify**: `grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<new-sha>"`
5. **Don't clobber**: Never replace third-party SHAs (actions/checkout, actions/upload-artifact, etc.)
6. **Commit**: `chore(ci): bump socket-registry action refs to main (<short-sha>)`
7. **Push and create PR**
8. **Wait for merge** before proceeding to next layer

### Phase 3: Propagate to external repos

The **propagation SHA** is the Layer 3 merge SHA (where ci.yml and provenance.yml were updated). All external repos pin to this same SHA.

External repos (update all):
- socket-btm, socket-cli, socket-sdk-js, socket-packageurl-js
- socket-sbom-generator, socket-lib, ultrathink

For each repo:
1. Update all `SocketDev/socket-registry/.github/` refs to the propagation SHA
2. Push directly to main where allowed
3. Create PRs where branch protection requires it

### Phase 4: Verify

For each updated repo, confirm no old SHAs remain:
```bash
grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<propagation-sha>"
```
