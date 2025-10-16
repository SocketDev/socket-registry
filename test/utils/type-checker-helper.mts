/**
 * @fileoverview Helper for testing type-checking functions (is-* packages).
 *
 * Reduces duplication when testing type-checking functions like isString, isDate, etc.
 * that follow the pattern of testing valid values (return true) and invalid values (return false).
 */

import { describe, expect, it } from 'vitest'

/**
 * Configuration for type-checker tests.
 */
export interface TypeCheckerTestConfig {
  /**
   * The type-checking function to test.
   */
  checkerFn: (value: unknown) => boolean

  /**
   * Human-readable type name (e.g., "String", "Date", "Boolean").
   */
  typeName: string

  /**
   * Array of values that should return true.
   */
  validValues: unknown[]

  /**
   * Array of values that should return false.
   */
  invalidValues: unknown[]

  /**
   * Whether to include @@toStringTag tests (optional, default: false).
   * Only applicable for types that support custom toStringTag.
   */
  toStringTagTests?: boolean

  /**
   * Skip all tests (optional).
   */
  skip?: boolean
}

/**
 * Standard set of invalid values for type checkers.
 * Covers common primitives and objects that should fail most type checks.
 */
export const standardInvalidValues = [
  undefined,
  null,
  false,
  true,
  0,
  42,
  '',
  'string',
  [],
  {},
  () => {},
  /regex/,
  new Date(),
  Symbol('test'),
]

/**
 * Creates comprehensive tests for a type-checking function.
 *
 * @param config - Configuration object for the type-checker tests
 *
 * @example
 * ```typescript
 * import { createTypeCheckerTests } from '../utils/type-checker-helper.mts'
 *
 * const { module: isString, ... } = await setupNpmPackageTest(import.meta.url)
 *
 * createTypeCheckerTests({
 *   checkerFn: isString,
 *   typeName: 'String',
 *   validValues: ['foo', Object('foo')],
 *   invalidValues: [undefined, null, 42, [], {}, new Date()],
 *   toStringTagTests: true
 * })
 * ```
 */
export function createTypeCheckerTests(config: TypeCheckerTestConfig): void {
  const {
    checkerFn,
    invalidValues,
    skip = false,
    toStringTagTests = false,
    typeName,
    validValues,
  } = config

  const describeFn = skip ? describe.skip : describe

  describeFn(`${typeName} type checker`, () => {
    // Test invalid values.
    describe(`not ${typeName}s`, () => {
      for (const value of invalidValues) {
        it(`should return false for ${String(value)}`, () => {
          expect(checkerFn(value)).toBe(false)
        })
      }
    })

    // Test @@toStringTag spoofing if requested.
    if (toStringTagTests) {
      const hasToStringTag = Symbol?.toStringTag
      describe('@@toStringTag', { skip: !hasToStringTag }, () => {
        it('should not be fooled by toStringTag', () => {
          const faker = {
            [Symbol.toStringTag]: typeName,
          }
          expect(checkerFn(faker)).toBe(false)
        })
      })
    }

    // Test valid values.
    describe(`${typeName}s`, () => {
      for (const value of validValues) {
        const valueDesc =
          typeof value === 'object' && value !== null
            ? `${value.constructor?.name || 'Object'} instance`
            : String(value)

        it(`should return true for ${valueDesc}`, () => {
          expect(checkerFn(value)).toBe(true)
        })
      }
    })
  })
}

/**
 * Helper to create common invalid value sets excluding specific types.
 *
 * @param exclude - Types to exclude from the standard invalid values
 * @returns Array of invalid values
 *
 * @example
 * ```typescript
 * // Get all invalid values except strings
 * const invalidValues = createInvalidValuesExcluding(['string'])
 * ```
 */
export function createInvalidValuesExcluding(
  exclude: Array<
    | 'undefined'
    | 'null'
    | 'boolean'
    | 'number'
    | 'string'
    | 'array'
    | 'object'
    | 'function'
    | 'regexp'
    | 'date'
    | 'symbol'
  >,
): unknown[] {
  const exclusionSet = new Set(exclude)
  const values: unknown[] = []

  if (!exclusionSet.has('undefined')) {
    values.push(undefined)
  }
  if (!exclusionSet.has('null')) {
    values.push(null)
  }
  if (!exclusionSet.has('boolean')) {
    values.push(false, true)
  }
  if (!exclusionSet.has('number')) {
    values.push(0, 42, -1, 3.14, Number.NaN, Number.POSITIVE_INFINITY)
  }
  if (!exclusionSet.has('string')) {
    values.push('', 'string', 'test')
  }
  if (!exclusionSet.has('array')) {
    values.push([], [1, 2, 3])
  }
  if (!exclusionSet.has('object')) {
    values.push({}, { key: 'value' })
  }
  if (!exclusionSet.has('function')) {
    values.push(
      () => {},
      function () {},
      async () => {},
    )
  }
  if (!exclusionSet.has('regexp')) {
    values.push(/regex/, /test/)
  }
  if (!exclusionSet.has('date')) {
    values.push(new Date())
  }
  if (!exclusionSet.has('symbol') && typeof Symbol !== 'undefined') {
    values.push(Symbol('test'))
  }

  return values
}
