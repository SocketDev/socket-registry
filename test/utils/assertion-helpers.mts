/**
 * @fileoverview Helper utilities for common test assertions.
 * Provides reusable assertion patterns for cleaner tests.
 */

/**
 * Asserts that a value is of a specific primitive type.
 *
 * @param value - The value to check.
 * @param expectedType - Expected type ('string', 'number', 'boolean', 'function', etc.).
 * @param message - Optional custom error message.
 *
 * @example
 * expectType(result, 'string')
 * expectType(callback, 'function', 'Callback must be a function')
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
 *
 * @param value - The value to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectString(result)
 * expectString(path, 'Path must be a string')
 */
export function expectString(value: unknown, message?: string): void {
  expectType(value, 'string', message)
}

/**
 * Asserts that a value is a number.
 *
 * @param value - The value to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectNumber(count)
 * expectNumber(age, 'Age must be a number')
 */
export function expectNumber(value: unknown, message?: string): void {
  expectType(value, 'number', message)
}

/**
 * Asserts that a value is a boolean.
 *
 * @param value - The value to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectBoolean(isValid)
 * expectBoolean(result, 'Result must be a boolean')
 */
export function expectBoolean(value: unknown, message?: string): void {
  expectType(value, 'boolean', message)
}

/**
 * Asserts that a value is a function.
 *
 * @param value - The value to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectFunction(callback)
 * expectFunction(handler, 'Handler must be a function')
 */
export function expectFunction(value: unknown, message?: string): void {
  expectType(value, 'function', message)
}

/**
 * Asserts that an object is frozen (Object.isFrozen).
 *
 * @param obj - The object to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectFrozen(constants)
 * expectFrozen(config, 'Config should be frozen')
 */
export function expectFrozen(obj: object, message?: string): void {
  if (!Object.isFrozen(obj)) {
    throw new Error(message ?? 'Expected object to be frozen')
  }
}

/**
 * Asserts that an object is not frozen.
 *
 * @param obj - The object to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectNotFrozen(mutableConfig)
 */
export function expectNotFrozen(obj: object, message?: string): void {
  if (Object.isFrozen(obj)) {
    throw new Error(message ?? 'Expected object not to be frozen')
  }
}

/**
 * Asserts that an object is sealed (Object.isSealed).
 *
 * @param obj - The object to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectSealed(options)
 */
export function expectSealed(obj: object, message?: string): void {
  if (!Object.isSealed(obj)) {
    throw new Error(message ?? 'Expected object to be sealed')
  }
}

/**
 * Asserts that a value is defined (not undefined).
 *
 * @param value - The value to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectDefined(result)
 * expectDefined(user.name, 'User name must be defined')
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
 *
 * @param value - The value to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectTruthy(result)
 * expectTruthy(isValid, 'Validation must pass')
 */
export function expectTruthy(value: unknown, message?: string): void {
  if (!value) {
    throw new Error(message ?? 'Expected value to be truthy')
  }
}

/**
 * Asserts that a value is falsy.
 *
 * @param value - The value to check.
 * @param message - Optional custom error message.
 *
 * @example
 * expectFalsy(result)
 * expectFalsy(error, 'Should not have error')
 */
export function expectFalsy(value: unknown, message?: string): void {
  if (value) {
    throw new Error(message ?? 'Expected value to be falsy')
  }
}

/**
 * Asserts that an array has a specific length.
 *
 * @param array - The array to check.
 * @param expectedLength - Expected array length.
 * @param message - Optional custom error message.
 *
 * @example
 * expectArrayLength(results, 5)
 * expectArrayLength(items, 0, 'Array should be empty')
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
 *
 * @param value - The value to check.
 * @param constructor - Expected constructor function.
 * @param message - Optional custom error message.
 *
 * @example
 * expectInstanceOf(error, Error)
 * expectInstanceOf(date, Date, 'Must be a Date instance')
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
 *
 * @param obj - The object to check.
 * @param property - Property name to check for.
 * @param message - Optional custom error message.
 *
 * @example
 * expectHasProperty(config, 'apiKey')
 * expectHasProperty(user, 'email', 'User must have email')
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
 *
 * @param obj - The object to check.
 * @param properties - Array of property names to check for.
 * @param message - Optional custom error message.
 *
 * @example
 * expectHasProperties(user, ['id', 'name', 'email'])
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
 *
 * @param value - The value to check.
 * @param pattern - Regular expression to match against.
 * @param message - Optional custom error message.
 *
 * @example
 * expectMatches(email, /^[\w.-]+@[\w.-]+\.\w+$/)
 * expectMatches(version, /^\d+\.\d+\.\d+$/, 'Invalid version format')
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
 *
 * @param actual - Actual value.
 * @param expected - Expected value.
 * @param message - Optional custom error message.
 *
 * @example
 * expectDeepEqual(result, { id: 1, name: 'test' })
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
 *
 * @param value - The numeric value to check.
 * @param min - Minimum value (inclusive).
 * @param max - Maximum value (inclusive).
 * @param message - Optional custom error message.
 *
 * @example
 * expectInRange(age, 0, 120)
 * expectInRange(percentage, 0, 100, 'Percentage must be 0-100')
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
