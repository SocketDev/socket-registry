/**
 * @fileoverview Performance benchmarking script runner.
 * Executes performance tests and benchmarks for registry operations.
 */

import { execBin } from '@socketsecurity/lib/bin'
import fastGlob from 'fast-glob'

import { PERF_NPM_PATH, TSX_EXEC_PATH } from './constants/paths.mjs'

async function main() {
  for (const perfFile of await fastGlob.glob(['*.perf.ts'], {
    cwd: PERF_NPM_PATH,
  })) {
    await execBin(TSX_EXEC_PATH, [perfFile], {
      cwd: PERF_NPM_PATH,
      stdio: 'inherit',
    })
  }
}

main().catch(console.error)
