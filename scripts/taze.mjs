/** @fileoverview Taze wrapper that errors on provenance downgrades. */

import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { logger } from '@socketsecurity/lib/logger'
import { spawn } from '@socketsecurity/lib/spawn'

function includesProvenanceDowngradeWarning(output) {
  const lowered = output.toString().toLowerCase()
  return (
    lowered.includes('provenance') &&
    (lowered.includes('downgrade') || lowered.includes('warn'))
  )
}

async function main() {
  // Run with command line arguments.
  const args = process.argv.slice(2)

  const tazePromise = spawn('pnpm', ['taze', ...args], {
    cwd: process.cwd(),
    shell: WIN32,
    stdio: 'pipe',
  })

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

      process.exit(1)
    }
  })

  await tazePromise
}

main().catch(console.error)
