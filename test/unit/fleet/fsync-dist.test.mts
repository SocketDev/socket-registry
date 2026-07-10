// Unit tests for the fleet fsync-dist build barrier (scripts/fleet/fsync-dist.mts).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { fsyncDist, fsyncFile } from '../../../scripts/fleet/fsync-dist.mts'

describe('fsyncFile', () => {
  it('is best-effort: resolves without throwing on a missing path', async () => {
    await expect(
      fsyncFile(path.join(os.tmpdir(), 'fleet-fsync-missing-xyz')),
    ).resolves.toBeUndefined()
  })
})

describe('fsyncDist', () => {
  it('walks a nested dir tree without throwing', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-fsync-'))
    writeFileSync(path.join(dir, 'a.js'), 'module.exports = { a: 1 }\n')
    mkdirSync(path.join(dir, 'sub'))
    writeFileSync(path.join(dir, 'sub', 'b.js'), 'module.exports = { b: 2 }\n')
    await expect(fsyncDist(dir)).resolves.toBeUndefined()
  })
})
