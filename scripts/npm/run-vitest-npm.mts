#!/usr/bin/env node
/**
 * @file Run vitest on test/npm/ packages with INCLUDE_NPM_TESTS set so vitest
 *   config includes test/npm/.
 */
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

const logger = getDefaultLogger()

process.env['INCLUDE_NPM_TESTS'] = '1'

async function main() {
  const result = await spawn(
    'pnpm',
    ['exec', 'vitest', 'run', 'test/npm/', ...process.argv.slice(2)],
    {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    },
  )
  process.exitCode = result.code ?? 0
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
