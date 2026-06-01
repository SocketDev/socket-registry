'use strict'

let processCache
function getProcess() {
  if (processCache === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    processCache = require('node:process')
  }
  return processCache
}

module.exports = function isInteractive({ stream = getProcess().stdout } = {}) {
  if (!stream?.isTTY) {
    return false
  }
  const { env } = getProcess()
  return env.TERM !== 'dumb' && !('CI' in env)
}
