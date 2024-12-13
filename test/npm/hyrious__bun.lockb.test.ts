import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'
import { resolveOriginalPackageName } from '@socketsecurity/registry/lib/packages'

const eco = 'npm'
const regPkgName = path.basename(__filename, '.test.ts')

// @hyrious/bun.lockb has no unit tests.
// https://github.com/hyrious/bun.lockb/tree/v0.0.4
// Test case from https://github.com/daggerok/bun-examples/tree/master/hello-bun.
describe(
  `${eco} > ${regPkgName}`,
  { skip: isPackageTestingSkipped(eco, regPkgName) },
  () => {
    const { testNpmFixturesPath } = constants
    const hyriousBunLockb = require(resolveOriginalPackageName(regPkgName))

    it('parses bun.lockb into yarn.lock contents', () => {
      const lockbPath = path.join(testNpmFixturesPath, 'fixture-bun.lockb')
      const yarnLockPath = path.join(testNpmFixturesPath, 'fixture-yarn.lock')
      const lockb = readFileSync(lockbPath)
      const yarnLock = readFileSync(yarnLockPath, 'utf8')
      assert.strictEqual(hyriousBunLockb.parse(lockb), yarnLock)
    })
  }
)
