// socket-lint: mirror-exempt — imports paths.mts (broadly-shared util), not a single source module
/*
 * @file Validates the local Agent CI path (`pnpm run ci:local`). Two tiers:
 *
 *   1. ALWAYS (cheap, runs everywhere incl. CI): the `ci:local` script exists in
 *      package.json and carries the canonical agent-ci flag set. This catches a
 *      repo that lost the script in a bad cascade.
 *   2. OPT-IN (heavy, local-with-Docker only): actually run `ci:local` and assert
 *      it succeeds. Skipped when:
 *
 *   - `getCI()` is truthy — running the full CI pipeline INSIDE a CI job is both
 *     pointless and recursive (this very test would re-run CI).
 *   - the Docker daemon is absent — agent-ci runs each job in a container; no
 *     daemon means "environment not ready", not "your code is broken". That
 *     leaves the case the developer actually wants: a local pre-push check that
 *     the CI pipeline is green before pushing.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { getCI } from '@socketsecurity/lib-stable/env/ci'
import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import { describe, expect, test } from 'vitest'

import { REPO_ROOT } from '../../../scripts/fleet/paths.mts'

// The canonical ci:local command from the scripts manifest. Routed through
// agent-ci-skip-locks.mts (agent-ci can't parse a gh-aw .lock.yml → the wrapper
// turns the crash into an informative skip, then forwards verbatim). agent-ci
// resolves from node_modules/.bin (never pnpm exec / npx); the flags are: --all
// (PR/push workflows for the branch), --quiet (pipe-safe renderer),
// --pause-on-failure (hold the container at the first failed step for `agent-ci
// retry`), --github-token (bare → gh auth token, fetches the socket-registry
// reusable workflow every fleet ci.yml calls).
const EXPECTED_CI_LOCAL =
  'node scripts/fleet/agent-ci-skip-locks.mts run --all --quiet --pause-on-failure --github-token'

function readPackageJson(): Record<string, unknown> {
  const pkgPath = path.join(REPO_ROOT, 'package.json')
  return JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>
}

// True when a Docker daemon is reachable. `docker info` exits non-zero (or
// `docker` is absent) when the daemon is down — agent-ci would then fail fast
// on the socket, which is an environment gap, not a test failure.
function dockerAvailable(): boolean {
  const r = spawnSync('docker', ['info'], { stdio: 'ignore' })
  return r.status === 0
}

describe('ci:local — script shape (always)', () => {
  test('package.json wires the canonical ci:local agent-ci command', () => {
    const pkg = readPackageJson()
    const scripts = (pkg['scripts'] ?? {}) as Record<string, unknown>
    expect(scripts['ci:local']).toBe(EXPECTED_CI_LOCAL)
  })
})

// Heavy integration tier, opt-in via RUN_LOCAL_CI=1. getCI() is the fleet's
// rewire-aware CI probe (any CI value counts); skipping under it prevents the
// CI-runs-CI recursion. Never auto-on with a live Docker daemon: `pnpm run
// ci:local` mutates the real checkout (installs, fix steps rewrite
// package.json) while sibling vitest workers read it, and its
// --pause-on-failure can park holding the worktree index.lock.
const runLocalCi =
  process.env['RUN_LOCAL_CI'] === '1' && !getCI() && dockerAvailable()

describe.skipIf(!runLocalCi)(
  'ci:local — pipeline runs green (local + Docker)',
  () => {
    // The pipeline spins up containers per job; give it room (timeout is the
    // second arg in Vitest 4, the callback is third).
    test('pnpm run ci:local exits 0', { timeout: 900_000 }, () => {
      const r = spawnSync('pnpm', ['run', 'ci:local'], {
        cwd: REPO_ROOT,
        // Detached pipe semantics: when stdout is not a TTY, agent-ci exits 77
        // the moment a step pauses. 0 = every workflow step passed; anything
        // else (including 77) means a step failed — surface it.
        encoding: 'utf8',
        stdio: 'pipe',
      })
      const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`
      // Environment gaps, not code failures — same class as a missing Docker
      // daemon; tolerate, don't fail:
      // - a workflow references repo vars/secrets not provisioned in THIS
      //   environment (e.g. a GitHub App's vars/secrets before the org sets
      //   them) — agent-ci can't simulate them;
      // - `--github-token` needs an authenticated `gh` whose keyring token is
      //   live — the fleet's 8-hour token-age hygiene routinely leaves dev
      //   boxes with an expired token between refreshes.
      if (
        r.status !== 0 &&
        (out.includes('Missing vars required by workflow') ||
          out.includes('requires `gh` CLI to be installed and authenticated'))
      ) {
        return
      }
      expect(r.status, `ci:local exited ${r.status}\n${out}`).toBe(0)
    })
  },
)
