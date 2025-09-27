'use strict'

const NODE_VERSION = /*@__PURE__*/ require('./node-version')
const semver = /*@__PURE__*/ require('../../external/semver')

// https://nodejs.org/api/cli.html#--permission
module.exports = semver.satisfies(NODE_VERSION, '>=23.5.0||^22.13.0')
