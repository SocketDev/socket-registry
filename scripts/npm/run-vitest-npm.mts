#!/usr/bin/env node
/**
 * @file Run the npm override tests with their own Vitest configuration.
 */
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { isMainModule, runMain } from '../lib/cli.mts'

const logger = getDefaultLogger()

async function main() {
  const result = await spawn(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--config',
      '.config/vitest.npm.config.mts',
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
      json: 'result',
      describe: 'runs registry npm override tests',
      help: 'Usage: pnpm test:npm [vitest options]',
    },
  )
}
