import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import util from 'node:util'

import fs from 'fs-extra'
import semver from 'semver'

// @ts-ignore
import constants from '@socketregistry/scripts/constants'
const {
  ENV,
  LICENSE_GLOB_RECURSIVE,
  NODE_VERSION,
  PACKAGE_JSON,
  README_GLOB_RECURSIVE,
  WIN_32,
  parseArgsConfig,
  skipTestsByEcosystem,
  testNpmNodeWorkspacesPath,
  win32EnsureTestsByEcosystem
} = constants
// @ts-ignore
import { readDirNamesSync } from '@socketregistry/scripts/utils/fs'
import {
  getModifiedPackagesSync,
  getStagedPackagesSync
  // @ts-ignore
} from '@socketregistry/scripts/utils/git'
// @ts-ignore
import { getManifestData } from '@socketregistry/scripts/utils/manifest'
// @ts-ignore
import { runScript } from '@socketregistry/scripts/utils/npm'
import {
  resolveOriginalPackageName
  // @ts-ignore
} from '@socketregistry/scripts/utils/packages'
// @ts-ignore
import { isNonEmptyString } from '@socketregistry/scripts/utils/strings'

// Pass args as tap --test-arg:
// npm run test:unit ./test/npm.test.ts -- --test-arg="--force"
const { values: cliArgs } = util.parseArgs(parseArgsConfig)
const eco = 'npm'

const testNpmNodeWorkspacesPackages = (<string[]>(
  readDirNamesSync(testNpmNodeWorkspacesPath)
)).filter(n => !skipTestsByEcosystem[eco]?.has(n))

const packageNames: string[] =
  ENV.CI || cliArgs.force
    ? testNpmNodeWorkspacesPackages
    : (() => {
        const testablePackages: Set<string> = (
          ENV.PRE_COMMIT ? getStagedPackagesSync : getModifiedPackagesSync
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
    const nwPkgJson = fs.readJsonSync(path.join(nwPkgPath, PACKAGE_JSON))
    const manifestData = getManifestData(eco, regPkgName)
    const nodeRange = nwPkgJson.engines?.node
    const origPkgName = resolveOriginalPackageName(regPkgName)
    const skip =
      !nwPkgJson.scripts?.test ||
      (WIN_32 &&
        !manifestData.interop.includes('browserify') &&
        !win32EnsureTestsByEcosystem?.[eco].has(origPkgName)) ||
      (isNonEmptyString(nodeRange) &&
        !semver.satisfies(NODE_VERSION, nodeRange))

    it(`${origPkgName} passes all its tests`, { skip }, async () => {
      try {
        await runScript('test', [], { cwd: nwPkgPath })
        assert.ok(true)
      } catch (e: any) {
        console.log(`✘ ${origPkgName}`, e)
        assert.ok(false)
      }
    })
  }
})
