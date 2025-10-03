/** @fileoverview Test script for npm packages that handles downloading, installing, and testing. */

import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import ENV from '../registry/dist/lib/constants/ENV.js'
import WIN32 from '../registry/dist/lib/constants/WIN32.js'
import { logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'

import { logSectionHeader } from './utils/logging.mjs'

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    'download-concurrency': {
      type: 'string',
      default: ENV.CI ? (WIN32 ? '10' : '20') : '50',
    },
    'install-concurrency': {
      type: 'string',
      default: ENV.CI ? (WIN32 ? '5' : '10') : '15',
    },
    'test-concurrency': {
      type: 'string',
      default: ENV.CI ? (WIN32 ? '3' : '8') : '20',
    },
    force: {
      type: 'boolean',
      default: ENV.CI,
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
    'download-only': {
      type: 'boolean',
      default: false,
    },
    'test-only': {
      type: 'boolean',
      default: false,
    },
    'clear-cache': {
      type: 'boolean',
      default: false,
    },
    'cache-dir': {
      type: 'string',
      default: path.join(os.homedir(), '.socket-npm-test-cache'),
    },
  },
  strict: false,
})

// Use cache directory by default for persistent caching across runs.
const tempBaseDir = cliArgs.tempDir || cliArgs.cacheDir

async function runCommand(command, args, options = {}) {
  try {
    const result = await spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform.startsWith('win'),
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      ...options,
    })
    return { code: result.code }
  } catch (error) {
    const commandError = new Error(
      `Command failed: ${command} ${args.join(' ')}`,
    )
    commandError.code = error.code || error.exitCode
    throw commandError
  }
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const validateScript = path.join(scriptDir, 'validate-npm-packages.mjs')
  const installScript = path.join(scriptDir, 'install-npm-packages.mjs')
  const testScript = path.join(scriptDir, 'run-npm-package-tests.mjs')

  // Build common arguments.
  const commonArgs = []

  if (cliArgs.package?.length) {
    cliArgs.package.forEach(pkg => {
      commonArgs.push('--package', pkg)
    })
  }

  // Validate args with validate concurrency.
  const validateArgs = [...commonArgs]
  if (cliArgs.downloadConcurrency) {
    validateArgs.push('--concurrency', cliArgs.downloadConcurrency)
  }

  // Install args with install concurrency.
  const installArgs = [...commonArgs]
  if (cliArgs.installConcurrency) {
    installArgs.push('--concurrency', cliArgs.installConcurrency)
  }

  // Test args with test concurrency.
  const testArgs = [...commonArgs]
  if (cliArgs.testConcurrency) {
    testArgs.push('--concurrency', cliArgs.testConcurrency)
  }

  validateArgs.push('--temp-dir', tempBaseDir)
  installArgs.push('--temp-dir', tempBaseDir)
  testArgs.push('--temp-dir', tempBaseDir)

  try {
    // Phase 1: Validate packages (unless test-only mode).
    if (!cliArgs.testOnly) {
      logSectionHeader('Phase 1: Validate packages', { emoji: '✅' })

      // Add clear-cache flag if specified.
      if (cliArgs.clearCache) {
        validateArgs.push('--clear-cache')
      }

      await runCommand('node', [validateScript, ...validateArgs])
      logger.log('')
    }

    // Phase 2: Install packages (unless test-only mode).
    if (!cliArgs.testOnly) {
      logSectionHeader('Phase 2: Install packages', { emoji: '📦' })

      const finalInstallArgs = [...installArgs]

      if (cliArgs.force) {
        finalInstallArgs.push('--force')
      }

      await runCommand('node', [installScript, ...finalInstallArgs])
      logger.log('')
    }

    // Phase 3: Run tests (unless download-only mode).
    if (!cliArgs.downloadOnly) {
      logSectionHeader('Phase 3: Run tests', { emoji: '🧪' })

      const finalTestArgs = [...testArgs]

      if (cliArgs.force) {
        finalTestArgs.push('--force')
      }

      await runCommand('node', [testScript, ...finalTestArgs])
    }

    // Never clean up the cache directory - it's persistent by design.
    // Users can explicitly clear it with --clear-cache flag in validate phase.
    process.exitCode = 0
  } catch (error) {
    logger.error('')
    logger.fail(`Operation failed: ${error.message}`)
    process.exitCode = 1
  }
}

main().catch(console.error)
