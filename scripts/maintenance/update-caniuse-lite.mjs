/** @fileoverview Update caniuse-lite database without triggering prepare scripts. */

import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { spawnSync } from '@socketsecurity/lib/spawn'

const logger = getDefaultLogger()

import { ROOT_PATH } from '../constants/paths.mjs'

/**
 * Update caniuse-lite to latest version.
 */
async function main() {
  try {
    // Manually update caniuse-lite to avoid triggering prepare script
    logger.log('Updating caniuse-lite version')

    // Use spawnSync for simpler error handling
    const result = spawnSync('pnpm', ['up', 'caniuse-lite'], {
      cwd: ROOT_PATH,
      shell: WIN32,
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

main().catch(e => logger.error(e))
