/**
 * @fileoverview Storage initialization and cleanup.
 * Manages storage directories and retention policies.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { deleteAsync as del } from 'del'

import {
  CLAUDE_HOME,
  REPO_STORAGE,
  RETENTION,
  STORAGE_PATHS,
} from './config.mjs'

/**
 * Clean up old data using del package.
 */
async function cleanupOldData() {
  const now = Date.now()

  // Clean old snapshots in current repo.
  try {
    const snapshots = await fs.readdir(REPO_STORAGE.snapshots)
    const toDelete = []
    for (const snap of snapshots) {
      const snapPath = path.join(REPO_STORAGE.snapshots, snap)
      const stats = await fs.stat(snapPath)
      if (now - stats.mtime.getTime() > RETENTION.snapshots) {
        toDelete.push(snapPath)
      }
    }
    if (toDelete.length > 0) {
      // Force delete temp directories outside CWD.
      await del(toDelete, { force: true })
    }
  } catch {
    // Ignore errors if directory doesn't exist.
  }

  // Clean old cache entries in ~/.claude/cache/.
  try {
    const cached = await fs.readdir(STORAGE_PATHS.cache)
    const toDelete = []
    for (const file of cached) {
      const filePath = path.join(STORAGE_PATHS.cache, file)
      const stats = await fs.stat(filePath)
      if (now - stats.mtime.getTime() > RETENTION.cache) {
        toDelete.push(filePath)
      }
    }
    if (toDelete.length > 0) {
      // Force delete temp directories outside CWD.
      await del(toDelete, { force: true })
    }
  } catch {
    // Ignore errors if directory doesn't exist.
  }
}

/**
 * Initialize storage directories.
 */
async function initStorage() {
  await fs.mkdir(CLAUDE_HOME, { recursive: true })
  await fs.mkdir(STORAGE_PATHS.cache, { recursive: true })
  await fs.mkdir(REPO_STORAGE.snapshots, { recursive: true })
  await fs.mkdir(REPO_STORAGE.scratch, { recursive: true })
}

export { cleanupOldData, initStorage }
