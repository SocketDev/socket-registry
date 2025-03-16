'use strict'

/*@__NO_SIDE_EFFECTS__*/
function debugLog(...args) {
  if (isDebug()) {
    const { logger } = /*@__PURE__*/ require('./logger')
    logger.info(...args)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function isDebug() {
  const ENV = /*@__PURE__*/ require('./constants/env')
  // eslint-disable-next-line no-warning-comments
  // TODO: Make the environment variable name configurable.
  return ENV.SOCKET_CLI_DEBUG
}

module.exports = {
  debugLog,
  isDebug
}
