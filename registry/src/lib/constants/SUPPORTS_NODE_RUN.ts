'use strict'

const NODE_VERSION = /*@__PURE__*/ require('./node-version')
const semver = /*@__PURE__*/ require('../../external/semver')

// https://nodejs.org/api/all.html#all_cli_--run
module.exports = semver.satisfies(NODE_VERSION, '>=22.3.0')
