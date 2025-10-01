/** @fileoverview Script for running tests on installed npm packages with retry logic. */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import WIN32 from '../registry/dist/lib/constants/WIN32.js'

import constants from './constants.mjs'
import { filterPackagesByChanges } from './utils/git.mjs'
import {
  PNPM_HOISTED_INSTALL_FLAGS,
  PNPM_INSTALL_BASE_FLAGS,
  PNPM_INSTALL_ENV,
  buildTestEnv,
  runCommand,
} from './utils/package.mjs'

import { suppressMaxListenersWarning } from './utils/suppress-warnings.mjs'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '../registry/dist/lib/packages.js'
import { pEach } from '../registry/dist/lib/promises.js'
import { logger } from '../registry/dist/lib/logger.js'

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
  },
  strict: false,
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10) || 3)
const tempBaseDir = cliArgs.tempDir

function hasModuleError(stdout, stderr) {
  const output = `${stdout}\n${stderr}`.toLowerCase()
  return (
    output.includes('cannot find module') || output.includes('module not found')
  )
}

async function runPackageTest(socketPkgName) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)
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

  try {
    // Check if package.json exists and has test script.
    const pkgJsonPath = path.join(installedPath, 'package.json')
    const pkgJson = await readPackageJson(pkgJsonPath)
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

    // Run the test (removed individual log message for cleaner output).
    const env = buildTestEnv(packageTempDir, installedPath)
    await runCommand('npm', ['test'], { cwd: installedPath, env })

    logger.success(origPkgName)
    return { package: origPkgName, passed: true }
  } catch (error) {
    const errorStdout = error.stdout || ''
    const errorStderr = error.stderr || ''

    // Check if this is a module resolution error.
    if (hasModuleError(errorStdout, errorStderr)) {
      logger.warn(`${origPkgName}: Module error detected, attempting reinstall`)

      try {
        // Attempt to reinstall with pnpm (consistent with install phase).
        // Unset NODE_ENV and CI to prevent pnpm from skipping devDependencies.
        const env = {
          ...buildTestEnv(packageTempDir, installedPath),
          ...PNPM_INSTALL_ENV,
        }

        // First reinstall in the root (installs prod dependencies of main package).
        await runCommand('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
          cwd: packageTempDir,
          env,
        })

        // Then reinstall all dependencies (including devDependencies) of the nested package.
        // Use isolated mode to avoid conflicts with parent installation.
        await runCommand('pnpm', ['install', ...PNPM_INSTALL_BASE_FLAGS], {
          cwd: installedPath,
          env,
        })

        // Retry the test after reinstall.
        await runCommand('npm', ['test'], { cwd: installedPath, env })

        logger.success(`${origPkgName} (after reinstall)`)
        return { package: origPkgName, passed: true, reinstalled: true }
      } catch (retryError) {
        logger.fail(`${origPkgName} (reinstall failed)`)
        if (retryError.stderr) {
          logger.log(`   Error output:`)
          logger.log(
            retryError.stderr
              .split('\n')
              .slice(0, 20)
              .map(line => `     ${line}`)
              .join('\n'),
          )
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
      logger.log(`   Error output:`)
      logger.log(
        errorStderr
          .split('\n')
          .slice(0, 20)
          .map(line => `     ${line}`)
          .join('\n'),
      )
    }
    if (errorStdout) {
      logger.log(`   Test output:`)
      logger.log(
        errorStdout
          .split('\n')
          .slice(-20)
          .map(line => `     ${line}`)
          .join('\n'),
      )
    }
    return { package: origPkgName, passed: false, reason: error.message }
  }
}

async function main() {
  suppressMaxListenersWarning()

  // Check if install results exist.
  const installResultsFile = path.join(tempBaseDir, 'install-results.json')
  let installResults = []

  if (existsSync(installResultsFile)) {
    try {
      const resultsData = await fs.readFile(installResultsFile, 'utf8')
      installResults = JSON.parse(resultsData)
    } catch (error) {
      logger.warn(`Could not read install results: ${error.message}`)
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
      } catch (error) {
        logger.warn(`Could not read download results: ${error.message}`)
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
      : constants.npmPackageNames.map(socketPackage => ({ socketPackage }))

    // Filter to only changed packages unless in force mode.
    const filteredPackages = await filterPackagesByChanges(
      availablePackages,
      'npm',
      { force: cliArgs.force },
    )

    if (filteredPackages.length === 0) {
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

  if (packagesToTest.length === 0) {
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
  logger.log('\n' + '='.repeat(60))
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

main().catch(console.error)
