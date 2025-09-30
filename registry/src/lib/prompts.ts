/**
 * @fileoverview User prompt utilities for interactive scripts.
 * Provides inquirer.js integration with spinner support and context handling.
 */

import abortSignalDefault from './constants/abort-signal'
import spinnerDefault from './constants/spinner'

const abortSignal = abortSignalDefault
const spinner = spinnerDefault

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

/**
 * Wrap an inquirer prompt with spinner handling and signal injection.
 */
/*@__NO_SIDE_EFFECTS__*/
export function wrapPrompt(
  inquirerPrompt: (...args: any[]) => Promise<any>,
): (...args: any[]) => Promise<any> {
  return async (...args) => {
    const origContext = args.length > 1 ? args[1] : undefined
    const { spinner: contextSpinner, ...contextWithoutSpinner } =
      origContext ?? {}
    const spinnerInstance =
      contextSpinner !== undefined ? contextSpinner : spinner
    const signal = abortSignal
    if (origContext) {
      args[1] = {
        signal,
        ...contextWithoutSpinner,
      }
    } else {
      args[1] = { signal }
    }
    const wasSpinning = !!spinnerInstance?.isSpinning
    spinnerInstance?.stop()
    let result
    try {
      result = await inquirerPrompt(...args)
    } catch (e) {
      if (e instanceof TypeError) {
        throw e
      }
    }
    if (wasSpinning) {
      spinnerInstance.start()
    }
    return typeof result === 'string' ? result.trim() : result
  }
}

// c8 ignore start - Third-party inquirer library requires and exports not testable in isolation.
const confirmExport = /*@__PURE__*/ require('../external/@inquirer/confirm')
const inputExport = /*@__PURE__*/ require('../external/@inquirer/input')
const passwordExport = /*@__PURE__*/ require('../external/@inquirer/password')
const searchExport = /*@__PURE__*/ require('../external/@inquirer/search')
const selectExport = /*@__PURE__*/ require('../external/@inquirer/select')
const confirmRaw = confirmExport.default ?? confirmExport
const inputRaw = inputExport.default ?? inputExport
const passwordRaw = passwordExport.default ?? passwordExport
const searchRaw = searchExport.default ?? searchExport
const selectRaw = selectExport.default ?? selectExport
const ActualSeparator = selectExport.Separator
// c8 ignore stop

export const confirm: typeof confirmRaw = wrapPrompt(confirmRaw)
export const input: typeof inputRaw = wrapPrompt(inputRaw)
export const password: typeof passwordRaw = wrapPrompt(passwordRaw)
export const search: typeof searchRaw = wrapPrompt(searchRaw)
export const select: typeof selectRaw = wrapPrompt(selectRaw)
export { ActualSeparator as Separator }
