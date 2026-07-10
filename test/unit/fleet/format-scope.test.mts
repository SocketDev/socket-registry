// vitest specs for scripts/fleet/_shared/format-scope.mts — the pure
// core of the oxfmt scope resolver: pickConfig, pickIgnorePath, buildOxfmtArgs.
// Fixture roots are passed via the functions' `cwd` option (never
// process.chdir(), which worker-thread pools don't support).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, test } from 'vitest'

// Each import is isolated (vitest default isolate: true), so the module-level
// cachedIgnorePath is fresh for this file. Explicit-cwd calls bypass the cache
// entirely; only cwd-less calls (the runtime shape) cache.
import {
  buildOxfmtArgs,
  FLEET_IGNORE_PATH,
  pickConfig,
  pickIgnorePath,
} from '../../../scripts/fleet/_shared/format-scope.mts'

// Build a minimal fake repo root with optional overlay files.
function makeRoot(options?: {
  repoConfig?: boolean | undefined
  repoIgnore?: string | undefined
  fleetIgnore?: string | undefined
}): string {
  const opts = { __proto__: null, ...options } as typeof options
  const root = mkdtempSync(path.join(os.tmpdir(), 'format-scope-'))
  mkdirSync(path.join(root, '.config', 'fleet'), { recursive: true })
  mkdirSync(path.join(root, '.config', 'repo'), { recursive: true })

  if (opts?.repoConfig) {
    writeFileSync(
      path.join(root, '.config', 'repo', 'oxfmtrc.json'),
      '{}',
      'utf8',
    )
  }
  if (opts?.fleetIgnore !== undefined) {
    writeFileSync(
      path.join(root, '.config', 'fleet', '.prettierignore'),
      opts.fleetIgnore,
      'utf8',
    )
  }
  if (opts?.repoIgnore !== undefined) {
    writeFileSync(
      path.join(root, '.config', 'repo', '.prettierignore'),
      opts.repoIgnore,
      'utf8',
    )
  }
  return root
}

describe('pickConfig', () => {
  test('returns fleet path when no repo overlay exists', () => {
    const root = makeRoot()
    assert.equal(
      pickConfig('oxfmtrc.json', { cwd: root }),
      path.join(root, '.config', 'fleet', 'oxfmtrc.json'),
    )
    rmSync(root, { recursive: true, force: true })
  })

  test('returns repo overlay path when it exists', () => {
    const root = makeRoot({ repoConfig: true })
    assert.equal(
      pickConfig('oxfmtrc.json', { cwd: root }),
      path.join(root, '.config', 'repo', 'oxfmtrc.json'),
    )
    rmSync(root, { recursive: true, force: true })
  })

  test('works for any basename, not just oxfmtrc.json', () => {
    const root = makeRoot()
    assert.equal(
      pickConfig('oxlintrc.json', { cwd: root }),
      path.join(root, '.config', 'fleet', 'oxlintrc.json'),
    )
    rmSync(root, { recursive: true, force: true })
  })

  test('picks repo overlay for any basename when present', () => {
    const root = makeRoot()
    writeFileSync(
      path.join(root, '.config', 'repo', 'oxlintrc.json'),
      '{}',
      'utf8',
    )
    assert.equal(
      pickConfig('oxlintrc.json', { cwd: root }),
      path.join(root, '.config', 'repo', 'oxlintrc.json'),
    )
    rmSync(root, { recursive: true, force: true })
  })

  test('cwd-less call resolves relative to the process cwd (runtime shape)', () => {
    // Run from the real repo root: the fleet config exists, no fixture needed.
    assert.equal(
      pickConfig('__no-such-config__.json'),
      path.join('.config', 'fleet', '__no-such-config__.json'),
    )
  })
})

describe('FLEET_IGNORE_PATH constant', () => {
  test('is .config/fleet/.prettierignore', () => {
    assert.equal(
      FLEET_IGNORE_PATH,
      path.join('.config', 'fleet', '.prettierignore'),
    )
  })
})

describe('pickIgnorePath', () => {
  test('returns fleet path when no repo overlay exists', () => {
    const root = makeRoot({ fleetIgnore: '# fleet\n.claude/\n' })
    assert.equal(
      pickIgnorePath({ cwd: root }),
      path.join(root, FLEET_IGNORE_PATH),
    )
    rmSync(root, { recursive: true, force: true })
  })

  test('explicit-cwd calls are not cached (fixture roots never leak)', () => {
    const rootA = makeRoot({ fleetIgnore: '# a\n' })
    const rootB = makeRoot({ fleetIgnore: '# b\n' })
    const a = pickIgnorePath({ cwd: rootA })
    const b = pickIgnorePath({ cwd: rootB })
    assert.notEqual(a, b)
    rmSync(rootA, { recursive: true, force: true })
    rmSync(rootB, { recursive: true, force: true })
  })

  test('overlay present: returns a combined temp file containing both bodies', () => {
    const root = makeRoot({
      fleetIgnore: '# fleet-part\n',
      repoIgnore: '# repo-part\n',
    })
    const combined = pickIgnorePath({ cwd: root })
    assert.notEqual(combined, path.join(root, FLEET_IGNORE_PATH))
    assert.ok(combined.includes(os.tmpdir()))
    rmSync(root, { recursive: true, force: true })
  })

  test('cwd-less calls cache: second call returns the same path', () => {
    // Runs against the real repo root — deterministic for a given checkout.
    const first = pickIgnorePath()
    const second = pickIgnorePath()
    assert.equal(first, second)
  })
})

// buildOxfmtArgs threads cwd through to pickConfig/pickIgnorePath; results are
// deterministic for a given fixture root.
describe('buildOxfmtArgs', () => {
  let root: string

  beforeEach(() => {
    root = makeRoot({ fleetIgnore: '# fleet\n' })
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  test('default call emits --write and targets "."', () => {
    const args = buildOxfmtArgs({ cwd: root })
    assert.equal(args[0], 'exec')
    assert.equal(args[1], 'oxfmt')
    assert.ok(args.includes('--write'), 'must have --write when check is falsy')
    assert.ok(
      !args.includes('--check'),
      'must not have --check when check is falsy',
    )
    assert.ok(
      args.includes('--no-error-on-unmatched-pattern'),
      'must always include --no-error-on-unmatched-pattern',
    )
    const lastArg = args.at(-1)
    assert.equal(lastArg, '.', 'default files target must be "."')
  })

  test('check: true emits --check instead of --write', () => {
    const args = buildOxfmtArgs({ check: true, cwd: root })
    assert.ok(args.includes('--check'))
    assert.ok(!args.includes('--write'))
  })

  test('check: false emits --write', () => {
    const args = buildOxfmtArgs({ check: false, cwd: root })
    assert.ok(args.includes('--write'))
    assert.ok(!args.includes('--check'))
  })

  test('explicit files replaces the default "."', () => {
    const args = buildOxfmtArgs({ cwd: root, files: ['src/', 'test/'] })
    // trailing positional args must be the provided files
    const last2 = args.slice(-2)
    assert.deepEqual(last2, ['src/', 'test/'])
    assert.ok(!args.includes('.'))
  })

  test('empty files array falls back to "."', () => {
    const args = buildOxfmtArgs({ cwd: root, files: [] })
    assert.equal(args.at(-1), '.')
  })

  test('argv structure: exec oxfmt -c <config> --ignore-path <path> <mode> --no-error-on-unmatched-pattern <files>', () => {
    const args = buildOxfmtArgs({ check: true, cwd: root, files: ['lib/'] })
    assert.equal(args[0], 'exec')
    assert.equal(args[1], 'oxfmt')
    assert.equal(args[2], '-c')
    // config at index 3
    assert.ok(
      args[3]!.includes('oxfmtrc.json'),
      'index 3 should be the config path',
    )
    assert.equal(args[4], '--ignore-path')
    // ignore-path at index 5
    assert.ok(typeof args[5] === 'string' && args[5].length > 0)
    assert.equal(args[6], '--check')
    assert.equal(args[7], '--no-error-on-unmatched-pattern')
    assert.equal(args[8], 'lib/')
  })

  test('--ignore-path is always present (the invariant the module exists to enforce)', () => {
    const argsWrite = buildOxfmtArgs({ cwd: root })
    const argsCheck = buildOxfmtArgs({ check: true, cwd: root })
    assert.ok(argsWrite.includes('--ignore-path'))
    assert.ok(argsCheck.includes('--ignore-path'))
  })

  test('options spread does not mutate the caller array', () => {
    const files = ['a.ts', 'b.ts']
    buildOxfmtArgs({ cwd: root, files })
    // original reference must be untouched
    assert.deepEqual(files, ['a.ts', 'b.ts'])
  })

  test('undefined options behaves identically to no argument', () => {
    const withUndefined = buildOxfmtArgs(undefined)
    const withNothing = buildOxfmtArgs()
    assert.deepEqual(withUndefined, withNothing)
  })
})
