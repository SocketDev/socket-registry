'use strict'

// Node entry: on the Node>=24 baseline, node:assert is the complete reference
// implementation this override was ported from, so Node consumers get it
// directly — zero dependencies, no vendored port to maintain. The portable
// (browser/bundler) build lives at ./package/build/assert.js for the `default`
// export condition, where node:assert is unavailable.
module.exports = /*@__PURE__*/ require('node:assert')
