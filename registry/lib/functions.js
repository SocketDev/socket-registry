'use strict'

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
