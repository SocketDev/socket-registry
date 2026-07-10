// vitest spec for the generated/vendored ignore single-source — the list that
// lint (oxlint), test (vitest exclude + test.mts staged-filter), and format
// derive from so the ignore surfaces can't drift apart.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  GENERATED_GLOBS,
  isGeneratedPath,
} from '../../../scripts/fleet/constants/generated-globs.mts'

describe('generated-globs', () => {
  test('every glob is **/-anchored so it matches at any monorepo depth', () => {
    assert.ok(GENERATED_GLOBS.length > 0)
    for (const glob of GENERATED_GLOBS) {
      assert.ok(glob.startsWith('**/'), `glob not **/-anchored: ${glob}`)
    }
  })

  test('isGeneratedPath matches generated/vendored trees by path segment', () => {
    for (const p of [
      'packages/x/dist/a.js',
      'lang/rust/upstream/acorn/x.js',
      'build/out.js',
      'a/b/coverage/report.js',
      'x/vendor/dep.js',
      'test/fixtures/deep.js',
      'pkg/generated.wasm',
    ]) {
      assert.equal(isGeneratedPath(p), true, `expected generated: ${p}`)
    }
  })

  test('isGeneratedPath does NOT match source (no false positives)', () => {
    for (const p of [
      'src/parser.ts',
      'src/foo/dist.ts', // filename contains "dist", not a path segment
      'scripts/fleet/test.mts',
      'packages/acorn/lang/rust/crates/parser/src/core.rs',
      'test/unit/fleet/generated-globs.test.mts',
    ]) {
      assert.equal(isGeneratedPath(p), false, `expected source: ${p}`)
    }
  })

  test('backslash paths (Windows) normalize before matching', () => {
    assert.equal(isGeneratedPath('packages\\x\\dist\\a.js'), true)
    assert.equal(isGeneratedPath('src\\parser.ts'), false)
  })
})
