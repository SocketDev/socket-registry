/**
 * @fileoverview Helper utilities for common test assertions.
 * Provides reusable assertion patterns for cleaner tests.
 */

/**
 * Asserts that a value is of a specific primitive type.
 */
export function expectType(
  value: unknown,
  expectedType: string,
  message?: string,
): void {
  const actualType = typeof value
  if (actualType !== expectedType) {
    throw new Error(
      message ?? `Expected type ${expectedType} but got ${actualType}`,
    )
  }
}

/**
 * Asserts that a value is a string.
 */
export function expectString(value: unknown, message?: string): void {
  expectType(value, 'string', message)
}

/**
 * Asserts that a value is a number.
 */
export function expectNumber(value: unknown, message?: string): void {
  expectType(value, 'number', message)
}

/**
 * Asserts that a value is a boolean.
 */
export function expectBoolean(value: unknown, message?: string): void {
  expectType(value, 'boolean', message)
}

/**
 * Asserts that a value is a function.
 */
export function expectFunction(value: unknown, message?: string): void {
  expectType(value, 'function', message)
}

/**
 * Asserts that an object is frozen (Object.isFrozen).
 */
export function expectFrozen(obj: object, message?: string): void {
  if (!Object.isFrozen(obj)) {
    throw new Error(message ?? 'Expected object to be frozen')
  }
}

/**
 * Asserts that an object is not frozen.
 */
export function expectNotFrozen(obj: object, message?: string): void {
  if (Object.isFrozen(obj)) {
    throw new Error(message ?? 'Expected object not to be frozen')
  }
}

/**
 * Asserts that an object is sealed (Object.isSealed).
 */
export function expectSealed(obj: object, message?: string): void {
  if (!Object.isSealed(obj)) {
    throw new Error(message ?? 'Expected object to be sealed')
  }
}

/**
 * Asserts that a value is defined (not undefined).
 */
export function expectDefined<T>(
  value: T,
  message?: string,
): asserts value is NonNullable<T> {
  if (value === undefined) {
    throw new Error(message ?? 'Expected value to be defined')
  }
}

/**
 * Asserts that a value is truthy.
 */
export function expectTruthy(value: unknown, message?: string): void {
  if (!value) {
    throw new Error(message ?? 'Expected value to be truthy')
  }
}

/**
 * Asserts that a value is falsy.
 */
export function expectFalsy(value: unknown, message?: string): void {
  if (value) {
    throw new Error(message ?? 'Expected value to be falsy')
  }
}

/**
 * Asserts that an array has a specific length.
 */
export function expectArrayLength(
  array: unknown[],
  expectedLength: number,
  message?: string,
): void {
  if (array.length !== expectedLength) {
    throw new Error(
      message ??
        `Expected array length ${expectedLength} but got ${array.length}`,
    )
  }
}

/**
 * Asserts that a value is an instance of a specific class/constructor.
 */
export function expectInstanceOf<T>(
  value: unknown,
  constructor: new (...args: any[]) => T,
  message?: string,
): asserts value is T {
  if (!(value instanceof constructor)) {
    throw new Error(
      message ??
        `Expected instance of ${constructor.name} but got ${typeof value}`,
    )
  }
}

/**
 * Asserts that an object has a specific property.
 */
export function expectHasProperty<T extends object>(
  obj: T,
  property: PropertyKey,
  message?: string,
): void {
  if (!Object.hasOwn(obj, property)) {
    throw new Error(
      message ?? `Expected object to have property '${String(property)}'`,
    )
  }
}

/**
 * Asserts that an object has all specified properties.
 */
export function expectHasProperties<T extends object>(
  obj: T,
  properties: PropertyKey[],
  message?: string,
): void {
  const missingProperties = properties.filter(prop => !Object.hasOwn(obj, prop))

  if (missingProperties.length > 0) {
    throw new Error(
      message ??
        `Expected object to have properties: ${missingProperties.map(String).join(', ')}`,
    )
  }
}

/**
 * Asserts that a value matches a regular expression.
 */
export function expectMatches(
  value: string,
  pattern: RegExp,
  message?: string,
): void {
  if (!pattern.test(value)) {
    throw new Error(
      message ?? `Expected '${value}' to match pattern ${pattern}`,
    )
  }
}

/**
 * Asserts that two values are deeply equal.
 */
export function expectDeepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)

  if (actualStr !== expectedStr) {
    throw new Error(
      message ??
        `Expected values to be deeply equal:\n  Actual: ${actualStr}\n  Expected: ${expectedStr}`,
    )
  }
}

/**
 * Asserts that a value is within a numeric range (inclusive).
 */
export function expectInRange(
  value: number,
  max: number,
  min: number,
  message?: string,
): void {
  if (value < min || value > max) {
    throw new Error(
      message ?? `Expected ${value} to be between ${min} and ${max}`,
    )
  }
}

/**
 * Asserts that a package has valid structure with path and module definition.
 * Common pattern for testing NPM package overrides.
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
