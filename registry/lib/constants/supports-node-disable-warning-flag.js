'use strict'

const semver = /*@__PURE__*/ require('semver')

const NODE_VERSION = /*@__PURE__*/ require('./node-version')

// https://nodejs.org/api/all.html#all_cli_--disable-warningcode-or-type
module.exports = semver.satisfies(NODE_VERSION, '>=21.3.0||^20.11.0')
