import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const { NPM, UTF8, testNpmNodeWorkspacesPath } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')
const pkgPath = path.join(testNpmNodeWorkspacesPath, sockRegPkgName)

// @hyrious/bun.lockb has no unit tests.
// https://github.com/hyrious/bun.lockb/tree/v0.0.4
// Test case from https://github.com/daggerok/bun-examples/tree/master/hello-bun.
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    const hyriousBunLockb = require(path.join(pkgPath, 'index.cjs'))

    const { testNpmFixturesPath } = constants

    it('parses bun.lockb into yarn.lock contents', () => {
      const lockbPath = path.join(testNpmFixturesPath, 'fixture-bun.lockb')
      const yarnLockPath = path.join(testNpmFixturesPath, 'fixture-yarn.lock')
      const lockb = readFileSync(lockbPath)
      const yarnLock = readFileSync(yarnLockPath, UTF8)
      assert.strictEqual(hyriousBunLockb.parse(lockb), yarnLock)
    })
  }
)
