// vitest spec for the three-way release hash gate
// (scripts/fleet/lib/verify-release-hashes.mts). Exercises the pure comparison
// logic (hashBuffer, compareHashSources) and the verifyReleaseHashes
// orchestration with injected fetchers, so no npm registry or `gh` is touched.

import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import { describe, test } from 'vitest'

import {
  compareHashSources,
  hashBuffer,
  ReleaseHashMismatchError,
  verifyReleaseHashes,
} from '../../../scripts/fleet/lib/verify-release-hashes.mts'

const INTEGRITY_A = 'sha512-AAAAAAAAAAAAAAAAAAAAAA=='
const INTEGRITY_B = 'sha512-BBBBBBBBBBBBBBBBBBBBBB=='
const SHASUM_A = 'a0000000000000000000000000000000000000aa'
const SHASUM_B = 'b0000000000000000000000000000000000000bb'

describe('hashBuffer', () => {
  test('computes sha512 SRI + sha1 hex, deterministically', () => {
    const buffer = Buffer.from('hello')
    const first = hashBuffer(buffer)
    const second = hashBuffer(Buffer.from('hello'))
    assert.deepEqual(first, second)
    assert.equal(first.shasum, 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
    assert.ok(first.integrity.startsWith('sha512-'))
    assert.equal(
      first.integrity,
      `sha512-${crypto.createHash('sha512').update(buffer).digest('base64')}`,
    )
  })
})

describe('compareHashSources', () => {
  test('needs at least two sources', () => {
    const result = compareHashSources([
      { integrity: INTEGRITY_A, label: 'local pack', shasum: SHASUM_A },
    ])
    assert.equal(result.ok, false)
    assert.equal(result.algorithm, undefined)
  })

  test('all integrity match → ok on the strong axis', () => {
    const result = compareHashSources([
      { integrity: INTEGRITY_A, label: 'local pack', shasum: SHASUM_A },
      { integrity: INTEGRITY_A, label: 'GitHub release', shasum: SHASUM_A },
      { integrity: INTEGRITY_A, label: 'npm registry', shasum: SHASUM_A },
    ])
    assert.equal(result.ok, true)
    assert.equal(result.algorithm, 'integrity')
    assert.equal(result.digest, INTEGRITY_A)
    assert.deepEqual(result.disagreeing, [])
  })

  test('one integrity differs → not ok, names the divergent source', () => {
    const result = compareHashSources([
      { integrity: INTEGRITY_A, label: 'local pack', shasum: SHASUM_A },
      { integrity: INTEGRITY_B, label: 'GitHub release', shasum: SHASUM_A },
      { integrity: INTEGRITY_A, label: 'npm registry', shasum: SHASUM_A },
    ])
    assert.equal(result.ok, false)
    assert.equal(result.algorithm, 'integrity')
    assert.deepEqual(result.disagreeing, ['GitHub release'])
  })

  test('registry lacks integrity but all shasum match → ok on the fallback axis', () => {
    const result = compareHashSources([
      { integrity: INTEGRITY_A, label: 'local pack', shasum: SHASUM_A },
      { integrity: INTEGRITY_A, label: 'GitHub release', shasum: SHASUM_A },
      { integrity: undefined, label: 'npm staging', shasum: SHASUM_A },
    ])
    assert.equal(result.ok, true)
    assert.equal(result.algorithm, 'shasum')
    assert.equal(result.digest, SHASUM_A)
  })

  test('registry lacks integrity and a shasum differs → not ok', () => {
    const result = compareHashSources([
      { integrity: INTEGRITY_A, label: 'local pack', shasum: SHASUM_A },
      { integrity: INTEGRITY_A, label: 'GitHub release', shasum: SHASUM_A },
      { integrity: undefined, label: 'npm staging', shasum: SHASUM_B },
    ])
    assert.equal(result.ok, false)
    assert.equal(result.algorithm, 'shasum')
    assert.deepEqual(result.disagreeing, ['npm staging'])
  })

  test('a source with neither axis → insufficient, not ok', () => {
    const result = compareHashSources([
      { integrity: INTEGRITY_A, label: 'local pack', shasum: SHASUM_A },
      { integrity: undefined, label: 'npm registry', shasum: undefined },
    ])
    assert.equal(result.ok, false)
    assert.equal(result.algorithm, undefined)
    assert.deepEqual(result.disagreeing, ['npm registry'])
  })

  test('an integrity mismatch never falls through to a matching shasum', () => {
    // All sources carry integrity, so integrity is the axis. Even though every
    // shasum matches, the integrity divergence must be a hard fail — a weaker
    // sha1 agreement can never rescue a strong sha512 mismatch.
    const result = compareHashSources([
      { integrity: INTEGRITY_A, label: 'local pack', shasum: SHASUM_A },
      { integrity: INTEGRITY_B, label: 'GitHub release', shasum: SHASUM_A },
      { integrity: INTEGRITY_A, label: 'npm registry', shasum: SHASUM_A },
    ])
    assert.equal(result.algorithm, 'integrity')
    assert.equal(result.ok, false)
  })
})

describe('verifyReleaseHashes', () => {
  test('resolves when all three sources agree, and uses the tarball basename as the asset name', async () => {
    let seenAssetName: string | undefined
    const comparison = await verifyReleaseHashes({
      cwd: '/repo',
      fetchGitHubAssetDigest: async options => {
        seenAssetName = options.assetName
        return {
          integrity: INTEGRITY_A,
          label: 'GitHub release',
          shasum: SHASUM_A,
        }
      },
      fetchRegistryDigest: async () => ({
        integrity: INTEGRITY_A,
        label: 'npm registry',
        shasum: SHASUM_A,
      }),
      hashLocalTarball: () => ({ integrity: INTEGRITY_A, shasum: SHASUM_A }),
      localTarball: '/tmp/ultrathink-acorn-wasm-1.0.0.tgz',
      name: '@ultrathink/acorn.wasm',
      tag: 'acorn-v1.0.0',
      version: '1.0.0',
    })
    assert.equal(comparison.ok, true)
    assert.equal(comparison.algorithm, 'integrity')
    assert.equal(seenAssetName, 'ultrathink-acorn-wasm-1.0.0.tgz')
  })

  test('throws ReleaseHashMismatchError with a fail-loud message on divergence', async () => {
    await assert.rejects(
      verifyReleaseHashes({
        cwd: '/repo',
        fetchGitHubAssetDigest: async () => ({
          integrity: INTEGRITY_A,
          label: 'GitHub release',
          shasum: SHASUM_A,
        }),
        fetchRegistryDigest: async () => ({
          integrity: INTEGRITY_B,
          label: 'npm registry',
          shasum: SHASUM_B,
        }),
        hashLocalTarball: () => ({ integrity: INTEGRITY_A, shasum: SHASUM_A }),
        localTarball: '/tmp/ultrathink-acorn-1.0.0.tgz',
        name: '@ultrathink/acorn',
        tag: 'acorn-v1.0.0',
        version: '1.0.0',
      }),
      (err: unknown) => {
        assert.ok(err instanceof ReleaseHashMismatchError)
        assert.match(err.message, /@ultrathink\/acorn@1\.0\.0/)
        assert.match(err.message, /stage reject/)
        assert.equal(err.comparison.ok, false)
        return true
      },
    )
  })
})
