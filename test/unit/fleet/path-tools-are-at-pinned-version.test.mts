// vitest specs for path-tools-are-at-pinned-version's pure logic. The check
// fails when an on-PATH fleet tool is below its pinned floor (the failure mode
// that let a stray pnpm@10.21.0 silently break the cascade). Imports the
// canonical template module (the cascaded live copy is byte-identical).

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  findBelowFloor,
  floorFromPin,
  pathToolPins,
} from '../../../scripts/fleet/check/path-tools-are-at-pinned-version.mts'

test('floorFromPin: a range pin resolves to its minimum', () => {
  assert.equal(floorFromPin('>=11.8.0'), '11.8.0')
  assert.equal(floorFromPin('^11.8.0'), '11.8.0')
})

test('floorFromPin: a bare version coerces', () => {
  assert.equal(floorFromPin('0.11.21'), '0.11.21')
})

test('findBelowFloor: flags a present tool below its floor', () => {
  const pins = [
    { bin: 'pnpm', floor: '11.8.0', source: 'package.json engines.pnpm' },
  ]
  const resolve = (bin: string): string | undefined =>
    bin === 'pnpm' ? '10.21.0' : undefined
  const out = findBelowFloor(pins, resolve)
  assert.equal(out.length, 1)
  assert.equal(out[0]!.bin, 'pnpm')
  assert.equal(out[0]!.found, '10.21.0')
  assert.equal(out[0]!.floor, '11.8.0')
})

test('findBelowFloor: passes a tool at or above its floor', () => {
  const pins = [{ bin: 'pnpm', floor: '11.8.0', source: 's' }]
  assert.equal(findBelowFloor(pins, () => '11.8.0').length, 0)
  assert.equal(findBelowFloor(pins, () => '12.0.0').length, 0)
})

test('findBelowFloor: skips a tool that is not on PATH', () => {
  const pins = [{ bin: 'uv', floor: '0.11.21', source: 's' }]
  assert.equal(findBelowFloor(pins, () => undefined).length, 0)
})

test('findBelowFloor: reports every below-floor tool', () => {
  const pins = [
    { bin: 'pnpm', floor: '11.8.0', source: 'a' },
    { bin: 'uv', floor: '0.11.21', source: 'b' },
  ]
  const resolve = (bin: string): string =>
    bin === 'pnpm' ? '10.21.0' : '0.9.26'
  assert.equal(findBelowFloor(pins, resolve).length, 2)
})

test('pathToolPins: derives BOTH node and pnpm floors from engines', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'path-tools-pins-'))
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ engines: { node: '>=24.12.0', pnpm: '>=11.9.0' } }),
  )
  const byBin = new Map(pathToolPins(dir).map(p => [p.bin, p.floor]))
  assert.equal(byBin.get('node'), '24.12.0')
  assert.equal(byBin.get('pnpm'), '11.9.0')
})

test('pathToolPins: a stale node below the engines floor is a violation', () => {
  const pins = [
    { bin: 'node', floor: '24.12.0', source: 'package.json engines.node' },
  ]
  // A stale Homebrew node (24.10.0) winning PATH over the racked runtime.
  const out = findBelowFloor(pins, () => '24.10.0')
  assert.equal(out.length, 1)
  assert.equal(out[0]!.bin, 'node')
})
