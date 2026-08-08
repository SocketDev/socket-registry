'use strict'

const nodeUtilTypes = /*@__PURE__*/ require('node:util/types')
const { isAsyncFunction, isGeneratorFunction } = nodeUtilTypes

// node:util/types.isGeneratorFunction also matches async generator functions;
// upstream is-generator-function excludes them, so the exclusion is a required
// fork, not an optimization. isAsyncFunction reads the same native slot family
// and is true for async generators, false for sync generators.
module.exports = function isGeneratorFn(value) {
  return isGeneratorFunction(value) && !isAsyncFunction(value)
}
