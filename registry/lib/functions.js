'use strict'

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
