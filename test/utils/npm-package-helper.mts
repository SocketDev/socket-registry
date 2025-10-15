/**
 * @fileoverview Helper utilities for NPM package testing.
 * Provides standardized setup for package installation and testing.
 */

import path from 'node:path'

import constants from '../../scripts/constants.mjs'
import { installPackageForTesting } from '../../scripts/utils/package.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'

const { NPM, npmPackagesPath } = constants

interface SetupNpmPackageTestResult {
  eco: string
  pkgPath: string
  // biome-ignore lint/suspicious/noExplicitAny: Package modules can be any type.
  module: any
  skip: boolean
  sockRegPkgName: string
}

/**
 * Sets up an NPM package test environment with standard boilerplate.
 *
 * @param filename - The test filename (typically __filename or import.meta.url).
 * @returns Promise<SetupNpmPackageTestResult> - Object containing test context and installed package.
 *
 * @example
 * import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'
 *
 * const { module: assert, pkgPath, skip, eco, sockRegPkgName } = await setupNpmPackageTest(__filename)
 *
 * describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
 *   it('should work', () => {
 *     expect(assert).toBeDefined()
 *   })
 * })
 */
export async function setupNpmPackageTest(
  filename: string,
): Promise<SetupNpmPackageTestResult> {
  const sockRegPkgName = path.basename(filename, '.test.mts')
  const eco = NPM
  const skip = isPackageTestingSkipped(sockRegPkgName)

  let pkgPath = ''
  // biome-ignore lint/suspicious/noExplicitAny: Test module can be any type.
  let module: any

  if (!skip) {
    const result = await installPackageForTesting(
      npmPackagesPath,
      sockRegPkgName,
    )
    if (!result.installed) {
      throw new Error(`Failed to install package: ${result.reason}`)
    }
    if (!result.packagePath) {
      throw new Error('Package path is undefined after installation')
    }
    pkgPath = result.packagePath
    module = require(pkgPath)
  }

  return {
    eco,
    module,
    pkgPath,
    skip,
    sockRegPkgName,
  }
}

/**
 * Creates a beforeAll hook that sets up an NPM package test.
 * Useful for simpler test files that just need the setup in beforeAll.
 *
 * @param filename - The test filename (typically __filename).
 * @param callback - Callback to receive the setup result.
 *
 * @example
 * createNpmPackageBeforeAll(__filename, ({ module, pkgPath }) => {
 *   assert = module
 *   testPkgPath = pkgPath
 * })
 */
export function createNpmPackageBeforeAll(
  filename: string,
  callback: (result: Omit<SetupNpmPackageTestResult, 'skip'>) => void,
): () => Promise<void> {
  return async () => {
    const { eco, module, pkgPath, sockRegPkgName } =
      await setupNpmPackageTest(filename)
    callback({ eco, module, pkgPath, sockRegPkgName })
  }
}
