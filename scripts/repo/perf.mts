/**
 * @file Performance benchmarking script runner. Executes performance tests and
 *   benchmarks for registry operations. Perf files are `.perf.mts` run with
 *   the current Node binary (native type stripping) — no tsx.
 */

import process from 'node:process'

import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import fastGlob from 'fast-glob'

import { isMainModule } from '../fleet/process/is-main-module.mts'
import { PERF_NPM_PATH } from './constants/paths.mts'

const logger = getDefaultLogger()

async function main(): Promise<void> {
  for (const perfFile of await fastGlob.glob(['*.perf.mts'], {
    cwd: PERF_NPM_PATH,
  })) {
    await spawn(process.execPath, [perfFile], {
      cwd: PERF_NPM_PATH,
      stdio: 'inherit',
    })
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((e: unknown) => {
    logger.error(e)
    process.exitCode = 1
  })
}
