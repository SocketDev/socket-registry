---
name: release
description: Orchestrates a release by chaining quality-scan and security-scan as gates, generating a changelog, bumping the version, and offering to publish. Use when preparing a release, cutting a new version, or when `/release-changelog` is invoked.
---

# Release

Orchestrates a release by chaining quality-scan and security-scan as gates, then generating a changelog and version bump.

## When to Use

- Preparing a new release
- When `/release-changelog` command is invoked (delegates here)

## Process

### Phase 1: Quality Gate

Run the `/quality-scan` skill with all scan types enabled.

**Gate condition**: zero CRITICAL findings. If any CRITICAL findings exist, abort the release and report them.

Read the HANDOFF block from quality-scan to check:
```
Findings: {critical: N, ...}
```

If `critical > 0`: stop, report findings, do not proceed.

Update queue: `current_phase: quality-gate`

---

### Phase 2: Security Gate

Run the `/security-scan` skill.

**Gate condition**: grade B or above. If grade is C, D, or F, abort the release and report findings.

Read the HANDOFF block from security-scan to check:
```
Grade: {A-F}
```

If grade is C or worse: stop, report findings, do not proceed.

Update queue: `current_phase: security-gate`

---

### Phase 3: Changelog

Generate changelog entry following CLAUDE.md § "Changelog Management":

1. Read current `CHANGELOG.md` to get the last released version (if it doesn't exist, create it with the Keep a Changelog header)
2. If no tags exist, use all commits on main; otherwise run `git log --oneline <last-tag>..HEAD`
3. Categorize: Added / Changed / Fixed / Removed
4. Skip chore/ci/deps commits unless they affect user-facing behavior
5. Write new entry at top of CHANGELOG.md
6. Present for review before committing

Update queue: `current_phase: changelog`

---

### Phase 4: Version Bump

Determine version bump from commit types:
- `feat` commits → minor bump
- `fix` commits only → patch bump
- Breaking changes (noted in commits) → major bump

Update `version` in `package.json`.

Present the version change for approval. Commit changelog + version bump together:
```
chore(release): X.Y.Z
```

Update queue: `status: done`

---

### Post-Release (Manual)

After the release commit is merged:
1. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
2. The provenance workflow handles npm publishing
