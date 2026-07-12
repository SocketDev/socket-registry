/**
 * @file Unified check runner — delegates to lint + type + path-hygiene.
 *   Forwards CLI scope flags to the lint script so `pnpm run check --all`
 *   actually runs a full-scope lint (not the default modified-only scope).
 *   `pnpm type` doesn't accept our scope flags, so it's always a full check.
 *   Usage: pnpm run check # lint in modified scope + full type check +
 *   path-hygiene pnpm run check --staged # lint staged + full type + paths pnpm
 *   run check --all # full lint + full type + paths (CI) Byte-identical across
 *   every fleet repo. Sync-scaffolding flags drift. The step list itself lives
 *   in _shared/check-steps.mts (+ its domain-split siblings) — this file owns
 *   CLI scope parsing and the run loop.
 */

// prefer-async-spawn: sync-required — top-level CLI runner; entire
// flow is sequential gate-running with exit-code aggregation.
import process from 'node:process'

import { buildSteps, run } from './_shared/check-steps.mts'
import { discoverRepoChecks } from './_shared/repo-checks.mts'
import { isScopeFlag } from './_shared/scope-flags.mts'
import { REPO_ROOT } from './paths.mts'

export { buildSteps, run }

// True when `arg` is one of the flags check.mts forwards to lint.mts — --fix,
// --quiet, or a scope flag (--all/--staged/…).
export function isForwardedArg(arg: string): boolean {
  return arg === '--fix' || arg === '--quiet' || isScopeFlag(arg)
}

export function computeForwardedArgs(argv: string[]): string[] {
  return argv.filter(isForwardedArg)
}

export function main(): void {
  const forwardedArgs = computeForwardedArgs(process.argv.slice(2))
  const steps = buildSteps(forwardedArgs)

  // Repo-owned checks: a member extends `check --all` by dropping
  // assertion-named scripts into scripts/repo/check/ (fleet/repo
  // segmentation — a one-repo concern never enters the fleet tier).
  // Appended after the fleet steps, alphabetical, same fail-fast loop;
  // vacuous when the dir is absent.
  for (const rel of discoverRepoChecks(REPO_ROOT)) {
    steps.push(() => run('node', [rel]))
  }

  for (let i = 0, { length } = steps; i < length; i += 1) {
    if (!steps[i]!()) {
      process.exitCode = 1
      break
    }
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main()
}
