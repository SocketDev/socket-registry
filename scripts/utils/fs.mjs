/**
 * @fileoverview File system utilities for safe operations.
 * Provides recoverable file deletion and other safe file system operations.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import trash from 'trash'
import constants from '../constants.mjs'
import ENV from '@socketsecurity/registry/lib/constants/env'
import { pEach } from '@socketsecurity/registry/lib/promises'

const { DEFAULT_CONCURRENCY } = constants

// Get system temp directory patterns for detection.
const TEMP_DIRS = [
  os.tmpdir(),
  process.env.TMPDIR,
  process.env.TEMP,
  process.env.TMP,
].filter(Boolean)

/**
 * Check if a path is within a temporary directory.
 * @param {string} targetPath - Path to check
 * @returns {boolean} True if path is in a temp directory
 */
function isTempPath(targetPath) {
  const resolved = path.resolve(targetPath)
  return TEMP_DIRS.some(tempDir => {
    if (!tempDir) {
      return false
    }
    const resolvedTempDir = path.resolve(tempDir)
    return (
      resolved.startsWith(resolvedTempDir + path.sep) ||
      resolved === resolvedTempDir
    )
  })
}

/**
 * Safely remove files/directories using trash, with fallback to fs.rm.
 * In CI environments, skips trash for performance. For temp directories,
 * silently ignores failures since system cleanup will handle them.
 *
 * @param {string|string[]} paths - Path(s) to remove
 * @param {object} options - Options for removal
 * @param {number} options.concurrency - Concurrency for fs.rm operations
 * @param {object} options.spinner - Spinner instance for warnings
 * @param {boolean} options.force - Force removal (default: true)
 * @param {boolean} options.recursive - Remove recursively (default: true)
 * @returns {Promise<void>}
 */
async function safeRemove(paths, options) {
  const pathArray = Array.isArray(paths) ? paths : [paths]
  if (pathArray.length === 0) {
    return
  }

  const {
    concurrency = DEFAULT_CONCURRENCY,
    force = true,
    recursive = true,
    spinner,
    ...otherOptions
  } = { __proto__: null, ...options }

  // In CI, skip trash for performance - go directly to fs.rm.
  if (ENV.CI) {
    await pEach(
      pathArray,
      async p => {
        try {
          await fs.rm(p, { force, recursive, ...otherOptions })
        } catch (rmError) {
          // Silently ignore failures for temp paths - system will clean them.
          if (!isTempPath(p) && spinner && rmError.code !== 'ENOENT') {
            spinner.warn(`Failed to remove ${p}: ${rmError.message}`)
          }
        }
      },
      { concurrency },
    )
    return
  }

  // Non-CI: try trash first for safety.
  try {
    await trash(pathArray)
  } catch {
    // Trash failed, fallback to fs.rm.
    await pEach(
      pathArray,
      async p => {
        try {
          await fs.rm(p, { force, recursive, ...otherOptions })
        } catch (rmError) {
          // Silently ignore failures for temp paths - system will clean them.
          if (!isTempPath(p) && spinner && rmError.code !== 'ENOENT') {
            spinner.warn(`Failed to remove ${p}: ${rmError.message}`)
          }
        }
      },
      { concurrency },
    )
  }
}

export { safeRemove }
