'use strict'

const constants = require('./constants')
const { logger } = require('./logger')

function debugLog(...args) {
  if (isDebug()) {
    logger.info(...args)
  }
}

function isDebug() {
  // Lazily access constants.ENV.
  return constants.ENV.SOCKET_CLI_DEBUG
}

module.exports = {
  debugLog,
  isDebug
}
