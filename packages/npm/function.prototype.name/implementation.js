'use strict'

module.exports = function getName() {
  if (typeof this !== 'function') {
    throw new TypeError(
      'Function.prototype.name sham getter called on non-function',
    )
  }
  return this.name
}
