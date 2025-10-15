/**
 * Process control: abort signals and UI utilities.
 */

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
let _spinner: unknown
export function getSpinner() {
  if (_spinner === undefined) {
    try {
      const { createSpinner } = require('../lib/spinner')
      _spinner = createSpinner()
    } catch {
      _spinner = null
    }
  }
  return _spinner
}
