/**
 * @fileoverview Common utilities for working with package.json files.
 * Provides helper functions for reading, updating, and managing package.json
 * files across the project.
 */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import constants from '../constants.mjs'
import WIN32 from '../../registry/dist/lib/constants/WIN32.js'
import { readPackageJson } from '../../registry/dist/lib/packages.js'
import { pEach } from '../../registry/dist/lib/promises.js'
import { spawn } from '../../registry/dist/lib/spawn.js'
import { cleanTestScript } from '../../test/utils/script-cleaning.mjs'
import { testRunners } from '../../test/utils/test-runners.mjs'

const { DEFAULT_CONCURRENCY } = constants

// Shared pnpm flags to make it behave like npm with hoisting.
const PNPM_NPM_LIKE_FLAGS = [
  '--config.shamefully-hoist=true',
  '--config.node-linker=hoisted',
  '--config.auto-install-peers=false',
  '--config.strict-peer-dependencies=false',
]

// Basic pnpm install flags for CI-friendly behavior.
const PNPM_INSTALL_BASE_FLAGS = [
  // Prevent interactive prompts in CI environments.
  '--config.confirmModulesPurge=false',
  // Allow lockfile updates (required for test package installations).
  '--no-frozen-lockfile',
]

// Pnpm install flags with hoisting for npm-like behavior.
const PNPM_HOISTED_INSTALL_FLAGS = [
  ...PNPM_NPM_LIKE_FLAGS,
  ...PNPM_INSTALL_BASE_FLAGS,
]

// Environment override to force pnpm to install devDependencies.
// By default, pnpm skips devDependencies when CI or NODE_ENV=production is detected.
const PNPM_INSTALL_ENV = { CI: undefined, NODE_ENV: undefined }

/**
 * Reads and caches editable package.json files to avoid redundant disk I/O.
 * @type {Map<string, any>}
 */
const editablePackageJsonCache = new Map()

/**
 * Reads an editable package.json with caching support.
 */
async function readCachedEditablePackageJson(pkgPath, options = {}) {
  const cacheKey = pkgPath

  if (!editablePackageJsonCache.has(cacheKey)) {
    const editablePackageJson = await readPackageJson(pkgPath, {
      ...options,
      editable: true,
      normalize: true,
    })
    editablePackageJsonCache.set(cacheKey, editablePackageJson)
  }

  return editablePackageJsonCache.get(cacheKey)
}

/**
 * Clears the editable package.json cache.
 */
function clearPackageJsonCache() {
  editablePackageJsonCache.clear()
}

/**
 * Updates multiple package.json files in parallel.
 */
async function updatePackagesJson(packages, options = {}) {
  const { concurrency = DEFAULT_CONCURRENCY, spinner } = options

  await pEach(
    packages,
    async ({ path: pkgPath, updates }) => {
      const editablePkgJson = await readCachedEditablePackageJson(pkgPath)
      editablePkgJson.update(updates)
      await editablePkgJson.save()

      if (spinner && updates.version) {
        spinner.log(`Updated ${pkgPath} to version ${updates.version}`)
      }
    },
    { concurrency },
  )
}

/**
 * Collects package.json data from multiple packages.
 */
async function collectPackageData(paths, options = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    fields = ['name', 'version', 'description'],
  } = options

  const results = []

  await pEach(
    paths,
    async pkgPath => {
      const pkgJson = await readPackageJson(pkgPath, { normalize: true })
      const data = { path: pkgPath }

      for (const field of fields) {
        if (field in pkgJson) {
          data[field] = pkgJson[field]
        }
      }

      results.push(data)
    },
    { concurrency },
  )

  return results
}

/**
 * Common patterns for processing packages with spinner feedback.
 */
async function processWithSpinner(items, processor, options = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    errorMessage,
    spinner,
    startMessage,
    successMessage,
  } = options

  const results = []
  const errors = []

  const processItems = async () => {
    await pEach(
      items,
      async item => {
        try {
          const result = await processor(item)
          results.push(result)
        } catch (error) {
          errors.push({ item, error })
        }
      },
      { concurrency },
    )
  }

  if (spinner && startMessage) {
    const { withSpinner } = await import('../../registry/dist/lib/spinner.js')
    await withSpinner({
      message: startMessage,
      operation: processItems,
      spinner,
    })

    if (errors.length > 0 && errorMessage) {
      spinner.error(`${errorMessage}: ${errors.length} failed`)
    } else if (successMessage) {
      spinner.success(successMessage)
    }
  } else {
    await processItems()
  }

  return { results, errors }
}

/**
 * Resolves the real path of a file or directory, handling symlinks.
 */
async function resolveRealPath(pathStr) {
  try {
    return await fs.realpath(pathStr)
  } catch {
    return path.resolve(pathStr)
  }
}

/**
 * Computes a hash of override package dependencies for cache validation.
 */
async function computeOverrideHash(overridePath) {
  try {
    const pkgJsonPath = path.join(overridePath, 'package.json')
    const pkgJson = await readPackageJson(pkgJsonPath)
    const depsString = JSON.stringify({
      dependencies: pkgJson.dependencies || {},
      devDependencies: pkgJson.devDependencies || {},
      version: pkgJson.version,
    })
    const crypto = await import('node:crypto')
    return crypto.createHash('sha256').update(depsString, 'utf8').digest('hex')
  } catch {
    return ''
  }
}

/**
 * Copies Socket override files to a package directory.
 */
async function copySocketOverride(fromPath, toPath, options) {
  const opts = { __proto__: null, ...options }
  const { excludePackageJson = true } = opts

  const realFromPath = await resolveRealPath(fromPath)
  const realToPath = await resolveRealPath(toPath)

  if (realFromPath === realToPath) {
    return
  }

  try {
    await fs.cp(fromPath, toPath, {
      dereference: true,
      errorOnExist: false,
      filter: src =>
        !src.includes('node_modules') &&
        !src.endsWith('.DS_Store') &&
        !(excludePackageJson && src.endsWith('package.json')),
      force: true,
      recursive: true,
      ...(WIN32 ? { maxRetries: 3, retryDelay: 100 } : {}),
    })
  } catch (e) {
    if (
      e.code === 'ERR_FS_CP_EINVAL' ||
      e.message?.includes('Source and destination must not be the same')
    ) {
      return
    }
    if (e.code !== 'ENOENT') {
      throw e
    }
  }
}

/**
 * Builds test environment with proper PATH for test runners.
 */
function buildTestEnv(packageTempDir, installedPath) {
  const packageBinPath = path.join(packageTempDir, 'node_modules', '.bin')
  const nestedBinPath = path.join(installedPath, 'node_modules', '.bin')
  const rootBinPath = path.join(constants.rootPath, 'node_modules', '.bin')
  return {
    ...process.env,
    PATH: `${nestedBinPath}${path.delimiter}${packageBinPath}${path.delimiter}${rootBinPath}${path.delimiter}${process.env.PATH}`,
  }
}

/**
 * Run a command with spawn.
 */
async function runCommand(command, args, options = {}) {
  try {
    const result = await spawn(command, args, {
      stdio: 'pipe',
      shell: process.platform.startsWith('win'),
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

/**
 * Install a package for testing in a temporary directory.
 *
 * @param {string} sourcePath - Absolute path to package source directory
 * @param {string} packageName - Package name for node_modules installation
 * @param {object} options - Installation options
 * @param {string} [options.versionSpec] - Version or URL to install (optional, for npm packages)
 * @returns {Promise<{installed: boolean, packagePath?: string, reason?: string}>}
 */
async function installPackageForTesting(sourcePath, packageName, options = {}) {
  const { versionSpec } = options

  if (!existsSync(sourcePath)) {
    return {
      installed: false,
      reason: `Source path does not exist: ${sourcePath}`,
    }
  }

  try {
    // Create temp directory for this package.
    const sanitizedName = packageName.replace(/[@/]/g, '-')
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `socket-test-${sanitizedName}-`),
    )
    const packageTempDir = path.join(tempDir, sanitizedName)
    await fs.mkdir(packageTempDir, { recursive: true })

    let installedPath
    let originalScripts
    let originalDevDependencies

    if (versionSpec) {
      // Installing from npm registry first, then copying source on top
      // Create minimal package.json in temp directory.
      await fs.writeFile(
        path.join(packageTempDir, 'package.json'),
        JSON.stringify(
          {
            name: 'test-temp',
            version: '1.0.0',
            private: true,
          },
          null,
          2,
        ),
      )

      // Install the package.
      const packageSpec = versionSpec.startsWith('https://')
        ? versionSpec
        : `${packageName}@${versionSpec}`

      await runCommand('pnpm', ['add', packageSpec, ...PNPM_NPM_LIKE_FLAGS], {
        cwd: packageTempDir,
      })

      installedPath = path.join(packageTempDir, 'node_modules', packageName)

      // Check if the installed path is a symlink to the source path.
      let realInstalledPath
      try {
        realInstalledPath = await fs.realpath(installedPath)
      } catch {
        realInstalledPath = path.resolve(installedPath)
      }

      let realSourcePath
      try {
        realSourcePath = await fs.realpath(sourcePath)
      } catch {
        realSourcePath = path.resolve(sourcePath)
      }

      // Skip if source and destination resolve to the same path.
      if (realSourcePath === realInstalledPath) {
        return {
          installed: false,
          reason: 'Package is already a Socket override (symlinked)',
        }
      }

      // Save original scripts and devDependencies before copying.
      const originalPkgJson = await readPackageJson(installedPath, {
        normalize: true,
      })
      originalScripts = originalPkgJson.scripts
      originalDevDependencies = originalPkgJson.devDependencies
    } else {
      // Just copying local package, no npm install
      const scopedPath = packageName.startsWith('@')
        ? path.join(packageTempDir, 'node_modules', packageName.split('/')[0])
        : path.join(packageTempDir, 'node_modules')

      await fs.mkdir(scopedPath, { recursive: true })
      installedPath = path.join(packageTempDir, 'node_modules', packageName)
    }

    // Copy source files to installedPath
    await fs.cp(sourcePath, installedPath, {
      force: true,
      recursive: true,
      dereference: true,
      errorOnExist: false,
      ...(WIN32 ? { retryDelay: 100, maxRetries: 3 } : {}),
      filter: src =>
        !src.includes('node_modules') && !src.endsWith('.DS_Store'),
    })

    // Merge back the test scripts and devDependencies if they existed.
    const pkgJsonPath = path.join(installedPath, 'package.json')
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))

    // Preserve devDependencies from original (only when we installed from npm).
    if (versionSpec && originalDevDependencies) {
      pkgJson.devDependencies = originalDevDependencies
    }

    // Preserve test scripts.
    if (originalScripts) {
      pkgJson.scripts = pkgJson.scripts || {}

      // Look for actual test runner in scripts.
      const additionalTestRunners = [...testRunners, 'test:stock', 'test:all']
      let actualTestScript = additionalTestRunners.find(
        runner => originalScripts[runner],
      )

      if (!actualTestScript && originalScripts.test) {
        // Try to extract the test runner from the test script.
        const testMatch = originalScripts.test.match(/npm run ([-:\w]+)/)
        if (testMatch && originalScripts[testMatch[1]]) {
          actualTestScript = testMatch[1]
        }
      }

      // Use the actual test script or cleaned version.
      if (actualTestScript && originalScripts[actualTestScript]) {
        pkgJson.scripts.test = cleanTestScript(
          originalScripts[actualTestScript],
        )
        // Also preserve the actual script if it's referenced.
        if (actualTestScript !== 'test') {
          pkgJson.scripts[actualTestScript] = cleanTestScript(
            originalScripts[actualTestScript],
          )
        }
      } else if (originalScripts.test) {
        // Fallback to simple test script if it exists.
        pkgJson.scripts.test = cleanTestScript(originalScripts.test)
      }

      // Preserve any test:* and tests-* scripts that might be referenced.
      for (const { 0: key, 1: value } of Object.entries(originalScripts)) {
        if (
          (key.startsWith('test:') || key.startsWith('tests')) &&
          !pkgJson.scripts[key]
        ) {
          pkgJson.scripts[key] = cleanTestScript(value)
        }
      }
    }

    await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))

    // Install dependencies with pnpm.
    await runCommand('pnpm', ['install', ...PNPM_HOISTED_INSTALL_FLAGS], {
      cwd: installedPath,
    })

    return {
      installed: true,
      packagePath: installedPath,
    }
  } catch (error) {
    return {
      installed: false,
      reason: error.message,
    }
  }
}

export {
  buildTestEnv,
  clearPackageJsonCache,
  collectPackageData,
  computeOverrideHash,
  copySocketOverride,
  editablePackageJsonCache,
  installPackageForTesting,
  PNPM_HOISTED_INSTALL_FLAGS,
  PNPM_INSTALL_BASE_FLAGS,
  PNPM_INSTALL_ENV,
  PNPM_NPM_LIKE_FLAGS,
  processWithSpinner,
  readCachedEditablePackageJson,
  resolveRealPath,
  runCommand,
  updatePackagesJson,
}
