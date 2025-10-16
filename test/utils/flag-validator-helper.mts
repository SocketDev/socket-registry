/**
 * @fileoverview Helper for testing flag validation functions.
 *
 * Reduces duplication when testing flag validators for package managers
 * (e.g., isNpmAuditFlag, isPnpmFrozenLockfileFlag).
 */

import { describe, expect, it } from 'vitest'

/**
 * Configuration for flag validator tests.
 */
export interface FlagValidatorConfig {
  /**
   * Name of the validator function (for test descriptions).
   */
  fnName: string

  /**
   * The flag validator function to test.
   */
  validatorFn: (flag: string) => boolean

  /**
   * Array of strings that should be recognized as valid flags.
   */
  validFlags: string[]

  /**
   * Array of strings that should be rejected as invalid flags.
   */
  invalidFlags: string[]

  /**
   * Skip all tests (optional).
   */
  skip?: boolean
}

/**
 * Common invalid flags that most validators should reject.
 */
export const commonInvalidFlags = [
  '--verbose',
  '--help',
  'install',
  'audit',
  '',
  'undefined',
  'null',
  '--',
  '-',
]

/**
 * Creates tests for a flag validator function.
 *
 * @param config - Configuration object for the flag validator tests
 *
 * @example
 * ```typescript
 * import { testFlagValidator, commonInvalidFlags } from '../utils/flag-validator-helper.mts'
 *
 * testFlagValidator({
 *   fnName: 'isNpmAuditFlag',
 *   validatorFn: isNpmAuditFlag,
 *   validFlags: ['--audit', '--no-audit', '--audit=true', '--audit=false'],
 *   invalidFlags: commonInvalidFlags
 * })
 * ```
 */
export function testFlagValidator(config: FlagValidatorConfig): void {
  const { fnName, invalidFlags, skip = false, validFlags, validatorFn } = config

  const describeFn = skip ? describe.skip : describe

  describeFn(fnName, () => {
    describe('valid flags', () => {
      for (const flag of validFlags) {
        it(`should identify ${flag}`, () => {
          expect(validatorFn(flag)).toBe(true)
        })
      }
    })

    describe('invalid flags', () => {
      for (const flag of invalidFlags) {
        it(`should reject ${flag}`, () => {
          expect(validatorFn(flag)).toBe(false)
        })
      }
    })
  })
}

/**
 * Creates tests for multiple related flag validators at once.
 *
 * @param configs - Array of flag validator configurations
 *
 * @example
 * ```typescript
 * testFlagValidators([
 *   {
 *     fnName: 'isNpmAuditFlag',
 *     validatorFn: isNpmAuditFlag,
 *     validFlags: ['--audit', '--no-audit'],
 *     invalidFlags: commonInvalidFlags
 *   },
 *   {
 *     fnName: 'isNpmFundFlag',
 *     validatorFn: isNpmFundFlag,
 *     validFlags: ['--fund', '--no-fund'],
 *     invalidFlags: commonInvalidFlags
 *   }
 * ])
 * ```
 */
export function testFlagValidators(configs: FlagValidatorConfig[]): void {
  for (const config of configs) {
    testFlagValidator(config)
  }
}
