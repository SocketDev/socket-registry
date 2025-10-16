/**
 * @fileoverview Helper for testing error handling and exceptions.
 *
 * Reduces boilerplate when testing that functions throw expected errors.
 */

import { expect } from 'vitest'

/**
 * Asserts that an async function throws an error.
 *
 * @param fn - Async function that should throw
 * @param errorMatcher - Optional regex or string to match against error message
 * @throws {Error} If the function does not throw
 *
 * @example
 * ```typescript
 * await expectToThrow(
 *   () => execNpm(['nonexistentcommand']),
 *   /command not found/
 * )
 * ```
 */
export async function expectToThrow(
  fn: () => Promise<unknown>,
  errorMatcher?: RegExp | string,
): Promise<void> {
  let thrown = false

  try {
    await fn()
  } catch (error) {
    thrown = true

    if (errorMatcher) {
      const message = error instanceof Error ? error.message : String(error)
      if (errorMatcher instanceof RegExp) {
        expect(message).toMatch(errorMatcher)
      } else {
        expect(message).toContain(errorMatcher)
      }
    } else {
      expect(error).toBeDefined()
    }
  }

  if (!thrown) {
    throw new Error('Expected function to throw but it did not')
  }
}

/**
 * Asserts that a sync function throws an error.
 *
 * @param fn - Sync function that should throw
 * @param errorMatcher - Optional regex or string to match against error message
 * @throws {Error} If the function does not throw
 *
 * @example
 * ```typescript
 * expectToThrowSync(
 *   () => parseJson('invalid json'),
 *   /Unexpected token/
 * )
 * ```
 */
export function expectToThrowSync(
  fn: () => unknown,
  errorMatcher?: RegExp | string,
): void {
  let thrown = false

  try {
    fn()
  } catch (error) {
    thrown = true

    if (errorMatcher) {
      const message = error instanceof Error ? error.message : String(error)
      if (errorMatcher instanceof RegExp) {
        expect(message).toMatch(errorMatcher)
      } else {
        expect(message).toContain(errorMatcher)
      }
    } else {
      expect(error).toBeDefined()
    }
  }

  if (!thrown) {
    throw new Error('Expected function to throw but it did not')
  }
}

/**
 * Asserts that a function throws a specific error type.
 *
 * @param fn - Function that should throw
 * @param errorType - Constructor of the expected error type
 * @param errorMatcher - Optional regex or string to match against error message
 * @throws {Error} If the function does not throw or throws wrong error type
 *
 * @example
 * ```typescript
 * await expectToThrowType(
 *   () => validateInput(null),
 *   TypeError,
 *   'Input cannot be null'
 * )
 * ```
 */
export async function expectToThrowType<T extends Error>(
  fn: () => Promise<unknown> | unknown,
  errorType: new (...args: any[]) => T,
  errorMatcher?: RegExp | string,
): Promise<void> {
  let thrown = false

  try {
    const result = fn()
    if (result instanceof Promise) {
      await result
    }
  } catch (error) {
    thrown = true

    expect(error).toBeInstanceOf(errorType)

    if (errorMatcher) {
      const message = error instanceof Error ? error.message : String(error)
      if (errorMatcher instanceof RegExp) {
        expect(message).toMatch(errorMatcher)
      } else {
        expect(message).toContain(errorMatcher)
      }
    }
  }

  if (!thrown) {
    throw new Error(
      `Expected function to throw ${errorType.name} but it did not throw`,
    )
  }
}

/**
 * Asserts that a function does NOT throw.
 *
 * @param fn - Function that should not throw
 * @throws {Error} If the function throws
 *
 * @example
 * ```typescript
 * await expectNotToThrow(() => validateInput('valid'))
 * ```
 */
export async function expectNotToThrow(
  fn: () => Promise<unknown> | unknown,
): Promise<void> {
  try {
    const result = fn()
    if (result instanceof Promise) {
      await result
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Expected function not to throw but it threw: ${message}`)
  }
}
