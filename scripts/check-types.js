/**
 * @fileoverview Type checks all TypeScript declaration files in the project.
 * Uses TypeScript compiler to validate .d.ts files for type correctness.
 * Excludes node_modules and packages directories from checking.
 * Part of the project's quality assurance toolchain.
 */
'use strict'

const fastGlob = require('fast-glob')

const constants = require('@socketregistry/scripts/constants')
const { execPnpm } = require('@socketsecurity/registry/lib/agent')
const { logger } = require('@socketsecurity/registry/lib/logger')

const { NODE_MODULES_GLOB_RECURSIVE, PACKAGES, rootPath } = constants

void (async () => {
  // Find all .d.ts files excluding node_modules and packages directories.
  const dtsPaths = await fastGlob.glob('**/*.d.ts', {
    cwd: rootPath,
    absolute: true,
    ignore: [NODE_MODULES_GLOB_RECURSIVE, `**/${PACKAGES}/**`]
  })

  if (!dtsPaths.length) {
    logger.log('No TypeScript declaration files found to check.')
    return
  }

  logger.log(`Checking ${dtsPaths.length} TypeScript declaration files.`)

  try {
    await execPnpm(['exec', 'tsc', '--noEmit', '--skipLibCheck', ...dtsPaths], {
      stdio: 'inherit'
    })
  } catch (error) {
    throw new Error(`TypeScript type checking failed: ${error.message}`)
  }
})()
