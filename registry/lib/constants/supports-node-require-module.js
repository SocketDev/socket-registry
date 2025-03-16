'use strict'

const semver = /*@__PURE__*/ require('semver')

const NODE_VERSION = /*@__PURE__*/ require('./node-version')

// https://nodejs.org/docs/latest-v22.x/api/all.html#all_cli_--experimental-require-module
module.exports = semver.satisfies(NODE_VERSION, '>=22.12')
