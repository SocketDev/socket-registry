/**
 * @fileoverview Helper for testing async and sync function pairs with shared test logic.
 *
 * Reduces duplication when testing functions that have both async and sync versions
 * (e.g., getChangedFiles/getChangedFilesSync, findUp/findUpSync).
 */

import { describe, it } from 'vitest'

/**
 * Test case configuration for async/sync testing.
 */
export interface AsyncSyncTestCase<TArgs extends unknown[], TResult> {
  /**
   * Test description (will be prefixed with "async:" or "sync:").
   */
  description: string

  /**
   * Test function that receives either the async or sync version of the function.
   * Should contain test assertions. Return Promise for async tests or void for sync.
   */
  test: (
    fn: (...args: TArgs) => TResult | Promise<TResult>,
  ) => Promise<void> | void

  /**
   * Skip this specific test case (optional).
   */
  skip?: boolean
}

/**
 * Creates test suites for both async and sync versions of a function.
 *
 * @param baseName - Base name for the describe blocks (e.g., "getChangedFiles")
 * @param asyncFn - The async version of the function
 * @param syncFn - The sync version of the function
 * @param testCases - Array of test cases to run for both versions
 *
 * @example
 * ```typescript
 * testAsyncAndSync(
 *   'getChangedFiles',
 *   getChangedFiles,
 *   getChangedFilesSync,
 *   [
 *     {
 *       description: 'should return empty array when no changes',
 *       test: async (fn) => {
 *         const files = await fn({ cache: false, cwd: tmpDir })
 *         expect(files).toEqual([])
 *       }
 *     },
 *     {
 *       description: 'should detect new files',
 *       test: async (fn) => {
 *         await fs.writeFile(path.join(tmpDir, 'new.txt'), 'content')
 *         const files = await fn({ cache: false, cwd: tmpDir })
 *         expect(files).toContain('new.txt')
 *       }
 *     }
 *   ]
 * )
 * ```
 */
export function testAsyncAndSync<TArgs extends unknown[], TResult>(
  baseName: string,
  asyncFn: (...args: TArgs) => Promise<TResult>,
  syncFn: (...args: TArgs) => TResult,
  testCases: Array<AsyncSyncTestCase<TArgs, TResult>>,
): void {
  // Async version tests.
  describe(baseName, () => {
    for (const { description, skip, test } of testCases) {
      const testFn = skip ? it.skip : it
      testFn(`async: ${description}`, async () => await test(asyncFn as any))
    }
  })

  // Sync version tests.
  describe(`${baseName}Sync`, () => {
    for (const { description, skip, test } of testCases) {
      const testFn = skip ? it.skip : it
      // Wrap sync test in async function for consistency.
      testFn(`sync: ${description}`, async () => {
        const result = test(syncFn as any)
        // If test returns a promise, await it.
        if (result instanceof Promise) {
          await result
        }
      })
    }
  })
}
