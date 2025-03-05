'use strict'

const constants = require('./constants')
const { logger } = require('./logger')

/*@__NO_SIDE_EFFECTS__*/
function debugLog(...args) {
  if (isDebug()) {
    logger.info(...args)
  }
}

/*@__NO_SIDE_EFFECTS__*/
function isDebug() {
  // Lazily access constants.ENV.
  return constants.ENV.SOCKET_CLI_DEBUG
}

module.exports = {
  debugLog,
  isDebug
}
