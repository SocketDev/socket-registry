// vitest specs for check-vite-is-rolldown-native.
//
// The fixtures are real pnpm-lock.yaml resolution shapes: a vite-7 + esbuild
// tree (the socket-lib drift this check enforces against) and a clean vite-8
// rolldown-native tree. scanLock is pure, so no real lockfile is needed.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { scanLock } from '../../../scripts/fleet/check/vite-is-rolldown-native.mts'

// A vite-7 + esbuild lock fragment (the drift: vitest pulled vite 7, which
// hard-depends on esbuild, dragging the platform binaries in).
const DRIFTED = `lockfileVersion: '9.0'
packages:
  vite@7.3.2(@types/node@24.9.2)(jiti@2.7.0)(yaml@2.9.0):
    resolution: {integrity: sha512-aaa}
  esbuild@0.27.7:
    resolution: {integrity: sha512-bbb}
  '@esbuild/darwin-arm64@0.27.7':
    resolution: {integrity: sha512-ccc}
  rolldown@1.1.0:
    resolution: {integrity: sha512-ddd}
`

// A clean vite-8 rolldown-native lock fragment (no esbuild, no @esbuild/*).
const CLEAN = `lockfileVersion: '9.0'
packages:
  vite@8.0.14(@types/node@24.9.2)(jiti@2.7.0)(yaml@2.9.0):
    resolution: {integrity: sha512-aaa}
  rolldown@1.1.0:
    resolution: {integrity: sha512-ddd}
  vitest@4.1.8(@types/node@24.9.2):
    resolution: {integrity: sha512-eee}
`

test('flags a vite < 8 resolution', () => {
  const f = scanLock(DRIFTED)
  assert.ok(f.some(x => x.kind === 'vite-too-old' && x.spec === 'vite@7.3.2'))
})

test('flags esbuild AND its @esbuild/* platform packages', () => {
  const f = scanLock(DRIFTED)
  assert.ok(
    f.some(x => x.kind === 'esbuild-present' && x.spec === 'esbuild@0.27.7'),
  )
  assert.ok(
    f.some(
      x =>
        x.kind === 'esbuild-present' &&
        x.spec === '@esbuild/darwin-arm64@0.27.7',
    ),
  )
})

test('a clean vite-8 + rolldown tree has zero findings', () => {
  assert.deepEqual(scanLock(CLEAN), [])
})

test('vite 8 with an esbuild PEER-HASH but no esbuild package is clean', () => {
  // vite 8 may carry an `(esbuild@...)` peer-hash in its key WITHOUT an actual
  // esbuild package resolution — that is benign. Only a real `esbuild@<v>:`
  // package entry (or @esbuild/*) is a finding, never the peer-hash suffix.
  const peerHashed = `packages:
  vite@8.0.14(@types/node@24.9.2)(esbuild@0.27.7)(jiti@2.7.0)(yaml@2.9.0):
    resolution: {integrity: sha512-aaa}
`
  assert.deepEqual(scanLock(peerHashed), [])
})

test('does not double-count repeated resolution lines', () => {
  const dup = `packages:
  vite@7.3.2(@types/node@24.9.2):
    resolution: {integrity: sha512-aaa}
  vite@7.3.2(@types/node@24.13.1):
    resolution: {integrity: sha512-bbb}
`
  assert.equal(scanLock(dup).length, 1)
})
