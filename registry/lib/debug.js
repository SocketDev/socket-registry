'use strict'

const constants = /*@__PURE__*/ require('./constants')
const { logger } = /*@__PURE__*/ require('./logger')

/*@__NO_SIDE_EFFECTS__*/
function debugLog(...args) {
  if (isDebug()) {
    logger.info(...args)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function isDebug() {
  // eslint-disable-next-line no-warning-comments
  // TODO: Make the environment variable name configurable.
  // Lazily access constants.ENV.
  return constants.ENV.SOCKET_CLI_DEBUG
}

module.exports = {
  debugLog,
  isDebug
}
