/**
 * @fileoverview File system utilities for safe operations.
 * Provides recoverable file deletion and other safe file system operations.
 *
 * Note: This module avoids importing from registry dist files (like ENV, pEach)
 * to prevent circular dependency issues during clean operations. Instead, it
 * implements minimal local versions of required functionality.
 */

import os from 'node:os'
import path from 'node:path'

import trashBin from 'trash'

import { remove } from '../../registry/dist/lib/fs.js'

// CI detection without registry dist dependency.
const IS_CI = Object.hasOwn(process.env, 'CI')

// Get system temp directory patterns for detection.
const TEMP_DIRS = [
  os.tmpdir(),
  process.env.TMPDIR,
  process.env.TEMP,
  process.env.TMP,
].filter(Boolean)

/**
 * Check if a path is within a temporary directory.
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
 * Remove files/directories using trash bin with safe fallback.
 * In CI environments, skips trash for performance and uses safe `remove` (del).
 * For temp directories, silently ignores failures since system cleanup will handle them.
 */
async function trash(paths, options) {
  const pathArray = Array.isArray(paths) ? paths : [paths]
  if (pathArray.length === 0) {
    return
  }

  const {
    force = true,
    recursive = true,
    spinner,
    ...otherOptions
  } = { __proto__: null, ...options }

  // In CI, skip trash for performance - use safe remove (del) directly.
  if (IS_CI) {
    for (const p of pathArray) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await remove(p, { force, recursive, ...otherOptions })
      } catch (rmError) {
        // Silently ignore failures for temp paths - system will clean them.
        if (!isTempPath(p) && spinner && rmError.code !== 'ENOENT') {
          spinner.warn(`Failed to remove ${p}: ${rmError.message}`)
        }
      }
    }
    return
  }

  // Non-CI: try trash bin first for safety.
  try {
    await trashBin(pathArray)
  } catch {
    // Trash failed, fallback to safe remove (del).
    for (const p of pathArray) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await remove(p, { force, recursive, ...otherOptions })
      } catch (rmError) {
        // Silently ignore failures for temp paths - system will clean them.
        if (!isTempPath(p) && spinner && rmError.code !== 'ENOENT') {
          spinner.warn(`Failed to remove ${p}: ${rmError.message}`)
        }
      }
    }
  }
}

export { trash }
