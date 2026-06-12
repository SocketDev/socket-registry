/**
 * @file Helper for NPM package testing. Loads override modules directly from
 *   packages/npm/ without installing.
 */

import path from 'node:path'

import { NPM, NPM_PACKAGES_PATH } from '../../scripts/constants/paths.mts'
import { isPackageTestingSkipped } from '../../scripts/repo/util/tests.mts'

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

// Callable, property-accessible no-op returned for `module` when the package
// test is skipped (or the override fails to load). Some specs evaluate the
// module at describe-time — e.g. `describe('…', { skip: !hasPropertyDescriptors() })`
// — before any `skip`-gated `it`. Handing back `undefined` there throws
// "x is not a function" and crashes the whole suite instead of skipping it.
// A self-returning Proxy makes `stub()`, `stub.foo`, `stub.foo()`, and
// destructuring all resolve to falsy without throwing.
const SKIPPED_MODULE_STUB: unknown = new Proxy(function skippedModule() {}, {
  get: () => SKIPPED_MODULE_STUB,
  apply: () => undefined,
})

export interface SetupNpmPackageTestOptions {
  // Explicit Socket-registry package name. By default the name is derived from
  // the test filename (`<pkg>.test.mts`), which only works when a package's
  // whole suite lives in one file. When a suite is split across sibling files
  // (e.g. `safer-buffer.test.mts` + `safer-buffer-alloc.test.mts`), pass the
  // real package name here so every split file binds to the same override
  // instead of resolving a non-existent `<pkg>-<group>` and silently skipping.
  package?: string | undefined
}

/**
 * Sets up an NPM package test by loading the module from packages/npm/.
 */
export function setupNpmPackageTest(
  filename: string,
  options?: SetupNpmPackageTestOptions | undefined,
): SetupNpmPackageTestResult {
  const opts = { __proto__: null, ...options } as SetupNpmPackageTestOptions
  const sockRegPkgName = opts.package ?? path.basename(filename, '.test.mts')
  const eco = NPM
  const skip = isPackageTestingSkipped(eco, sockRegPkgName)
  const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let module: any = SKIPPED_MODULE_STUB

  if (!skip) {
    try {
      module = require(pkgPath)
    } catch {
      return {
        eco,
        module: SKIPPED_MODULE_STUB,
        pkgPath,
        skip: true,
        sockRegPkgName,
      }
    }
  }

  return { eco, module, pkgPath, skip, sockRegPkgName }
}
