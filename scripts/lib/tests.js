'use strict'

const constants = require('@socketregistry/scripts/constants')
const {
  getModifiedPackagesSync,
  getStagedPackagesSync
} = require('@socketregistry/scripts/lib/git')

const { LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE } = constants

let _cliArgs
function getCliArgs() {
  if (_cliArgs === undefined) {
    _cliArgs = getUtil().parseArgs(constants.parseArgsConfig).values
  }
  return _cliArgs
}

let _util
function getUtil() {
  if (_util === undefined) {
    const id = 'node:util'
    _util = require(id)
  }
  return _util
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
