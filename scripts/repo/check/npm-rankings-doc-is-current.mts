#!/usr/bin/env node
/*
 * @file Repo gate: the committed npm-high-impact rankings doc matches what the
 *   generator renders from the catalog-pinned dataset. The doc is
 *   script-owned (scripts/repo/npm/gen-high-impact-rankings.mts); a
 *   npm-high-impact bump or a packages/npm addition makes the committed copy
 *   stale, and this gate turns that staleness red instead of letting the
 *   research record drift. Fix: node
 *   scripts/repo/npm/gen-high-impact-rankings.mts --write, then commit the
 *   regenerated doc. Exit codes: 0 - the doc matches; 1 - stale or missing.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { isMainModule } from '../../fleet/_shared/is-main-module.mts'
import { ROOT_PATH } from '../constants/paths.mts'
import {
  RANKINGS_DOC_PATH,
  readOverrideUpstreamNames,
  renderHighImpactRankings,
} from '../npm/gen-high-impact-rankings.mts'

const logger = getDefaultLogger()

export interface RankingsDocCheckOptions {
  // Suppress the pass line; failures always print.
  quiet?: boolean | undefined
}

export async function runRankingsDocCheck(
  options?: RankingsDocCheckOptions | undefined,
): Promise<number> {
  const opts = { __proto__: null, ...options } as RankingsDocCheckOptions
  const quiet = opts.quiet === true
  const relDoc = path.relative(ROOT_PATH, RANKINGS_DOC_PATH)
  const mod = await import('npm-high-impact')
  const manifest = JSON.parse(
    readFileSync(
      path.join(ROOT_PATH, 'node_modules', 'npm-high-impact', 'package.json'),
      'utf8',
    ),
  ) as { version: string }
  const expected = renderHighImpactRankings(
    {
      npmHighImpact: mod.npmHighImpact,
      npmTopDependents: mod.npmTopDependents,
      npmTopDownloads: mod.npmTopDownloads,
      version: manifest.version,
    },
    readOverrideUpstreamNames(),
  )
  const actual = existsSync(RANKINGS_DOC_PATH)
    ? readFileSync(RANKINGS_DOC_PATH, 'utf8')
    : undefined
  if (actual === expected) {
    if (!quiet) {
      logger.success(
        `npm-rankings-doc-is-current: ${relDoc} matches npm-high-impact ${manifest.version}.`,
      )
    }
    return 0
  }
  logger.fail(
    [
      `npm-rankings-doc-is-current: ${relDoc} is ${actual === undefined ? 'missing' : 'stale'}.`,
      `  Saw: ${actual === undefined ? 'no committed doc' : 'committed bytes that differ from the render'}.`,
      `  Wanted: the doc regenerated from npm-high-impact ${manifest.version} and the current packages/npm set.`,
      '  Fix: node scripts/repo/npm/gen-high-impact-rankings.mts --write, then commit the result.',
    ].join('\n'),
  )
  return 1
}

/* c8 ignore start - entrypoint guard; the pure legs are covered directly. */
if (isMainModule(import.meta.url)) {
  runRankingsDocCheck({ quiet: process.argv.includes('--quiet') })
    .then(code => {
      process.exitCode = code
    })
    .catch((e: unknown) => {
      logger.fail(`npm-rankings-doc-is-current failed: ${String(e)}`)
      process.exitCode = 1
    })
}
/* c8 ignore stop */
