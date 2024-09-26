import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import util from 'node:util'

import spawn from '@npmcli/promise-spawn'
import fs from 'fs-extra'
import semver from 'semver'

import {
  ENV,
  NODE_VERSION,
  PACKAGE_JSON,
  execPath,
  runScriptSequentiallyExecPath,
  testNpmNodeWorkspacesPath
  // @ts-ignore
} from '@socketregistry/scripts/constants'
// @ts-ignore
import { readDirNames } from '@socketregistry/scripts/utils/fs'
import {
  getModifiedPackagesSync,
  getStagedPackagesSync
  // @ts-ignore
} from '@socketregistry/scripts/utils/git'
// @ts-ignore
import { isNonEmptyString } from '@socketregistry/scripts/utils/strings'

// Use by passing as a tap --test-arg:
// npm run test:unit ./test/npm.test.ts -- --test-arg="--force"
const { values: cliArgs } = util.parseArgs({
  options: {
    force: {
      type: 'boolean',
      short: 'f'
    }
  }
})

const skippedPackages = new Set([
  // Has known test fails in its package:
  // https://github.com/es-shims/Date/issues/3
  'date',
  // Has no unit tests.
  'es6-object-assign',
  // Has known failures in its package and requires running tests in browser.
  'harmony-reflect',
  // The package tests don't account for the `require('node:util/types).isRegExp`
  // method having no observable side-effects and assumes the "getOwnPropertyDescriptor"
  // trap will be triggered by `Object.getOwnPropertyDescriptor(value, 'lastIndex')`.
  'is-regex',
  // Has known failures in its package.
  'safer-buffer'
])

describe('npm', async () => {
  const testNpmNodeWorkspacesPackages = (<string[]>(
    await readDirNames(testNpmNodeWorkspacesPath)
  )).filter(n => !skippedPackages.has(n))
  const packageNames: string[] =
    ENV.CI || cliArgs.force
      ? testNpmNodeWorkspacesPackages
      : (() => {
          const testablePackages: Set<string> = ENV.PRE_COMMIT
            ? getStagedPackagesSync('npm', { asSet: true })
            : getModifiedPackagesSync('npm', { asSet: true })
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
        await spawn(execPath, [runScriptSequentiallyExecPath, 'test'], {
          cwd: nwPkgPath
        })
        assert.ok(true)
      } catch (e) {
        console.log(`✘ ${pkgName}`, e)
        assert.ok(false)
      }
    })
  }
})
