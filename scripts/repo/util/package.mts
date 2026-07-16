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
import { isErrnoException } from '@socketsecurity/lib-stable/errors/predicates'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { withSpinner } from '@socketsecurity/lib-stable/spinner/with'

import type {
  EditablePackageJson,
  PackageJson,
} from '@socketsecurity/lib-stable/packages/types'
import type { SpinnerInstance } from '@socketsecurity/lib-stable/spinner/types'

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
 */
export const editablePackageJsonCache = new Map<string, EditablePackageJson>()

/**
 * Clears the editable package.json cache.
 */
export function clearPackageJsonCache() {
  editablePackageJsonCache.clear()
}

export interface CollectPackageDataOptions {
  concurrency?: number | undefined
  fields?: string[] | undefined
}

export type PackageData = { path: string } & Record<string, unknown>

/**
 * Collects package.json data from multiple packages.
 */
export async function collectPackageData(
  paths: string[],
  options?: CollectPackageDataOptions | undefined,
): Promise<PackageData[]> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    fields = ['name', 'version', 'description'],
  } = { __proto__: null, ...options } as CollectPackageDataOptions

  const results: PackageData[] = []

  await pEach(
    paths,
    async pkgPath => {
      const pkgJson = await readPackageJson(pkgPath, { normalize: true })
      const data: PackageData = { path: pkgPath }

      for (let i = 0, { length } = fields; i < length; i += 1) {
        const field = fields[i]
        if (field !== undefined && pkgJson && field in pkgJson) {
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
export async function computeOverrideHash(
  overridePath: string,
): Promise<string> {
  try {
    const pkgJsonPath = path.join(overridePath, 'package.json')
    const pkgJson = await readPackageJson(pkgJsonPath)
    const depsString = JSON.stringify({
      dependencies: pkgJson?.dependencies || {},
      devDependencies: pkgJson?.devDependencies || {},
      version: pkgJson?.version,
    })
    return crypto.createHash('sha256').update(depsString, 'utf8').digest('hex')
  } catch {
    return ''
  }
}

/**
 * Copies Socket override files to a package directory.
 */
export interface CopySocketOverrideOptions {
  excludePackageJson?: boolean | undefined
}

export async function copySocketOverride(
  fromPath: string,
  toPath: string,
  options?: CopySocketOverrideOptions | undefined,
): Promise<void> {
  const opts = { __proto__: null, ...options } as CopySocketOverrideOptions
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
      isErrnoException(e) &&
      (e.code === 'ERR_FS_CP_EINVAL' ||
        e.message?.includes('Source and destination must not be the same'))
    ) {
      return
    }
    if (!isErrnoException(e) || e.code !== 'ENOENT') {
      throw e
    }
  }
}

export interface ProcessWithSpinnerOptions {
  concurrency?: number | undefined
  errorMessage?: string | undefined
  spinner?: SpinnerInstance | undefined
  startMessage?: string | undefined
  successMessage?: string | undefined
}

export interface ProcessWithSpinnerResult<T, R> {
  results: R[]
  errors: Array<{ item: T; error: unknown }>
}

/**
 * Common patterns for processing packages with spinner feedback.
 */
export async function processWithSpinner<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options?: ProcessWithSpinnerOptions | undefined,
): Promise<ProcessWithSpinnerResult<T, R>> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    errorMessage,
    spinner,
    startMessage,
    successMessage,
  } = { __proto__: null, ...options } as ProcessWithSpinnerOptions

  const results: R[] = []
  const errors: Array<{ item: T; error: unknown }> = []

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
export async function readCachedEditablePackageJson(
  pkgPath: string,
  options?: { preserve?: string[] | readonly string[] | undefined } | undefined,
): Promise<EditablePackageJson> {
  const cacheKey = pkgPath

  if (!editablePackageJsonCache.has(cacheKey)) {
    const editablePackageJson = (await readPackageJson(pkgPath, {
      ...options,
      editable: true,
      normalize: true,
    })) as unknown as EditablePackageJson
    editablePackageJsonCache.set(cacheKey, editablePackageJson)
  }

  // Non-null: the branch above always populates cacheKey before this return.
  return editablePackageJsonCache.get(cacheKey) as EditablePackageJson
}

/**
 * Resolves the real path of a file or directory, handling symlinks.
 */
export async function resolveRealPath(pathStr: string): Promise<string> {
  try {
    return await fs.realpath(pathStr)
  } catch {
    return path.resolve(pathStr)
  }
}

export interface PackageUpdate {
  path: string
  updates: Partial<PackageJson>
}

export interface UpdatePackagesJsonOptions {
  concurrency?: number | undefined
  spinner?: SpinnerInstance | undefined
}

/**
 * Updates multiple package.json files in parallel.
 */
export async function updatePackagesJson(
  packages: PackageUpdate[],
  options?: UpdatePackagesJsonOptions | undefined,
): Promise<void> {
  const { concurrency = DEFAULT_CONCURRENCY, spinner } = {
    __proto__: null,
    ...options,
  } as UpdatePackagesJsonOptions

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
