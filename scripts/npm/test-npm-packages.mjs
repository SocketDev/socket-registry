/** @fileoverview Test script for npm packages that handles downloading, installing, and testing. */

import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { getCI } from '@socketsecurity/lib/env/ci'
import { getDefaultLogger } from '@socketsecurity/lib/logger'

const logger = getDefaultLogger()

import { logSectionHeader } from '../utils/logging.mjs'
import { runCommandStrict } from '../utils/run-command.mjs'

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    'download-concurrency': {
      type: 'string',
      default: getCI() ? (WIN32 ? '10' : '20') : '50',
    },
    'install-concurrency': {
      type: 'string',
      default: getCI() ? (WIN32 ? '5' : '10') : '30',
    },
    'test-concurrency': {
      type: 'string',
      default: getCI() ? (WIN32 ? '3' : '8') : '40',
    },
    force: {
      type: 'boolean',
      default: getCI(),
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

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const validateScript = path.join(
    scriptDir,
    '..',
    'validation',
    'npm-packages.mjs',
  )
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

      await runCommandStrict('node', [validateScript, ...validateArgs], {
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      })
      logger.log('')
    }

    // Phase 2: Install packages (unless test-only mode).
    if (!cliArgs.testOnly) {
      logSectionHeader('Phase 2: Install packages', { emoji: '📦' })

      const finalInstallArgs = [...installArgs]

      if (cliArgs.force) {
        finalInstallArgs.push('--force')
      }

      await runCommandStrict('node', [installScript, ...finalInstallArgs], {
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      })
      logger.log('')
    }

    // Phase 3: Run tests (unless download-only mode).
    if (!cliArgs.downloadOnly) {
      logSectionHeader('Phase 3: Run tests', { emoji: '🧪' })

      const finalTestArgs = [...testArgs]

      if (cliArgs.force) {
        finalTestArgs.push('--force')
      }

      await runCommandStrict('node', [testScript, ...finalTestArgs], {
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      })
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

main().catch(e => logger.error(e))
