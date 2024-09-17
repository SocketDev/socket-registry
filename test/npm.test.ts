import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import spawn from '@npmcli/promise-spawn'
import semver from 'semver'
import { glob as tinyGlob } from 'tinyglobby'
import which from 'which'

// @ts-ignore
import { NODE_WORKSPACE, NODE_VERSION } from '@socketregistry/scripts/constants'
// @ts-ignore
import { readPackageJsonSync } from '@socketregistry/scripts/utils/fs'
// @ts-ignore
import { trimTrailingSlash } from '@socketregistry/scripts/utils/path'
import {
  isNonEmptyString,
  localCompare
  // @ts-ignore
} from '@socketregistry/scripts/utils/strings'

const { execPath } = process
const rootPath = path.resolve(__dirname, '..')
const testNpmPath = path.join(rootPath, 'test/npm')
const runScriptExecPath = which.sync('run-s')
const workspacePath = path.join(testNpmPath, NODE_WORKSPACE)

const skippedPackages = [
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
]

describe('Package runs against their own unit tests', async () => {
  const packageNames = <string[]>(
    await tinyGlob(['*/'], {
      cwd: workspacePath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .filter((n: any) => !skippedPackages.includes(n))
    .sort(localCompare)

  for (const pkgName of packageNames) {
    const wsPkgPath = path.join(workspacePath, pkgName)
    const wsPkgJson = readPackageJsonSync(wsPkgPath)
    const nodeRange = wsPkgJson?.engines?.node
    const skip =
      !wsPkgJson.scripts.test ||
      (isNonEmptyString(nodeRange) &&
        !semver.satisfies(NODE_VERSION, nodeRange))

    it(`${pkgName} should pass all its unit tests`, { skip }, () => {
      assert.doesNotReject(
        spawn(execPath, [runScriptExecPath, 'test'], {
          cwd: wsPkgPath
        })
      )
    })
  }
})
