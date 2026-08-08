'use strict'

const {
  isAsyncFunction: nodeIsAsyncFunction,
  isGeneratorFunction: nodeIsGeneratorFunction,
} = /*@__PURE__*/ require('node:util/types')

// node:util/types.isGeneratorFunction also matches async generator functions;
// upstream is-generator-function excludes them, so the exclusion is a required
// fork, not an optimization. isAsyncFunction reads the same native slot family
// and is true for async generators, false for sync generators.
module.exports = function isGeneratorFunction(value) {
  return nodeIsGeneratorFunction(value) && !nodeIsAsyncFunction(value)
}
