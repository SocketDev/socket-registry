/** @fileoverview Reset utilities for dependency management. */

import { resetBuildToolsDependencies } from './build-tools'
import { resetFileSystemDependencies } from './file-system'
import { resetLoggingDependencies } from './logging'
import { resetNpmToolsDependencies } from './npm-tools'
import { resetPromptsDependencies } from './prompts'
import { resetSystemDependencies } from './system'
import { resetValidationDependencies } from './validation'

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
