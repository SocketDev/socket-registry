'use strict'

const NODE_VERSION = /*@__PURE__*/ require('./node-version')
const semver = /*@__PURE__*/ require('../../external/semver')

// https://nodejs.org/api/cli.html#node_compile_cachedir
module.exports = semver.satisfies(NODE_VERSION, '>=22.1.0')
