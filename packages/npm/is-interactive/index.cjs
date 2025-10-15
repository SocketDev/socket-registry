'use strict'

let _process
function getProcess() {
  if (_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    _process = require('node:process')
  }
  return _process
}

module.exports = function isInteractive({ stream = getProcess().stdout } = {}) {
  if (!stream?.isTTY) {
    return false
  }
  const { env } = getProcess()
  return env.TERM !== 'dumb' && !('CI' in env)
}
