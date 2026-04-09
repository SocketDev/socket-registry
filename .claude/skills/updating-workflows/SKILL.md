---
name: updating-workflows
description: Executes the GitHub Actions SHA pin cascade when a socket-registry action or workflow changes. Creates PRs in dependency order, waits for merges, and propagates the final SHA to all consuming repos. Use when workflow files or actions change, or when asked to update workflows or cascade SHAs.
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob, Edit
---

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

### Phase 2: Create PRs in layer order

For each layer from the starting layer through Layer 3:

1. **Wait for previous PR to merge** before starting the next layer
2. Get the **post-merge** SHA from main — NEVER use a SHA from a PR branch:
   ```bash
   git fetch origin main && git rev-parse origin/main
   ```
3. **Verify the SHA exists on GitHub** before writing it into any file:
   ```bash
   gh api repos/SocketDev/socket-registry/commits/<sha> --jq '.sha'
   ```
4. Create branch: `git checkout -b chore/ci-cascade-layer-N`
5. Replace old SHA with new SHA in all files at this layer only
6. Verify no stale refs: `grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<new-sha>"`
7. Don't clobber third-party SHAs (`actions/checkout`, etc.)
8. Commit: `chore(ci): bump socket-registry action refs to main (<short-sha>)`
9. Push and create PR
10. **Wait for merge** before proceeding to next layer

After Layer 3 merges, record the merge SHA. This is the **propagation SHA**.

```
Progress:
- [ ] Layer 2a PR (if needed)
- [ ] Layer 2b PR (if needed)
- [ ] Layer 3 PR -> propagation SHA: ________
```

### Phase 3: Update Layer 4

Pin all `_local-not-for-reuse-*` workflows to the **propagation SHA** (Layer 3 merge SHA). Create a PR, wait for merge.

```
Progress:
- [ ] Layer 4 PR
```

### Phase 4: Propagate to external repos

All external repos pin to the **propagation SHA** (NOT the Layer 4 merge SHA).

- Push directly to main: socket-btm, socket-sbom-generator, ultrathink
- Create PRs: socket-cli, socket-lib, socket-sdk-js, socket-packageurl-js

```
Progress:
- [ ] socket-btm
- [ ] socket-cli
- [ ] socket-lib
- [ ] socket-sdk-js
- [ ] socket-packageurl-js
- [ ] socket-sbom-generator
- [ ] ultrathink
```

### Phase 5: Verify

For each updated repo, confirm no stale SHAs remain:

```bash
grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<propagation-sha>"
```
