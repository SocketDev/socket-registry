import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import spawn from '@npmcli/promise-spawn'
import fs from 'fs-extra'
import semver from 'semver'

import {
  NODE_VERSION,
  PACKAGE_JSON,
  execPath,
  runScriptSequentiallyExecPath,
  testNpmNodeWorkspacesPath
  // @ts-ignore
} from '@socketregistry/scripts/constants'
import {
  readDirNames
  // @ts-ignores
} from '@socketregistry/scripts/utils/fs'
// @ts-ignore
import { isNonEmptyString } from '@socketregistry/scripts/utils/strings'

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
    (await readDirNames(testNpmNodeWorkspacesPath)).filter(
      (n: any) => !skippedPackages.includes(n)
    )
  )

  for (const pkgName of packageNames) {
    const wsPkgPath = path.join(testNpmNodeWorkspacesPath, pkgName)
    const wsPkgJson = fs.readJsonSync(path.join(wsPkgPath, PACKAGE_JSON))
    const nodeRange = wsPkgJson.engines?.node
    const skip =
      !wsPkgJson.scripts?.test ||
      (isNonEmptyString(nodeRange) &&
        !semver.satisfies(NODE_VERSION, nodeRange))

    it(`${pkgName} should pass all its unit tests`, { skip }, async () => {
      try {
        await spawn(execPath, [runScriptSequentiallyExecPath, 'test'], {
          cwd: wsPkgPath
        })
        assert.ok(true)
      } catch (e) {
        console.log(`✘ ${pkgName}`, e)
        assert.ok(false)
      }
    })
  }
})
