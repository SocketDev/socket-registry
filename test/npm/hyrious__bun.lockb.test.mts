/**
 * @file Tests for @socketregistry/hyrious//bun.lockb npm package override.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { TEST_NPM_FIXTURES_PATH } from '../../scripts/constants/paths.mts'
import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const UTF8 = 'utf8'
const testNpmFixturesPath = TEST_NPM_FIXTURES_PATH
const { eco, pkgPath, skip, sockRegPkgName } = setupNpmPackageTest(
  import.meta.url,
)

const LOCKB_HEADER = new TextEncoder().encode(
  '#!/usr/bin/env bun\nbun-lockfile-format-v0\n',
)

// Bytes one package occupies across the struct-of-arrays package list:
// name(8) + name_hash(8) + resolution(64) + dependencies(8) + resolutions(8)
// + meta(88) + bin(20) + scripts(48).
const PACKAGE_STRIDE = 8 + 8 + 64 + 8 + 8 + 88 + 20 + 48

interface CraftLockfileOptions {
  depsLength?: number | undefined
  depsOff?: number | undefined
  invertFirstBuffer?: boolean | undefined
  listLen: number
  overrunFirstBuffer?: boolean | undefined
  packageBytes?: number | undefined
}

// Builds a lockfile whose header passes every structural check but whose
// declared counts and offsets can exceed the bytes actually present.
function craftLockfile(options: CraftLockfileOptions): Uint8Array {
  const {
    depsLength,
    depsOff,
    invertFirstBuffer,
    listLen,
    overrunFirstBuffer,
    packageBytes,
  } = options
  const beginAt = LOCKB_HEADER.byteLength + 4 + 32 + 8 * 6
  const endAt = beginAt + (packageBytes ?? 0)
  const total = endAt + 96
  const buf = new ArrayBuffer(total)
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)
  bytes.set(LOCKB_HEADER, 0)
  let pos = LOCKB_HEADER.byteLength
  view.setUint32(pos, 2, true)
  // Step past the format field and the 32-byte meta_hash, both left as zeros.
  pos += 4 + 32
  const writeU64 = (n: number) => {
    view.setUint32(pos, n >>> 0, true)
    view.setUint32(pos + 4, Math.floor(n / 2 ** 32), true)
    pos += 8
  }
  writeU64(total)
  writeU64(listLen)
  // input_alignment and field_count are both fixed at 8.
  writeU64(8)
  writeU64(8)
  writeU64(beginAt)
  writeU64(endAt)
  // Six (start, end) descriptor pairs, each naming an empty buffer.
  for (let i = 0, at = endAt; i < 6; i += 1, at += 16) {
    view.setUint32(at, at + 16, true)
    view.setUint32(at + 8, at + 16, true)
  }
  if (invertFirstBuffer) {
    view.setUint32(endAt, endAt + 32, true)
    view.setUint32(endAt + 8, endAt + 16, true)
  }
  if (overrunFirstBuffer) {
    view.setUint32(endAt + 8, total + 4096, true)
  }
  if (depsLength !== undefined) {
    // packages[1].dependencies sits at the second slot of the dependencies
    // field, which follows name, name_hash, and resolution.
    const at = beginAt + (8 + 8 + 64) * listLen + 8
    view.setUint32(at, depsOff ?? 0, true)
    view.setUint32(at + 4, depsLength, true)
  }
  return bytes
}

// @hyrious/bun.lockb has no unit tests.
// https://github.com/hyrious/bun.lockb/tree/v0.0.4
// Test case from https://github.com/daggerok/bun-examples/tree/master/hello-bun.
describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const hyriousBunLockbIndex = skip
    ? undefined
    : require(path.join(pkgPath, 'index.cjs'))

  it('parses bun.lockb into yarn.lock contents', () => {
    const lockbPath = path.join(testNpmFixturesPath, 'fixture-bun.lockb')
    const yarnLockPath = path.join(testNpmFixturesPath, 'fixture-yarn.lock')
    const lockb = readFileSync(lockbPath)
    const yarnLock = readFileSync(yarnLockPath, UTF8)
    expect(hyriousBunLockbIndex.parse(lockb)).toBe(yarnLock)
  })

  describe('rejects hostile input without allocating', () => {
    it('rejects a package count the file cannot back', () => {
      expect(() =>
        hyriousBunLockbIndex.parse(craftLockfile({ listLen: 0x20_00_00_00 })),
      ).toThrow(/package list exceeds file size/)
    })

    it('rejects the maximum package count', () => {
      expect(() =>
        hyriousBunLockbIndex.parse(craftLockfile({ listLen: 0xff_ff_ff_ff })),
      ).toThrow(TypeError)
    })

    it('rejects an entry count larger than its buffer', () => {
      expect(() =>
        hyriousBunLockbIndex.parse(
          craftLockfile({
            depsLength: 0xff_ff_ff_ff,
            listLen: 2,
            packageBytes: PACKAGE_STRIDE * 2,
          }),
        ),
      ).toThrow(/entry list exceeds buffer/)
    })

    it('rejects an entry offset past its buffer', () => {
      expect(() =>
        hyriousBunLockbIndex.parse(
          craftLockfile({
            depsLength: 1,
            depsOff: 0xff_ff_ff_ff,
            listLen: 2,
            packageBytes: PACKAGE_STRIDE * 2,
          }),
        ),
      ).toThrow(/entry list exceeds buffer/)
    })

    it('rejects an inverted buffer range', () => {
      expect(() =>
        hyriousBunLockbIndex.parse(
          craftLockfile({
            invertFirstBuffer: true,
            listLen: 1,
            packageBytes: PACKAGE_STRIDE,
          }),
        ),
      ).toThrow(/invalid buffer range/)
    })

    it('rejects a buffer range past the end of the file', () => {
      expect(() =>
        hyriousBunLockbIndex.parse(
          craftLockfile({
            listLen: 1,
            overrunFirstBuffer: true,
            packageBytes: PACKAGE_STRIDE,
          }),
        ),
      ).toThrow(/invalid buffer range/)
    })

    it('rejects truncated buffers at every stage', () => {
      const full = craftLockfile({
        listLen: 2,
        packageBytes: PACKAGE_STRIDE * 2,
      })
      for (const at of [0, 20, 42, 60, 100, 126, 300, full.byteLength - 1]) {
        expect(() => hyriousBunLockbIndex.parse(full.subarray(0, at))).toThrow(
          TypeError,
        )
      }
    })

    it('rejects promptly rather than allocating', () => {
      const started = Date.now()
      expect(() =>
        hyriousBunLockbIndex.parse(craftLockfile({ listLen: 0xff_ff_ff_ff })),
      ).toThrow(TypeError)
      expect(() =>
        hyriousBunLockbIndex.parse(
          craftLockfile({
            depsLength: 0xff_ff_ff_ff,
            listLen: 2,
            packageBytes: PACKAGE_STRIDE * 2,
          }),
        ),
      ).toThrow(TypeError)
      expect(Date.now() - started).toBeLessThan(500)
    })
  })
})
