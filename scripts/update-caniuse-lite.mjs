import { spawnSync } from 'node:child_process'

import { logger } from '@socketsecurity/registry/lib/logger'

import constants from './constants.mjs'

const { rootPath } = constants

void (function main() {
  try {
    // Manually update caniuse-lite to avoid triggering prepare script
    logger.log('Updating caniuse-lite version')

    // Use spawnSync for simpler error handling
    const result = spawnSync('pnpm', ['up', 'caniuse-lite'], {
      stdio: 'inherit',
      cwd: rootPath,
      shell: constants.WIN32,
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
})()
