/** @fileoverview Test script for npm packages that handles downloading, installing, and testing. */

import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import util from 'node:util'

import { safeRemove } from './utils/fs.mjs'
import ENV from '@socketsecurity/registry/lib/constants/env'
import WIN32 from '@socketsecurity/registry/lib/constants/win32'
import { logger } from '@socketsecurity/registry/lib/logger'
import { spawn } from '@socketsecurity/registry/lib/spawn'

const { values: cliArgs } = util.parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    'download-concurrency': {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: ENV.CI ? (WIN32 ? '5' : '10') : '50',
    },
    'install-concurrency': {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: ENV.CI ? (WIN32 ? '3' : '5') : '10',
    },
    'test-concurrency': {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: ENV.CI ? (WIN32 ? '2' : '5') : '20',
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
    'no-cleanup': {
      type: 'boolean',
      default: false,
    },
  },
})

const tempBaseDir = cliArgs['temp-dir']

async function runCommand(command, args, options = {}) {
  try {
    const result = await spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform.startsWith('win'),
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

void (async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const downloadScript = path.join(scriptDir, 'download-npm-packages.mjs')
  const installScript = path.join(scriptDir, 'install-npm-packages.mjs')
  const testScript = path.join(scriptDir, 'run-npm-package-tests.mjs')

  // Build common arguments.
  const commonArgs = []

  if (cliArgs.package?.length) {
    cliArgs.package.forEach(pkg => {
      commonArgs.push('--package', pkg)
    })
  }

  // Download args with download concurrency.
  const downloadArgs = [...commonArgs]
  if (cliArgs['download-concurrency']) {
    downloadArgs.push('--concurrency', cliArgs['download-concurrency'])
  }

  // Install args with install concurrency.
  const installArgs = [...commonArgs]
  if (cliArgs['install-concurrency']) {
    installArgs.push('--concurrency', cliArgs['install-concurrency'])
  }

  // Test args with test concurrency.
  const testArgs = [...commonArgs]
  if (cliArgs['test-concurrency']) {
    testArgs.push('--concurrency', cliArgs['test-concurrency'])
  }

  commonArgs.push('--temp-dir', tempBaseDir)

  try {
    // Phase 1: Download packages (unless test-only mode).
    if (!cliArgs['test-only']) {
      logger.log('📦 Phase 1: Processing package information...\n')

      await runCommand('node', [downloadScript, ...downloadArgs])

      logger.log('\n✅ Download phase completed!\n')
    }

    // Phase 2: Install packages (unless test-only mode).
    if (!cliArgs['test-only']) {
      logger.log('🚀 Phase 2: Installing packages...\n')

      await runCommand('node', [installScript, ...installArgs])

      logger.log('\n✅ Install phase completed!\n')
    }

    // Phase 3: Run tests (unless download-only mode).
    if (!cliArgs['download-only']) {
      logger.log('🧪 Phase 3: Running package tests...\n')

      const finalTestArgs = [...testArgs]

      if (cliArgs.force) {
        finalTestArgs.push('--force')
      }

      if (cliArgs['no-cleanup']) {
        finalTestArgs.push('--cleanup', 'false')
      }

      await runCommand('node', [testScript, ...finalTestArgs])

      logger.log('\n✅ Test phase completed!')
    }

    // Final cleanup if all phases ran and cleanup is enabled.
    if (
      !cliArgs['download-only'] &&
      !cliArgs['test-only'] &&
      !cliArgs['no-cleanup']
    ) {
      try {
        await safeRemove(tempBaseDir)
        logger.log('\n🧹 Cleaned up temp directory')
      } catch (error) {
        logger.warn(`Could not clean up temp directory: ${error.message}`)
      }
    }

    logger.log('')
    logger.log('🎉 All phases completed successfully!')
    process.exitCode = 0
  } catch (error) {
    logger.error('')
    logger.fail(`Operation failed: ${error.message}`)
    process.exitCode = cliArgs.force ? 0 : 1
  }
})()
