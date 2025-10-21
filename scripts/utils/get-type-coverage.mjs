/** @fileoverview Utility to calculate TypeScript type coverage percentage. */
import { WIN32 } from '@socketsecurity/lib/constants/platform'

import { spawn } from './spawn.mjs'

/**
 * Execute type-coverage command and extract percentage from output.
 * @throws {Error} When type coverage command fails.
 */
export async function getTypeCoverage() {
  const result = await spawn('pnpm', ['run', 'coverage:type'], {
    stdio: 'pipe',
    shell: WIN32,
  })

  if (result.code !== 0) {
    throw new Error(`Failed to get type coverage: exit code ${result.code}`)
  }

  const output = result.stdout || ''
  const lines = output.split('\n')
  const percentageLine = lines.find(line => line.includes('%'))

  if (percentageLine) {
    const match = percentageLine.match(/(\d+(?:\.\d+)?)%/)
    if (match) {
      return Number.parseFloat(match[1])
    }
  }

  return null
}
