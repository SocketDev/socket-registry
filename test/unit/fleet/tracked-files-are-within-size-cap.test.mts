// Unit tests for the fleet file-size cap check
// (scripts/fleet/check/tracked-files-are-within-size-cap.mts).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  formatBytes,
  scanDirectory,
} from '../../../scripts/fleet/check/tracked-files-are-within-size-cap.mts'

const OVER_CAP = 2 * 1024 * 1024 + 1

describe('formatBytes', () => {
  it('formats across byte scales', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB')
  })
})

describe('scanDirectory', () => {
  it('flags files over the cap, ignores small ones', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-size-'))
    writeFileSync(path.join(dir, 'big.bin'), Buffer.alloc(OVER_CAP))
    writeFileSync(path.join(dir, 'small.txt'), 'hi')
    const violations = await scanDirectory(dir, dir)
    expect(violations.map(v => v.file)).toStrictEqual(['big.bin'])
  })

  it('skips excluded dirs (node_modules)', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-size-skip-'))
    mkdirSync(path.join(dir, 'node_modules'))
    writeFileSync(
      path.join(dir, 'node_modules', 'big.bin'),
      Buffer.alloc(OVER_CAP),
    )
    expect(await scanDirectory(dir, dir)).toStrictEqual([])
  })
})
