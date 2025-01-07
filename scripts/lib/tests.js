'use strict'

let _util
function getUtil() {
  if (_util === undefined) {
    const id = 'node:util'
    _util = require(`${id}`)
  }
  return _util
}

const constants = require('@socketregistry/scripts/constants')
const { LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE, parseArgsConfig } =
  constants
const {
  getModifiedPackagesSync,
  getStagedPackagesSync
} = require('@socketregistry/scripts/lib/git')

let _cliArgs
function getCliArgs() {
  if (_cliArgs === undefined) {
    _cliArgs = getUtil().parseArgs(parseArgsConfig).values
  }
  return _cliArgs
}

function isPackageTestingSkipped(eco, regPkgName) {
  // Lazily access constants.ENV.
  const { ENV } = constants
  return getCliArgs().force || ENV.CI
    ? false
    : !(ENV.PRE_COMMIT ? getStagedPackagesSync : getModifiedPackagesSync)(eco, {
        ignore: [LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE]
      }).includes(regPkgName)
}

module.exports = {
  isPackageTestingSkipped
}
