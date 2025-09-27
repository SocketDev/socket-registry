'use strict'

const NODE_VERSION = /*@__PURE__*/ require('./node-version')
const semver = /*@__PURE__*/ require('../../external/semver')

// https://nodejs.org/api/cli.html#--disable-warningcode-or-type
module.exports = semver.satisfies(NODE_VERSION, '>=21.3.0||^20.11.0')
