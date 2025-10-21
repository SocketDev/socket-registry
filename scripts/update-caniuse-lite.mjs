/** @fileoverview Update caniuse-lite database without triggering prepare scripts. */

import { logger } from '@socketsecurity/lib/logger'
import { spawnSync } from '@socketsecurity/lib/spawn'

import constants from './constants.mjs'

const { rootPath } = constants

/**
 * Update caniuse-lite to latest version.
 */
async function main() {
  try {
    // Manually update caniuse-lite to avoid triggering prepare script
    logger.log('Updating caniuse-lite version')

    // Use spawnSync for simpler error handling
    const result = spawnSync('pnpm', ['up', 'caniuse-lite'], {
      cwd: rootPath,
      shell: constants.WIN32,
      stdio: 'inherit',
    })

    if (result.error) {
      throw result.error
    }

    if (result.status) {
      logger.fail(`update caniuse-lite: pnpm exited with code ${result.status}`)
      process.exitCode = 1
      return
    }

    logger.log('Done')
  } catch (e) {
    logger.fail(`update caniuse-lite: ${e.message}`)
    process.exitCode = 1
  }
}

main().catch(console.error)
