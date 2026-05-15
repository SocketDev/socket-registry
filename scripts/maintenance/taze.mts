/** @fileoverview Taze wrapper that errors on provenance downgrades. */

import { WIN32 } from '@socketsecurity/lib-stable/constants/platform'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger'
import { spawn } from '@socketsecurity/lib-stable/spawn'
import process from 'node:process'

const logger = getDefaultLogger()

export function includesProvenanceDowngradeWarning(output) {
  const lowered = output.toString().toLowerCase()
  return (
    lowered.includes('provenance') &&
    (lowered.includes('downgrade') || lowered.includes('warn'))
  )
}

async function main(): Promise<void> {
  // Run with command line arguments.
  const args = process.argv.slice(2)

  const tazePromise = spawn(
    'pnpm',
    ['taze', '--config', '.config/taze.config.mts', ...args],
    {
      cwd: process.cwd(),
      shell: WIN32,
      stdio: 'pipe',
    },
  )

  let hasProvenanceDowngrade = false

  tazePromise.process.stdout.on('data', chunk => {
    process.stdout.write(chunk)
    if (includesProvenanceDowngradeWarning(chunk)) {
      hasProvenanceDowngrade = true
    }
  })

  tazePromise.process.stderr.on('data', chunk => {
    process.stderr.write(chunk)
    if (includesProvenanceDowngradeWarning(chunk)) {
      hasProvenanceDowngrade = true
    }
  })

  tazePromise.process.on('close', () => {
    if (hasProvenanceDowngrade) {
      logger.error('')
      logger.fail(
        'ERROR: Provenance downgrade detected! Failing build to maintain security.',
      )
      logger.error(
        '   Configure your dependencies to maintain provenance or exclude problematic packages.',
      )

      process.exitCode = 1
    }
  })

  await tazePromise
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
