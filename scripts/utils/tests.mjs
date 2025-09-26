/**
 * @fileoverview Test execution coordination and package filtering logic.
 * Provides utilities for running tests on specific packages and handling test workflows.
 */

import util from 'node:util'

import constants from '../constants.mjs'
import { getModifiedPackagesSync, getStagedPackagesSync } from './git.mjs'

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

  // Check if package is in the skip list for known issues.
  const skipSet = constants.skipTestsByEcosystem.get(eco)
  if (skipSet?.has(sockRegPkgName)) {
    return true
  }

  return getCliArgs().force || ENV.CI || process.env.FORCE_TEST === '1'
    ? false
    : !(ENV.PRE_COMMIT ? getStagedPackagesSync : getModifiedPackagesSync)(eco, {
        ignore: [LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE],
      }).includes(sockRegPkgName)
}

export { isPackageTestingSkipped }
