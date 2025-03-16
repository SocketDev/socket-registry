'use strict'

const maintainedNodeVersions = /*@__PURE__*/ require('./maintained-node-versions')

module.exports = `>=${maintainedNodeVersions.last}`
