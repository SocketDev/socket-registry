'use strict'

const { assign: builtinAssign } = Object

function assign(target, firstSource, ...args) {
  return builtinAssign(target, firstSource, ...args)
}

function polyfill() {
  // noop
}

module.exports = {
  assign,
  polyfill
}
