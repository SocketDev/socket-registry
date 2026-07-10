// vitest specs for collect-submodule-consumers — the pure bucketing + the
// outside-only (internal-self-reference) filter that owns the documented
// false-verdict trap.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  bucketForFile,
  isInsideSubmodule,
} from '../../../scripts/fleet/optimizing-submodules/collect-submodule-consumers.mts'

describe('bucketForFile', () => {
  test('rust manifests + build script', () => {
    assert.equal(bucketForFile('Cargo.toml'), 'rust')
    assert.equal(bucketForFile('crates/x/build.rs'), 'rust')
  })
  test('c/c++ build files', () => {
    assert.equal(bucketForFile('CMakeLists.txt'), 'cpp')
    assert.equal(bucketForFile('src/binding.gyp'), 'cpp')
  })
  test('go module files', () => {
    assert.equal(bucketForFile('go.mod'), 'go')
    assert.equal(bucketForFile('go.sum'), 'go')
  })
  test('js/ts: package.json, source, vitest config', () => {
    assert.equal(bucketForFile('package.json'), 'jsts')
    assert.equal(bucketForFile('src/index.mts'), 'jsts')
    assert.equal(bucketForFile('a/b/foo.cjs'), 'jsts')
    assert.equal(bucketForFile('vitest.config.mts'), 'jsts')
  })
  test('test corpus by path', () => {
    // A source-extension file-type match wins before the path bucket: a .mts
    // under test/ is jsts (it's a runner, not a corpus fixture).
    assert.equal(bucketForFile('test/runner.mts'), 'jsts')
    // Non-source files under test/ are corpus fixtures.
    assert.equal(bucketForFile('test/fixtures/data.txt'), 'testCorpus')
    assert.equal(bucketForFile('packages/x/test/golden.json'), 'testCorpus')
  })
  test('build by scripts/ path', () => {
    assert.equal(bucketForFile('scripts/bench.sh'), 'build')
    assert.equal(bucketForFile('packages/x/scripts/gen.py'), 'build')
  })
  test('everything else is other', () => {
    assert.equal(bucketForFile('README.org'), 'other')
    assert.equal(bucketForFile('docs/notes.adoc'), 'other')
  })
})

describe('isInsideSubmodule (the internal-self-reference filter)', () => {
  test('a hit inside the submodule dir is internal', () => {
    assert.equal(
      isInsideSubmodule('upstream/blake3/b3sum/Cargo.toml', 'upstream/blake3'),
      true,
    )
    assert.equal(isInsideSubmodule('upstream/blake3', 'upstream/blake3'), true)
  })
  test('a hit outside the submodule dir is external (real consumption)', () => {
    assert.equal(isInsideSubmodule('Cargo.toml', 'upstream/blake3'), false)
    assert.equal(
      isInsideSubmodule('crates/host/build.rs', 'upstream/blake3'),
      false,
    )
  })
  test('a sibling dir sharing a prefix is NOT inside (no false positive)', () => {
    // upstream/blake3-extra must not count as inside upstream/blake3.
    assert.equal(
      isInsideSubmodule('upstream/blake3-extra/x.rs', 'upstream/blake3'),
      false,
    )
  })
  test('windows-separator hit normalizes', () => {
    assert.equal(
      isInsideSubmodule('upstream\\blake3\\src\\lib.rs', 'upstream/blake3'),
      true,
    )
  })
})
