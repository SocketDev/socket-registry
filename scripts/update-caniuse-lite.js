'use strict'

const { spawnSync } = require('node:child_process')
const constants = require('@socketregistry/scripts/constants')
const { logger } = require('@socketsecurity/registry/lib/logger')

const { rootPath } = constants

try {
  // Manually update caniuse-lite to avoid triggering prepare script
  logger.log('Updating caniuse-lite version')

  // Use spawnSync for simpler error handling
  const result = spawnSync('pnpm', ['up', 'caniuse-lite'], {
    stdio: 'inherit',
    cwd: rootPath,
    shell: true
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    logger.fail(`update caniuse-lite: pnpm exited with code ${result.status}`)
    process.exit(1)
  }

  logger.log('Done')
} catch (e) {
  logger.fail(`update caniuse-lite: ${e.message}`)
  process.exit(1)
}