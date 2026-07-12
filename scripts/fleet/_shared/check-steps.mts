/**
 * @file Fleet check step registry — assembles the full `check --all` step
 *   list from its domain-split sibling registries (hooks-and-docs, paths-
 *   and-supply-chain, release-and-docs) plus the shared `run` step executor
 *   every domain file spawns steps through. check.mts composes this with CLI
 *   scope parsing and the repo-owned check discovery loop.
 */

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

import { buildHookAndDocSteps } from './check-steps-hooks.mts'
import { buildPathsAndSupplyChainSteps } from './check-steps-paths.mts'
import { buildReleaseAndDocsSteps } from './check-steps-release.mts'

// spawnSync with array args — no shell interpolation, matches the
// socket/prefer-spawn-over-execsync rule.
export function run(cmd: string, cmdArgs: string[]): boolean {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit' })
  return r.status === 0
}

export function buildSteps(forwardedArgs: string[]): Array<() => boolean> {
  return [
    ...buildHookAndDocSteps(forwardedArgs),
    ...buildPathsAndSupplyChainSteps(),
    ...buildReleaseAndDocsSteps(),
  ]
}
