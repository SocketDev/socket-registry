/**
 * @fileoverview Common utilities for working with package.json files.
 * Provides helper functions for reading, updating, and managing package.json
 * files across the project.
 */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { copy } from 'fs-extra'

import constants from '../constants.mjs'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '../../registry/dist/lib/packages.js'
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

// Additional pnpm install flags for CI-friendly behavior.
const PNPM_INSTALL_FLAGS = [
  ...PNPM_NPM_LIKE_FLAGS,
  // Prevent interactive prompts in CI environments.
  '--config.confirmModulesPurge=false',
  // Allow lockfile updates (required for test package installations).
  '--no-frozen-lockfile',
]

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

  if (spinner && startMessage) {
    spinner.start(startMessage)
  }

  const results = []
  const errors = []

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

  if (spinner) {
    if (errors.length > 0 && errorMessage) {
      spinner.errorAndStop(`${errorMessage}: ${errors.length} failed`)
    } else if (successMessage) {
      spinner.successAndStop(successMessage)
    } else {
      spinner.stop()
    }
  }

  return { results, errors }
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
 */
async function installPackageForTesting(socketPkgName) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)

  // Check if this package should be skipped.
  const skipTestsMap = constants.skipTestsByEcosystem
  const skipSet = skipTestsMap.get('npm')
  if (skipSet && (skipSet.has(socketPkgName) || skipSet.has(origPkgName))) {
    return {
      installed: false,
      reason: 'Skipped (known issues)',
    }
  }

  const overridePath = path.join(constants.npmPackagesPath, socketPkgName)

  if (!existsSync(overridePath)) {
    return {
      installed: false,
      reason: 'No Socket override found',
    }
  }

  try {
    // Read the test/npm/package.json to get the version spec.
    const testPkgJson = await readPackageJson(constants.testNpmPkgJsonPath, {
      normalize: true,
    })
    const versionSpec = testPkgJson.devDependencies?.[origPkgName]

    if (!versionSpec) {
      return {
        installed: false,
        reason: 'Not in devDependencies',
      }
    }

    // Create temp directory for this package.
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `socket-test-${socketPkgName}-`),
    )
    const packageTempDir = path.join(tempDir, socketPkgName)
    await fs.mkdir(packageTempDir, { recursive: true })

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
      : `${origPkgName}@${versionSpec}`

    await runCommand('pnpm', ['add', packageSpec, ...PNPM_NPM_LIKE_FLAGS], {
      cwd: packageTempDir,
    })

    // Copy Socket override files on top.
    const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)

    // Save original scripts before copying.
    const originalPkgJson = await readPackageJson(installedPath, {
      normalize: true,
    })
    const originalScripts = originalPkgJson.scripts

    await copy(overridePath, installedPath, {
      overwrite: true,
      dereference: true,
      filter: src =>
        !src.includes('node_modules') && !src.endsWith('.DS_Store'),
    })

    // Merge back the test scripts and devDependencies if they existed.
    const pkgJsonPath = path.join(installedPath, 'package.json')
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))

    // Preserve devDependencies from original.
    if (originalPkgJson.devDependencies) {
      pkgJson.devDependencies = originalPkgJson.devDependencies
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
      for (const [key, value] of Object.entries(originalScripts)) {
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
    await runCommand('pnpm', ['install', ...PNPM_INSTALL_FLAGS], {
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
  clearPackageJsonCache,
  collectPackageData,
  editablePackageJsonCache,
  installPackageForTesting,
  PNPM_INSTALL_FLAGS,
  PNPM_NPM_LIKE_FLAGS,
  processWithSpinner,
  readCachedEditablePackageJson,
  runCommand,
  updatePackagesJson,
}
