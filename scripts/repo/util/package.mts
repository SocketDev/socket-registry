/**
 * @file Common utilities for working with package.json files. Provides helper
 *   functions for reading, updating, and managing package.json files across the
 *   project. The temp-dir test-install harness (install flags, the installer,
 *   the capturing spawn) lives in package-test-install.mts and is re-exported
 *   here so existing import paths keep resolving.
 */

import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { WIN32 } from '@socketsecurity/lib-stable/constants/platform'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { withSpinner } from '@socketsecurity/lib-stable/spinner/with'

import { DEFAULT_CONCURRENCY } from '../../constants/core.mts'

export {
  buildTestEnv,
  installPackageForTesting,
  PNPM_HOISTED_INSTALL_FLAGS,
  PNPM_INSTALL_BASE_FLAGS,
  PNPM_INSTALL_ENV,
  PNPM_NPM_LIKE_FLAGS,
  spawnCapture,
} from './package-test-install.mts'

/**
 * Reads and caches editable package.json files to avoid redundant disk I/O.
 *
 * @type {Map<string, any>}
 */
export const editablePackageJsonCache = new Map()

/**
 * Clears the editable package.json cache.
 */
export function clearPackageJsonCache() {
  editablePackageJsonCache.clear()
}

/**
 * Collects package.json data from multiple packages.
 */
export async function collectPackageData(paths, options = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    fields = ['name', 'version', 'description'],
  } = { __proto__: null, ...options } as {
    concurrency?: number | undefined
    fields?: string[] | undefined
  }

  const results = []

  await pEach(
    paths,
    async pkgPath => {
      const pkgJson = await readPackageJson(pkgPath, { normalize: true })
      const data = { path: pkgPath }

      for (let i = 0, { length } = fields; i < length; i += 1) {
        const field = fields[i]
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
 * Computes a hash of override package dependencies for cache validation.
 */
export async function computeOverrideHash(overridePath) {
  try {
    const pkgJsonPath = path.join(overridePath, 'package.json')
    const pkgJson = await readPackageJson(pkgJsonPath)
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
 * Copies Socket override files to a package directory.
 */
export async function copySocketOverride(fromPath, toPath, options) {
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
 * Common patterns for processing packages with spinner feedback.
 */
export async function processWithSpinner(items, processor, options = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    errorMessage,
    spinner,
    startMessage,
    successMessage,
  } = { __proto__: null, ...options } as {
    concurrency?: number | undefined
    errorMessage?: string | undefined
    spinner?: unknown | undefined
    startMessage?: string | undefined
    successMessage?: string | undefined
  }

  const results = []
  const errors = []

  const processItems = async () => {
    await pEach(
      items,
      async item => {
        try {
          const result = await processor(item)
          results.push(result)
        } catch (e) {
          errors.push({ item, error: e })
        }
      },
      { concurrency },
    )
  }

  if (spinner && startMessage) {
    await withSpinner({
      message: startMessage,
      operation: processItems,
      spinner,
    })

    if (errors.length > 0 && errorMessage) {
      spinner.error(`${errorMessage}: ${errors.length} failed`)
      // Ensure spinner is fully cleared and we're on a fresh line
      process.stdout.write('\r\x1b[K')
    } else if (successMessage) {
      spinner.success(successMessage)
      // Ensure spinner is fully cleared and we're on a fresh line
      process.stdout.write('\r\x1b[K')
    }
  } else {
    await processItems()
  }

  return { results, errors }
}

/**
 * Reads an editable package.json with caching support.
 */
export async function readCachedEditablePackageJson(pkgPath, options = {}) {
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
 * Resolves the real path of a file or directory, handling symlinks.
 */
export async function resolveRealPath(pathStr) {
  try {
    return await fs.realpath(pathStr)
  } catch {
    return path.resolve(pathStr)
  }
}

/**
 * Updates multiple package.json files in parallel.
 */
export async function updatePackagesJson(packages, options = {}) {
  const { concurrency = DEFAULT_CONCURRENCY, spinner } = {
    __proto__: null,
    ...options,
  } as { concurrency?: number | undefined; spinner?: unknown | undefined }

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
