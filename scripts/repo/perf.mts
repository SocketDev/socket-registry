/**
 * @file Performance benchmarking script runner. Executes performance tests and
 *   benchmarks for registry operations. Perf files are `.perf.mts` run with
 *   the current Node binary (native type stripping) — no tsx.
 */

import process from 'node:process'

import { execBin } from '@socketsecurity/lib-stable/bin/exec'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import fastGlob from 'fast-glob'

const logger = getDefaultLogger()

import { PERF_NPM_PATH } from '../constants/paths.mts'

async function main(): Promise<void> {
  for (const perfFile of await fastGlob.glob(['*.perf.mts'], {
    cwd: PERF_NPM_PATH,
  })) {
    await execBin(process.execPath, [perfFile], {
      cwd: PERF_NPM_PATH,
      stdio: 'inherit',
    })
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
