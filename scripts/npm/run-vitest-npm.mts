#!/usr/bin/env node
/**
 * @file Run vitest on test/npm/ packages with INCLUDE_NPM_TESTS set so vitest
 *   config includes test/npm/.
 */
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

process.env['INCLUDE_NPM_TESTS'] = '1'
const result = await spawn(
  'pnpm',
  ['exec', 'vitest', 'run', 'test/npm/', ...process.argv.slice(2)],
  {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
)
process.exitCode = result.code ?? 0
