'use strict'

// Upstream shipped this probe from 3.0.0 through 4.1.x and consumers deep-
// require it; symbols are always present at this override's runtime floor.
module.exports = function hasSymbols() {
  return true
}
