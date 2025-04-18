'use strict'

// Use non-'node:' prefixed require to avoid Webpack errors.
// eslint-disable-next-line n/prefer-node-protocol
const fs = /*@__PURE__*/ require('fs')

const which = /*@__PURE__*/ require('../../external/which')

const WIN32 = require('./win32')

// Will throw if not found.
let binPath = which.sync('npm')

// Lazily access constants.WIN32.
if (WIN32) {
  // Use non-'node:' prefixed require to avoid Webpack errors.
  // eslint-disable-next-line n/prefer-node-protocol
  const path = /*@__PURE__*/ require('path')

  // The npm.CMD looks like:
  // :: Created by npm, please don't edit manually.
  // @ECHO OFF
  //
  // SETLOCAL
  //
  // SET "NODE_EXE=%~dp0\node.exe"
  // IF NOT EXIST "%NODE_EXE%" (
  //   SET "NODE_EXE=node"
  // )
  //
  // SET "NPM_PREFIX_JS=%~dp0\node_modules\npm\bin\npm-prefix.js"
  // SET "NPM_CLI_JS=%~dp0\node_modules\npm\bin\npm-cli.js"
  // FOR /F "delims=" %%F IN ('CALL "%NODE_EXE%" "%NPM_PREFIX_JS%"') DO (
  //   SET "NPM_PREFIX_NPM_CLI_JS=%%F\node_modules\npm\bin\npm-cli.js"
  // )
  // IF EXIST "%NPM_PREFIX_NPM_CLI_JS%" (
  //   SET "NPM_CLI_JS=%NPM_PREFIX_NPM_CLI_JS%"
  // )
  //
  // "%NODE_EXE%" "%NPM_CLI_JS%" %*
  binPath = path.join(path.dirname(binPath), 'node_modules/npm/bin/npm-cli.js')
}

module.exports = fs.realpathSync.native(binPath)
