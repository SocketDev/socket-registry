// Unit tests for the fleet verify-dist integrity guard (scripts/fleet/verify-dist.mts).
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { verifyDist } from '../../../scripts/fleet/verify-dist.mts'

describe('verifyDist', () => {
  it('returns 0 when every emitted file parses', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-verify-ok-'))
    writeFileSync(path.join(dir, 'ok.js'), 'module.exports = { a: 1 }\n')
    writeFileSync(path.join(dir, 'ok.cjs'), 'const x = 1; module.exports = x\n')
    expect(await verifyDist(dir)).toBe(0)
  })

  it('returns 1 when a file is truncated / unparseable (parallel-write race)', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-verify-bad-'))
    writeFileSync(path.join(dir, 'good.js'), 'module.exports = {}\n')
    // Truncated mid-object literal — the classic half-written-file symptom.
    writeFileSync(path.join(dir, 'bad.js'), 'module.exports = { a: \n')
    expect(await verifyDist(dir)).toBe(1)
  })
})
