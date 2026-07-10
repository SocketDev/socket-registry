/**
 * @file Helper utilities for common test assertions. Provides reusable
 *   assertion patterns for cleaner tests.
 */

/**
 * Asserts that a loaded npm-override module has a valid shape: a truthy package
 * path and a module of the expected type (`function` by default, or `object`).
 */
export function expectValidPackageStructure(
  pkgPath: string,
  module: unknown,
  expectedType: 'function' | 'object' = 'function',
  message?: string,
): void {
  if (!pkgPath) {
    throw new Error(message ?? 'Expected package path to be truthy')
  }
  if (module === undefined) {
    throw new Error(message ?? 'Expected module to be defined')
  }
  if (typeof module !== expectedType) {
    throw new Error(
      message ??
        `Expected module to be ${expectedType} but got ${typeof module}`,
    )
  }
}
