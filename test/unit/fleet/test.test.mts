// vitest specs for scripts/fleet/test.mts's staged-scope collector.
//
// The pre-commit `node scripts/fleet/test.mts --staged` run is NARROW by
// design: it runs (a) staged test files directly plus (b) for each staged
// source file, the test files that mirror it via the MIRROR resolver — never
// vitest related, never an untracked (foreign, mid-write) test another live
// actor hasn't committed. buildStagedTestFiles + mirrorTestsFor encode that
// scope rule; these specs lock it in (finder injected — no filesystem).

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  buildStagedTestFiles,
  findMirrorTests,
  mirrorTestsFor,
} from '../../../scripts/fleet/test.mts'

// A finder that maps a source path to its mirror test paths, standing in for
// the real findMirrorTests so these specs never touch the filesystem.
function fakeFinder(known: Record<string, string[]>) {
  return (sourcePath: string): string[] => known[sourcePath] ?? []
}

describe('mirrorTestsFor', () => {
  test('maps a source path to its mirror test(s) via the injected finder', () => {
    const finder = fakeFinder({
      'scripts/fleet/foo.mts': ['test/unit/fleet/foo.test.mts'],
    })
    assert.deepEqual(mirrorTestsFor('scripts/fleet/foo.mts', finder), [
      'test/unit/fleet/foo.test.mts',
    ])
  })

  test('returns empty when the source has no mirror test', () => {
    assert.deepEqual(
      mirrorTestsFor('scripts/fleet/orphan.mts', fakeFinder({})),
      [],
    )
  })

  test('returns empty for an empty source path', () => {
    assert.deepEqual(mirrorTestsFor('', fakeFinder({})), [])
  })

  test('returns multiple mirror tests (bare + shard + direct-importer)', () => {
    const finder = fakeFinder({
      'scripts/fleet/cover.mts': [
        'test/unit/fleet/cover.test.mts',
        'test/unit/fleet/cover-thresholds.test.mts',
        'test/unit/fleet/cover-discovery.test.mts',
      ],
    })
    assert.deepEqual(mirrorTestsFor('scripts/fleet/cover.mts', finder), [
      'test/unit/fleet/cover.test.mts',
      'test/unit/fleet/cover-thresholds.test.mts',
      'test/unit/fleet/cover-discovery.test.mts',
    ])
  })
})

describe('buildStagedTestFiles — narrow staged scope', () => {
  test('runs staged test files directly', () => {
    const files = buildStagedTestFiles(
      ['test/unit/fleet/a.test.mts', 'test/unit/fleet/b.test.mts'],
      [],
      fakeFinder({}),
    )
    assert.deepEqual(files.toSorted(), [
      'test/unit/fleet/a.test.mts',
      'test/unit/fleet/b.test.mts',
    ])
  })

  test('adds mirror tests for staged source files via the mirror resolver', () => {
    const finder = fakeFinder({
      'scripts/fleet/a.mts': ['test/unit/fleet/a.test.mts'],
      'scripts/fleet/b.mts': ['test/unit/fleet/b.test.mts'],
    })
    const files = buildStagedTestFiles(
      ['scripts/fleet/a.mts', 'scripts/fleet/b.mts'],
      [],
      finder,
    )
    assert.deepEqual(files.toSorted(), [
      'test/unit/fleet/a.test.mts',
      'test/unit/fleet/b.test.mts',
    ])
  })

  test('finder receives the full source path, not just the basename', () => {
    const seen: string[] = []
    const finder = (sourcePath: string): string[] => {
      seen.push(sourcePath)
      return []
    }
    buildStagedTestFiles(['scripts/fleet/foo.mts'], [], finder)
    assert.deepEqual(seen, ['scripts/fleet/foo.mts'])
  })

  test('a staged source file with no mirror test contributes nothing', () => {
    assert.deepEqual(
      buildStagedTestFiles(['scripts/fleet/orphan.mts'], [], fakeFinder({})),
      [],
    )
  })

  test('an untracked (foreign, mid-write) mirror test is dropped', () => {
    const foreign = 'test/repo/unit/hooks/foreign-ledger.test.mts'
    const finder = fakeFinder({
      'scripts/fleet/a.mts': [foreign],
    })
    assert.deepEqual(
      buildStagedTestFiles(['scripts/fleet/a.mts'], [foreign], finder),
      [],
    )
    // A staged test file that is itself untracked is likewise dropped.
    assert.deepEqual(
      buildStagedTestFiles([foreign], [foreign], fakeFinder({})),
      [],
    )
  })

  test('deduplicates when two staged sources share a mirror test', () => {
    const finder = fakeFinder({
      'scripts/a.mts': ['test/shared.test.mts'],
      'scripts/b.mts': ['test/shared.test.mts'],
    })
    assert.deepEqual(
      buildStagedTestFiles(['scripts/a.mts', 'scripts/b.mts'], [], finder),
      ['test/shared.test.mts'],
    )
  })

  test('shard tests and check-by-name tests are included when finder returns them', () => {
    // The finder abstracts the real glob+importer logic; these assert that
    // buildStagedTestFiles correctly threads them through.
    const finder = fakeFinder({
      'scripts/fleet/cover.mts': [
        'test/unit/fleet/cover.test.mts',
        'test/unit/fleet/cover-thresholds.test.mts',
      ],
      'scripts/fleet/check/telemetry-deps-are-reviewed.mts': [
        'test/unit/fleet/check-telemetry-deps-are-reviewed.test.mts',
      ],
    })
    const files = buildStagedTestFiles(
      [
        'scripts/fleet/cover.mts',
        'scripts/fleet/check/telemetry-deps-are-reviewed.mts',
      ],
      [],
      finder,
    )
    assert.deepEqual(files.toSorted(), [
      'test/unit/fleet/check-telemetry-deps-are-reviewed.test.mts',
      'test/unit/fleet/cover-thresholds.test.mts',
      'test/unit/fleet/cover.test.mts',
    ])
  })

  test('direct-importer tests are included when finder returns them', () => {
    // A test that imports the source under a different basename is a direct
    // importer; the finder is expected to return it.
    const finder = fakeFinder({
      'scripts/fleet/foo.mts': [
        'test/unit/fleet/foo.test.mts',
        'test/unit/fleet/old-name.test.mts',
      ],
    })
    const files = buildStagedTestFiles(['scripts/fleet/foo.mts'], [], finder)
    assert.deepEqual(files.toSorted(), [
      'test/unit/fleet/foo.test.mts',
      'test/unit/fleet/old-name.test.mts',
    ])
  })
})

describe('findMirrorTests — MIRROR resolver against the live test tree', () => {
  // findMirrorTests walks the real test/ tree on disk, so it can only exercise
  // files that actually exist. These cases target the live wheelhouse repo.
  const REPO_ROOT = new URL('../../../', import.meta.url).pathname.replace(
    /\/$/,
    '',
  )

  test('bare basename: finds test.test.mts for scripts/fleet/test.mts', () => {
    const tests = findMirrorTests('scripts/fleet/test.mts', REPO_ROOT)
    assert.ok(
      tests.some(t => t.endsWith('test/unit/fleet/test.test.mts')),
      `expected test.test.mts in ${JSON.stringify(tests)}`,
    )
  })

  test('shard: finds cover-thresholds.test.mts for scripts/fleet/cover.mts', () => {
    const tests = findMirrorTests('scripts/fleet/cover.mts', REPO_ROOT)
    assert.ok(
      tests.some(t => t.endsWith('cover-thresholds.test.mts')),
      `expected cover-thresholds shard in ${JSON.stringify(tests)}`,
    )
  })

  test('check-by-name: finds check-<name>.test.mts when the enforcer exists', () => {
    const tests = findMirrorTests(
      'scripts/fleet/check/tests-are-mirror-named.mts',
      REPO_ROOT,
    )
    assert.ok(
      tests.some(t => t.endsWith('tests-are-mirror-named.test.mts')),
      `expected tests-are-mirror-named.test.mts in ${JSON.stringify(tests)}`,
    )
  })

  test('returns empty for a source with no corresponding test', () => {
    const tests = findMirrorTests(
      'scripts/fleet/nonexistent-orphan-source.mts',
      REPO_ROOT,
    )
    assert.deepEqual(tests, [])
  })

  test('returns empty for an empty source path', () => {
    assert.deepEqual(findMirrorTests('', REPO_ROOT), [])
  })
})
