/**
 * @fileoverview Common utilities for working with package.json files.
 * Provides helper functions for reading, updating, and managing package.json
 * files across the project.
 */
'use strict'

import constants from '@socketregistry/scripts/constants'
import { readPackageJson } from '@socketsecurity/registry/lib/packages'
import { pEach } from '@socketsecurity/registry/lib/promises'

const { DEFAULT_CONCURRENCY } = constants

/**
 * Reads and caches editable package.json files to avoid redundant disk I/O.
 * @type {Map<string, any>}
 */
const editablePackageJsonCache = new Map()

/**
 * Reads an editable package.json with caching support.
 * @param {string} pkgPath - Path to the package directory
 * @param {Object} options - Read options
 * @returns {Promise<Object>} The editable package.json object
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
 * @param {Array<{path: string, updates: Object}>} packages - Array of packages to update
 * @param {Object} options - Options including concurrency and spinner
 * @returns {Promise<void>}
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
 * @param {Array<string>} paths - Paths to package directories
 * @param {Object} options - Options including fields to extract
 * @returns {Promise<Array<Object>>} Array of package data
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
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {Object} options - Options including concurrency and spinner
 * @returns {Promise<Array>} Results from processing
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

export {
  clearPackageJsonCache,
  collectPackageData,
  editablePackageJsonCache,
  processWithSpinner,
  readCachedEditablePackageJson,
  updatePackagesJson,
}
