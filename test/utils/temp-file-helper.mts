/**
 * @fileoverview Helper utilities for temporary file and directory management in tests.
 * Provides automatic cleanup and error handling for temp resources.
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { safeDelete, safeDeleteSync } from '@socketsecurity/lib/fs'

interface TempDirResult {
  cleanup: () => Promise<void>
  path: string
}

interface TempFileResult {
  cleanup: () => Promise<void>
  path: string
}

/**
 * Creates a temporary directory with automatic cleanup.
 */
export async function withTempDir(prefix = 'test-'): Promise<TempDirResult> {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), prefix))

  return {
    cleanup: async () => {
      // Force delete temp directory outside CWD.
      await safeDelete(tmpDir)
    },
    path: tmpDir,
  }
}

/**
 * Creates a temporary directory synchronously with automatic cleanup.
 */
export function withTempDirSync(
  prefix = 'test-',
): Omit<TempDirResult, 'cleanup'> & { cleanup: () => void } {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), prefix))

  return {
    cleanup: () => {
      safeDeleteSync(tmpDir)
    },
    path: tmpDir,
  }
}

/**
 * Creates a temporary file with content and automatic cleanup.
 */
export async function withTempFile(
  content: Buffer | string,
  options: { extension?: string; prefix?: string } = {},
): Promise<TempFileResult> {
  const { extension = '.txt', prefix = 'test-file-' } = {
    __proto__: null,
    ...options,
  } as { extension?: string; prefix?: string }
  const tmpFile = path.join(os.tmpdir(), `${prefix}${randomUUID()}${extension}`)

  writeFileSync(tmpFile, content)

  return {
    cleanup: async () => {
      await safeDelete(tmpFile)
    },
    path: tmpFile,
  }
}

/**
 * Creates multiple temporary files with automatic cleanup.
 */
export async function withTempFiles(
  files: Array<{ content: Buffer | string; name: string }>,
  baseDir?: string,
): Promise<{
  cleanup: () => Promise<void>
  dir: string
  files: Record<string, string>
}> {
  const tmpDir = baseDir ?? mkdtempSync(path.join(os.tmpdir(), 'test-files-'))

  // Ensure base directory exists
  if (baseDir) {
    mkdirSync(tmpDir, { recursive: true })
  }

  const filePaths: Record<string, string> = {}

  const tmpDirWithSep = tmpDir.endsWith(path.sep) ? tmpDir : tmpDir + path.sep
  for (const file of files) {
    const filePath = path.resolve(tmpDir, file.name)
    // Reject path traversal — file.name must resolve inside tmpDir.
    if (!filePath.startsWith(tmpDirWithSep) && filePath !== tmpDir) {
      throw new Error(
        `Rejected path traversal in withTempFiles: "${file.name}"`,
      )
    }
    const fileDir = path.dirname(filePath)

    // Create subdirectories if needed.
    if (fileDir !== tmpDir) {
      mkdirSync(fileDir, { recursive: true })
    }

    writeFileSync(filePath, file.content)
    filePaths[file.name] = filePath
  }

  return {
    cleanup: async () => {
      await safeDelete(tmpDir)
    },
    dir: tmpDir,
    files: filePaths,
  }
}

/**
 * Executes a callback with a temporary directory, ensuring cleanup.
 */
export async function runWithTempDir<T>(
  callback: (tmpDir: string) => Promise<T> | T,
  prefix = 'test-',
): Promise<T> {
  const { cleanup, path: tmpDir } = await withTempDir(prefix)
  try {
    return await callback(tmpDir)
  } finally {
    await cleanup()
  }
}

/**
 * Executes a callback with a temporary file, ensuring cleanup.
 */
export async function runWithTempFile<T>(
  content: Buffer | string,
  callback: (tmpFile: string) => Promise<T> | T,
  options: { extension?: string; prefix?: string } = {},
): Promise<T> {
  const normalizedOptions = { __proto__: null, ...options } as {
    extension?: string
    prefix?: string
  }
  const { cleanup, path: tmpFile } = await withTempFile(
    content,
    normalizedOptions,
  )
  try {
    return await callback(tmpFile)
  } finally {
    await cleanup()
  }
}
