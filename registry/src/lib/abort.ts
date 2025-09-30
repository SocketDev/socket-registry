/**
 * @fileoverview Abort utilities for signals and controllers.
 * Provides helpers for creating composite signals from multiple abort sources.
 */

/**
 * Create a composite AbortSignal that aborts when any of the input signals abort.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createCompositeAbortSignal(
  ...signals: Array<AbortSignal | null | undefined>
): AbortSignal {
  // Filter out null/undefined signals
  const validSignals = signals.filter(signal => signal != null)

  if (validSignals.length === 0) {
    // No valid signals, return a signal that never aborts
    return new AbortController().signal
  }

  if (validSignals.length === 1) {
    // Only one signal, return it directly
    return validSignals[0]!
  }

  // Check if any signal is already aborted
  const abortedSignal = validSignals.find(signal => signal.aborted)
  if (abortedSignal) {
    // If any signal is already aborted, return an already aborted signal
    const controller = new AbortController()
    controller.abort()
    return controller.signal
  }

  // Create composite signal that listens to all input signals
  const compositeController = new AbortController()
  const abortHandler = () => {
    if (!compositeController.signal.aborted) {
      compositeController.abort()
    }
  }

  // Add abort listeners to all valid signals
  for (const signal of validSignals) {
    signal.addEventListener('abort', abortHandler, { once: true })
  }

  return compositeController.signal
}

/**
 * Create an AbortSignal that aborts after a specified timeout.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createTimeoutSignal(timeout: number): AbortSignal {
  if (
    typeof timeout !== 'number' ||
    !Number.isFinite(timeout) ||
    timeout <= 0
  ) {
    throw new TypeError('timeout must be a positive number')
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return controller.signal
}
