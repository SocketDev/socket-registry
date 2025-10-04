/** @fileoverview Download locking utilities to prevent concurrent downloads of the same resource. Uses file-based locking for cross-process synchronization. */

import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { httpDownload } from './http-request'

import type { HttpDownloadOptions, HttpDownloadResult } from './http-request'

export interface DownloadLockInfo {
  pid: number
  startTime: number
  url: string
}

export interface DownloadWithLockOptions extends HttpDownloadOptions {
  /**
   * Maximum time to wait for lock acquisition in milliseconds.
   * @default 60000 (1 minute)
   */
  lockTimeout?: number | undefined
  /**
   * Directory where lock files are stored.
   * @default '<destPath>.locks'
   */
  locksDir?: string | undefined
  /**
   * Interval for checking stale locks in milliseconds.
   * @default 1000 (1 second)
   */
  pollInterval?: number | undefined
  /**
   * Maximum age of a lock before it's considered stale in milliseconds.
   * @default 300000 (5 minutes)
   */
  staleTimeout?: number | undefined
}

/**
 * Get the path to the lock file for a destination path.
 */
function getLockFilePath(destPath: string, locksDir?: string): string {
  const dir = locksDir || `${dirname(destPath)}/.locks`
  const filename = `${destPath.replace(/[^\w.-]/g, '_')}.lock`
  return join(dir, filename)
}

/**
 * Check if a lock is stale (process no longer exists or too old).
 */
function isLockStale(
  lockInfo: DownloadLockInfo,
  staleTimeout: number,
): boolean {
  // Check if lock is too old
  const age = Date.now() - lockInfo.startTime
  if (age > staleTimeout) {
    return true
  }

  // Check if process still exists (Node.js specific)
  try {
    // process.kill(pid, 0) doesn't actually kill the process
    // It just checks if the process exists
    process.kill(lockInfo.pid, 0)
    return false
  } catch {
    // Process doesn't exist
    return true
  }
}

/**
 * Acquire a lock for downloading to a destination path.
 * @throws {Error} When lock cannot be acquired within timeout.
 */
async function acquireLock(
  destPath: string,
  url: string,
  options: {
    lockTimeout: number
    locksDir?: string | undefined
    pollInterval: number
    staleTimeout: number
  },
): Promise<string> {
  const { lockTimeout, locksDir, pollInterval, staleTimeout } = options
  const lockPath = getLockFilePath(destPath, locksDir)
  const lockDir = dirname(lockPath)

  // Ensure lock directory exists
  await mkdir(lockDir, { recursive: true })

  const startTime = Date.now()

  while (true) {
    try {
      // Try to read existing lock
      if (existsSync(lockPath)) {
        const lockContent = await readFile(lockPath, 'utf8')
        const lockInfo: DownloadLockInfo = JSON.parse(lockContent)

        // Check if lock is stale
        if (isLockStale(lockInfo, staleTimeout)) {
          // Remove stale lock
          await rm(lockPath, { force: true })
        } else {
          // Lock is valid, check timeout
          if (Date.now() - startTime > lockTimeout) {
            throw new Error(
              `Lock acquisition timed out after ${lockTimeout}ms (held by PID ${lockInfo.pid})`,
            )
          }

          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, pollInterval))
          continue
        }
      }

      // Try to create lock file
      const lockInfo: DownloadLockInfo = {
        pid: process.pid,
        startTime: Date.now(),
        url,
      }

      await writeFile(lockPath, JSON.stringify(lockInfo, null, 2), {
        // Use 'wx' flag to fail if file exists (atomic operation)
        flag: 'wx',
      })

      // Successfully acquired lock
      return lockPath
    } catch (error) {
      // If file already exists, another process created it first
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        if (Date.now() - startTime > lockTimeout) {
          throw new Error(`Lock acquisition timed out after ${lockTimeout}ms`)
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        continue
      }

      // Other error
      throw error
    }
  }
}

/**
 * Release a lock by removing the lock file.
 */
async function releaseLock(lockPath: string): Promise<void> {
  try {
    await rm(lockPath, { force: true })
  } catch {
    // Ignore errors when releasing lock
  }
}

/**
 * Download a file with locking to prevent concurrent downloads of the same resource.
 * If another process is already downloading to the same destination, this will wait
 * for the download to complete (up to lockTimeout) before proceeding.
 *
 * @throws {Error} When download fails or lock cannot be acquired.
 *
 * @example
 * ```typescript
 * const result = await downloadWithLock(
 *   'https://example.com/file.tar.gz',
 *   '/tmp/downloads/file.tar.gz',
 *   {
 *     retries: 3,
 *     lockTimeout: 60000, // Wait up to 1 minute for other downloads
 *   }
 * )
 * ```
 */
export async function downloadWithLock(
  url: string,
  destPath: string,
  options?: DownloadWithLockOptions | undefined,
): Promise<HttpDownloadResult> {
  const {
    lockTimeout = 60000,
    locksDir,
    pollInterval = 1000,
    staleTimeout = 300000,
    ...downloadOptions
  } = { __proto__: null, ...options } as DownloadWithLockOptions

  // If file already exists and has content, return immediately
  if (existsSync(destPath)) {
    const stat = await import('node:fs/promises').then(m =>
      m.stat(destPath).catch(() => null),
    )
    if (stat && stat.size > 0) {
      return {
        path: destPath,
        size: stat.size,
      }
    }
  }

  // Acquire lock
  const lockPath = await acquireLock(destPath, url, {
    lockTimeout,
    locksDir,
    pollInterval,
    staleTimeout,
  })

  try {
    // Check again if file was created while we were waiting for lock
    if (existsSync(destPath)) {
      const stat = await import('node:fs/promises').then(m =>
        m.stat(destPath).catch(() => null),
      )
      if (stat && stat.size > 0) {
        return {
          path: destPath,
          size: stat.size,
        }
      }
    }

    // Perform download
    const result = await httpDownload(url, destPath, downloadOptions)

    return result
  } finally {
    // Always release lock
    await releaseLock(lockPath)
  }
}
