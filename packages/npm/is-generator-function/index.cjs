'use strict'

const nodeUtilTypes = /*@__PURE__*/ require('node:util/types')
const { isAsyncGeneratorFunction, isGeneratorFunction } = nodeUtilTypes

// node:util/types.isGeneratorFunction also matches async generator functions;
// upstream is-generator-function excludes them, so the exclusion is a required
// fork, not an optimization.
module.exports = function isGeneratorFn(value) {
  return isGeneratorFunction(value) && !isAsyncGeneratorFunction(value)
}
