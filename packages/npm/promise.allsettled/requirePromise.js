'use strict'

module.exports = function requirePromise() {
  if (typeof Promise !== 'function') {
    throw new TypeError('This environment does not support Promise.')
  }
}
