'use strict'

const nodeUtilTypes = /*@__PURE__*/ require('node:util/types')
const { isNumberObject } = nodeUtilTypes

// node:util/types.isNumberObject covers only boxed Number objects; upstream
// is-number-object also accepts primitive numbers, so the primitive check is
// a required fork, not an optimization.
module.exports = function isNumber(value) {
  return typeof value === 'number' || isNumberObject(value)
}
