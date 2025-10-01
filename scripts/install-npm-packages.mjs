/** @fileoverview Script for installing npm packages with Socket overrides for testing. */

import crypto from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import { cleanTestScript } from '../test/utils/script-cleaning.mjs'
import { testRunners } from '../test/utils/test-runners.mjs'
import { suppressMaxListenersWarning } from './utils/suppress-warnings.mjs'
import { filterPackagesByChanges } from './utils/git.mjs'
import { PNPM_INSTALL_ENV, PNPM_INSTALL_FLAGS } from './utils/package.mjs'
import constants from './constants.mjs'
import ENV from '../registry/dist/lib/constants/ENV.js'
import spinner from '../registry/dist/lib/constants/spinner.js'
import WIN32 from '../registry/dist/lib/constants/WIN32.js'
import { readPackageJson } from '../registry/dist/lib/packages.js'
import { pEach, pRetry } from '../registry/dist/lib/promises.js'
import { LOG_SYMBOLS, logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'
import { pluralize } from '../registry/dist/lib/words.js'
import { writeJson } from '../registry/dist/lib/fs.js'

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
    force: {
      type: 'boolean',
      default: ENV.CI,
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
  if (symbol === '💾') {
    cachedCount += 1
  } else if (symbol === LOG_SYMBOLS.success || symbol === '✓') {
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
    const pkgJson = await readPackageJson(pkgJsonPath)
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
  const opts = { __proto__: null, ...options }
  const { env: spawnEnv } = opts
  try {
    const result = await spawn(command, args, {
      stdio: 'pipe',
      shell: WIN32,
      env: { ...process.env, NODE_NO_WARNINGS: '1', ...spawnEnv },
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

let cachedPnpmOverrides

async function generatePnpmOverrides(options) {
  const opts = { __proto__: null, ...options }
  const { excludes = [] } = opts

  // Use cache key that includes the excluded packages.
  const cacheKey =
    excludes.length > 0 ? excludes.slice().sort().join(',') : '__all__'
  if (cachedPnpmOverrides?.[cacheKey]) {
    return cachedPnpmOverrides[cacheKey]
  }

  const overrides = { __proto__: null }
  const npmPackagesDir = constants.npmPackagesPath

  // Check if npm packages directory exists.
  if (!existsSync(npmPackagesDir)) {
    if (!cachedPnpmOverrides) {
      cachedPnpmOverrides = { __proto__: null }
    }
    cachedPnpmOverrides[cacheKey] = overrides
    return overrides
  }

  // Get all Socket override packages.
  const entries = await fs.readdir(npmPackagesDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const packageName = entry.name

    // Skip excluded packages so they don't get overridden by pnpm.
    if (excludes.includes(packageName)) {
      continue
    }

    const packagePath = path.join(npmPackagesDir, packageName)
    const pkgJsonPath = path.join(packagePath, 'package.json')

    try {
      // eslint-disable-next-line no-await-in-loop
      const pkgJson = await readPackageJson(pkgJsonPath)

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

  if (!cachedPnpmOverrides) {
    cachedPnpmOverrides = { __proto__: null }
  }
  cachedPnpmOverrides[cacheKey] = overrides
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

  // Resolve symlinks to check if paths are actually the same.
  let realPackagePath
  try {
    realPackagePath = await fs.realpath(packagePath)
  } catch {
    realPackagePath = path.resolve(packagePath)
  }

  let realOverridePath
  try {
    realOverridePath = await fs.realpath(overridePath)
  } catch {
    realOverridePath = path.resolve(overridePath)
  }

  // Skip if source and destination resolve to the same path.
  if (realOverridePath === realPackagePath) {
    return
  }

  // Read the Socket override package.json.
  const overridePkgJsonPath = path.join(overridePath, 'package.json')
  let overridePkgJson
  try {
    overridePkgJson = await readPackageJson(overridePkgJsonPath)
  } catch {
    return
  }

  // Read the existing package.json.
  const packageJsonPath = path.join(packagePath, 'package.json')
  let existingPkgJson
  try {
    existingPkgJson = await readPackageJson(packageJsonPath, {
      editable: true,
    })
  } catch {
    return
  }

  // Copy Socket override files (excluding package.json).
  try {
    await fs.cp(overridePath, packagePath, {
      force: true,
      recursive: true,
      dereference: true,
      errorOnExist: false,
      ...(WIN32 ? { retryDelay: 100, maxRetries: 3 } : {}),
      filter: src =>
        !src.includes('node_modules') &&
        !src.endsWith('.DS_Store') &&
        !src.endsWith('package.json'),
    })
  } catch (e) {
    // Ignore errors about same paths - this happens when pnpm symlinks to our override.
    if (
      e.code === 'ERR_FS_CP_EINVAL' ||
      e.message?.includes('Source and destination must not be the same')
    ) {
      return
    }
    // Log other errors for debugging if it's not a simple file missing error.
    if (e.code !== 'ENOENT') {
      console.error(
        `Copy error for ${packageName}: ${e.message}\n  From: ${realOverridePath}\n  To: ${realPackagePath}`,
      )
    }
    return
  }

  // Merge exports: Socket exports take precedence.
  const mergedExports = overridePkgJson.exports
    ? { ...existingPkgJson.content.exports, ...overridePkgJson.exports }
    : existingPkgJson.content.exports

  // Update package.json with Socket override fields.
  // Note: We intentionally do NOT overwrite scripts here to preserve test scripts.
  existingPkgJson.update({
    exports: mergedExports,
    main: overridePkgJson.main,
    module: overridePkgJson.module,
  })

  // Write updated package.json.
  await existingPkgJson.save()
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
      // Read package.json to check if installation is valid.
      const existingPkgJson = await readPackageJson(packageJsonPath, {
        editable: true,
      })
      const markerData = JSON.parse(
        await fs.readFile(installMarkerPath, 'utf8'),
      )

      // Verify the installation matches the requested version and override hash.
      if (
        existingPkgJson.content.scripts?.test &&
        markerData.versionSpec === versionSpec &&
        markerData.overrideHash === currentOverrideHash
      ) {
        // Always reapply Socket override files to ensure they're up-to-date.
        // Resolve symlinks to check if paths are actually the same.
        let realInstalledPath
        try {
          realInstalledPath = await fs.realpath(installedPath)
        } catch {
          realInstalledPath = path.resolve(installedPath)
        }

        let realOverridePath
        try {
          realOverridePath = await fs.realpath(overridePath)
        } catch {
          realOverridePath = path.resolve(overridePath)
        }

        // Skip if source and destination resolve to the same path.
        if (realOverridePath !== realInstalledPath) {
          // Copy Socket override files (excluding package.json).
          try {
            await fs.cp(overridePath, installedPath, {
              force: true,
              recursive: true,
              dereference: true,
              errorOnExist: false,
              ...(WIN32 ? { retryDelay: 100, maxRetries: 3 } : {}),
              filter: src =>
                !src.includes('node_modules') &&
                !src.endsWith('.DS_Store') &&
                !src.endsWith('package.json'),
            })
          } catch (e) {
            // Ignore errors about same paths - this happens when pnpm symlinks to our override.
            if (
              e.code === 'ERR_FS_CP_EINVAL' ||
              e.message?.includes('Source and destination must not be the same')
            ) {
              // Skip silently.
            } else if (e.code !== 'ENOENT') {
              console.error(
                `Copy error (cached path) for ${origPkgName}: ${e.message}\n  From: ${realOverridePath}\n  To: ${realInstalledPath}`,
              )
            }
          }
        }

        // Read the Socket override package.json to get the fields we want.
        const overridePkgJsonPath = path.join(overridePath, 'package.json')
        const overridePkgJson = await readPackageJson(overridePkgJsonPath)

        // Selectively update the fields from Socket override.
        // Merge exports: use Socket's exports but preserve any original subpaths.
        existingPkgJson.update({
          ...(overridePkgJson.exports
            ? {
                exports: {
                  ...existingPkgJson.exports,
                  ...overridePkgJson.exports,
                },
              }
            : {}),
          main: overridePkgJson.main,
          module: overridePkgJson.module,
          private: true,
        })

        await existingPkgJson.save()

        // Install any missing dependencies.
        // Unset NODE_ENV and CI to prevent pnpm from skipping devDependencies.
        await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
          cwd: packageTempDir,
          env: { ...process.env, ...PNPM_INSTALL_ENV },
        })

        // Explicitly install dependencies in the nested package to ensure test
        // runners (tape, mocha, ava, etc.) are available.
        await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
          cwd: installedPath,
          env: { ...process.env, ...PNPM_INSTALL_ENV },
        })

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
    // Generate pnpm overrides for all Socket registry packages except the one being installed.
    // This ensures the original package gets installed (not replaced by Socket override),
    // allowing us to preserve its test scripts.
    const pnpmOverrides = await generatePnpmOverrides({
      excludes: [socketPkgName],
    })

    // Create package.json with the original package as a dependency.
    // This allows pnpm to install it along with all its dependencies in one go.
    const packageSpec = versionSpec.startsWith('https://')
      ? versionSpec
      : versionSpec

    await writeJson(path.join(packageTempDir, 'package.json'), {
      name: 'test-temp',
      version: '1.0.0',
      private: true,
      dependencies: {
        [origPkgName]: packageSpec,
      },
      pnpm: {
        overrides: pnpmOverrides,
      },
    })

    writeProgress('📦')

    // Install the package with retry logic to handle transient network failures,
    // registry timeouts, and rate limiting from npm registry.
    // Retry up to 3 times with exponential backoff (1s base delay, 2x multiplier).
    // Unset NODE_ENV and CI to prevent pnpm from skipping devDependencies.
    await pRetry(
      async () => {
        await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
          cwd: packageTempDir,
          env: { ...process.env, ...PNPM_INSTALL_ENV },
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

    // Read the original installed package.json with editable support.
    const pkgJsonPath = path.join(installedPath, 'package.json')
    let originalPkgJson

    try {
      originalPkgJson = await readPackageJson(pkgJsonPath, {
        editable: true,
      })
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
        originalPkgJson = await readPackageJson(
          path.join(pnpmStorePath, 'package.json'),
          {
            editable: true,
          },
        )
      } catch {
        // If we still can't read it, that's a problem.
        throw new Error(`Cannot read package.json for ${origPkgName}`)
      }
    }

    // Resolve symlinks to check if paths are actually the same.
    let realInstalledPath
    try {
      realInstalledPath = await fs.realpath(installedPath)
    } catch {
      realInstalledPath = path.resolve(installedPath)
    }

    let realOverridePath
    try {
      realOverridePath = await fs.realpath(overridePath)
    } catch {
      realOverridePath = path.resolve(overridePath)
    }

    // Skip if source and destination resolve to the same path.
    if (realOverridePath !== realInstalledPath) {
      // Copy Socket override files (excluding package.json).
      try {
        await fs.cp(overridePath, installedPath, {
          force: true,
          recursive: true,
          dereference: true,
          errorOnExist: false,
          ...(WIN32 ? { retryDelay: 100, maxRetries: 3 } : {}),
          filter: src =>
            !src.includes('node_modules') &&
            !src.endsWith('.DS_Store') &&
            !src.endsWith('package.json'),
        })
      } catch (e) {
        // Ignore errors about same paths - this happens when pnpm symlinks to our override.
        if (
          e.code === 'ERR_FS_CP_EINVAL' ||
          e.message?.includes('Source and destination must not be the same')
        ) {
          // Skip silently, don't rethrow.
        } else if (e.code !== 'ENOENT') {
          console.error(
            `Copy error (install path) for ${origPkgName}: ${e.message}\n  From: ${realOverridePath}\n  To: ${realInstalledPath}`,
          )
          throw e
        } else {
          throw e
        }
      }
    }

    // Read the Socket override package.json to get the fields we want.
    const overridePkgJsonPath = path.join(overridePath, 'package.json')
    const overridePkgJson = await readPackageJson(overridePkgJsonPath)

    // Selectively merge Socket override fields into original package.json.
    // We want: exports, main, module, types, files, sideEffects, socket

    // Merge exports: use Socket's exports but preserve any original subpaths
    // that don't conflict (like special aliases or paths we don't override).
    const mergedExports = overridePkgJson.exports
      ? { ...originalPkgJson.content.exports, ...overridePkgJson.exports }
      : originalPkgJson.content.exports

    // Update the package.json with merged fields.
    originalPkgJson.update({
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
    })

    // Clean up the test scripts.
    if (originalPkgJson.content.scripts) {
      // Remove pretest script to avoid lint checks.
      delete originalPkgJson.content.scripts.pretest
      delete originalPkgJson.content.scripts.posttest

      // Look for actual test runner in scripts.
      const additionalTestRunners = [...testRunners, 'test:stock', 'test:all']
      let actualTestScript = additionalTestRunners.find(
        runner => originalPkgJson.content.scripts[runner],
      )

      if (!actualTestScript && originalPkgJson.content.scripts.test) {
        // Try to extract the test runner from the test script.
        const testMatch =
          originalPkgJson.content.scripts.test.match(/npm run ([-:\w]+)/)
        if (testMatch && originalPkgJson.content.scripts[testMatch[1]]) {
          actualTestScript = testMatch[1]
        }
      }

      // If the test script just runs lint or pretest, find a real test runner.
      if (
        originalPkgJson.content.scripts.test?.includes('lint') ||
        originalPkgJson.content.scripts.test?.includes('pretest')
      ) {
        // Find a test runner that actually runs tests.
        const realTestRunner = testRunners.find(
          runner =>
            originalPkgJson.content.scripts[runner] &&
            !originalPkgJson.content.scripts[runner].includes('lint'),
        )
        if (realTestRunner) {
          originalPkgJson.content.scripts.test =
            originalPkgJson.content.scripts[realTestRunner]
        }
      }

      // If test script just delegates to another script, resolve it.
      if (originalPkgJson.content.scripts.test?.match(/^npm run ([-:\w]+)$/)) {
        const targetScript =
          originalPkgJson.content.scripts.test.match(/^npm run ([-:\w]+)$/)[1]
        if (
          originalPkgJson.content.scripts[targetScript] &&
          !originalPkgJson.content.scripts[targetScript].includes('lint')
        ) {
          originalPkgJson.content.scripts.test =
            originalPkgJson.content.scripts[targetScript]
        }
      }

      // Clean the test scripts.
      if (
        actualTestScript &&
        originalPkgJson.content.scripts[actualTestScript]
      ) {
        originalPkgJson.content.scripts[actualTestScript] = cleanTestScript(
          originalPkgJson.content.scripts[actualTestScript],
        )
      }
      if (originalPkgJson.content.scripts.test) {
        originalPkgJson.content.scripts.test = cleanTestScript(
          originalPkgJson.content.scripts.test,
        )
      }

      // Clean any test:* and tests-* scripts.
      for (const [key, value] of Object.entries(
        originalPkgJson.content.scripts,
      )) {
        if (key.startsWith('test:') || key.startsWith('tests')) {
          originalPkgJson.content.scripts[key] = cleanTestScript(value)
        }
      }
    }

    await originalPkgJson.save()

    // Check for test script.
    const testScript = originalPkgJson.content.scripts?.test

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

    // Install dependencies to ensure devDependencies (test runners) are available.
    // Unset NODE_ENV and CI to prevent pnpm from skipping devDependencies.
    await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
      cwd: packageTempDir,
      env: { ...process.env, ...PNPM_INSTALL_ENV },
    })

    // Explicitly install dependencies in the nested package to ensure test
    // runners (tape, mocha, ava, etc.) are available.
    await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
      cwd: installedPath,
      env: { ...process.env, ...PNPM_INSTALL_ENV },
    })

    // Apply Socket overrides to all nested dependencies recursively.
    await applyNestedSocketOverrides(installedPath)

    // Mark installation as complete.
    const installMarkerPath = path.join(
      packageTempDir,
      '.socket-install-complete',
    )
    const overrideHash = await computeOverrideHash(overridePath)
    await writeJson(installMarkerPath, {
      installedAt: new Date().toISOString(),
      versionSpec,
      overrideHash,
      socketPackage: socketPkgName,
      originalPackage: origPkgName,
    })

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
    const errorDetails = [error.message]
    if (error.stderr) {
      errorDetails.push(error.stderr.slice(0, 500))
    }
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: false,
      reason: errorDetails.join('\n'),
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
  let filteredPackages = cliArgs.package?.length
    ? packagesToInstall.filter(
        pkg =>
          cliArgs.package.includes(pkg.package) ||
          cliArgs.package.includes(pkg.socketPackage),
      )
    : packagesToInstall

  // If not in force mode, only install packages that have changes.
  filteredPackages = await filterPackagesByChanges(filteredPackages, 'npm', {
    force: cliArgs.force,
  })

  if (filteredPackages.length === 0) {
    logger.log('No changed packages to install')
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
  // In CI environments, batch updates to avoid excessive line output.
  const updateInterval = ENV.CI ? 10 : 1
  let lastCompletedCount = 0
  const progressInterval = setInterval(
    () => {
      if (completedPackages !== lastCompletedCount) {
        // Only update display at intervals to reduce output in CI.
        if (
          completedPackages % updateInterval === 0 ||
          completedPackages === totalPackagesCount
        ) {
          spinner.text = `Installing ${completedPackages}/${totalPackagesCount} ${pluralize('package', filteredPackages.length)}`
        }
        lastCompletedCount = completedPackages
      }
    },
    ENV.CI ? 1_000 : 100,
  )

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
  await writeJson(resultsFile, results)

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
