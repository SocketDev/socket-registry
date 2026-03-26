# updating Reference Documentation

## Table of Contents

1. [How the Update Script Works](#how-the-update-script-works)
2. [Files Changed After Update](#files-changed-after-update)
3. [Validation Commands](#validation-commands)
4. [Troubleshooting](#troubleshooting)

---

## How the Update Script Works

`pnpm run update` runs `scripts/update.mjs` which performs:

```bash
# 1. Run taze recursively with write mode
pnpm exec taze -r -w

# 2. Force-update Socket scoped packages (bypasses taze maturity period)
pnpm update @socketsecurity/* @socketregistry/* @socketbin/* --latest -r

# 3. pnpm install runs automatically to reconcile lockfile
```

### Repo Structure

- **Monorepo** with pnpm workspaces: `packages/npm/*`, `perf/*`, `registry`, `scripts`
- Uses `pnpm-workspace.yaml` catalog for centralized version management
- Dependencies use `catalog:` references in package.json files
- Has `pnpm.overrides` mapping many packages to `@socketregistry/*` replacements
- Has `pnpm.patchedDependencies` for brace-expansion, iconv-lite, minimatch

---

## Files Changed After Update

- `package.json` - Root dependency version pins
- `pnpm-workspace.yaml` - Catalog version entries
- `packages/npm/*/package.json` - Workspace package dependencies
- `pnpm-lock.yaml` - Lock file

---

## Validation Commands

```bash
# Fix lint issues
pnpm run fix --all

# Run all checks (lint + type check)
pnpm run check --all

# Run tests
pnpm test
```

---

## Troubleshooting

### taze Fails to Detect Updates

**Cause:** taze has a maturity period for new releases.
**Solution:** Socket packages are force-updated separately via `pnpm update --latest`.

### Catalog Version Mismatches

**Symptom:** Workspace packages reference `catalog:` but version differs from
what taze wrote to root `package.json`.
**Solution:** Ensure `pnpm-workspace.yaml` catalog entries match. taze updates
catalog entries directly when using `-r -w`.

### Lock File Conflicts

**Solution:**
```bash
rm pnpm-lock.yaml
pnpm install
```
