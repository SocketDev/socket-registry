/**
 * @fileoverview Performance benchmarking script runner.
 * Executes performance tests and benchmarks for registry operations.
 */
/* oxlint-disable socket/prefer-cached-for-loop -- iterates an async glob() generator; the cached-length rewrite is incorrect for AsyncIterables. */

import { execBin } from '@socketsecurity/lib/bin'
import { getDefaultLogger } from '@socketsecurity/lib/logger'

import fastGlob from 'fast-glob'

const logger = getDefaultLogger()

import { PERF_NPM_PATH, TSX_EXEC_PATH } from './constants/paths.mts'

async function main(): Promise<void> {
  for (const perfFile of await fastGlob.glob(['*.perf.ts'], {
    cwd: PERF_NPM_PATH,
  })) {
    await execBin(TSX_EXEC_PATH, [perfFile], {
      cwd: PERF_NPM_PATH,
      stdio: 'inherit',
    })
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
