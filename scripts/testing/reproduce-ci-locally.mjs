/** @fileoverview Reproduces CI test environment locally to catch issues before pushing. */

import { promises as fs, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import parseArgsModule from '../../registry/dist/lib/parse-args.js'
import loggerModule from '../../registry/dist/lib/logger.js'
import spawnModule from '../../registry/dist/lib/spawn.js'

const { parseArgs } = parseArgsModule
const { logger } = loggerModule
const { spawn } = spawnModule

import { safeRemove } from '../utils/fs.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    'skip-build': {
      type: 'boolean',
      default: false,
    },
    'skip-install': {
      type: 'boolean',
      default: false,
    },
    'keep-temp': {
      type: 'boolean',
      default: false,
    },
    verbose: {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
})

/**
 * Run command with CI-like environment.
 */
async function runCiCommand(command, args, options = {}) {
  const ciEnv = {
    ...process.env,
    CI: 'true',
    NODE_ENV: 'test',
    NODE_NO_WARNINGS: '1',
    // Disable color output for consistent comparison.
    NO_COLOR: '1',
    FORCE_COLOR: '0',
  }

  const result = await spawn(command, args, {
    stdio: cliArgs.verbose ? 'inherit' : 'pipe',
    env: ciEnv,
    ...options,
  })

  return result
}

/**
 * Create isolated test environment.
 */
async function createTestEnvironment() {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ci-reproduce-'))
  logger.info(`Created temporary directory: ${tempDir}`)

  // Copy project to temp directory.
  const projectRoot = path.join(__dirname, '..', '..')
  logger.info('Copying project files...')

  await fs.cp(projectRoot, tempDir, {
    recursive: true,
    filter: source => {
      const relativePath = path.relative(projectRoot, source)
      // Skip node_modules, build artifacts, and temp files.
      return !(
        relativePath.includes('node_modules') ||
        relativePath.includes('.tmp-') ||
        relativePath.includes('coverage') ||
        relativePath.startsWith('.git')
      )
    },
  })

  return tempDir
}

/**
 * Run build in CI environment.
 */
async function runBuild(workDir) {
  logger.info('\n--- Building Project (CI Mode) ---')
  const result = await runCiCommand('pnpm', ['run', 'build'], { cwd: workDir })

  if (result.code !== 0) {
    logger.error('Build failed')
    return false
  }

  logger.success('✓ Build passed')
  return true
}

/**
 * Run dependency installation.
 */
async function runInstall(workDir) {
  logger.info('\n--- Installing Dependencies (CI Mode) ---')
  const result = await runCiCommand('pnpm', ['install', '--frozen-lockfile'], {
    cwd: workDir,
  })

  if (result.code !== 0) {
    logger.error('Installation failed')
    return false
  }

  logger.success('✓ Installation passed')
  return true
}

/**
 * Run linting checks.
 */
async function runLint(workDir) {
  logger.info('\n--- Running Linting (CI Mode) ---')
  const result = await runCiCommand('pnpm', ['run', 'check:lint'], {
    cwd: workDir,
  })

  if (result.code !== 0) {
    logger.error('Linting failed')
    if (!cliArgs.verbose) {
      logger.error(result.stderr || result.stdout)
    }
    return false
  }

  logger.success('✓ Linting passed')
  return true
}

/**
 * Run type checking.
 */
async function runTypecheck(workDir) {
  logger.info('\n--- Running Type Check (CI Mode) ---')
  const result = await runCiCommand('pnpm', ['run', 'check:tsc'], {
    cwd: workDir,
  })

  if (result.code !== 0) {
    logger.error('Type checking failed')
    if (!cliArgs.verbose) {
      logger.error(result.stderr || result.stdout)
    }
    return false
  }

  logger.success('✓ Type checking passed')
  return true
}

/**
 * Run unit tests.
 */
async function runUnitTests(workDir) {
  logger.info('\n--- Running Unit Tests (CI Mode) ---')
  const result = await runCiCommand('pnpm', ['run', 'test:unit:ci'], {
    cwd: workDir,
  })

  if (result.code !== 0) {
    logger.error('Unit tests failed')
    if (!cliArgs.verbose) {
      logger.error(result.stderr || result.stdout)
    }
    return false
  }

  logger.success('✓ Unit tests passed')
  return true
}

/**
 * Run npm package tests.
 */
async function runNpmPackageTests(workDir) {
  logger.info('\n--- Running NPM Package Tests (CI Mode) ---')

  const args = ['run', 'test:npm:packages:ci']

  if (cliArgs.package?.length) {
    cliArgs.package.forEach(pkg => {
      args.push('--', '--package', pkg)
    })
  }

  const result = await runCiCommand('pnpm', args, { cwd: workDir })

  if (result.code !== 0) {
    logger.error('NPM package tests failed')
    if (!cliArgs.verbose) {
      logger.error(result.stderr || result.stdout)
    }
    return false
  }

  logger.success('✓ NPM package tests passed')
  return true
}

/**
 * Main reproduction flow.
 */
async function main() {
  logger.info('=== Reproducing CI Environment Locally ===\n')

  if (cliArgs.package?.length) {
    logger.info(`Testing specific packages: ${cliArgs.package.join(', ')}\n`)
  }

  let tempDir
  let success = true

  try {
    tempDir = await createTestEnvironment()

    if (!cliArgs.skipInstall) {
      const installSuccess = await runInstall(tempDir)
      if (!installSuccess) {
        success = false
        throw new Error('Installation failed')
      }
    }

    if (!cliArgs.skipBuild) {
      const buildSuccess = await runBuild(tempDir)
      if (!buildSuccess) {
        success = false
        throw new Error('Build failed')
      }
    }

    const lintSuccess = await runLint(tempDir)
    if (!lintSuccess) {
      success = false
    }

    const typecheckSuccess = await runTypecheck(tempDir)
    if (!typecheckSuccess) {
      success = false
    }

    const unitTestSuccess = await runUnitTests(tempDir)
    if (!unitTestSuccess) {
      success = false
    }

    if (cliArgs.package?.length || !cliArgs.package) {
      const npmTestSuccess = await runNpmPackageTests(tempDir)
      if (!npmTestSuccess) {
        success = false
      }
    }

    logger.info('\n=== CI Reproduction Summary ===')
    if (success) {
      logger.success('✓ All CI checks passed locally!')
      logger.info(
        'Your changes should pass CI (though real CI may have additional checks).',
      )
    } else {
      logger.error('✗ Some CI checks failed locally')
      logger.info('Fix these issues before pushing to avoid CI failures.')
      process.exitCode = 1
    }
  } catch (e) {
    logger.error(`CI reproduction failed: ${e.message}`)
    if (cliArgs.verbose) {
      logger.error(e.stack)
    }
    process.exitCode = 1
  } finally {
    if (tempDir && !cliArgs.keepTemp) {
      logger.info(`\nCleaning up temporary directory: ${tempDir}`)
      await safeRemove(tempDir)
    } else if (tempDir && cliArgs.keepTemp) {
      logger.info(`\nTemporary directory preserved: ${tempDir}`)
    }
  }
}

main().catch(e => {
  logger.error(`Fatal error: ${e.message}`)
  if (cliArgs.verbose) {
    logger.error(e.stack)
  }
  process.exitCode = 1
})
