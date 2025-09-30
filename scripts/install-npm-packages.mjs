/** @fileoverview Script for installing npm packages with Socket overrides for testing. */

import crypto from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import { copy } from 'fs-extra'

import { cleanTestScript } from '../test/utils/script-cleaning.mjs'
import { testRunners } from '../test/utils/test-runners.mjs'
import { suppressMaxListenersWarning } from './utils/suppress-warnings.mjs'
import {
  PNPM_INSTALL_FLAGS,
  PNPM_NPM_LIKE_FLAGS,
} from './utils/package-utils.mjs'
import constants from './constants.mjs'
import ENV from '../registry/dist/lib/constants/ENV.js'
import spinner from '../registry/dist/lib/constants/spinner.js'
import WIN32 from '../registry/dist/lib/constants/WIN32.js'
import { pEach, pRetry } from '../registry/dist/lib/promises.js'
import { LOG_SYMBOLS, logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'
import { pluralize } from '../registry/dist/lib/words.js'

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      default: ENV.CI ? (WIN32 ? '5' : '10') : '15',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
  },
  strict: false,
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10))
const tempBaseDir = cliArgs.tempDir

// Progress tracking.
let cachedCount = 0
let completedPackages = 0
let failedCount = 0
let installedCount = 0
let totalPackagesCount = 0

function writeProgress(symbol) {
  // Track counts silently.
  if (symbol === '✓' || symbol === '💾') {
    cachedCount += 1
  } else if (symbol === LOG_SYMBOLS.success) {
    installedCount += 1
  } else if (symbol === LOG_SYMBOLS.fail || symbol === LOG_SYMBOLS.warn) {
    failedCount += 1
  }
}

function completePackage() {
  completedPackages += 1
}

async function computeOverrideHash(overridePath) {
  try {
    const pkgJsonPath = path.join(overridePath, 'package.json')
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))
    // Hash the dependencies to detect changes.
    const depsString = JSON.stringify({
      dependencies: pkgJson.dependencies || {},
      devDependencies: pkgJson.devDependencies || {},
      version: pkgJson.version,
    })
    return crypto.createHash('sha256').update(depsString, 'utf8').digest('hex')
  } catch {
    return ''
  }
}

async function runCommand(command, args, options = {}) {
  try {
    const result = await spawn(command, args, {
      stdio: 'pipe',
      shell: process.platform.startsWith('win'),
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      ...options,
    })
    return { stdout: result.stdout, stderr: result.stderr }
  } catch (error) {
    const commandError = new Error(
      `Command failed: ${command} ${args.join(' ')}`,
    )
    commandError.code = error.code || error.exitCode
    commandError.stdout = error.stdout || ''
    commandError.stderr = error.stderr || ''
    throw commandError
  }
}

async function generatePnpmOverrides() {
  const overrides = { __proto__: null }
  const npmPackagesDir = constants.npmPackagesPath

  // Check if npm packages directory exists.
  if (!existsSync(npmPackagesDir)) {
    return overrides
  }

  // Get all Socket override packages.
  const entries = await fs.readdir(npmPackagesDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const packageName = entry.name
    const packagePath = path.join(npmPackagesDir, packageName)
    const pkgJsonPath = path.join(packagePath, 'package.json')

    try {
      // eslint-disable-next-line no-await-in-loop
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))

      if (pkgJson.name) {
        // Use file:// protocol to point to local Socket override packages.
        // This allows unpublished versions to be used in testing.
        // pathToFileURL ensures correct file URL format on all platforms (Windows/Unix).
        overrides[packageName] = pathToFileURL(packagePath).href
      }
    } catch {
      // Skip packages without valid package.json.
    }
  }

  return overrides
}

async function applyNestedSocketOverrides(packagePath) {
  const nodeModulesPath = path.join(packagePath, 'node_modules')

  // Check if node_modules exists.
  if (!existsSync(nodeModulesPath)) {
    return
  }

  // Get list of all installed packages in node_modules.
  const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    // Handle scoped packages (starting with @).
    if (entry.name.startsWith('@')) {
      const scopePath = path.join(nodeModulesPath, entry.name)
      // eslint-disable-next-line no-await-in-loop
      const scopedEntries = await fs.readdir(scopePath, { withFileTypes: true })

      for (const scopedEntry of scopedEntries) {
        if (!scopedEntry.isDirectory()) {
          continue
        }

        const packageName = `${entry.name}/${scopedEntry.name}`
        const nestedPackagePath = path.join(scopePath, scopedEntry.name)
        // eslint-disable-next-line no-await-in-loop
        await applySocketOverrideIfExists(packageName, nestedPackagePath)

        // Recursively apply to nested dependencies.
        // eslint-disable-next-line no-await-in-loop
        await applyNestedSocketOverrides(nestedPackagePath)
      }
    } else {
      // Regular (non-scoped) package.
      const nestedPackagePath = path.join(nodeModulesPath, entry.name)
      // eslint-disable-next-line no-await-in-loop
      await applySocketOverrideIfExists(entry.name, nestedPackagePath)

      // Recursively apply to nested dependencies.
      // eslint-disable-next-line no-await-in-loop
      await applyNestedSocketOverrides(nestedPackagePath)
    }
  }
}

async function applySocketOverrideIfExists(packageName, packagePath) {
  // Check if Socket override exists.
  const overridePath = path.join(
    constants.npmPackagesPath,
    packageName.replace(/^@.*?\//, ''),
  )

  if (!existsSync(overridePath)) {
    return
  }

  // Read the Socket override package.json.
  const overridePkgJsonPath = path.join(overridePath, 'package.json')
  let overridePkgJson
  try {
    overridePkgJson = JSON.parse(await fs.readFile(overridePkgJsonPath, 'utf8'))
  } catch {
    return
  }

  // Read the existing package.json.
  const packageJsonPath = path.join(packagePath, 'package.json')
  let existingPkgJson
  try {
    existingPkgJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
  } catch {
    return
  }

  // Copy Socket override files (excluding package.json).
  try {
    await copy(overridePath, packagePath, {
      overwrite: true,
      dereference: true,
      filter: src =>
        !src.includes('node_modules') &&
        !src.endsWith('.DS_Store') &&
        !src.endsWith('package.json'),
    })
  } catch {
    // Ignore copy errors.
    return
  }

  // Merge exports: Socket exports take precedence.
  const mergedExports = overridePkgJson.exports
    ? { ...existingPkgJson.exports, ...overridePkgJson.exports }
    : existingPkgJson.exports

  // Update package.json with Socket override fields.
  existingPkgJson.exports = mergedExports
  existingPkgJson.main = overridePkgJson.main
  existingPkgJson.module = overridePkgJson.module
  existingPkgJson.types = overridePkgJson.types
  existingPkgJson.files = overridePkgJson.files
  existingPkgJson.sideEffects = overridePkgJson.sideEffects
  existingPkgJson.socket = overridePkgJson.socket

  // Write updated package.json.
  await fs.writeFile(packageJsonPath, JSON.stringify(existingPkgJson, null, 2))
}

async function installPackage(packageInfo) {
  const {
    overridePath,
    package: origPkgName,
    socketPackage: socketPkgName,
    versionSpec,
  } = packageInfo

  // Check if this package should be skipped.
  const skipSet = constants.skipTestsByEcosystem.get('npm')
  const skipTests = !!skipSet?.has(socketPkgName) || !!skipSet?.has(origPkgName)
  if (skipTests) {
    writeProgress()
    completePackage()
    return {
      installed: false,
      package: origPkgName,
      reason: 'Skipped',
      socketPackage: socketPkgName,
    }
  }

  // Create temp directory for this package.
  const packageTempDir = path.join(tempBaseDir, socketPkgName)

  // Check if package is already installed and has a test script.
  const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)
  const packageJsonPath = path.join(installedPath, 'package.json')
  const installMarkerPath = path.join(
    packageTempDir,
    '.socket-install-complete',
  )

  // Compute current override hash for cache validation.
  const currentOverrideHash = await computeOverrideHash(overridePath)

  // Check if installation is complete and valid.
  if (existsSync(installMarkerPath) && existsSync(packageJsonPath)) {
    try {
      // Read package.json directly to avoid readPackageJson issues with circular references.
      const existingPkgJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8'),
      )
      const markerData = JSON.parse(
        await fs.readFile(installMarkerPath, 'utf8'),
      )

      // Verify the installation matches the requested version and override hash.
      if (
        existingPkgJson.scripts?.test &&
        markerData.versionSpec === versionSpec &&
        markerData.overrideHash === currentOverrideHash
      ) {
        // Always reapply Socket override files to ensure they're up-to-date.
        writeProgress('💾')

        // Copy Socket override files (excluding package.json).
        await copy(overridePath, installedPath, {
          overwrite: true,
          dereference: true,
          filter: src =>
            !src.includes('node_modules') &&
            !src.endsWith('.DS_Store') &&
            !src.endsWith('package.json'),
        })

        // Read the Socket override package.json to get the fields we want.
        const overridePkgJsonPath = path.join(overridePath, 'package.json')
        const overridePkgJson = JSON.parse(
          await fs.readFile(overridePkgJsonPath, 'utf8'),
        )

        // Selectively update the fields from Socket override.
        // Merge exports: use Socket's exports but preserve any original subpaths.
        existingPkgJson.exports = overridePkgJson.exports
          ? { ...existingPkgJson.exports, ...overridePkgJson.exports }
          : existingPkgJson.exports
        existingPkgJson.main = overridePkgJson.main
        existingPkgJson.module = overridePkgJson.module
        existingPkgJson.types = overridePkgJson.types
        existingPkgJson.files = overridePkgJson.files
        existingPkgJson.sideEffects = overridePkgJson.sideEffects
        existingPkgJson.socket = overridePkgJson.socket
        existingPkgJson.private = true

        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(existingPkgJson, null, 2),
        )

        // Install any missing dependencies.
        // First install in the root (installs prod dependencies of main package).
        writeProgress('📚')
        await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
          cwd: packageTempDir,
        })

        // Then install devDependencies of the nested package by running install inside it.
        await runCommand(
          'pnpm',
          ['install', '--prod=false', ...PNPM_INSTALL_FLAGS],
          { cwd: installedPath },
        )

        // Apply Socket overrides to all nested dependencies recursively.
        await applyNestedSocketOverrides(installedPath)

        // Check mark for cached with refreshed overrides.
        writeProgress('✓')
        completePackage()
        return {
          package: origPkgName,
          socketPackage: socketPkgName,
          installed: true,
          tempDir: packageTempDir,
          cached: true,
        }
      }
    } catch {
      // If we can't read it, reinstall.
    }
  }

  await fs.mkdir(packageTempDir, { recursive: true })

  try {
    // Generate pnpm overrides for all Socket registry packages.
    const pnpmOverrides = await generatePnpmOverrides()

    // Create minimal package.json in temp directory with pnpm overrides.
    await fs.writeFile(
      path.join(packageTempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-temp',
          version: '1.0.0',
          private: true,
          pnpm: {
            overrides: pnpmOverrides,
          },
        },
        null,
        2,
      ),
    )

    writeProgress('📦')

    // Install the package with retry logic to handle transient network failures,
    // registry timeouts, and rate limiting from npm registry.
    const packageSpec = versionSpec.startsWith('https://')
      ? versionSpec
      : `${origPkgName}@${versionSpec}`

    // Retry up to 3 times with exponential backoff (1s base delay, 2x multiplier).
    await pRetry(
      async () => {
        await runCommand('pnpm', ['add', packageSpec, ...PNPM_NPM_LIKE_FLAGS], {
          cwd: packageTempDir,
        })
      },
      {
        backoffFactor: 2,
        baseDelayMs: 1_000,
        retries: 3,
      },
    )

    // Apply Socket overrides selectively.
    const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)
    writeProgress('🔧')

    // Read the original installed package.json.
    let originalPkgJson = {}
    const pkgJsonPath = path.join(installedPath, 'package.json')

    try {
      originalPkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))
    } catch {
      // Package.json might not exist in the symlink location for some packages.
      // Try the pnpm store location.
      // For GitHub archive URLs, pnpm encodes special characters.
      // Convert to pnpm store format: replace : and / with +
      const pnpmStoreDir = `${origPkgName}@${versionSpec.replaceAll(':', '+').replaceAll('/', '+')}`

      const pnpmStorePath = path.join(
        packageTempDir,
        'node_modules',
        '.pnpm',
        pnpmStoreDir,
        'node_modules',
        origPkgName,
      )
      try {
        originalPkgJson = JSON.parse(
          await fs.readFile(path.join(pnpmStorePath, 'package.json'), 'utf8'),
        )
      } catch {
        // If we still can't read it, that's a problem.
        throw new Error(`Cannot read package.json for ${origPkgName}`)
      }
    }

    // Copy Socket override files (excluding package.json).
    await copy(overridePath, installedPath, {
      overwrite: true,
      dereference: true,
      filter: src =>
        !src.includes('node_modules') &&
        !src.endsWith('.DS_Store') &&
        !src.endsWith('package.json'),
    })

    // Read the Socket override package.json to get the fields we want.
    const overridePkgJsonPath = path.join(overridePath, 'package.json')
    const overridePkgJson = JSON.parse(
      await fs.readFile(overridePkgJsonPath, 'utf8'),
    )

    // Selectively merge Socket override fields into original package.json.
    // We want: exports, main, module, types, files, sideEffects, socket

    // Merge exports: use Socket's exports but preserve any original subpaths
    // that don't conflict (like special aliases or paths we don't override).
    const mergedExports = overridePkgJson.exports
      ? { ...originalPkgJson.exports, ...overridePkgJson.exports }
      : originalPkgJson.exports

    const mergedPkgJson = {
      ...originalPkgJson,
      // Override these specific fields from Socket package.
      exports: mergedExports,
      main: overridePkgJson.main,
      module: overridePkgJson.module,
      types: overridePkgJson.types,
      files: overridePkgJson.files,
      sideEffects: overridePkgJson.sideEffects,
      socket: overridePkgJson.socket,
      // Make the package private for testing.
      private: true,
    }

    // Clean up the test scripts.
    if (mergedPkgJson.scripts) {
      // Remove pretest script to avoid lint checks.
      delete mergedPkgJson.scripts.pretest
      delete mergedPkgJson.scripts.posttest

      // Look for actual test runner in scripts.
      const additionalTestRunners = [...testRunners, 'test:stock', 'test:all']
      let actualTestScript = additionalTestRunners.find(
        runner => mergedPkgJson.scripts[runner],
      )

      if (!actualTestScript && mergedPkgJson.scripts.test) {
        // Try to extract the test runner from the test script.
        const testMatch = mergedPkgJson.scripts.test.match(/npm run ([-:\w]+)/)
        if (testMatch && mergedPkgJson.scripts[testMatch[1]]) {
          actualTestScript = testMatch[1]
        }
      }

      // If the test script just runs lint or pretest, find a real test runner.
      if (
        mergedPkgJson.scripts.test?.includes('lint') ||
        mergedPkgJson.scripts.test?.includes('pretest')
      ) {
        // Find a test runner that actually runs tests.
        const realTestRunner = testRunners.find(
          runner =>
            mergedPkgJson.scripts[runner] &&
            !mergedPkgJson.scripts[runner].includes('lint'),
        )
        if (realTestRunner) {
          mergedPkgJson.scripts.test = mergedPkgJson.scripts[realTestRunner]
        }
      }

      // If test script just delegates to another script, resolve it.
      if (mergedPkgJson.scripts.test?.match(/^npm run ([-:\w]+)$/)) {
        const targetScript =
          mergedPkgJson.scripts.test.match(/^npm run ([-:\w]+)$/)[1]
        if (
          mergedPkgJson.scripts[targetScript] &&
          !mergedPkgJson.scripts[targetScript].includes('lint')
        ) {
          mergedPkgJson.scripts.test = mergedPkgJson.scripts[targetScript]
        }
      }

      // Clean the test scripts.
      if (actualTestScript && mergedPkgJson.scripts[actualTestScript]) {
        mergedPkgJson.scripts[actualTestScript] = cleanTestScript(
          mergedPkgJson.scripts[actualTestScript],
        )
      }
      if (mergedPkgJson.scripts.test) {
        mergedPkgJson.scripts.test = cleanTestScript(mergedPkgJson.scripts.test)
      }

      // Clean any test:* and tests-* scripts.
      for (const [key, value] of Object.entries(mergedPkgJson.scripts)) {
        if (key.startsWith('test:') || key.startsWith('tests')) {
          mergedPkgJson.scripts[key] = cleanTestScript(value)
        }
      }
    }

    await fs.writeFile(pkgJsonPath, JSON.stringify(mergedPkgJson, null, 2))

    // Check for test script.
    const testScript = mergedPkgJson.scripts?.test

    if (!testScript) {
      writeProgress(LOG_SYMBOLS.warn)
      completePackage()
      return {
        package: origPkgName,
        socketPackage: socketPkgName,
        installed: false,
        reason: 'No test script',
      }
    }

    // Install dependencies with pnpm.
    // First install in the root (installs prod dependencies of main package).
    writeProgress('📚')
    await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
      cwd: packageTempDir,
    })

    // Then install devDependencies of the nested package by running install inside it.
    await runCommand(
      'pnpm',
      ['install', '--prod=false', ...PNPM_INSTALL_FLAGS],
      {
        cwd: installedPath,
      },
    )

    // Apply Socket overrides to all nested dependencies recursively.
    await applyNestedSocketOverrides(installedPath)

    // Mark installation as complete.
    const installMarkerPath = path.join(
      packageTempDir,
      '.socket-install-complete',
    )
    const overrideHash = await computeOverrideHash(overridePath)
    await fs.writeFile(
      installMarkerPath,
      JSON.stringify(
        {
          installedAt: new Date().toISOString(),
          versionSpec,
          overrideHash,
          socketPackage: socketPkgName,
          originalPackage: origPkgName,
        },
        null,
        2,
      ),
    )

    writeProgress(LOG_SYMBOLS.success)
    completePackage()
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: true,
      tempDir: packageTempDir,
    }
  } catch (error) {
    writeProgress(LOG_SYMBOLS.fail)
    completePackage()
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: false,
      reason: error.message,
    }
  }
}

async function main() {
  suppressMaxListenersWarning()

  // Read download results.
  const downloadResultsFile = path.join(tempBaseDir, 'download-results.json')

  if (!existsSync(downloadResultsFile)) {
    logger.fail('Download results not found. Please run download phase first.')
    process.exitCode = 1
    return
  }

  let downloadResults = []
  try {
    const resultsData = await fs.readFile(downloadResultsFile, 'utf8')
    downloadResults = JSON.parse(resultsData)
  } catch (error) {
    logger.fail(`Could not read download results: ${error.message}`)
    process.exitCode = 1
    return
  }

  // Filter to packages that were successfully downloaded.
  const packagesToInstall = downloadResults.filter(r => r.downloaded)

  // Filter by specific packages if requested.
  const filteredPackages = cliArgs.package?.length
    ? packagesToInstall.filter(
        pkg =>
          cliArgs.package.includes(pkg.package) ||
          cliArgs.package.includes(pkg.socketPackage),
      )
    : packagesToInstall

  if (filteredPackages.length === 0) {
    logger.warn('No packages to install')
    process.exitCode = 0
    return
  }

  // Initialize progress tracking.
  cachedCount = 0
  completedPackages = 0
  failedCount = 0
  installedCount = 0
  totalPackagesCount = filteredPackages.length

  spinner.start()

  // Update spinner text when progress changes.
  let lastCompletedCount = 0
  const progressInterval = setInterval(() => {
    if (completedPackages !== lastCompletedCount) {
      lastCompletedCount = completedPackages
      spinner.text = `Installing ${completedPackages}/${totalPackagesCount} ${pluralize('package', filteredPackages.length)}`
    }
  }, 100)

  // Ensure base temp directory exists.
  await fs.mkdir(tempBaseDir, { recursive: true })

  const results = []

  await pEach(
    filteredPackages,
    async packageInfo => {
      const result = await installPackage(packageInfo)
      results.push(result)
    },
    { concurrency },
  )

  clearInterval(progressInterval)
  spinner.stop()

  // Show progress summary.
  if (cachedCount > 0) {
    logger.log(`♻️  Used cache: ${cachedCount}`)
  }
  if (installedCount > 0) {
    logger.log(`📦 Installed: ${installedCount}`)
  }
  if (failedCount > 0) {
    logger.fail(`Failed: ${failedCount}`)
  }

  // Get the set of packages that are allowed to fail.
  const allowFailuresSet = constants.allowTestFailuresByEcosystem.get('npm')

  // Categorize failures.
  const noTestScript = results.filter(
    r => !r.installed && r.reason === 'No test script',
  )
  const allowedFailures = results.filter(
    r =>
      !r.installed &&
      r.reason !== 'Skipped' &&
      r.reason !== 'No test script' &&
      (allowFailuresSet?.has(r.socketPackage) ||
        allowFailuresSet?.has(r.package)),
  )
  const criticalFailures = results.filter(
    r =>
      !r.installed &&
      r.reason !== 'Skipped' &&
      r.reason !== 'No test script' &&
      !allowFailuresSet?.has(r.socketPackage) &&
      !allowFailuresSet?.has(r.package),
  )

  // Write results to file for the test runner.
  const resultsFile = path.join(tempBaseDir, 'install-results.json')
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2))

  // Summary output only if issues.
  if (
    noTestScript.length > 0 ||
    allowedFailures.length > 0 ||
    criticalFailures.length > 0
  ) {
    logger.log('')
    if (noTestScript.length > 0) {
      logger.warn(`No test script: ${noTestScript.length} packages`)
      if (noTestScript.length <= 5) {
        logger.group()
        for (const pkg of noTestScript) {
          logger.log(`- ${pkg.package}`)
        }
        logger.groupEnd()
      }
    }
    if (allowedFailures.length > 0) {
      logger.warn(`Allowed failures: ${allowedFailures.length} packages`)
      if (allowedFailures.length <= 5) {
        logger.group()
        for (const pkg of allowedFailures) {
          logger.log(`- ${pkg.package}: ${pkg.reason}`)
        }
        logger.groupEnd()
      }
    }
    if (criticalFailures.length > 0) {
      logger.fail(`Failed: ${criticalFailures.length} packages`)
      logger.group()
      for (const pkg of criticalFailures) {
        logger.log(`- ${pkg.package}: ${pkg.reason}`)
      }
      logger.groupEnd()
    }
  }

  // Only fail on critical errors, not on packages without test scripts or allowed failures.
  process.exitCode = criticalFailures.length ? 1 : 0
}

main().catch(console.error)
