import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { TEST_NPM_FIXTURES_PATH } from '../../scripts/constants/paths.mjs'
import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const UTF8 = 'utf8'
const testNpmFixturesPath = TEST_NPM_FIXTURES_PATH
const { eco, pkgPath, skip, sockRegPkgName } =
  await setupNpmPackageTest(__filename)

// @hyrious/bun.lockb has no unit tests.
// https://github.com/hyrious/bun.lockb/tree/v0.0.4
// Test case from https://github.com/daggerok/bun-examples/tree/master/hello-bun.
describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const hyriousBunLockbIndex = require(path.join(pkgPath, 'index.cjs'))

  it('parses bun.lockb into yarn.lock contents', () => {
    const lockbPath = path.join(testNpmFixturesPath, 'fixture-bun.lockb')
    const yarnLockPath = path.join(testNpmFixturesPath, 'fixture-yarn.lock')
    const lockb = readFileSync(lockbPath)
    const yarnLock = readFileSync(yarnLockPath, UTF8)
    expect(hyriousBunLockbIndex.parse(lockb)).toBe(yarnLock)
  })
})
