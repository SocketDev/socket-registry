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

module.exports = function isUnicodeSupported() {
  const process = getProcess()
  if (process.platform !== 'win32') {
    // Linux console (kernel).
    return process.env.TERM !== 'linux'
  }
  const { env } = process
  if (
    // Windows Terminal.
    !!env.WT_SESSION ||
    // Terminus (<0.2.27).
    !!env.TERMINUS_SUBLIME ||
    // ConEmu and cmder.
    env.ConEmuTask === '{cmd::Cmder}'
  ) {
    return true
  }
  const { TERM, TERM_PROGRAM } = env
  return (
    TERM_PROGRAM === 'Terminus-Sublime' ||
    TERM_PROGRAM === 'vscode' ||
    TERM === 'xterm-256color' ||
    TERM === 'alacritty' ||
    TERM === 'rxvt-unicode' ||
    TERM === 'rxvt-unicode-256color' ||
    env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
  )
}
