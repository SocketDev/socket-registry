/**
 * @fileoverview Helper utilities for platform-specific testing.
 * Provides cross-platform test helpers and assertions.
 */

import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { describe, it } from 'vitest'

/**
 * Platform detection utilities.
 */
export const platform = {
  isMac: process.platform === 'darwin',
  isUnix: process.platform !== 'win32',
  isWindows: process.platform === 'win32',
}

/**
 * Common path patterns for testing across platforms.
 */
export const platformPaths = {
  absolute: {
    posix: '/usr/local/bin',
    win32: 'C:\\Windows\\System32',
  },
  relative: {
    posix: './relative/path',
    win32: '.\\relative\\path',
  },
  withSpaces: {
    posix: '/path with spaces/to/file',
    win32: 'C:\\Program Files\\node',
  },
} as const

/**
 * Normalizes a path for cross-platform comparison.
 * Converts all separators to forward slashes and handles drive letters.
 */
export function normalizePath(inputPath: string): string {
  // Normalize separators to forward slashes
  let normalized = inputPath.replace(/\\/g, '/')

  // Handle Windows drive letters (C: -> /c)
  if (/^[A-Z]:/i.test(normalized)) {
    normalized = `/${normalized.charAt(0).toLowerCase()}${normalized.slice(2)}`
  }

  return normalized
}

/**
 * Asserts that two paths are equal after normalization.
 * Useful for cross-platform path comparisons.
 */
export function expectNormalizedPath(actual: string, expected: string): void {
  const normalizedActual = normalizePath(actual)
  const normalizedExpected = normalizePath(expected)

  if (normalizedActual !== normalizedExpected) {
    throw new Error(
      `Paths do not match after normalization:\n  Actual: ${normalizedActual}\n  Expected: ${normalizedExpected}`,
    )
  }
}

/**
 * Conditionally run tests only on Windows.
 */
export function describeOnWindows(name: string, fn: () => void): void {
  if (platform.isWindows) {
    describe(name, fn)
  } else {
    describe.skip(name, fn)
  }
}

/**
 * Conditionally run tests only on Unix-like systems (Linux/Mac).
 */
export function describeOnUnix(name: string, fn: () => void): void {
  if (platform.isUnix) {
    describe(name, fn)
  } else {
    describe.skip(name, fn)
  }
}

/**
 * Conditionally run a single test only on Windows.
 */
export function itOnWindows(
  name: string,
  fn: () => void | Promise<void>,
): void {
  if (platform.isWindows) {
    it(name, fn)
  } else {
    it.skip(name, fn)
  }
}

/**
 * Conditionally run a single test only on Unix-like systems.
 */
export function itOnUnix(name: string, fn: () => void | Promise<void>): void {
  if (platform.isUnix) {
    it(name, fn)
  } else {
    it.skip(name, fn)
  }
}

/**
 * Gets the appropriate path for the current platform.
 */
export function getPlatformPath(paths: {
  posix: string
  win32: string
}): string {
  return platform.isWindows ? paths.win32 : paths.posix
}

/**
 * Creates a path using the correct separator for the current platform.
 */
export function createPlatformPath(...parts: string[]): string {
  return path.join(...parts)
}

/**
 * Checks if a path would be considered absolute on the current platform.
 */
export function isPlatformAbsolute(testPath: string): boolean {
  return path.isAbsolute(testPath)
}

/**
 * Gets a temp directory path appropriate for the current platform.
 */
export function getPlatformTempDir(): string {
  return os.tmpdir()
}

// Map / Set / WeakMap / WeakSet / Symbol have been baseline since Node 4, so
// these aliases are unconditional on Node 18+. Kept as aliases so existing
// callers that express "this suite needs feature X" stay readable.
export const describeIfMap = describe
export const describeIfSet = describe
