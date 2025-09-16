import path from 'node:path'
import util from 'node:util'

import semver from 'semver'
import { describe, expect, it } from 'vitest'

import constants from '@socketregistry/scripts/constants'
import {
  getModifiedPackagesSync,
  getStagedPackagesSync
} from '@socketregistry/scripts/lib/git'
import { getManifestData } from '@socketsecurity/registry'
import { readDirNamesSync, readJsonSync } from '@socketsecurity/registry/lib/fs'
import { logger } from '@socketsecurity/registry/lib/logger'
import { runNpmScript } from '@socketsecurity/registry/lib/npm'
import { resolveOriginalPackageName } from '@socketsecurity/registry/lib/packages'
import { isNonEmptyString } from '@socketsecurity/registry/lib/strings'

const {
  LICENSE_GLOB_RECURSIVE,
  NPM,
  PACKAGE_JSON,
  README_GLOB_RECURSIVE,
  abortSignal,
  testNpmNodeWorkspacesPath,
  win32EnsureTestsByEcosystem
} = constants

// Pass args:
// npm run test:unit ./test/npm.test.ts -- --force
const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)
const eco = NPM

const testNpmNodeWorkspacesPackages = (
  readDirNamesSync(testNpmNodeWorkspacesPath) as string[]
).filter(n => !constants.skipTestsByEcosystem?.get(eco)?.has(n))

const packageNames: string[] =
  cliArgs.force || constants.ENV.CI
    ? testNpmNodeWorkspacesPackages
    : (() => {
        const testablePackages = (
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
  for (const sockRegPkgName of packageNames) {
    const nwPkgPath = path.join(testNpmNodeWorkspacesPath, sockRegPkgName)
    const nwPkgJson = readJsonSync(path.join(nwPkgPath, PACKAGE_JSON))
    const manifestData = getManifestData(eco, sockRegPkgName)
    const nodeRange = nwPkgJson.engines?.['node']
    const origPkgName = resolveOriginalPackageName(sockRegPkgName)
    const skip =
      !nwPkgJson.scripts?.test ||
      (constants.WIN32 &&
        !manifestData?.interop.includes('browserify') &&
        !win32EnsureTestsByEcosystem?.get(eco)?.has(origPkgName)) ||
      (isNonEmptyString(nodeRange) &&
        !semver.satisfies(constants.NODE_VERSION, nodeRange))

    it(`${origPkgName} passes all its tests`, { skip }, async () => {
      try {
        await runNpmScript('test', [], { cwd: nwPkgPath, signal: abortSignal })
        expect(true).toBe(true)
      } catch (e) {
        logger.fail(`${origPkgName}`)
        // const error = e as { stderr?: string } | null | undefined
        expect(false).toBe(true)
      }
    })
  }
})
