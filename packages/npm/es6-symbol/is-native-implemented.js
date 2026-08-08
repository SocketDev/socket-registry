'use strict'

// Boolean like upstream: true whenever the runtime Symbol is native.
module.exports = typeof Symbol === 'function'
