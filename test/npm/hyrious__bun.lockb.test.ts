import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import fs from 'fs-extra'

// @ts-ignore
import constants from '@socketregistry/scripts/constants'
const { testNpmFixturesPath } = constants

const regPkgName = '@hyrious/bun.lockb'
const hyriousBunLockb: any = require(regPkgName)

const lockbPath = path.join(testNpmFixturesPath, 'fixture-bun.lockb')
const yarnLockPath = path.join(testNpmFixturesPath, 'fixture-yarn.lock')

// @hyrious/bun.lockb has no unit tests.
// https://github.com/hyrious/bun.lockb/tree/v0.0.4
// Added test case from https://github.com/daggerok/bun-examples/tree/master/hello-bun.
describe(`npm > ${regPkgName}`, () => {
  it('parses bun.lockb into yarn.lock contents', () => {
    const lockb = fs.readFileSync(lockbPath)
    const yarnLock = fs.readFileSync(yarnLockPath, 'utf8')
    assert.strictEqual(hyriousBunLockb.parse(lockb), yarnLock)
  })
})
