'use strict'

// Upstream ships this probe; named functions always carry .name here.
module.exports = function functionsHaveNames() {
  return typeof function f() {}.name === 'string'
}
