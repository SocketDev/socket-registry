'use strict'

const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const {
  getModifiedPackagesSync,
  getStagedPackagesSync,
} = require('@socketregistry/scripts/lib/git')

const { LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE } = constants

let _cliArgs
function getCliArgs() {
  if (_cliArgs === undefined) {
    _cliArgs = util.parseArgs(constants.parseArgsConfig).values
  }
  return _cliArgs
}

function isPackageTestingSkipped(eco, sockRegPkgName) {
  const { ENV } = constants
  return getCliArgs().force || ENV.CI || process.env.FORCE_TEST === '1'
    ? false
    : !(ENV.PRE_COMMIT ? getStagedPackagesSync : getModifiedPackagesSync)(eco, {
        ignore: [LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE],
      }).includes(sockRegPkgName)
}

module.exports = {
  isPackageTestingSkipped,
}
