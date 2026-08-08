/**
 * @file Helper for NPM package testing. Loads override modules directly from
 *   packages/npm/ without installing.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import { NPM, NPM_PACKAGES_PATH } from '../../scripts/repo/constants/paths.mts'
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

// Resolve the entry to require for an override. Node's directory `require(dir)`
// uses legacy main/index.js resolution and IGNORES the `exports` field, so an
// override that declares only `exports` (e.g. a `node` condition pointing at
// index.cjs) with no main/index.js cannot be loaded that way — it silently
// becomes the skip-stub and its suite never runs. Resolve the package's own
// declared entry the way a Node consumer would (honoring `exports`), falling
// back to the directory for overrides that still rely on main/index.js.
function resolveOverrideEntry(pkgPath: string): string {
  let pkgJson: { exports?: unknown | undefined } | undefined
  try {
    pkgJson = require(path.join(pkgPath, 'package.json'))
  } catch {
    return pkgPath
  }
  const target = resolveExportsTarget(pkgJson?.exports)
  return target ? path.join(pkgPath, target) : pkgPath
}

function resolveExportsTarget(exportsField: unknown): string | undefined {
  if (typeof exportsField === 'string') {
    return exportsField
  }
  if (!exportsField || typeof exportsField !== 'object') {
    return undefined
  }
  const entries = exportsField as Record<string, unknown>
  // Subpath exports keep the main entry under '.'; a conditional-only exports
  // object IS the conditions map.
  return resolveExportCondition('.' in entries ? entries['.'] : entries)
}

// Conditions a CommonJS `require` activates, in Node's precedence. Keys
// outside this set (import, browser, deno, worker, types, …) are skipped so
// the test loads the same entry a `require('<pkg>')` consumer would, not the
// ESM or browser build. Picking the first key blindly resolves an `import`
// branch to an `.mjs` that `require` then mis-loads.
const REQUIRE_CONDITIONS = new Set([
  'default',
  'node',
  'node-addons',
  'require',
])

function resolveExportCondition(node: unknown): string | undefined {
  if (typeof node === 'string') {
    return node
  }
  if (!node || typeof node !== 'object') {
    return undefined
  }
  const conditions = node as Record<string, unknown>
  // Walk conditions in declared order (first match wins, like Node), following
  // only those a CJS require activates.
  const keys = Object.keys(conditions)
  for (let i = 0, { length } = keys; i < length; i += 1) {
    const key = keys[i]!
    if (!REQUIRE_CONDITIONS.has(key)) {
      continue
    }
    const resolved = resolveExportCondition(conditions[key])
    if (resolved !== undefined) {
      return resolved
    }
  }
  return undefined
}

// Render one lane's outcome for the divergence error: the thrown error's
// constructor, or the returned value.
function laneOutcome(outcome: LaneOutcome): string {
  if (outcome.threw) {
    return `threw ${outcome.error instanceof Error ? outcome.error.constructor.name : 'a non-Error'}`
  }
  const { value } = outcome
  if (value !== null && typeof value === 'object') {
    try {
      return `returned ${JSON.stringify(value)}`
    } catch {
      return 'returned an unserializable object'
    }
  }
  return `returned ${String(value)}`
}

interface LaneOutcome {
  error?: unknown | undefined
  threw: boolean
  value?: unknown | undefined
}

function callLane(
  lane: (...args: unknown[]) => unknown,
  thisArg: unknown,
  args: unknown[],
): LaneOutcome {
  try {
    return { threw: false, value: Reflect.apply(lane, thisArg, args) }
  } catch (e) {
    return { error: e, threw: true }
  }
}

function outcomesAgree(a: LaneOutcome, b: LaneOutcome): boolean {
  // Both throwing counts as agreement; error text may legitimately differ.
  if (a.threw || b.threw) {
    return a.threw === b.threw
  }
  if (Object.is(a.value, b.value)) {
    return true
  }
  const bothObjects =
    a.value !== null &&
    typeof a.value === 'object' &&
    b.value !== null &&
    typeof b.value === 'object'
  if (!bothObjects) {
    return false
  }
  try {
    return JSON.stringify(a.value) === JSON.stringify(b.value)
  } catch {
    return false
  }
}

// Differential wrapper for dual-lane overrides: every suite call runs BOTH
// entry lanes and throws when they disagree, so the whole ported suite gates
// index.js and index.cjs at once. The consumer-resolved entry stays the
// primary: its return value, name, and properties are what the suite sees.
function createLaneMirror(
  pkgName: string,
  primary: (...args: unknown[]) => unknown,
  primaryLabel: string,
  shadow: (...args: unknown[]) => unknown,
  shadowLabel: string,
): unknown {
  return new Proxy(primary, {
    apply(target, thisArg, args: unknown[]) {
      const primaryOutcome = callLane(target, thisArg, args)
      const shadowOutcome = callLane(shadow, thisArg, args)
      if (!outcomesAgree(primaryOutcome, shadowOutcome)) {
        throw new Error(
          `packages/npm/${pkgName}: entry lanes disagree. Saw: ${primaryLabel} ${laneOutcome(primaryOutcome)}, ${shadowLabel} ${laneOutcome(shadowOutcome)}. Wanted: identical outcomes on every input. Fix: fork the divergent lane to match the upstream contract (see scripts/repo/check/override-lanes-agree.mts).`,
        )
      }
      if (primaryOutcome.threw) {
        throw primaryOutcome.error
      }
      return primaryOutcome.value
    },
  })
}

// Load the override the way a consumer would, then mirror the sibling lane in
// when the package ships both index.js and index.cjs so suites test both.
function loadOverrideModule(pkgPath: string, pkgName: string): unknown {
  const entry = resolveOverrideEntry(pkgPath)
  const module: unknown = require(entry)
  const jsPath = path.join(pkgPath, 'index.js')
  const cjsPath = path.join(pkgPath, 'index.cjs')
  if (!existsSync(jsPath) || !existsSync(cjsPath)) {
    return module
  }
  const resolvedEntry = path.resolve(entry)
  const shadowPath = resolvedEntry === path.resolve(cjsPath) ? jsPath : cjsPath
  let shadow: unknown
  try {
    shadow = require(shadowPath)
  } catch {
    return module
  }
  if (typeof module !== 'function' || typeof shadow !== 'function') {
    return module
  }
  const primaryLabel = path.basename(shadowPath === jsPath ? cjsPath : jsPath)
  return createLaneMirror(
    pkgName,
    module as (...args: unknown[]) => unknown,
    primaryLabel,
    shadow as (...args: unknown[]) => unknown,
    path.basename(shadowPath),
  )
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
  const skip = isPackageTestingSkipped()
  const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let module: any = SKIPPED_MODULE_STUB

  if (!skip) {
    try {
      module = loadOverrideModule(pkgPath, sockRegPkgName)
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
