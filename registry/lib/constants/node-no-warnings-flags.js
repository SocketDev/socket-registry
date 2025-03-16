'use strict'

const SUPPORTS_NODE_DISABLE_WARNING_FLAG = /*@__PURE__*/ require('./supports-node-disable-warning-flag')

module.exports = Object.freeze(
  SUPPORTS_NODE_DISABLE_WARNING_FLAG
    ? ['--disable-warning', 'ExperimentalWarning']
    : ['--no-warnings']
)
