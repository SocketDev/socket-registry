/**
 * @fileoverview Interactive prompt utilities for CLI applications.
 * Re-exports commonly used prompt functions from inquirer packages.
 */

export { default as confirm } from '@inquirer/confirm'
export { default as input } from '@inquirer/input'
export { default as password } from '@inquirer/password'
export { default as search } from '@inquirer/search'
export { default as select } from '@inquirer/select'

// Export types - Choice is a type interface, not a direct export
export interface Choice<Value = unknown> {
  value: Value
  name?: string
  description?: string
  short?: string
  disabled?: boolean | string
}

// Create a Separator type that matches the expected interface
export interface Separator {
  type: 'separator'
  separator?: string
  line?: string
}

/**
 * Create a separator for select prompts.
 */
export function createSeparator(text?: string): Separator {
  return {
    type: 'separator',
    separator: text || '───────',
    line: text || '───────',
  }
}
