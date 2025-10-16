/**
 * Process control: abort signals and UI utilities.
 */

import type { Spinner } from '#lib/spinner'

// Abort controller and signal.
let _abortController: AbortController
export function getAbortController(): AbortController {
  if (_abortController === undefined) {
    _abortController = new AbortController()
  }
  return _abortController
}

export function getAbortSignal(): AbortSignal {
  return getAbortController().signal
}

// Spinner instance.
let _spinner: Spinner | null | undefined
export function getSpinner(): Spinner | null {
  if (_spinner === undefined) {
    try {
      const { Spinner: SpinnerFn } = require('../lib/spinner')
      _spinner = SpinnerFn() ?? null
    } catch {
      _spinner = null
    }
  }
  return _spinner ?? null
}
