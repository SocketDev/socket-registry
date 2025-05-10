'use strict'

const semver = /*@__PURE__*/ require('../../external/semver')

const NODE_VERSION = /*@__PURE__*/ require('./node-version')

// https://nodejs.org/api/cli.html#node_compile_cachedir
module.exports = semver.satisfies(NODE_VERSION, '>=22.1.0')
