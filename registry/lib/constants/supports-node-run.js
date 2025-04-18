'use strict'

const semver = /*@__PURE__*/ require('../../external/semver')

const NODE_VERSION = /*@__PURE__*/ require('./node-version')

// https://nodejs.org/api/all.html#all_cli_--run
module.exports = semver.satisfies(NODE_VERSION, '>=22.3.0')
