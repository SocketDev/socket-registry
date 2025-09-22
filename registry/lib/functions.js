'use strict'

/**
 * A no-op function that does nothing.
 * @returns {undefined} Always returns undefined.
 */
/*@__NO_SIDE_EFFECTS__*/
function noop() {}

/**
 * Create a function that only executes once.
 * @param {Function} fn - The function to execute once.
 * @returns {Function} The wrapped function.
 */
/*@__NO_SIDE_EFFECTS__*/
function once(fn) {
  let called = false
  let result
  return function (...args) {
    if (!called) {
      called = true
      result = fn.apply(this, args)
    }
    return result
  }
}

/**
 * Wrap an async function to silently catch and ignore errors.
 * @param {Function} fn - The async function to wrap.
 * @returns {Function} The wrapped async function that returns undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
function silentWrapAsync(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch {}
    return undefined
  }
}

/**
 * Execute a function with tail call optimization via trampoline.
 * @param {Function} fn - The function to trampoline.
 * @returns {Function} The trampolined function.
 */
/*@__NO_SIDE_EFFECTS__*/
function trampoline(fn) {
  return function (...args) {
    let result = fn.apply(this, args)
    while (typeof result === 'function') {
      result = result()
    }
    return result
  }
}

module.exports = {
  noop,
  once,
  silentWrapAsync,
  trampoline
}
