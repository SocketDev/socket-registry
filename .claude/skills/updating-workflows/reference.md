# Updating Workflows Reference

## Table of Contents

1. [Architecture layers](#architecture-layers)
2. [Propagation SHA](#propagation-sha)
3. [Cascade procedure](#cascade-procedure)
4. [External consuming repos](#external-consuming-repos)
5. [Rules](#rules)

---

## Architecture layers

Actions and workflows reference each other by full 40-char SHA. When any action
changes, all consumers must be updated in dependency order via separate PRs. Each
PR must merge before the next can be created (the new merge SHA becomes the pin).

```
Layer 1 — Leaf actions (no internal SocketDev refs):
  checkout, install, debug, setup-git-signing, cleanup-git-signing,
  run-script, artifacts, cache-npm-packages

Layer 2a — setup (references Layer 1):
  setup/action.yml         -> refs: debug

Layer 2b — setup-and-install (references Layer 1 + 2a):
  setup-and-install        -> refs: checkout, setup, install

Layer 3 — Shared reusable workflows (reference Layer 2):
  ci.yml                   -> refs: setup-and-install, run-script
  provenance.yml           -> refs: setup-and-install
  weekly-update.yml        -> refs: setup-and-install, setup-git-signing, cleanup-git-signing

Layer 4 — _local workflows (reference Layer 3, not reused externally):
  _local-not-for-reuse-ci.yml             -> refs: ci.yml, setup-and-install, cache-npm-packages
  _local-not-for-reuse-provenance.yml     -> refs: provenance.yml
  _local-not-for-reuse-weekly-update.yml  -> refs: weekly-update.yml (via uses) OR setup-and-install directly
```

---

## Propagation SHA

The **propagation SHA** is the Layer 3 merge SHA — the one where `ci.yml`,
`provenance.yml`, or `weekly-update.yml` were updated.

- Layer 4 (`_local-not-for-reuse-*`) pins to the propagation SHA
- External repos pin to the propagation SHA
- The Layer 4 merge SHA is NOT used for external pinning because it only
  changed `_local` wrappers, not the reusable workflows that consumers reference

---

## Cascade procedure

Starting from the layer **above** the change, create a PR for each layer.

**Full cascade (when a leaf action changes):**

```
1. PR: Update Layer 2a pins (setup)                  -> merge -> get SHA
2. PR: Update Layer 2b pins (setup-and-install)       -> merge -> get SHA
3. PR: Update Layer 3 pins (ci.yml, provenance.yml)   -> merge -> get SHA  <-- PROPAGATION SHA
4. PR: Update Layer 4 pins (_local workflows)         -> merge
5. Propagate the Layer 3 SHA to all consuming repos
```

**Shortcut (when the change is at a higher layer):**

- Change at Layer 2a/2b: start cascade from Layer 3
- Change at Layer 3: start cascade from Layer 4, propagation SHA is the Layer 3 merge commit
- Change at Layer 4: no internal cascade, external repos may need updating if reusable workflows also changed

---

## External consuming repos

All pin to the propagation SHA (Layer 3 merge SHA):

| Repo | Method |
|------|--------|
| socket-btm | Push directly to main |
| sdxgen | Push directly to main (local checkout at `../socket-sdxgen/`) |
| stuie | Push directly to main (local checkout at `../socket-tui/`) |
| ultrathink | Push directly to main |
| socket-cli | Create PR |
| socket-lib | Create PR |
| socket-sdk-js | Create PR |
| socket-packageurl-js | Create PR |

---

## Rules

- Each layer gets its own PR — never combine layers
- **NEVER type or guess SHAs** — always copy the full 40-char SHA from command output:
  ```bash
  git fetch origin main && git rev-parse origin/main
  ```
- Always get SHAs from main AFTER merge (squash merges create new SHAs)
- **Verify SHA exists on GitHub before using it in any file**:
  ```bash
  gh api repos/SocketDev/socket-registry/commits/<sha> --jq '.sha'
  ```
- Use `--no-verify` for pin-only commits (no code changes)
- Verify no stale refs: `grep -rn "SocketDev/socket-registry" .github/ | grep "@" | grep -v "<current-sha>"`
- Don't clobber third-party SHAs (`actions/checkout`, `actions/upload-artifact`, etc.)
