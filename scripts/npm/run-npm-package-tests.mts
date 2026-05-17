/** @fileoverview Script for running tests on installed npm packages with retry logic. */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { WIN32 } from '@socketsecurity/lib-stable/constants/platform'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '@socketsecurity/lib-stable/packages'
import { pEach } from '@socketsecurity/lib-stable/promises'

const logger = getDefaultLogger()

import { cleanTestScript } from '../util/script-cleaning.mts'
import { ROOT_PATH, TEST_NPM_PATH } from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { extractErrorInfo } from '../util/errors.mts'
import { filterPackagesByChanges } from '../util/git.mts'
import {
  PNPM_HOISTED_INSTALL_FLAGS,
  PNPM_INSTALL_BASE_FLAGS,
  PNPM_INSTALL_ENV,
  buildTestEnv,
  spawnCapture,
} from '../util/package.mts'
import { suppressMaxListenersWarning } from '../util/suppress-warnings.mts'

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: process.env.CI ? (WIN32 ? '3' : '8') : '20',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
    force: {
      type: 'boolean',
      default: false,
    },
    'skip-reinstall-retry': {
      type: 'boolean',
      default: true,
    },
  },
  strict: false,
})

const concurrency = Math.max(1, Number.parseInt(cliArgs.concurrency, 10) || 3)
const tempBaseDir = cliArgs.tempDir

// Cache for package.json reads to avoid repeated filesystem access
const packageJsonCache = new Map()

export function hasModuleError(stdout: string, stderr: string): boolean {
  const output = `${stdout}\n${stderr}`.toLowerCase()
  return (
    output.includes('cannot find module') || output.includes('module not found')
  )
}

/**
 * Check if cleaned script only runs non-test commands.
 */
export function isNonTestScript(cleanedScript: string): boolean {
  return (
    /^npm run (?:build|lint|prepare|prepublish|pretest)$/.test(cleanedScript) ||
    cleanedScript === 'exit 0'
  )
}

export async function runPackageTest(socketPkgName: string) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)

  // Check if we have a custom test file in test/npm/.
  const testFilePath = path.join(TEST_NPM_PATH, `${socketPkgName}.test.mts`)

  if (existsSync(testFilePath)) {
    // Run vitest on the custom test file.
    // Set INCLUDE_NPM_TESTS to bypass the exclude pattern in vitest.config.mts.
    try {
      await spawnCapture(
        'pnpm',
        [
          'vitest',
          'run',
          `test/npm/${socketPkgName}.test.mts`,
          '--no-coverage',
          '--reporter=dot',
        ],
        {
          cwd: ROOT_PATH,
          env: {
            ...process.env,
            FORCE_TEST: '1',
            INCLUDE_NPM_TESTS: '1',
          },
        },
      )

      logger.success(origPkgName)
      return { package: origPkgName, passed: true }
    } catch (e) {
      logger.fail(origPkgName)
      const err = e as { message?: string | undefined; stderr?: string | undefined }
      if (err.stderr) {
        const errorInfo = extractErrorInfo(err.stderr)
        logger.log(`   ${errorInfo}`)
      }
      return {
        package: origPkgName,
        passed: false,
        reason: err.message ?? String(e),
      }
    }
  }

  // Otherwise, run the package's original tests.
  const packageTempDir = path.join(tempBaseDir, socketPkgName)

  if (!existsSync(packageTempDir)) {
    logger.fail(`${origPkgName}: Package not found in temp directory`)
    return {
      package: origPkgName,
      passed: false,
      reason: 'Package not downloaded',
    }
  }

  const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)

  if (!existsSync(installedPath)) {
    logger.fail(`${origPkgName}: Installed package not found`)
    return {
      package: origPkgName,
      passed: false,
      reason: 'Package not installed',
    }
  }

  // Check if package.json exists and has test script.
  const pkgJsonPath = path.join(installedPath, 'package.json')
  // Use cache to avoid repeated fs reads
  let pkgJson = packageJsonCache.get(pkgJsonPath)
  if (!pkgJson) {
    pkgJson = await readPackageJson(pkgJsonPath)
    packageJsonCache.set(pkgJsonPath, pkgJson)
  }
  const testScript = pkgJson.scripts?.test

  if (!testScript) {
    logger.warn(`${origPkgName}: No test script`)
    return {
      package: origPkgName,
      passed: true,
      skipped: true,
      reason: 'No test script',
    }
  }

  // Clean test script to remove lint commands and unsupported flags.
  const cleanedScript = cleanTestScript(testScript)

  if (isNonTestScript(cleanedScript)) {
    logger.warn(`${origPkgName}: Test script only runs non-test commands`)
    return {
      package: origPkgName,
      passed: true,
      skipped: true,
      reason: 'No actual test commands',
    }
  }

  try {
    // Run the cleaned test script directly.
    const env = buildTestEnv(packageTempDir, installedPath)
    const shell = WIN32 ? 'cmd' : 'sh'
    const shellFlag = WIN32 ? '/c' : '-c'
    await spawnCapture(shell, [shellFlag, cleanedScript], {
      cwd: installedPath,
      env,
    })

    logger.success(origPkgName)
    return { package: origPkgName, passed: true }
  } catch (e) {
    const err = e as { message?: string | undefined; stdout?: string | undefined; stderr?: string | undefined }
    const errorStdout = err.stdout || ''
    const errorStderr = err.stderr || ''

    // Check if this is a module resolution error.
    // Only attempt reinstall if --skip-reinstall-retry is false (opt-in behavior).
    if (
      !cliArgs.skipReinstallRetry &&
      hasModuleError(errorStdout, errorStderr)
    ) {
      logger.warn(`${origPkgName}: Module error detected, attempting reinstall`)

      try {
        // Attempt to reinstall with pnpm (consistent with install phase).
        // Unset NODE_ENV and CI to prevent pnpm from skipping devDependencies.
        const env = {
          ...buildTestEnv(packageTempDir, installedPath),
          ...PNPM_INSTALL_ENV,
        }

        // First reinstall in the root (installs prod dependencies of main package).
        await spawnCapture('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
          cwd: packageTempDir,
          env,
        })

        // Then reinstall all dependencies (including devDependencies) of the nested package.
        // Use isolated mode to avoid conflicts with parent installation.
        await spawnCapture('pnpm', ['install', ...PNPM_INSTALL_BASE_FLAGS], {
          cwd: installedPath,
          env,
        })

        // Retry the test after reinstall using cleaned script.
        const shell = WIN32 ? 'cmd' : 'sh'
        const shellFlag = WIN32 ? '/c' : '-c'
        await spawnCapture(shell, [shellFlag, cleanedScript], {
          cwd: installedPath,
          env,
        })

        logger.success(`${origPkgName} (after reinstall)`)
        return { package: origPkgName, passed: true, reinstalled: true }
      } catch (retryError) {
        logger.fail(`${origPkgName} (reinstall failed)`)
        const retryErr = retryError as { stderr?: string | undefined }
        if (retryErr.stderr) {
          const errorInfo = extractErrorInfo(retryErr.stderr)
          logger.log(`   ${errorInfo}`)
        }
        return {
          package: origPkgName,
          passed: false,
          reason: 'Module error after reinstall',
        }
      }
    }

    logger.fail(origPkgName)
    if (errorStderr) {
      const errorInfo = extractErrorInfo(errorStderr)
      logger.log(`   ${errorInfo}`)
    }
    return {
      package: origPkgName,
      passed: false,
      reason: err.message ?? String(e),
    }
  }
}

async function main(): Promise<void> {
  suppressMaxListenersWarning()

  // Check if install results exist.
  const installResultsFile = path.join(tempBaseDir, 'install-results.json')
  let installResults = []

  if (existsSync(installResultsFile)) {
    try {
      const resultsData = await fs.readFile(installResultsFile, 'utf8')
      installResults = JSON.parse(resultsData)
    } catch (e) {
      logger.warn(`Could not read install results: ${(e as Error).message}`)
    }
  } else {
    // Fallback to download results for backwards compatibility.
    const downloadResultsFile = path.join(tempBaseDir, 'download-results.json')
    if (existsSync(downloadResultsFile)) {
      try {
        const resultsData = await fs.readFile(downloadResultsFile, 'utf8')
        const downloadResults = JSON.parse(resultsData)
        // Convert download results to install-like format.
        installResults = downloadResults
          .filter(r => r.downloaded)
          .map(r => ({
            ...r,
            installed: r.downloaded,
          }))
      } catch (e) {
        logger.warn(`Could not read download results: ${(e as Error).message}`)
      }
    }
  }

  // Determine which packages to test.
  let packagesToTest = []

  if (cliArgs.package?.length) {
    // Test specific packages requested.
    packagesToTest = cliArgs.package
  } else {
    // Build list of available packages to test.
    const availablePackages = installResults.length
      ? installResults
          .filter(r => r.installed)
          .map(r => ({
            socketPackage:
              r.socketPackage || resolveOriginalPackageName(r.package),
          }))
      : getNpmPackageNames().map(socketPackage => ({ socketPackage }))

    // Filter to only changed packages unless in force mode.
    const filteredPackages = await filterPackagesByChanges(
      availablePackages,
      'npm',
      { force: cliArgs.force },
    )

    if (!filteredPackages.length) {
      logger.log(
        cliArgs.force
          ? 'No packages available to test'
          : 'No changed packages detected, use --force to test all packages',
      )
      logger.log('')
      process.exitCode = 0
      return
    }

    packagesToTest = filteredPackages.map(pkg => pkg.socketPackage)
  }

  if (!packagesToTest.length) {
    logger.warn('No packages to test\n')
    process.exitCode = 0
    return
  }

  logger.log(
    `Running tests for ${packagesToTest.length} packages (concurrency ${concurrency})\n`,
  )

  const results = []

  await pEach(
    packagesToTest,
    async pkgName => {
      const result = await runPackageTest(pkgName)
      results.push(result)
    },
    { concurrency },
  )

  // Summary.
  logger.log(`\n${'='.repeat(60)}`)
  logger.log('TEST SUMMARY')
  logger.log('='.repeat(60))

  const passed = results.filter(r => r.passed && !r.skipped)
  const failed = results.filter(r => !r.passed)
  const skipped = results.filter(r => r.skipped)

  // Calculate total tested (excluding skipped).
  const totalTested = results.length - skipped.length

  if (skipped.length > 0) {
    logger.log(`Skipped: ${skipped.length} (no test script)`)
  }

  logger.success(
    `Passed: ${passed.length}/${totalTested} (${results.length} total)\n`,
  )

  // Never clean up the cache directory - it's persistent by design.

  // Set exit code for process termination.
  process.exitCode = failed.length ? 1 : 0
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
