'use strict'

const semver = /*@__PURE__*/ require('../../external/semver')

const NODE_VERSION = /*@__PURE__*/ require('./node-version')

// https://nodejs.org/api/cli.html#--permission
module.exports = semver.satisfies(NODE_VERSION, '>=23.5.0||^22.13.0')
