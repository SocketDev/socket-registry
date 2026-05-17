/**
 * @fileoverview Helper for NPM package testing.
 * Loads override modules directly from packages/npm/ without installing.
 */

import path from 'node:path'

import { NPM, NPM_PACKAGES_PATH } from '../../scripts/constants/paths.mts'
import { isPackageTestingSkipped } from '../../scripts/util/tests.mts'

interface SetupNpmPackageTestResult {
  eco: string
  pkgPath: string
  // Intentionally `any` — callers invoke the loaded module in every conceivable
  // way (function call, property access, destructure). Narrowing would force
  // casts at ~300 test sites for no safety win.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  module: any
  skip: boolean
  sockRegPkgName: string
}

/**
 * Sets up an NPM package test by loading the module from packages/npm/.
 */
export async function setupNpmPackageTest(
  filename: string,
): Promise<SetupNpmPackageTestResult> {
  const sockRegPkgName = path.basename(filename, '.test.mts')
  const eco = NPM
  const skip = isPackageTestingSkipped(eco, sockRegPkgName)
  const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let module: any

  if (!skip) {
    try {
      module = require(pkgPath)
    } catch {
      return { eco, module: undefined, pkgPath, skip: true, sockRegPkgName }
    }
  }

  return { eco, module, pkgPath, skip, sockRegPkgName }
}
