#!/usr/bin/env node
/**
 * @file Run vitest on test/npm/ packages with INCLUDE_NPM_TESTS set so vitest
 *   config includes test/npm/.
 */
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { isMainModule } from '../../fleet/process/is-main-module.mts'
import { runMain } from '../../fleet/process/run-main.mts'

const logger = getDefaultLogger()

async function main() {
  process.env['INCLUDE_NPM_TESTS'] = '1'
  // Pass the repo vitest config explicitly — bare `vitest` auto-discovers the
  // ROOT vitest.config.mts, which is the vitiate fuzz-lane config (include:
  // test/**/*.fuzz.ts) and finds zero files under test/npm/. Same contract as
  // scripts/fleet/test.mts.
  const result = await spawn(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--config',
      '.config/repo/vitest.config.mts',
      'test/npm/',
      ...process.argv.slice(2),
    ],
    {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    },
  )
  process.exitCode = result.code ?? 0
}

if (isMainModule(import.meta.url)) {
  runMain(
    async () => {
      await main().catch((e: unknown) => {
        logger.error(e)
        process.exitCode = 1
      })
    },
    {
      describe: 'runs registry npm override tests',
      help: 'Usage: pnpm test:npm [vitest options]',
    },
  )
}
