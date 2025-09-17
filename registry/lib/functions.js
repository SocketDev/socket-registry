'use strict'

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

module.exports = {
  silentWrapAsync
}
