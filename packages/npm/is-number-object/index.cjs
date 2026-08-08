'use strict'

const {
  isNumberObject: nodeIsNumberObject,
} = /*@__PURE__*/ require('node:util/types')

// node:util/types.isNumberObject covers only boxed Number objects; upstream
// is-number-object also accepts primitive numbers, so the primitive check is
// a required fork, not an optimization.
module.exports = function isNumberObject(value) {
  return typeof value === 'number' || nodeIsNumberObject(value)
}
