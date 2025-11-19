/**
 * @fileoverview Build script for socket-registry monorepo.
 * Delegates to the registry package build with proper flag handling.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import colors from 'yoctocolors-cjs'
import { getDefaultLogger } from '@socketsecurity/lib/logger'

import { runCommand } from './utils/run-command.mjs'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '..')
const registryPath = path.join(rootPath, 'registry')

// Parse all flags from command line to pass through.
const args = process.argv.slice(2)
const isQuiet = args.includes('--quiet') || args.includes('--silent')

async function main() {
  // Build the @socketsecurity/registry package.
  // This is required before running tests that import from it.
  // Pass all arguments through to the registry build script.
  const buildArgs = ['run', 'build']
  if (args.length > 0) {
    buildArgs.push('--', ...args)
  }

  const exitCode = await runCommand('pnpm', buildArgs, {
    cwd: registryPath,
  })

  if (exitCode !== 0) {
    if (!isQuiet) {
      logger.error(colors.red('✗ Failed to build @socketsecurity/registry'))
    }
    process.exitCode = exitCode
    return
  }

  process.exitCode = 0
}

main().catch(error => {
  logger.error(colors.red('✗ Build failed:'), error)
  process.exitCode = 1
})
