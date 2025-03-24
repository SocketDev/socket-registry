'use strict'

let _process
function getProcess() {
  if (_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _process = require('process')
  }
  return _process
}

module.exports = function isInteractive({ stream = getProcess().stdout } = {}) {
  if (!(stream && stream.isTTY)) {
    return false
  }
  const { env } = getProcess()
  return env.TERM !== 'dumb' && !('CI' in env)
}
