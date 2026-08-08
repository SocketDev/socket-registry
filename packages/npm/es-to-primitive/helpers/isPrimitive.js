'use strict'

// Upstream ships this helper in every published tag and consumers deep-require
// it, so the override carries it too.
module.exports = function isPrimitive(value) {
  return (
    value === null || (typeof value !== 'function' && typeof value !== 'object')
  )
}
