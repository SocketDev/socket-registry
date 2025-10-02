/**
 * @fileoverview Test execution coordination and package filtering logic.
 * Provides utilities for running tests on specific packages and handling test workflows.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../registry/dist/lib/logger.js'
import { parseArgs } from '../../registry/dist/lib/parse-args.js'

import constants from '../constants.mjs'
import { getModifiedPackagesSync, getStagedPackagesSync } from './git.mjs'

const { LICENSE_GLOB_RECURSIVE, PACKAGE_JSON, README_GLOB_RECURSIVE, UTF8 } =
  constants

let _cliArgs
function getCliArgs() {
  if (_cliArgs === undefined) {
    const { values } = parseArgs({
      options: {
        force: {
          type: 'boolean',
          short: 'f',
        },
        quiet: {
          type: 'boolean',
        },
      },
      strict: false,
    })
    _cliArgs = values
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

  // Check if package is not in devDeps but also not in skip list.
  // Suggest adding to skip list if missing from devDeps.
  const testPkgJsonPath = path.join(constants.rootPath, 'test', eco, PACKAGE_JSON)
  if (existsSync(testPkgJsonPath)) {
    try {
      const testPkgJson = JSON.parse(readFileSync(testPkgJsonPath, UTF8))
      const devDeps = testPkgJson.devDependencies || {}
      const normalizedName = sockRegPkgName.replace(/__/g, '/')
      const hasDevDep =
        devDeps[sockRegPkgName] !== undefined ||
        devDeps[normalizedName] !== undefined ||
        devDeps[`@${normalizedName}`] !== undefined

      if (!hasDevDep && !skipSet?.has(sockRegPkgName)) {
        logger.warn(
          `Package "${sockRegPkgName}" is not in test/${eco}/${PACKAGE_JSON} devDependencies.`,
        )
        logger.warn(
          `Consider adding it to skipTestsByEcosystem in scripts/constants.mjs`,
        )
      }
    } catch (e) {
      // Ignore parse errors.
    }
  }

  return getCliArgs().force || ENV.CI || process.env.FORCE_TEST === '1'
    ? false
    : !(ENV.PRE_COMMIT ? getStagedPackagesSync : getModifiedPackagesSync)(eco, {
        ignore: [LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE],
      }).includes(sockRegPkgName)
}

export { isPackageTestingSkipped }
