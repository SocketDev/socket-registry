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
import { execScript } from '@socketsecurity/registry/lib/agent'
import { readDirNamesSync, readJsonSync } from '@socketsecurity/registry/lib/fs'
import { logger } from '@socketsecurity/registry/lib/logger'
import { resolveOriginalPackageName } from '@socketsecurity/registry/lib/packages'
import { isNonEmptyString } from '@socketsecurity/registry/lib/strings'

import type { SpawnError } from '@socketsecurity/registry/lib/spawn'

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
// pnpm run test:unit ./test/npm.test.ts -- --force
// Note: --force is converted to FORCE_TEST env var by test.js because
// Vitest runs tests in worker processes that don't receive CLI args.
const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)
const useForce =
  cliArgs.force || constants.ENV.CI || process.env['FORCE_TEST'] === '1'

const eco = NPM

const testNpmNodeWorkspacesPackages = (
  readDirNamesSync(testNpmNodeWorkspacesPath) as string[]
).filter(n => !constants.skipTestsByEcosystem?.get(eco)?.has(n))

const packageNames: string[] = useForce
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
  if (!packageNames.length) {
    it('no packages to test', () => {
      expect(true).toBe(true)
    })
    return
  }

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
        await execScript('test', [], { cwd: nwPkgPath, signal: abortSignal })
        expect(true).toBe(true)
      } catch (e) {
        logger.fail(`${origPkgName}`)
        logger.error(
          `Failed ${origPkgName}:`,
          (e as Error)?.message ?? 'Unknown error',
          'stderr:',
          (e as SpawnError)?.stderr ?? 'Unknown stderr'
        )
        expect(false).toBe(true)
      }
    })
  }
})
