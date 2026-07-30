# Test layout

**No wheelhouse test ships to the fleet.** Members receive the fleet scripts,
hooks, and lint-rules as opaque cascaded tooling and run their OWN tests with the
cascaded **runner** (`scripts/fleet/test.mts`, `cover.mts`, the cascaded
`vitest.config.mts` + `test/{fleet,repo}/scripts/setup.mts`,
`test/fleet/_shared/lib` helpers). The wheelhouse authors + owns every
`*.test.mts`, and they all live under `test/repo/**` — host-only, never
cascaded, never in the release bundle.

`test/fleet/` holds only cascaded helpers + setup (`_shared/lib`,
`test/fleet/scripts/setup.mts`) — never a `*.test.*` file. There is no cascaded TEST tier.

## Homes

| Test of…                                      | Lives in                              |
| --------------------------------------------- | ------------------------------------- |
| Fleet **scripts** (`scripts/fleet/**`)        | `test/repo/{unit,integration}/**`     |
| Wheelhouse **hooks / lint-rules / git-hooks** | `test/repo/{unit,integration,e2e}/**` |
| Repo-specific host-owned code                 | `test/repo/**`                        |

All wheelhouse-only. The cascaded trees (`.claude/hooks/fleet`,
`.config/fleet/oxlint-plugin`, `.git-hooks`, `scripts/fleet`) ship **no**
`*.test.*` files.

## `test/repo/` organization

`test/repo/<category>/<area?>/<name>.test.mts`

- **category** — `unit` (pure, in-process), `integration` (spawns a child
  process / git fixture / exercises the cascade engine), `e2e` (release /
  publish / bundle flows), `isolated` (own forks / longer timeouts).
- **area** (optional) — e.g. `hooks`, `hooks-shared`, `lint-rules`, `git-hooks`,
  `sync-scaffolding`. Tests of fleet scripts sit flat under the category.
- Tests import the source under a relative path; a hook / lint-rule test that
  targets a cascaded dir-mirror source reads it under `template/base/**`.

## Enforcement (code-is-law)

- **Runner**: `prefer-vitest-guard` — tests are vitest, not `node:test`. Blocks
  a raw `node --test` on a src/repo test or a bare vitest binary call, and
  steers to `pnpm test [<file>]`.
- **No double-dash before the test path**: `no-vitest-double-dash-guard`
  blocks a vitest invocation with a `--` separator before the file path. The
  pnpm/npm args-separator swallows it, so vitest silently runs the WHOLE
  suite instead of the one file named.
- **No `node:test` under `scripts/`**: `no-test-in-scripts-guard` blocks a
  `node:test` suite living under `scripts/`. It never runs in CI, so move it
  to a vitest suite under `test/`.
- **`package.json` test scripts defer to a wrapper**: `test-script-defers-guard`
  blocks a `package.json` test script that invokes a raw test-runner binary
  directly instead of a `.mts` wrapper; the hook/lint-rule/script/git-hook
  tier's own runner scripts are exempt.
- **No test in a cascaded tree**: `cascaded-fleet-trees-have-no-tests` (in
  `check --all`) plus the edit-time guard fail loud if a `*.test.*` appears
  under any cascaded tree, absolute, no exceptions. Put it under `test/repo/`.
- **No test in the cascade manifest**: `scripts/repo/sync-scaffolding/manifest/files.mts` lists no `*.test.*`
  file. Its `test/fleet/**` entries are helpers + setup only, so the cascade
  never carries a wheelhouse test to a member.
