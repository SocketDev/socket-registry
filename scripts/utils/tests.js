'use strict'

const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { ENV, LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE, parseArgsConfig } =
  constants
const {
  getModifiedPackagesSync,
  getStagedPackagesSync
} = require('@socketregistry/scripts/utils/git')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

function isPackageTestingSkipped(eco, regPkgName) {
  return ENV.CI || cliArgs.force
    ? false
    : !(ENV.PRE_COMMIT ? getStagedPackagesSync : getModifiedPackagesSync)(eco, {
        ignore: [LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE]
      }).includes(regPkgName)
}

module.exports = {
  isPackageTestingSkipped
}
