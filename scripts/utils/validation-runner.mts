/**
 * @fileoverview Base utility for validation scripts.
 * Provides common pattern for running validations and reporting results.
 */

import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib/logger'

interface RunValidationOptions {
  failureMessage?: string
  successMessage?: string
}

/**
 * Run a validation function and handle success/failure reporting.
 *
 * @throws {Error} When validation logic throws unexpectedly.
 */
export async function runValidation(
  validationFn: () => Promise<unknown> | unknown,
  options: RunValidationOptions = {},
): Promise<{ passed: boolean; result: unknown }> {
  const { failureMessage, successMessage } = {
    __proto__: null,
    ...options,
  } as RunValidationOptions

  const logger = getDefaultLogger()

  try {
    const result = await validationFn()

    // If validation returns falsy or empty violations array, it passed.
    const hasViolations = Array.isArray(result) ? !!result.length : !!result

    if (!hasViolations) {
      logger.success(successMessage || 'Validation passed')
      process.exitCode = 0
      return { passed: true, result }
    }

    logger.fail(failureMessage || 'Validation failed')
    process.exitCode = 1
    return { passed: false, result }
  } catch (e) {
    logger.fail(`Validation failed: ${(e as Error).message}`)
    process.exitCode = 1
    throw e
  }
}

/**
 * Main entry point wrapper for validation scripts.
 * Handles errors and ensures proper exit codes.
 */
export async function runValidationScript(
  validationFn: () => Promise<unknown> | unknown,
  options: RunValidationOptions = {},
): Promise<void> {
  try {
    await runValidation(validationFn, options)
  } catch (e) {
    const logger = getDefaultLogger()
    logger.fail(`Validation failed: ${(e as Error).message}`)
    process.exitCode = 1
  }
}
