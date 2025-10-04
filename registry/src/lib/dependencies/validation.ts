/** @fileoverview Validation dependency registry. */

export interface ValidateNpmPackageName {
  (
    name: string,
  ): {
    errors?: string[]
    validForNewPackages: boolean
    validForOldPackages: boolean
    warnings?: string[]
  }
}

export interface SpdxCorrect {
  (spdx: string): string | null
}

export interface SpdxExpressionParse {
  (
    spdx: string,
  ): {
    conjunction?: string
    left?: unknown
    license?: string
    right?: unknown
  }
}

interface ValidationDependencies {
  spdxCorrect: SpdxCorrect | undefined
  spdxExpressionParse: SpdxExpressionParse | undefined
  validateNpmPackageName: ValidateNpmPackageName | undefined
}

const dependencies: ValidationDependencies = {
  spdxCorrect: undefined,
  spdxExpressionParse: undefined,
  validateNpmPackageName: undefined,
}

/**
 * Get spdx-correct instance, lazily loading if not set.
 */
export function getSpdxCorrect(): SpdxCorrect {
  if (!dependencies.spdxCorrect) {
    dependencies.spdxCorrect = require('../../../external/spdx-correct')
  }
  return dependencies.spdxCorrect!
}

/**
 * Get spdx-expression-parse instance, lazily loading if not set.
 */
export function getSpdxExpressionParse(): SpdxExpressionParse {
  if (!dependencies.spdxExpressionParse) {
    dependencies.spdxExpressionParse = require('../../../external/spdx-expression-parse')
  }
  return dependencies.spdxExpressionParse!
}

/**
 * Get validate-npm-package-name instance, lazily loading if not set.
 */
export function getValidateNpmPackageName(): ValidateNpmPackageName {
  if (!dependencies.validateNpmPackageName) {
    dependencies.validateNpmPackageName = require('../../../external/validate-npm-package-name')
  }
  return dependencies.validateNpmPackageName!
}

/**
 * Set spdx-correct instance (useful for testing).
 */
export function setSpdxCorrect(spdxCorrect: SpdxCorrect): void {
  dependencies.spdxCorrect = spdxCorrect
}

/**
 * Set spdx-expression-parse instance (useful for testing).
 */
export function setSpdxExpressionParse(
  spdxExpressionParse: SpdxExpressionParse,
): void {
  dependencies.spdxExpressionParse = spdxExpressionParse
}

/**
 * Set validate-npm-package-name instance (useful for testing).
 */
export function setValidateNpmPackageName(
  validateNpmPackageName: ValidateNpmPackageName,
): void {
  dependencies.validateNpmPackageName = validateNpmPackageName
}

/**
 * Reset all validation dependencies to undefined (forces reload on next access).
 */
export function resetValidationDependencies(): void {
  dependencies.spdxCorrect = undefined
  dependencies.spdxExpressionParse = undefined
  dependencies.validateNpmPackageName = undefined
}
