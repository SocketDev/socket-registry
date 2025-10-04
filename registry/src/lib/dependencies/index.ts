/** @fileoverview Central dependency registry for all external dependencies. */

import { resetBuildToolsDependencies } from './build-tools'
import { resetFileSystemDependencies } from './file-system'
import { resetLoggingDependencies } from './logging'
import { resetNpmToolsDependencies } from './npm-tools'
import { resetPromptsDependencies } from './prompts'
import { resetSystemDependencies } from './system'
import { resetValidationDependencies } from './validation'

// Re-export all types and functions from sub-modules
export * from './build-tools'
export * from './file-system'
export * from './logging'
export * from './npm-tools'
export * from './prompts'
export * from './system'
export * from './validation'

/**
 * Reset all dependencies to undefined (forces reload on next access).
 * Useful for testing to ensure clean state between tests.
 */
export function resetDependencies(): void {
  resetBuildToolsDependencies()
  resetFileSystemDependencies()
  resetLoggingDependencies()
  resetNpmToolsDependencies()
  resetPromptsDependencies()
  resetSystemDependencies()
  resetValidationDependencies()
}
