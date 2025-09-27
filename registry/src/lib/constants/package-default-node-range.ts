'use strict'

const maintainedNodeVersions = /*@__PURE__*/ require('./maintained-node-versions')
const semver = /*@__PURE__*/ require('../../external/semver')

module.exports = `>=${semver.parse(maintainedNodeVersions.last).major}`
