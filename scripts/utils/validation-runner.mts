/**
 * @fileoverview Base utility for validation scripts.
 * Provides common pattern for running validations and reporting results.
 */

import { getDefaultLogger } from '@socketsecurity/lib/logger'
import process from 'node:process'

/**
 * Run a validation function and handle success/failure reporting.
 *
 * @throws {Error} When validation logic throws unexpectedly.
 */
export async function runValidation(validationFn, options = {}) {
  const {
    __proto__: _ = null,
    failureMessage,
    successMessage,
  } = {
    __proto__: null,
    ...options,
  }

  const logger = getDefaultLogger()

  try {
    const result = await validationFn()

    // If validation returns falsy or empty violations array, it passed.
    const hasViolations = Array.isArray(result)
      ? result.length > 0
      : Boolean(result)

    if (!hasViolations) {
      logger.success(successMessage || 'Validation passed')
      process.exitCode = 0
      return { passed: true, result }
    }

    logger.fail(failureMessage || 'Validation failed')
    process.exitCode = 1
    return { passed: false, result }
  } catch (e: unknown) {
    logger.fail(`Validation failed: ${e.message}`)
    process.exitCode = 1
    throw e
  }
}

/**
 * Main entry point wrapper for validation scripts.
 * Handles errors and ensures proper exit codes.
 */
export async function runValidationScript(validationFn, options = {}) {
  try {
    await runValidation(validationFn, options)
  } catch (e: unknown) {
    const logger = getDefaultLogger()
    logger.fail(`Validation failed: ${e}`)
    process.exitCode = 1
  }
}
