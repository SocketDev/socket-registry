import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { resolveOwningManifest } from '../../../scripts/fleet/lockstep/auto-bump.mts'
import {
  listManifestFiles,
  resolveManifestRoot,
} from '../../../scripts/fleet/lockstep/manifest.mts'

describe('listManifestFiles + resolveOwningManifest', () => {
  function tree(): { root: string; sub: string } {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'lockstep-tree-'))
    const sub = path.join(dir, 'sub.json')
    const root = path.join(dir, 'lockstep.json')
    writeFileSync(
      sub,
      JSON.stringify({
        area: 'sub',
        rows: [
          {
            id: 'included-row',
            kind: 'version-pin',
            pinned_sha: 'a'.repeat(40),
            upgrade_policy: 'track-latest',
            upstream: 'u',
          },
        ],
        upstreams: {
          u: { repo: 'https://example.com/u', submodule: 'up/u' },
        },
      }),
    )
    writeFileSync(
      root,
      JSON.stringify({ area: 'root', includes: ['sub.json'], rows: [] }),
    )
    return { root, sub }
  }
  test('lists root then includes, resolved against the root dir', () => {
    const { root, sub } = tree()
    assert.deepEqual(listManifestFiles(root), [root, sub])
  })
  test('resolveOwningManifest finds a row living in an includes[] file', () => {
    const { root, sub } = tree()
    assert.equal(resolveOwningManifest(root, 'included-row'), sub)
    assert.equal(resolveOwningManifest(root, 'no-such-row'), undefined)
  })
})

describe('resolveManifestRoot', () => {
  test('prefers the root shim, falls back to .config/', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'lockstep-root-'))
    mkdirSync(path.join(dir, '.config'))
    writeFileSync(path.join(dir, '.config', 'lockstep.json'), '{"rows":[]}')
    assert.equal(
      resolveManifestRoot(dir),
      path.join(dir, '.config', 'lockstep.json'),
    )
    writeFileSync(path.join(dir, 'lockstep.json'), '{"rows":[]}')
    assert.equal(resolveManifestRoot(dir), path.join(dir, 'lockstep.json'))
  })
})
