'use strict'

const { freeze: ObjectFreeze } = Object

const SUPPORTS_NODE_DISABLE_WARNING_FLAG = /*@__PURE__*/ require('./supports-node-disable-warning-flag')

module.exports = ObjectFreeze(
  SUPPORTS_NODE_DISABLE_WARNING_FLAG
    ? [
        '--disable-warning',
        'DeprecationWarning',
        '--disable-warning',
        'ExperimentalWarning'
      ]
    : ['--no-warnings']
)
