/**
 * @fileoverview Helper utilities for temporary file and directory management in tests.
 * Provides automatic cleanup and error handling for temp resources.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { deleteAsync as del } from 'del'

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
 *
 * @param prefix - Optional prefix for the temp directory name (default: 'test-').
 * @returns Object with temp directory path and cleanup function.
 *
 * @example
 * const { path: tmpDir, cleanup } = await withTempDir('my-test-')
 * try {
 *   // Use tmpDir...
 * } finally {
 *   await cleanup()
 * }
 *
 * @example
 * // With custom prefix matching existing patterns
 * const { path: testCacheDir, cleanup } = await withTempDir('cacache-test-')
 * try {
 *   testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))
 *   // ...test code...
 * } finally {
 *   await cleanup()
 * }
 */
export async function withTempDir(prefix = 'test-'): Promise<TempDirResult> {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), prefix))

  return {
    cleanup: async () => {
      // Force delete temp directory outside CWD.
      await del(tmpDir, { force: true })
    },
    path: tmpDir,
  }
}

/**
 * Creates a temporary directory synchronously with automatic cleanup.
 *
 * @param prefix - Optional prefix for the temp directory name (default: 'test-').
 * @returns Object with temp directory path and cleanup function.
 *
 * @example
 * const { path: tmpDir, cleanup } = withTempDirSync('my-test-')
 * try {
 *   // Use tmpDir...
 * } finally {
 *   cleanup()
 * }
 */
export function withTempDirSync(
  prefix = 'test-',
): Omit<TempDirResult, 'cleanup'> & { cleanup: () => void } {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), prefix))

  return {
    cleanup: () => {
      try {
        rmSync(tmpDir, { force: true, recursive: true })
      } catch {
        // Ignore cleanup errors
      }
    },
    path: tmpDir,
  }
}

/**
 * Creates a temporary file with content and automatic cleanup.
 *
 * @param content - File content (string or Buffer).
 * @param options - Optional configuration.
 * @param options.extension - File extension (default: '.txt').
 * @param options.prefix - Filename prefix (default: 'test-file-').
 * @returns Object with temp file path and cleanup function.
 *
 * @example
 * const { path: tmpFile, cleanup } = await withTempFile('test content')
 * try {
 *   // Use tmpFile...
 * } finally {
 *   await cleanup()
 * }
 *
 * @example
 * const { path: jsonFile, cleanup } = await withTempFile('{"key": "value"}', {
 *   extension: '.json',
 *   prefix: 'config-'
 * })
 */
export async function withTempFile(
  content: Buffer | string,
  options: { extension?: string; prefix?: string } = {},
): Promise<TempFileResult> {
  const { extension = '.txt', prefix = 'test-file-' } = options
  const tmpFile = path.join(os.tmpdir(), `${prefix}${Date.now()}${extension}`)

  writeFileSync(tmpFile, content)

  return {
    cleanup: async () => {
      try {
        await del(tmpFile, { force: true })
      } catch {
        // Ignore cleanup errors
      }
    },
    path: tmpFile,
  }
}

/**
 * Creates multiple temporary files with automatic cleanup.
 *
 * @param files - Array of file definitions with name and content.
 * @param baseDir - Optional base directory (defaults to os.tmpdir()).
 * @returns Object with temp directory path, file paths map, and cleanup function.
 *
 * @example
 * const { cleanup, dir, files } = await withTempFiles([
 *   { name: 'config.json', content: '{"key": "value"}' },
 *   { name: 'data.txt', content: 'test data' }
 * ])
 * try {
 *   console.log(files['config.json']) // Full path to config.json
 *   console.log(files['data.txt'])    // Full path to data.txt
 * } finally {
 *   await cleanup()
 * }
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

  for (const file of files) {
    const filePath = path.join(tmpDir, file.name)
    const fileDir = path.dirname(filePath)

    // Create subdirectories if needed
    if (fileDir !== tmpDir) {
      mkdirSync(fileDir, { recursive: true })
    }

    writeFileSync(filePath, file.content)
    filePaths[file.name] = filePath
  }

  return {
    cleanup: async () => {
      await del(tmpDir, { force: true })
    },
    dir: tmpDir,
    files: filePaths,
  }
}

/**
 * Executes a callback with a temporary directory, ensuring cleanup.
 *
 * @param callback - Function to execute with the temp directory path.
 * @param prefix - Optional prefix for the temp directory name (default: 'test-').
 * @returns The result of the callback.
 *
 * @example
 * await runWithTempDir(async (tmpDir) => {
 *   const file = path.join(tmpDir, 'test.txt')
 *   writeFileSync(file, 'content')
 *   // ...test code...
 * }, 'my-test-')
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
 *
 * @param content - File content (string or Buffer).
 * @param callback - Function to execute with the temp file path.
 * @param options - Optional configuration for temp file.
 * @returns The result of the callback.
 *
 * @example
 * await runWithTempFile('test content', async (tmpFile) => {
 *   const content = readFileSync(tmpFile, 'utf8')
 *   expect(content).toBe('test content')
 * })
 */
export async function runWithTempFile<T>(
  content: Buffer | string,
  callback: (tmpFile: string) => Promise<T> | T,
  options: { extension?: string; prefix?: string } = {},
): Promise<T> {
  const { cleanup, path: tmpFile } = await withTempFile(content, options)
  try {
    return await callback(tmpFile)
  } finally {
    await cleanup()
  }
}
