'use strict'

// Delegate to the portable implementation so Node and browser/bundler consumers
// share one faithful behavior. A node:assert / node:util delegation diverges
// from the upstream deep-equal package on strict comparisons (e.g. objects with
// different prototypes return false in deep-equal but true under
// util.isDeepStrictEqual), and a drop-in must match the package it replaces.
module.exports = /*@__PURE__*/ require('./package/index.js')
