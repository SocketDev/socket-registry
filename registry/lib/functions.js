/**
 * @fileoverview Common function utilities for control flow and caching.
 * Provides noop, once, and other foundational function helpers.
 */
'use strict'

/**
 * A no-op function that does nothing.
 */
/*@__NO_SIDE_EFFECTS__*/
function noop() {}

/**
 * Create a function that only executes once.
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
  trampoline,
}
