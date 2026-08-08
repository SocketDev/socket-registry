'use strict'

// Native Symbol is always implemented at this override's runtime floor.
module.exports = function isImplemented() {
  return true
}
