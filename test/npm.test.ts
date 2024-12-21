import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import util from 'node:util'

import semver from 'semver'

import constants from '@socketregistry/scripts/constants'
const {
  LICENSE_GLOB_RECURSIVE,
  PACKAGE_JSON,
  README_GLOB_RECURSIVE,
  abortSignal,
  parseArgsConfig,
  testNpmNodeWorkspacesPath,
  win32EnsureTestsByEcosystem
} = constants
import {
  getModifiedPackagesSync,
  getStagedPackagesSync
} from '@socketregistry/scripts/lib/git'
import { getManifestData } from '@socketsecurity/registry'
import { readDirNamesSync, readJsonSync } from '@socketsecurity/registry/lib/fs'
import { runScript } from '@socketsecurity/registry/lib/npm'
import { resolveOriginalPackageName } from '@socketsecurity/registry/lib/packages'
import { isNonEmptyString } from '@socketsecurity/registry/lib/strings'

// Pass args as tap --test-arg:
// npm run test:unit ./test/npm.test.ts -- --test-arg="--force"
const { values: cliArgs } = util.parseArgs(parseArgsConfig)
const eco = 'npm'

const testNpmNodeWorkspacesPackages = (<string[]>(
  readDirNamesSync(testNpmNodeWorkspacesPath)
)).filter(
  // Lazily access constants.skipTestsByEcosystem.
  n => !constants.skipTestsByEcosystem[eco]?.has(n)
)

const packageNames: string[] =
  // Lazily access constants.ENV.
  cliArgs.force || constants.ENV.CI
    ? testNpmNodeWorkspacesPackages
    : (() => {
        const testablePackages = // Lazily access constants.ENV.
        (
          constants.ENV.PRE_COMMIT
            ? getStagedPackagesSync
            : getModifiedPackagesSync
        )(eco, {
          asSet: true,
          ignore: [LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE]
        })
        return testNpmNodeWorkspacesPackages.filter((n: string) =>
          testablePackages.has(n)
        )
      })()

describe(eco, { skip: !packageNames.length }, () => {
  for (const regPkgName of packageNames) {
    const nwPkgPath = path.join(testNpmNodeWorkspacesPath, regPkgName)
    const nwPkgJson = readJsonSync(path.join(nwPkgPath, PACKAGE_JSON))
    const manifestData = getManifestData(eco, regPkgName)
    const nodeRange = nwPkgJson.engines?.['node']
    const origPkgName = resolveOriginalPackageName(regPkgName)
    const skip =
      !nwPkgJson.scripts?.test ||
      // Lazily access constants.WIN32.
      (constants.WIN32 &&
        !manifestData?.interop.includes('browserify') &&
        !win32EnsureTestsByEcosystem?.[eco]?.has(origPkgName)) ||
      (isNonEmptyString(nodeRange) &&
        // Lazily access constants.NODE_VERSION.
        !semver.satisfies(constants.NODE_VERSION, nodeRange))

    it(`${origPkgName} passes all its tests`, { skip }, async () => {
      try {
        await runScript('test', [], { cwd: nwPkgPath, signal: abortSignal })
        assert.ok(true)
      } catch (e: any) {
        console.error(`✖️ ${origPkgName}`, e)
        assert.ok(false)
      }
    })
  }
})
