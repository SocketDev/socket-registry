/**
 * @fileoverview Helper utilities for platform-specific testing.
 * Provides cross-platform test helpers and assertions.
 */

import path from 'node:path'

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
 *
 * @param inputPath - The path to normalize.
 * @returns Normalized path string.
 *
 * @example
 * expectNormalizedPath('C:\\Users\\test', '/c/Users/test')
 * expectNormalizedPath('/usr/local', '/usr/local')
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
 *
 * @param actual - The actual path.
 * @param expected - The expected path.
 *
 * @example
 * expectNormalizedPath('C:\\Users\\test', '/c/Users/test')
 * expectNormalizedPath('/usr/local/bin', '/usr/local/bin')
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
 *
 * @param name - Test suite name.
 * @param fn - Test suite function.
 *
 * @example
 * describeOnWindows('Windows-specific tests', () => {
 *   it('should handle drive letters', () => {
 *     // Only runs on Windows
 *   })
 * })
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
 *
 * @param name - Test suite name.
 * @param fn - Test suite function.
 *
 * @example
 * describeOnUnix('Unix-specific tests', () => {
 *   it('should handle symlinks', () => {
 *     // Only runs on Unix-like systems
 *   })
 * })
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
 *
 * @param name - Test name.
 * @param fn - Test function.
 *
 * @example
 * itOnWindows('should handle backslashes', () => {
 *   expect(normalizePath('C:\\test')).toBe('/c/test')
 * })
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
 *
 * @param name - Test name.
 * @param fn - Test function.
 *
 * @example
 * itOnUnix('should handle forward slashes', () => {
 *   expect(path.sep).toBe('/')
 * })
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
 *
 * @param paths - Object with posix and win32 path versions.
 * @returns The path for the current platform.
 *
 * @example
 * const absPath = getPlatformPath({
 *   posix: '/usr/local/bin',
 *   win32: 'C:\\Windows\\System32'
 * })
 */
export function getPlatformPath(paths: {
  posix: string
  win32: string
}): string {
  return platform.isWindows ? paths.win32 : paths.posix
}

/**
 * Creates a path using the correct separator for the current platform.
 *
 * @param parts - Path parts to join.
 * @returns Joined path with platform-appropriate separators.
 *
 * @example
 * const testPath = createPlatformPath('dir', 'subdir', 'file.txt')
 * // On Windows: 'dir\\subdir\\file.txt'
 * // On Unix: 'dir/subdir/file.txt'
 */
export function createPlatformPath(...parts: string[]): string {
  return path.join(...parts)
}

/**
 * Checks if a path would be considered absolute on the current platform.
 *
 * @param testPath - The path to check.
 * @returns true if the path is absolute on the current platform.
 *
 * @example
 * isPlatformAbsolute('/usr/local') // true on Unix, false on Windows
 * isPlatformAbsolute('C:\\Windows') // true on Windows, false on Unix
 */
export function isPlatformAbsolute(testPath: string): boolean {
  return path.isAbsolute(testPath)
}

/**
 * Gets a temp directory path appropriate for the current platform.
 *
 * @returns Platform-appropriate temp directory.
 *
 * @example
 * const tmpDir = getPlatformTempDir()
 * // On Windows: 'C:\\Users\\...\\AppData\\Local\\Temp'
 * // On Unix: '/tmp'
 */
export function getPlatformTempDir(): string {
  return process.platform === 'win32'
    ? (process.env['TEMP'] ?? process.env['TMP'] ?? 'C:\\Windows\\Temp')
    : (process.env['TMPDIR'] ?? '/tmp')
}

/**
 * JavaScript feature detection.
 * Checks for availability of built-in types and features.
 */
export const features = {
  hasMap: typeof Map === 'function',
  hasSet: typeof Set === 'function',
  hasSymbol: typeof Symbol === 'function',
  hasWeakMap: typeof WeakMap === 'function',
  hasWeakSet: typeof WeakSet === 'function',
} as const

/**
 * Conditionally run tests only when Map is available.
 *
 * @param name - Test name.
 * @param fn - Test function.
 *
 * @example
 * itIfMap('should work with Maps', () => {
 *   const map = new Map()
 *   map.set('key', 'value')
 *   expect(map.get('key')).toBe('value')
 * })
 */
export function itIfMap(name: string, fn: () => void | Promise<void>): void {
  if (features.hasMap) {
    it(name, fn)
  } else {
    it.skip(name, fn)
  }
}

/**
 * Conditionally run tests only when Set is available.
 *
 * @param name - Test name.
 * @param fn - Test function.
 *
 * @example
 * itIfSet('should work with Sets', () => {
 *   const set = new Set([1, 2, 3])
 *   expect(set.has(2)).toBe(true)
 * })
 */
export function itIfSet(name: string, fn: () => void | Promise<void>): void {
  if (features.hasSet) {
    it(name, fn)
  } else {
    it.skip(name, fn)
  }
}

/**
 * Conditionally run tests only when WeakMap is available.
 *
 * @param name - Test name.
 * @param fn - Test function.
 *
 * @example
 * itIfWeakMap('should work with WeakMaps', () => {
 *   const wm = new WeakMap()
 *   const key = {}
 *   wm.set(key, 'value')
 *   expect(wm.get(key)).toBe('value')
 * })
 */
export function itIfWeakMap(
  name: string,
  fn: () => void | Promise<void>,
): void {
  if (features.hasWeakMap) {
    it(name, fn)
  } else {
    it.skip(name, fn)
  }
}

/**
 * Conditionally run tests only when WeakSet is available.
 *
 * @param name - Test name.
 * @param fn - Test function.
 *
 * @example
 * itIfWeakSet('should work with WeakSets', () => {
 *   const ws = new WeakSet()
 *   const obj = {}
 *   ws.add(obj)
 *   expect(ws.has(obj)).toBe(true)
 * })
 */
export function itIfWeakSet(
  name: string,
  fn: () => void | Promise<void>,
): void {
  if (features.hasWeakSet) {
    it(name, fn)
  } else {
    it.skip(name, fn)
  }
}

/**
 * Conditionally run describe block only when Map is available.
 *
 * @param name - Test suite name.
 * @param fn - Test suite function.
 *
 * @example
 * describeIfMap('Map operations', () => {
 *   it('should create a map', () => {
 *     const map = new Map()
 *     expect(map).toBeDefined()
 *   })
 * })
 */
export function describeIfMap(name: string, fn: () => void): void {
  if (features.hasMap) {
    describe(name, fn)
  } else {
    describe.skip(name, fn)
  }
}

/**
 * Conditionally run describe block only when Set is available.
 *
 * @param name - Test suite name.
 * @param fn - Test suite function.
 *
 * @example
 * describeIfSet('Set operations', () => {
 *   it('should create a set', () => {
 *     const set = new Set()
 *     expect(set).toBeDefined()
 *   })
 * })
 */
export function describeIfSet(name: string, fn: () => void): void {
  if (features.hasSet) {
    describe(name, fn)
  } else {
    describe.skip(name, fn)
  }
}
