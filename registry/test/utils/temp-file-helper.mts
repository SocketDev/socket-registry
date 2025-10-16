/**
 * @fileoverview Temporary file and directory utilities for tests.
 */

import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Creates a unique temporary directory for testing.
 * The directory is created in the system's temp directory with a unique name.
 */
export async function createTempDir(prefix: string): Promise<string> {
  const tempBaseDir = os.tmpdir()
  const tempDirName = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`
  const tempDir = path.join(tempBaseDir, tempDirName)

  await fs.mkdir(tempDir, { recursive: true })
  return tempDir
}

/**
 * Helper to create a temporary directory with automatic cleanup.
 * Returns an object with the temp directory path and cleanup function.
 */
export async function withTempDir(prefix: string): Promise<{
  cleanup: () => Promise<void>
  path: string
}> {
  const tempDir = await createTempDir(prefix)

  const cleanup = async () => {
    try {
      // Force delete temp directory outside CWD.
      await fs.rm(tempDir, { force: true, recursive: true })
    } catch {
      // Ignore cleanup errors.
    }
  }

  return { cleanup, path: tempDir }
}

/**
 * Helper to run a callback with a temporary directory that's automatically cleaned up.
 * Useful for tests that need a temp directory for the duration of a test case.
 */
export async function runWithTempDir(
  callback: (tempDir: string) => Promise<void>,
  prefix: string,
): Promise<void> {
  const { cleanup, path: tempDir } = await withTempDir(prefix)
  try {
    await callback(tempDir)
  } finally {
    await cleanup()
  }
}

/**
 * Helper to create a temporary file with content.
 */
export async function withTempFile(
  content: string,
  options: {
    extension?: string
    prefix?: string
  } = {},
): Promise<{
  cleanup: () => Promise<void>
  path: string
}> {
  const { extension = '.txt', prefix = 'temp-file-' } = options

  const tempBaseDir = os.tmpdir()
  const tempFileName = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`
  const tempFile = path.join(tempBaseDir, tempFileName)

  await fs.writeFile(tempFile, content, 'utf8')

  const cleanup = async () => {
    try {
      await fs.unlink(tempFile)
    } catch {
      // Ignore cleanup errors.
    }
  }

  return { cleanup, path: tempFile }
}
