// vitest specs for scripts/fleet/util/napi-targets.mts — the canonical
// ABI/NAPI target identifiers (napi-rs naming: `platform-arch[-abi]`) that
// the binary-vs-napi naming domain split depends on.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  isNapiTarget,
  NAPI_TARGET_SET,
  NAPI_TARGETS,
  NAPI_TARGETS_DEFAULT,
  napiTargetEngineFields,
  parseNapiTargetSegment,
  resolveCurrentNapiTarget,
  RUST_TRIPLE_TO_NAPI_TARGET,
} from '../../../scripts/fleet/util/napi-targets.mts'

describe('NAPI_TARGETS', () => {
  test('is sorted in ASCII order', () => {
    assert.deepEqual(NAPI_TARGETS, [...NAPI_TARGETS].toSorted())
  })

  test('carries the 9 canonical targets, wasm32-wasi included', () => {
    assert.deepEqual(NAPI_TARGETS, [
      'darwin-arm64',
      'darwin-x64',
      'linux-arm64-gnu',
      'linux-arm64-musl',
      'linux-x64-gnu',
      'linux-x64-musl',
      'wasm32-wasi',
      'win32-arm64-msvc',
      'win32-x64-msvc',
    ])
  })

  test('every linux target carries an explicit libc ABI', () => {
    for (const target of NAPI_TARGETS) {
      if (target.startsWith('linux-')) {
        assert.ok(
          target.endsWith('-gnu') || target.endsWith('-musl'),
          `${target} is missing an explicit libc ABI`,
        )
      }
    }
  })

  test('every darwin target carries no ABI segment', () => {
    for (const target of NAPI_TARGETS) {
      if (target.startsWith('darwin-')) {
        assert.ok(
          !target.endsWith('-gnu') && !target.endsWith('-musl'),
          `${target} should not carry an ABI segment`,
        )
      }
    }
  })
})

describe('NAPI_TARGETS_DEFAULT', () => {
  test('is a 5-target subset of NAPI_TARGETS, excluding musl + win32-arm64', () => {
    assert.equal(NAPI_TARGETS_DEFAULT.length, 5)
    for (const target of NAPI_TARGETS_DEFAULT) {
      assert.ok(NAPI_TARGET_SET.has(target))
    }
    assert.ok(
      !(NAPI_TARGETS_DEFAULT as readonly string[]).includes('linux-arm64-musl'),
    )
    assert.ok(
      !(NAPI_TARGETS_DEFAULT as readonly string[]).includes('linux-x64-musl'),
    )
    assert.ok(
      !(NAPI_TARGETS_DEFAULT as readonly string[]).includes('win32-arm64-msvc'),
    )
  })
})

describe('NAPI_TARGET_SET', () => {
  test('mirrors NAPI_TARGETS membership exactly', () => {
    assert.equal(NAPI_TARGET_SET.size, NAPI_TARGETS.length)
    for (const target of NAPI_TARGETS) {
      assert.ok(NAPI_TARGET_SET.has(target))
    }
  })
})

describe('RUST_TRIPLE_TO_NAPI_TARGET', () => {
  test('every value is a canonical napi target', () => {
    for (const target of Object.values(RUST_TRIPLE_TO_NAPI_TARGET)) {
      assert.ok(NAPI_TARGET_SET.has(target))
    }
  })

  test('maps the native x86_64/aarch64 triples napi-rs emits', () => {
    assert.equal(
      RUST_TRIPLE_TO_NAPI_TARGET['x86_64-unknown-linux-gnu'],
      'linux-x64-gnu',
    )
    assert.equal(
      RUST_TRIPLE_TO_NAPI_TARGET['aarch64-unknown-linux-musl'],
      'linux-arm64-musl',
    )
    assert.equal(
      RUST_TRIPLE_TO_NAPI_TARGET['aarch64-apple-darwin'],
      'darwin-arm64',
    )
    assert.equal(
      RUST_TRIPLE_TO_NAPI_TARGET['aarch64-pc-windows-msvc'],
      'win32-arm64-msvc',
    )
    assert.equal(
      RUST_TRIPLE_TO_NAPI_TARGET['wasm32-wasip1-threads'],
      'wasm32-wasi',
    )
  })
})

describe('isNapiTarget', () => {
  test('accepts every canonical target', () => {
    for (const target of NAPI_TARGETS) {
      assert.ok(isNapiTarget(target))
    }
  })

  test('rejects an unknown string', () => {
    assert.ok(!isNapiTarget('linux-x64'))
    assert.ok(!isNapiTarget('freebsd-x64'))
  })

  test('rejects non-string values', () => {
    assert.ok(!isNapiTarget(undefined))
    assert.ok(!isNapiTarget(42))
    assert.ok(!isNapiTarget(false))
  })
})

describe('resolveCurrentNapiTarget', () => {
  test('resolves linux glibc vs musl by isMusl', () => {
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'x64',
        isMusl: false,
        platform: 'linux',
      }),
      'linux-x64-gnu',
    )
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'x64',
        isMusl: true,
        platform: 'linux',
      }),
      'linux-x64-musl',
    )
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'arm64',
        isMusl: false,
        platform: 'linux',
      }),
      'linux-arm64-gnu',
    )
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'arm64',
        isMusl: true,
        platform: 'linux',
      }),
      'linux-arm64-musl',
    )
  })

  test('resolves darwin regardless of isMusl (ignored on non-linux)', () => {
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'arm64',
        isMusl: true,
        platform: 'darwin',
      }),
      'darwin-arm64',
    )
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'x64',
        isMusl: false,
        platform: 'darwin',
      }),
      'darwin-x64',
    )
  })

  test('resolves win32 arm64 + x64', () => {
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'arm64',
        isMusl: false,
        platform: 'win32',
      }),
      'win32-arm64-msvc',
    )
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'x64',
        isMusl: false,
        platform: 'win32',
      }),
      'win32-x64-msvc',
    )
  })

  test('returns undefined for an unsupported arch on a supported platform', () => {
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'ia32',
        isMusl: false,
        platform: 'linux',
      }),
      undefined,
    )
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'ia32',
        isMusl: false,
        platform: 'darwin',
      }),
      undefined,
    )
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'ia32',
        isMusl: false,
        platform: 'win32',
      }),
      undefined,
    )
  })

  test('returns undefined for an unsupported platform entirely', () => {
    assert.equal(
      resolveCurrentNapiTarget({
        arch: 'x64',
        isMusl: false,
        platform: 'freebsd',
      }),
      undefined,
    )
  })
})

describe('parseNapiTargetSegment', () => {
  test('matches an exact target name', () => {
    assert.equal(parseNapiTargetSegment('darwin-arm64'), 'darwin-arm64')
  })

  test('matches a napi-suffixed tail package name', () => {
    assert.equal(parseNapiTargetSegment('acorn-linux-x64-gnu'), 'linux-x64-gnu')
    assert.equal(parseNapiTargetSegment('acorn-darwin-arm64'), 'darwin-arm64')
  })

  test('a bare pack-app binary suffix (no ABI) does not match', () => {
    // "acorn-linux-x64" belongs to the pack-app BINARY domain, not this one.
    assert.equal(parseNapiTargetSegment('acorn-linux-x64'), undefined)
  })

  test('prefers the longest matching suffix', () => {
    // "linux-arm64-gnu" ends in both "-gnu" (via "linux-arm64-gnu") and would
    // also share a trailing "arm64-gnu" fragment with no shorter napi target —
    // exercise the actual overlap: a musl name must not resolve to gnu.
    assert.equal(
      parseNapiTargetSegment('addon-linux-arm64-musl'),
      'linux-arm64-musl',
    )
  })

  test('an unrelated string does not match', () => {
    assert.equal(parseNapiTargetSegment('some-random-package'), undefined)
  })
})

describe('napiTargetEngineFields', () => {
  test('darwin targets carry no libc field', () => {
    assert.deepEqual(napiTargetEngineFields('darwin-arm64'), {
      cpu: ['arm64'],
      os: ['darwin'],
    })
    assert.deepEqual(napiTargetEngineFields('darwin-x64'), {
      cpu: ['x64'],
      os: ['darwin'],
    })
  })

  test('linux targets carry the matching libc field', () => {
    assert.deepEqual(napiTargetEngineFields('linux-arm64-gnu'), {
      cpu: ['arm64'],
      libc: ['glibc'],
      os: ['linux'],
    })
    assert.deepEqual(napiTargetEngineFields('linux-arm64-musl'), {
      cpu: ['arm64'],
      libc: ['musl'],
      os: ['linux'],
    })
    assert.deepEqual(napiTargetEngineFields('linux-x64-gnu'), {
      cpu: ['x64'],
      libc: ['glibc'],
      os: ['linux'],
    })
    assert.deepEqual(napiTargetEngineFields('linux-x64-musl'), {
      cpu: ['x64'],
      libc: ['musl'],
      os: ['linux'],
    })
  })

  test('win32 targets carry no libc field', () => {
    assert.deepEqual(napiTargetEngineFields('win32-arm64-msvc'), {
      cpu: ['arm64'],
      os: ['win32'],
    })
    assert.deepEqual(napiTargetEngineFields('win32-x64-msvc'), {
      cpu: ['x64'],
      os: ['win32'],
    })
  })
})
