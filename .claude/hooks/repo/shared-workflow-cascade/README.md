# shared-workflow-cascade

PostToolUse Bash hook that fires whenever a `git push` or `git commit`
touches a shared workflow file in socket-registry:

- `.github/workflows/ci.yml` (Layer 3 reusable workflow)
- `.github/workflows/provenance.yml` (Layer 3 reusable workflow)
- `.github/workflows/_local-not-for-reuse-*.yml` (Layer 4 — signals cascade done)

## Why

After `cascade-internal.mts` converges, the Layer 3 propagation SHA
changes. Every fleet consumer repo (socket-lib, socket-cli, socket-btm,
socket-sdk-js, socket-packageurl-js, sdxgen, ultrathink) has a SHA pin
pointing at socket-registry's reusable workflows. That pin is now stale.

Without this hook Claude routinely completes the internal cascade and
moves on without touching external consumers, leaving them broken until
the next manual bump.

## What it does

Emits a blocking error message that lists the changed files and
instructs the agent to complete Phase 4 of the `/updating-workflows`
skill before proceeding.

## Gate

The hook only fires after a commit/push — it does not block during
editing. The CI-green gate from Phase 2.5 of the skill still applies.

## Bypass

Type `Allow workflow-cascade bypass` to skip for non-behavioural
changes (doc-only edits, comment changes, etc.).
