#!/usr/bin/env node
/**
 * @file Every packages/npm/* override tracks its upstream's latest release.
 *   An override that lags upstream ships stale behavior under the upstream's
 *   name — the override's implementation and unit tests must move in
 *   lock-step with upstream releases (docs/agents.md/fleet/test-layout.md,
 *   docs/agents.md/fleet/code-is-law.md). Fails when a pinned upstream in
 *   test/npm/package.json is behind that upstream's npm latest; the remedy
 *   is the sync driver, which updates implementation + tests together:
 *   node scripts/npm/sync-npm-overrides.mts --apply [--package <name>]
 *   Network-dependent by nature; an unreachable registry degrades to a
 *   loud pass so offline commits are never blocked on npm availability.
 *   Usage: node scripts/repo/check/npm-overrides-are-current.mts [--quiet]
 */

import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { collectOverrideDrift } from '../../npm/sync-npm-overrides.mts'

import type { OverrideDrift } from '../../npm/sync-npm-overrides.mts'

const logger = getDefaultLogger()

/**
 * Render the failing report; undefined when there is nothing to report.
 */
export function formatStaleReport(drift: OverrideDrift[]): string | undefined {
  const stale = drift.filter(d => d.status === 'stale')
  if (!stale.length) {
    return undefined
  }
  const lines = stale.map(
    d =>
      `  ${d.socketPkgName}: ${d.upstreamName} ${d.pinnedSpec} -> ` +
      `${d.latestVersion}`,
  )
  return [
    `${stale.length} npm override(s) behind their upstream latest:`,
    ...lines,
    'Sync implementation + tests in lock-step:',
    '  node scripts/npm/sync-npm-overrides.mts --apply [--package <name>]',
  ].join('\n')
}

async function main(): Promise<number> {
  const quiet = process.argv.includes('--quiet')
  let drift: OverrideDrift[]
  try {
    drift = await collectOverrideDrift()
  } catch (e) {
    logger.warn(
      `npm registry unreachable (${(e as Error).message}) — override ` +
        'currency not checked this run',
    )
    return 0
  }
  const report = formatStaleReport(drift)
  if (report === undefined) {
    if (!quiet) {
      logger.success('npm overrides track their upstream latest')
    }
    return 0
  }
  logger.fail(report)
  process.exitCode = 1
  return 1
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main()
}
