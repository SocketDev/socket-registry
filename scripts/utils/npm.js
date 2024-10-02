'use strict'

const spawn = require('@npmcli/promise-spawn')

const constants = require('@socketregistry/scripts/constants')
const { WIN_32, execPath } = constants

async function runBin(binPath, args, options) {
  return await spawn(
    WIN_32 ? binPath : execPath,
    [...(WIN_32 ? [] : [binPath]), ...args],
    options
  )
}

module.exports = {
  runBin
}
