import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants'
import { installPackageForTesting } from '../../scripts/utils/package-utils'
import { isPackageTestingSkipped } from '../../scripts/utils/tests'

const { NPM, UTF8 } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')

// @hyrious/bun.lockb has no unit tests.
// https://github.com/hyrious/bun.lockb/tree/v0.0.4
// Test case from https://github.com/daggerok/bun-examples/tree/master/hello-bun.
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    let pkgPath: string
    let hyriousBunLockb: any

    beforeAll(async () => {
      const result = await installPackageForTesting(sockRegPkgName)
      if (!result.installed) {
        throw new Error(`Failed to install package: ${result.reason}`)
      }
      pkgPath = result.packagePath!
      hyriousBunLockb = require(path.join(pkgPath, 'index.cjs'))
    })

    const { testNpmFixturesPath } = constants

    it('parses bun.lockb into yarn.lock contents', () => {
      const lockbPath = path.join(testNpmFixturesPath, 'fixture-bun.lockb')
      const yarnLockPath = path.join(testNpmFixturesPath, 'fixture-yarn.lock')
      const lockb = readFileSync(lockbPath)
      const yarnLock = readFileSync(yarnLockPath, UTF8)
      expect(hyriousBunLockb.parse(lockb)).toBe(yarnLock)
    })
  },
)
