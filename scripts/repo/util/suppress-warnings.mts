/**
 * @file Utility to suppress specific process warnings.
 */

import process from 'node:process'

const { apply: ReflectApply } = Reflect

type EmitWarning = typeof process.emitWarning

// Store the original emitWarning function to avoid repeat wrapping.
let originalEmitWarning: EmitWarning | undefined

// Track which warning types are currently suppressed.
const suppressedWarnings = new Set<string>()

/**
 * Internal function to set up warning suppression. Only wraps
 * process.emitWarning once, regardless of how many times it's called.
 */
export function setupSuppression() {
  // Only wrap once - store the original on first call.
  if (!originalEmitWarning) {
    const original = process.emitWarning
    originalEmitWarning = original
    process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
      // Check both string warnings and warning objects.
      if (typeof warning === 'string') {
        // `suppressedWarnings` is a Set — iterate with for...of
        // since the body only needs each element, not an index.
        for (const suppressedType of suppressedWarnings) {
          if (warning.includes(suppressedType)) {
            return
          }
        }
      } else if (warning && typeof warning === 'object') {
        const warningName = warning.name
        if (warningName && suppressedWarnings.has(warningName)) {
          return
        }
      }
      // Not suppressed - call the original function.
      return ReflectApply(original, process, [warning, ...args])
    }) as EmitWarning
  }
}

/**
 * Restore the original process.emitWarning function. Call this to re-enable all
 * warnings after suppressing them.
 */
export function restoreWarnings() {
  if (originalEmitWarning) {
    process.emitWarning = originalEmitWarning
    originalEmitWarning = undefined
    suppressedWarnings.clear()
  }
}

/**
 * Set max listeners on an EventTarget (like AbortSignal) to avoid TypeError.
 *
 * By manually setting `kMaxEventTargetListeners` on the target we avoid:
 * TypeError [ERR_INVALID_ARG_TYPE]: The "emitter" argument must be an instance
 * of EventEmitter or EventTarget. Received an instance of AbortSignal.
 *
 * In some patch releases of Node 18-23 when calling events.getMaxListeners().
 * See https://github.com/nodejs/node/pull/56807.
 *
 * Instead of calling events.setMaxListeners(n, target) we set the symbol
 * property directly to avoid depending on 'node:events' module.
 */
export function setMaxEventTargetListeners(target: object, maxListeners = 10) {
  const symbols = Object.getOwnPropertySymbols(target)
  const kMaxEventTargetListeners = symbols.find(
    s => s.description === 'events.maxEventTargetListeners',
  )
  if (kMaxEventTargetListeners) {
    // The default events.defaultMaxListeners value is 10.
    // https://nodejs.org/api/events.html#eventsdefaultmaxlisteners
    ;(target as Record<symbol, number>)[kMaxEventTargetListeners] = maxListeners
  }
}

/**
 * Suppress MaxListenersExceededWarning messages. This is useful in tests or
 * scripts where multiple listeners are expected.
 */
export function suppressMaxListenersWarning() {
  suppressedWarnings.add('MaxListenersExceededWarning')
  setupSuppression()
}

/**
 * Suppress all process warnings of a specific type.
 */
export function suppressWarningType(warningType: string) {
  suppressedWarnings.add(warningType)
  setupSuppression()
}

/**
 * Suppress warnings temporarily within a callback.
 */
export async function withSuppressedWarnings<T>(
  warningType: string,
  callback: () => T | Promise<T>,
) {
  const original = process.emitWarning
  suppressWarningType(warningType)
  try {
    return await callback()
  } finally {
    process.emitWarning = original
  }
}
