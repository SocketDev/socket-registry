'use strict'

const semver = /*@__PURE__*/ require('../../external/semver')

const NODE_VERSION = /*@__PURE__*/ require('./node-version')

// https://nodejs.org/api/cli.html#--disable-warningcode-or-type
module.exports = semver.satisfies(NODE_VERSION, '>=21.3.0||^20.11.0')
