/**
 * @fileoverview Script for installing npm packages with Socket overrides for testing.
 *
 * EXECUTION FLOW:
 *
 * This script is part of a 3-phase testing pipeline:
 *   1. download-npm-packages.mjs - Validates packages exist and can be downloaded
 *   2. install-npm-packages.mjs  - Installs packages with Socket overrides (THIS FILE)
 *   3. run-npm-package-tests.mjs - Runs tests for installed packages
 *
 * WHAT THIS SCRIPT DOES:
 *
 * 0. Cleanup Phase (before processing packages):
 *    - Removes node_modules directories from packages/npm/* to prevent pnpm workspace
 *      symlink conflicts between local development and CI environments
 *    - NOTE: socket-test-extract-* directories are NOT cleaned up here, as they may
 *      still be referenced by cached installations. They accumulate in /tmp but are
 *      harmless and will be cleaned by OS temp directory cleanup
 *
 * For each package in test/npm/package.json devDependencies:
 *
 * 1. GitHub Tarball Handling (if versionSpec is a GitHub URL):
 *    - Downloads and extracts the GitHub tarball using pacote to /tmp/socket-test-extract-{timestamp}
 *    - Removes the "files" field from package.json to preserve test files
 *      (GitHub tarballs often have "files": ["index.js"] which excludes test files)
 *    - Removes unnecessary lifecycle scripts (prepublishOnly, prepack, etc.)
 *      while keeping test-related scripts (test*, pretest, posttest)
 *    - Points pnpm to the modified local directory using file:// URL
 *    - On failure: Falls back to GitHub URL and cleans up failed extraction directory
 *    - On success: Extraction directory is preserved (cleaned up after installation)
 *
 * 2. Package Manager Detection:
 *    - Detects the preferred package manager by checking:
 *      a) packageManager field in package.json (official standard)
 *      b) Script patterns (e.g., "npm run" commands suggest npm)
 *      c) Defaults to pnpm if no preference detected
 *
 * 3. Package Installation:
 *    - Creates a temporary directory with a dummy package.json
 *    - Installs the package using the detected package manager with Socket registry overrides
 *    - Socket overrides are applied to all dependencies EXCEPT the package being tested
 *      (this ensures the original package is installed, not replaced by our override)
 *    - Uses appropriate override format: pnpm.overrides for pnpm, overrides for npm
 *
 * 4. DevDependencies Installation:
 *    - Reads the installed package's devDependencies (test runners like ava, tape, mocha)
 *    - Adds them to the dummy package.json
 *    - Runs install again using the detected package manager to install test dependencies
 *
 * 5. Socket Override Application:
 *    - Copies Socket override files (index.js, etc.) to the installed package
 *    - Does NOT overwrite test files or package.json test scripts
 *    - Updates package.json with Socket override metadata (exports, main, module, dependencies, etc.)
 *    - If Socket override has different dependencies, installs them using detected package manager
 *    - Recursively applies Socket overrides to nested dependencies
 *
 * 6. Caching:
 *    - Creates a .socket-install-complete marker with version and override hash
 *    - On subsequent runs, skips installation if marker matches current version/hash
 *    - Always reapplies Socket override files even for cached packages
 *    - Cache directory: ~/.socket-npm-test-cache/ (GitHub Actions caches this)
 *    - Cache invalidation: Hash of all npm package.json files in packages/npm/
 *    - Cache cleanup (Phase 0): Removes node_modules from packages/npm/* only
 *      (socket-test-extract-* dirs are preserved for cached installations)
 *
 * OUTPUT:
 *   - Installed packages in: /tmp/npm-package-tests/{package-name}/
 *   - Install results JSON for run-npm-package-tests.mjs
 */

import crypto from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import pacote from 'pacote'
import { c as tarCreate } from 'tar'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import { cleanTestScript } from '../test/utils/script-cleaning.mjs'
import { suppressMaxListenersWarning } from './utils/suppress-warnings.mjs'
import { safeRemove } from './utils/fs.mjs'
import { filterPackagesByChanges } from './utils/git.mjs'
import {
  PNPM_HOISTED_INSTALL_FLAGS,
  PNPM_INSTALL_ENV,
} from './utils/package.mjs'
import constants from './constants.mjs'
import ENV from '../registry/dist/lib/constants/ENV.js'
import spinner from '../registry/dist/lib/constants/spinner.js'
import NODE_MODULES from '../registry/dist/lib/constants/NODE_MODULES.js'
import PACKAGE_JSON from '../registry/dist/lib/constants/PACKAGE_JSON.js'
import WIN32 from '../registry/dist/lib/constants/WIN32.js'
import { readPackageJson } from '../registry/dist/lib/packages.js'
import { pEach, pRetry } from '../registry/dist/lib/promises.js'
import { LOG_SYMBOLS, logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'
import { pluralize } from '../registry/dist/lib/words.js'
import { readFileUtf8, readJson, writeJson } from '../registry/dist/lib/fs.js'

// Default concurrency values based on environment and platform.
const DEFAULT_CI_CONCURRENCY_WIN32 = '5'
const DEFAULT_CI_CONCURRENCY_POSIX = '10'
const DEFAULT_DEV_CONCURRENCY = '15'

// Filesystem delay constants for tar extraction and JSON parsing.
const FS_FLUSH_DELAY_MS = 100
const JSON_PARSE_RETRY_BASE_DELAY_MS = 200
const JSON_PARSE_MAX_RETRIES = 3

// Output truncation length for error messages.
const ERROR_OUTPUT_TRUNCATE_LENGTH = 1_000

// Progress update intervals for CI vs. local environments.
const PROGRESS_UPDATE_INTERVAL_CI = 10
const PROGRESS_UPDATE_INTERVAL_DEV = 1
const PROGRESS_TIMER_INTERVAL_CI_MS = 1_000
const PROGRESS_TIMER_INTERVAL_DEV_MS = 100

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      default: ENV.CI
        ? WIN32
          ? DEFAULT_CI_CONCURRENCY_WIN32
          : DEFAULT_CI_CONCURRENCY_POSIX
        : DEFAULT_DEV_CONCURRENCY,
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
    const pkgJsonPath = path.join(overridePath, PACKAGE_JSON)
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

/**
 * Detect the preferred package manager for a package.
 */
function detectPackageManager(pkgJson) {
  // 1. Check packageManager field (official way).
  if (pkgJson.packageManager) {
    if (pkgJson.packageManager.startsWith('npm')) {
      return 'npm'
    }
    if (pkgJson.packageManager.startsWith('pnpm')) {
      return 'pnpm'
    }
    if (pkgJson.packageManager.startsWith('yarn')) {
      return 'yarn'
    }
  }

  // 2. Check if scripts use npm or pnpm commands.
  const scriptText = JSON.stringify(pkgJson.scripts || {})
  if (/\bnpm\s+/.test(scriptText)) {
    return 'npm'
  }
  if (/\bpnpm\s+/.test(scriptText)) {
    return 'pnpm'
  }

  // 3. Default to pnpm (faster, more efficient).
  return 'pnpm'
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
    const pkgJsonPath = path.join(packagePath, PACKAGE_JSON)

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
  const overridePkgJsonPath = path.join(overridePath, PACKAGE_JSON)
  let overridePkgJson
  try {
    overridePkgJson = await readPackageJson(overridePkgJsonPath)
  } catch {
    return
  }

  // Read the existing package.json.
  const packageJsonPath = path.join(packagePath, PACKAGE_JSON)
  let existingPkgJson
  try {
    existingPkgJson = await readPackageJson(packageJsonPath, {
      editable: true,
    })
  } catch {
    return
  }

  // Copy Socket override files (excluding package.json).
  // Note: We don't filter out test files here because some packages may have
  // test files in their Socket overrides that should be preserved.
  try {
    await fs.cp(overridePath, packagePath, {
      force: true,
      recursive: true,
      dereference: true,
      errorOnExist: false,
      ...(WIN32 ? { retryDelay: 100, maxRetries: 3 } : {}),
      filter: src =>
        !src.includes(NODE_MODULES) &&
        !src.endsWith('.DS_Store') &&
        !src.endsWith(PACKAGE_JSON),
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

  // Update package.json with Socket override fields.
  // Note: We intentionally do NOT overwrite scripts here to preserve test scripts.
  //
  // Exports handling:
  // - If Socket override has exports, use them entirely (no merging)
  // - Cannot merge because mixing conditional exports (e.g., 'import', 'require')
  //   with subpath exports (e.g., '.', './package.json') creates invalid config
  // - See: https://nodejs.org/api/packages.html#conditional-exports
  // - See: https://nodejs.org/api/packages.html#subpath-exports
  existingPkgJson.update({
    ...(overridePkgJson.exports ? { exports: overridePkgJson.exports } : {}),
    ...(overridePkgJson.dependencies
      ? { dependencies: overridePkgJson.dependencies }
      : {}),
    ...(overridePkgJson.main ? { main: overridePkgJson.main } : {}),
    ...(overridePkgJson.module ? { module: overridePkgJson.module } : {}),
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
  const installedPath = path.join(packageTempDir, NODE_MODULES, origPkgName)
  const packageJsonPath = path.join(installedPath, PACKAGE_JSON)
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
      const markerData = await readJson(installMarkerPath)

      // Verify the installation matches the requested version and override hash.
      // Also check if the cached installation references GitHub extraction directories.
      // If the versionSpec is a GitHub URL but the marker doesn't have an extractPath,
      // or if it does have an extractPath but that directory no longer exists,
      // we need to reinstall because pnpm won't be able to access the dependencies.
      const hasGitHubUrl = versionSpec.startsWith('https://github.com/')
      const extractPath = markerData.extractPath
      const extractPathValid = extractPath ? existsSync(extractPath) : true

      if (
        existingPkgJson.content.scripts?.test &&
        markerData.versionSpec === versionSpec &&
        markerData.overrideHash === currentOverrideHash &&
        (!hasGitHubUrl || extractPathValid)
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
                !src.includes(NODE_MODULES) &&
                !src.endsWith('.DS_Store') &&
                !src.endsWith(PACKAGE_JSON),
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
        const overridePkgJsonPath = path.join(overridePath, PACKAGE_JSON)
        const overridePkgJson = await readPackageJson(overridePkgJsonPath)

        // Selectively update the fields from Socket override.
        //
        // Exports handling:
        // - If Socket override has exports, use them entirely (no merging)
        // - Cannot merge because mixing conditional exports (e.g., 'import', 'require')
        //   with subpath exports (e.g., '.', './package.json') creates invalid config
        // - See: https://nodejs.org/api/packages.html#conditional-exports
        // - See: https://nodejs.org/api/packages.html#subpath-exports
        existingPkgJson.update({
          ...(overridePkgJson.exports
            ? { exports: overridePkgJson.exports }
            : {}),
          ...(overridePkgJson.dependencies
            ? { dependencies: overridePkgJson.dependencies }
            : {}),
          ...(overridePkgJson.main ? { main: overridePkgJson.main } : {}),
          ...(overridePkgJson.module ? { module: overridePkgJson.module } : {}),
          private: true,
        })

        await existingPkgJson.save()

        // If Socket override has different dependencies, install them.
        // Always use pnpm for installation to avoid npm override conflicts.
        if (overridePkgJson.dependencies) {
          await runCommand('pnpm', ['install'], {
            cwd: installedPath,
            env: { ...process.env, ...PNPM_INSTALL_ENV },
          })
        }

        // Install all dependencies including devDependencies at the parent level.
        // Unset NODE_ENV and CI to prevent package manager from skipping devDependencies.
        // The hoisted install at parent level makes test runners available to nested package.
        // Always use pnpm for installation to avoid npm override conflicts.
        await runCommand('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
          cwd: packageTempDir,
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

  // Track modified package path for cleanup.
  let modifiedPackagePath

  try {
    // Generate pnpm overrides for all Socket registry packages except the one being installed.
    // This ensures the original package gets installed (not replaced by Socket override),
    // allowing us to preserve its test scripts.
    const pnpmOverrides = await generatePnpmOverrides({
      excludes: [socketPkgName],
    })

    // Handle GitHub tarball URLs specially to preserve test files.
    // GitHub tarballs often have a "files" field in package.json that excludes test files.
    // When pnpm installs from a GitHub tarball, it respects the "files" field and discards test files.
    // To preserve test files, we:
    // 1. Download and extract the GitHub tarball ourselves (with validation to catch HTTP errors)
    // 2. Wait for filesystem to flush, then verify the downloaded tarball and extracted package.json are not empty
    // 3. Retry reading package.json up to 3 times with exponential backoff to handle filesystem delays on slow CI
    // 4. Remove the "files" field from package.json and .npmignore to preserve test files
    // 5. Repack into a new tarball (ensures pnpm includes all files regardless of files field)
    // 6. Point pnpm to our repacked tarball instead of the GitHub URL
    // If extraction fails (HTTP error, empty files, or JSON parse error after retries), fall back to GitHub URL.
    let packageSpec = versionSpec

    if (versionSpec.startsWith('https://github.com/')) {
      writeProgress('📝')
      const tempExtractDir = path.join(
        os.tmpdir(),
        `socket-test-extract-${socketPkgName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`,
      )
      try {
        await fs.mkdir(tempExtractDir, { recursive: true })

        // Download and extract GitHub tarball using pacote.
        // pacote handles HTTP errors, validation, and extraction automatically.
        await pacote.extract(versionSpec, tempExtractDir, {
          preferOnline: true,
        })

        // Wait briefly for filesystem to flush after extraction.
        // This prevents reading truncated files on slower CI systems.
        await new Promise(resolve => setTimeout(resolve, FS_FLUSH_DELAY_MS))

        // pacote extracts directly to tempExtractDir (no nested directory).
        const pkgJsonPath = path.join(tempExtractDir, PACKAGE_JSON)

        if (existsSync(pkgJsonPath)) {
          // Verify package.json exists and is not empty.
          // Retry up to JSON_PARSE_MAX_RETRIES times to handle filesystem flush delays on slow CI systems.
          let editablePkgJson
          let lastError
          for (
            let attempt = 1;
            attempt <= JSON_PARSE_MAX_RETRIES;
            attempt += 1
          ) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const pkgJsonStats = await fs.stat(pkgJsonPath)
              if (pkgJsonStats.size === 0) {
                throw new Error(`Extracted ${PACKAGE_JSON} is empty`)
              }

              // Remove the "files" field so pnpm includes all files (including tests).
              // Also remove unnecessary lifecycle scripts that could interfere with testing.
              // eslint-disable-next-line no-await-in-loop
              editablePkgJson = await readPackageJson(pkgJsonPath, {
                editable: true,
              })
              break
            } catch (error) {
              lastError = error
              if (attempt < JSON_PARSE_MAX_RETRIES) {
                // Wait longer on each retry (200ms, 400ms).
                // eslint-disable-next-line no-await-in-loop
                await new Promise(resolve =>
                  setTimeout(resolve, attempt * JSON_PARSE_RETRY_BASE_DELAY_MS),
                )
              }
            }
          }

          if (!editablePkgJson) {
            // All retries failed, add diagnostic info.
            const pkgJsonStats = await fs.stat(pkgJsonPath)
            const fileContent = await readFileUtf8(pkgJsonPath)
            throw new Error(
              `Invalid package.json after 3 retries: ${lastError.message}. File size: ${pkgJsonStats.size}, Content preview: ${fileContent.slice(0, 200)}`,
            )
          }
          const { scripts } = editablePkgJson.content
          const cleanedScripts = scripts ? { __proto__: null } : undefined
          if (scripts) {
            // Clean test scripts, keep all other scripts.
            for (const { 0: key, 1: value } of Object.entries(scripts)) {
              cleanedScripts[key] = key.startsWith('test')
                ? cleanTestScript(value)
                : value
            }
          }
          editablePkgJson.update({
            files: undefined,
            scripts: cleanedScripts,
          })
          await editablePkgJson.save()

          // Remove .npmignore if it exists, as it can also filter out test files.
          const npmignorePath = path.join(tempExtractDir, '.npmignore')
          await safeRemove(npmignorePath).catch(() => {
            // File doesn't exist, ignore.
          })

          // CRITICAL: pnpm respects the "files" field even when installing from file:// directories.
          // Even though we removed the "files" field from package.json, pnpm still filters files
          // during installation if we point it to a directory. To work around this pnpm limitation,
          // we create a NEW tarball that contains ALL files (including test files that were
          // originally excluded by the "files" field).
          //
          // WHY THIS IS NECESSARY:
          // 1. GitHub tarballs often have "files": ["index.js"] which excludes test files
          // 2. We remove this field from package.json to preserve test files
          // 3. But pnpm STILL filters files when installing from a file:// directory URL
          // 4. Creating a new tarball bypasses pnpm's filtering since tarballs don't support
          //    selective file inclusion - they contain everything that's in them
          //
          // CROSS-PLATFORM: Uses the 'tar' npm package (same as pacote) which works on all platforms
          // including Windows 10+ without requiring external tar command.
          const repackedTarball = path.join(tempExtractDir, 'repacked.tgz')
          const entries = await fs.readdir(tempExtractDir)
          await tarCreate(
            {
              gzip: true,
              file: repackedTarball,
              cwd: tempExtractDir,
              prefix: 'package',
            },
            entries.filter(name => name !== 'repacked.tgz'),
          )

          // Use file:// URL to point pnpm to our repacked tarball that contains all files.
          packageSpec = pathToFileURL(repackedTarball).href
          modifiedPackagePath = tempExtractDir
        }
      } catch (e) {
        // If extraction fails, fall back to the original GitHub URL.
        console.warn(
          `Warning: Could not extract GitHub tarball for ${origPkgName}, using URL directly: ${e.message}`,
        )
        packageSpec = versionSpec
        // Clean up failed extraction directory.
        await safeRemove(tempExtractDir).catch(() => {
          // Ignore cleanup errors.
        })
      }
    }

    // Detect the preferred package manager for this package.
    let packageManager = 'pnpm'
    let packageManifest
    try {
      // Fetch package manifest from registry to detect package manager.
      packageManifest = await pacote.manifest(packageSpec, {
        preferOnline: false,
      })
      packageManager = detectPackageManager(packageManifest)
    } catch {
      // If we can't fetch the manifest, default to pnpm.
    }

    // Create package.json with the original package as a dependency.
    // Use the appropriate override format for the detected package manager.
    const testPkgJson = {
      name: 'test-temp',
      private: true,
      version: '1.0.0',
      dependencies: {
        [origPkgName]: packageSpec,
      },
    }

    // Add overrides in the appropriate format for the package manager.
    if (packageManager === 'pnpm') {
      testPkgJson.pnpm = {
        overrides: pnpmOverrides,
      }
    } else if (packageManager === 'npm') {
      testPkgJson.overrides = pnpmOverrides
    }

    await writeJson(path.join(packageTempDir, PACKAGE_JSON), testPkgJson)

    writeProgress('📦')

    // Install the package with retry logic to handle transient network failures,
    // registry timeouts, and rate limiting from npm registry.
    // Retry up to 3 times with exponential backoff (1s base delay, 2x multiplier).
    // Unset NODE_ENV and CI to prevent package manager from skipping devDependencies.
    // Always use pnpm for installation to avoid npm override conflicts.
    await pRetry(
      async () => {
        await runCommand('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
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

    // Read the installed package's devDependencies.
    const installedPkgJson = await readPackageJson(
      path.join(installedPath, 'package.json'),
    )
    const devDeps = installedPkgJson.devDependencies || {}

    // Add the package's devDependencies to our dummy package.json.
    if (Object.keys(devDeps).length > 0) {
      const dummyPkgJsonPath = path.join(packageTempDir, 'package.json')
      const dummyPkgJson = await readPackageJson(dummyPkgJsonPath)
      await writeJson(dummyPkgJsonPath, {
        ...dummyPkgJson,
        devDependencies: devDeps,
      })

      // Install devDependencies (test runners, etc.) along with dependencies.
      // Always use pnpm for installation to avoid npm override conflicts.
      writeProgress('👷')
      await runCommand('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
        cwd: packageTempDir,
        env: { ...process.env, ...PNPM_INSTALL_ENV },
      })
    }

    // Apply Socket overrides selectively.
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
        NODE_MODULES,
        '.pnpm',
        pnpmStoreDir,
        NODE_MODULES,
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
            !src.includes(NODE_MODULES) &&
            !src.endsWith('.DS_Store') &&
            !src.endsWith(PACKAGE_JSON),
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

    // Update package.json with Socket override fields.
    // We want: exports, main, module, types, files, sideEffects, socket
    //
    // Exports handling:
    // - If Socket override has exports, use them entirely (no merging)
    // - Cannot merge because mixing conditional exports (e.g., 'import', 'require')
    //   with subpath exports (e.g., '.', './package.json') creates invalid config
    // - See: https://nodejs.org/api/packages.html#conditional-exports
    // - See: https://nodejs.org/api/packages.html#subpath-exports
    originalPkgJson.update({
      // Override these specific fields from Socket package.
      ...(overridePkgJson.exports ? { exports: overridePkgJson.exports } : {}),
      ...(overridePkgJson.dependencies
        ? { dependencies: overridePkgJson.dependencies }
        : {}),
      ...(overridePkgJson.main ? { main: overridePkgJson.main } : {}),
      ...(overridePkgJson.module ? { module: overridePkgJson.module } : {}),
      ...(overridePkgJson.types ? { types: overridePkgJson.types } : {}),
      // Make the package private for testing.
      private: true,
    })

    // Clean up the test scripts.
    if (originalPkgJson.content.scripts) {
      // Remove pretest script to avoid lint checks.
      delete originalPkgJson.content.scripts.pretest
      delete originalPkgJson.content.scripts.posttest

      // Build cleaned scripts object.
      const cleanedScripts = { __proto__: null }
      for (const { 0: key, 1: value } of Object.entries(
        originalPkgJson.content.scripts,
      )) {
        if (key.startsWith('test')) {
          cleanedScripts[key] = cleanTestScript(value)
        } else {
          cleanedScripts[key] = value
        }
      }

      // Update scripts using .update().
      originalPkgJson.update({
        scripts: cleanedScripts,
      })
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

    // If Socket override has different dependencies, install them.
    // Always use pnpm for installation to avoid npm override conflicts.
    if (overridePkgJson.dependencies) {
      await runCommand('pnpm', ['install'], {
        cwd: installedPath,
        env: { ...process.env, ...PNPM_INSTALL_ENV },
      })
    }

    // Install all dependencies including devDependencies at the parent level.
    // Unset NODE_ENV and CI to prevent package manager from skipping devDependencies.
    // The hoisted install at parent level makes test runners available to nested package.
    // Always use pnpm for installation to avoid npm override conflicts.
    await runCommand('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
      cwd: packageTempDir,
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
      // Store extractPath if this was a GitHub tarball installation.
      // This allows us to validate that the extraction directory still exists
      // when checking the cache on subsequent runs.
      ...(modifiedPackagePath ? { extractPath: modifiedPackagePath } : {}),
    })

    // Note: We do NOT clean up the modifiedPackagePath (extraction directory) here.
    // The installed package's node_modules may contain package.json files with
    // file:// URLs pointing to this directory. Cleaning it would cause
    // "LINKED_PKG_DIR_NOT_FOUND" errors when the cache is restored on subsequent runs.
    // The extraction directory will remain in /tmp and be cleaned by OS temp cleanup.

    writeProgress(LOG_SYMBOLS.success)
    completePackage()
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: true,
      tempDir: packageTempDir,
    }
  } catch (error) {
    // Clean up temporary GitHub tarball extraction directory.
    if (modifiedPackagePath) {
      try {
        await safeRemove(modifiedPackagePath)
      } catch {
        // Ignore cleanup errors in error path.
      }
    }

    writeProgress(LOG_SYMBOLS.fail)
    completePackage()
    const errorDetails = [error.message]
    // Show last ERROR_OUTPUT_TRUNCATE_LENGTH chars of stderr (where actual errors appear).
    if (error.stderr) {
      const stderrText = error.stderr.slice(-ERROR_OUTPUT_TRUNCATE_LENGTH)
      errorDetails.push(
        `STDERR (last ${ERROR_OUTPUT_TRUNCATE_LENGTH} chars):`,
        stderrText,
      )
    }
    // Show last ERROR_OUTPUT_TRUNCATE_LENGTH chars of stdout.
    if (error.stdout) {
      const stdoutText = error.stdout.slice(-ERROR_OUTPUT_TRUNCATE_LENGTH)
      errorDetails.push(
        `STDOUT (last ${ERROR_OUTPUT_TRUNCATE_LENGTH} chars):`,
        stdoutText,
      )
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

  // Clean up any node_modules directories in Socket override packages.
  // These can be created by pnpm during local development (workspace linking),
  // and if they get into the cache, they cause installation failures in CI
  // because the symlink targets don't exist in the CI environment.
  // This cleanup ensures we start with a clean state before installation.
  const npmPackagesDir = constants.npmPackagesPath
  if (existsSync(npmPackagesDir)) {
    const entries = await fs.readdir(npmPackagesDir, { withFileTypes: true })
    const nodeModulesPaths = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const nodeModulesPath = path.join(
          npmPackagesDir,
          entry.name,
          NODE_MODULES,
        )
        if (existsSync(nodeModulesPath)) {
          nodeModulesPaths.push(nodeModulesPath)
        }
      }
    }

    if (nodeModulesPaths.length > 0) {
      logger.log(
        `Cleaning ${nodeModulesPaths.length} ${NODE_MODULES} from override packages`,
      )
      await safeRemove(nodeModulesPaths)
    }
  }

  // Note: We do NOT clean up old socket-test-extract-* directories here.
  // These directories may still be referenced by cached package installations
  // in ~/.socket-npm-test-cache/. Cleaning them would cause "LINKED_PKG_DIR_NOT_FOUND"
  // errors when pnpm tries to access dependencies with file:// URLs.
  // They are cleaned up after successful installation of each package.

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
  const updateInterval = ENV.CI
    ? PROGRESS_UPDATE_INTERVAL_CI
    : PROGRESS_UPDATE_INTERVAL_DEV
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
    ENV.CI ? PROGRESS_TIMER_INTERVAL_CI_MS : PROGRESS_TIMER_INTERVAL_DEV_MS,
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
