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
  parseArgsConfig,
  skipTestsByEcosystem,
  testNpmNodeWorkspacesPath
} = constants
// @ts-ignore
import { readDirNames } from '@socketregistry/scripts/utils/fs'
import {
  getModifiedPackagesSync,
  getStagedPackagesSync
  // @ts-ignore
} from '@socketregistry/scripts/utils/git'
// @ts-ignore
import { runScript } from '@socketregistry/scripts/utils/npm'
// @ts-ignore
import { isNonEmptyString } from '@socketregistry/scripts/utils/strings'

// Use by passing as a tap --test-arg:
// npm run test:unit ./test/npm.test.ts -- --test-arg="--force"
const { values: cliArgs } = util.parseArgs(parseArgsConfig)

describe('npm', async () => {
  const testNpmNodeWorkspacesPackages = (<string[]>(
    await readDirNames(testNpmNodeWorkspacesPath)
  )).filter(n => !skipTestsByEcosystem.npm.has(n))
  const packageNames: string[] =
    ENV.CI || cliArgs.force
      ? testNpmNodeWorkspacesPackages
      : (() => {
          const testablePackages: Set<string> = (
            ENV.PRE_COMMIT ? getStagedPackagesSync : getModifiedPackagesSync
          )('npm', {
            asSet: true,
            ignore: [LICENSE_GLOB_RECURSIVE, README_GLOB_RECURSIVE]
          })
          return testNpmNodeWorkspacesPackages.filter((n: string) =>
            testablePackages.has(n)
          )
        })()
  for (const pkgName of packageNames) {
    const nwPkgPath = path.join(testNpmNodeWorkspacesPath, pkgName)
    const nwPkgJson = fs.readJsonSync(path.join(nwPkgPath, PACKAGE_JSON))
    const nodeRange = nwPkgJson.engines?.node
    const skip =
      !nwPkgJson.scripts?.test ||
      (isNonEmptyString(nodeRange) &&
        !semver.satisfies(NODE_VERSION, nodeRange))

    it(`${pkgName} passes all its tests`, { skip }, async () => {
      try {
        await runScript('test', [], { cwd: nwPkgPath })
        assert.ok(true)
      } catch (e: any) {
        console.log(`✘ ${pkgName}`, e)
        assert.ok(false)
      }
    })
  }
})
