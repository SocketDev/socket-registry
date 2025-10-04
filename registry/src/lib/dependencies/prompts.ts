/** @fileoverview Prompt dependency registry. */

export type InquirerConfirm = {
  default: unknown
  [key: string]: unknown
}

export type InquirerInput = {
  default: unknown
  [key: string]: unknown
}

export type InquirerPassword = {
  default: unknown
  [key: string]: unknown
}

export type InquirerSearch = {
  default: unknown
  [key: string]: unknown
}

export type InquirerSelect = {
  default: unknown
  Separator: unknown
  [key: string]: unknown
}

interface PromptsDependencies {
  inquirerConfirm: InquirerConfirm | undefined
  inquirerInput: InquirerInput | undefined
  inquirerPassword: InquirerPassword | undefined
  inquirerSearch: InquirerSearch | undefined
  inquirerSelect: InquirerSelect | undefined
}

const dependencies: PromptsDependencies = {
  inquirerConfirm: undefined,
  inquirerInput: undefined,
  inquirerPassword: undefined,
  inquirerSearch: undefined,
  inquirerSelect: undefined,
}

/**
 * Get inquirer confirm instance, lazily loading if not set.
 */
export function getInquirerConfirm(): InquirerConfirm {
  if (!dependencies.inquirerConfirm) {
    dependencies.inquirerConfirm = require('../../external/@inquirer/confirm')
  }
  return dependencies.inquirerConfirm!
}

/**
 * Get inquirer input instance, lazily loading if not set.
 */
export function getInquirerInput(): InquirerInput {
  if (!dependencies.inquirerInput) {
    dependencies.inquirerInput = require('../../external/@inquirer/input')
  }
  return dependencies.inquirerInput!
}

/**
 * Get inquirer password instance, lazily loading if not set.
 */
export function getInquirerPassword(): InquirerPassword {
  if (!dependencies.inquirerPassword) {
    dependencies.inquirerPassword = require('../../external/@inquirer/password')
  }
  return dependencies.inquirerPassword!
}

/**
 * Get inquirer search instance, lazily loading if not set.
 */
export function getInquirerSearch(): InquirerSearch {
  if (!dependencies.inquirerSearch) {
    dependencies.inquirerSearch = require('../../external/@inquirer/search')
  }
  return dependencies.inquirerSearch!
}

/**
 * Get inquirer select instance, lazily loading if not set.
 */
export function getInquirerSelect(): InquirerSelect {
  if (!dependencies.inquirerSelect) {
    dependencies.inquirerSelect = require('../../external/@inquirer/select')
  }
  return dependencies.inquirerSelect!
}

/**
 * Set inquirer confirm instance (useful for testing).
 */
export function setInquirerConfirm(inquirerConfirm: InquirerConfirm): void {
  dependencies.inquirerConfirm = inquirerConfirm
}

/**
 * Set inquirer input instance (useful for testing).
 */
export function setInquirerInput(inquirerInput: InquirerInput): void {
  dependencies.inquirerInput = inquirerInput
}

/**
 * Set inquirer password instance (useful for testing).
 */
export function setInquirerPassword(inquirerPassword: InquirerPassword): void {
  dependencies.inquirerPassword = inquirerPassword
}

/**
 * Set inquirer search instance (useful for testing).
 */
export function setInquirerSearch(inquirerSearch: InquirerSearch): void {
  dependencies.inquirerSearch = inquirerSearch
}

/**
 * Set inquirer select instance (useful for testing).
 */
export function setInquirerSelect(inquirerSelect: InquirerSelect): void {
  dependencies.inquirerSelect = inquirerSelect
}

/**
 * Reset all prompt dependencies to undefined (forces reload on next access).
 */
export function resetPromptsDependencies(): void {
  dependencies.inquirerConfirm = undefined
  dependencies.inquirerInput = undefined
  dependencies.inquirerPassword = undefined
  dependencies.inquirerSearch = undefined
  dependencies.inquirerSelect = undefined
}
