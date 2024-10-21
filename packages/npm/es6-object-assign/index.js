'use strict'

const { assign: ObjectAssign } = Object

function assign(target, firstSource, ...args) {
  return ObjectAssign(target, firstSource, ...args)
}

function polyfill() {
  // noop
}

module.exports = {
  assign,
  polyfill
}
