/**
 * @fileoverview User prompt utilities for interactive scripts.
 * Provides inquirer.js integration with spinner support and context handling.
 */

import abortSignal from './constants/abort-signal'

// Type definitions

export interface Choice<Value = unknown> {
  value: Value
  disabled?: boolean | string | undefined
  description?: string | undefined
  name?: string | undefined
  short?: string | undefined
}

// Duplicated from @inquirer/type - InquirerContext
// This is the minimal context interface used by Inquirer prompts
interface InquirerContext {
  signal?: AbortSignal | undefined
  input?: NodeJS.ReadableStream | undefined
  output?: NodeJS.WritableStream | undefined
  clearPromptOnDone?: boolean | undefined
}

export type Context = import('./objects').Remap<
  InquirerContext & {
    spinner?: import('./spinner').Spinner | undefined
  }
>

// Duplicated from @inquirer/select - Separator
// A separator object used in select/checkbox prompts to create visual separators
// This type definition ensures the Separator type is available in published packages
declare class SeparatorType {
  readonly separator: string
  readonly type: 'separator'
  constructor(separator?: string)
}

export type Separator = SeparatorType

/*@__NO_SIDE_EFFECTS__*/
function wrapPrompt(
  inquirerPrompt: (...args: any[]) => Promise<any>,
): (...args: any[]) => Promise<any> {
  return async (...args) => {
    const origContext = args.length > 1 ? args[1] : undefined
    const {
      spinner = /*@__PURE__*/ require('./constants/spinner').default,
      ...contextWithoutSpinner
    } = origContext ?? {}
    const signal = abortSignal
    if (origContext) {
      args[1] = {
        signal,
        ...contextWithoutSpinner,
      }
    } else {
      args[1] = { signal }
    }
    const wasSpinning = !!spinner?.isSpinning
    spinner?.stop()
    let result
    try {
      result = await inquirerPrompt(...args)
    } catch (e) {
      if (e instanceof TypeError) {
        throw e
      }
    }
    if (wasSpinning) {
      spinner.start()
    }
    return typeof result === 'string' ? result.trim() : result
  }
}

// c8 ignore start - Third-party inquirer library integrations not testable in isolation.
const confirmRaw = /*@__PURE__*/ require('../external/@inquirer/confirm')
export const confirm: typeof confirmRaw = wrapPrompt(confirmRaw)
const inputRaw = /*@__PURE__*/ require('../external/@inquirer/input')
export const input: typeof inputRaw = wrapPrompt(inputRaw)
const passwordRaw = /*@__PURE__*/ require('../external/@inquirer/password')
export const password: typeof passwordRaw = wrapPrompt(passwordRaw)
const searchExport = /*@__PURE__*/ require('../external/@inquirer/search')
const selectExport = /*@__PURE__*/ require('../external/@inquirer/select')
const searchRaw = searchExport.default
const selectRaw = selectExport.default
// Re-export the actual Separator from @inquirer/select but typed with our local definition
const ActualSeparator = selectExport.Separator

export const search: typeof searchRaw = wrapPrompt(searchRaw)
export const select: typeof selectRaw = wrapPrompt(selectRaw)
// Export Separator is already defined as a class above, just re-export the actual implementation
export { ActualSeparator as Separator }
// c8 ignore stop
