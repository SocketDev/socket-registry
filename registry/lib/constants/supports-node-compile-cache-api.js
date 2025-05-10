'use strict'

const semver = /*@__PURE__*/ require('../../external/semver')

const NODE_VERSION = /*@__PURE__*/ require('./node-version')

// https://nodejs.org/api/module.html#module-compile-cache
module.exports = semver.satisfies(NODE_VERSION, '>=22.8.0')
