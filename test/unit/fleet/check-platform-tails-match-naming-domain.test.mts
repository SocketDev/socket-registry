// vitest specs for check-platform-tails-match-naming-domain.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  checkManifest,
  classifyDomain,
  collectManifestPaths,
  runCheck,
} from '../../../scripts/fleet/check/platform-tails-match-naming-domain.mts'

// ── classifyDomain ───────────────────────────────────────────────

describe('classifyDomain', () => {
  test('a manifest with a non-empty bin field classifies as cli', () => {
    assert.equal(classifyDomain({ bin: { foo: './bin/foo' } }), 'cli')
  })

  test('a manifest with an empty bin array is not cli', () => {
    assert.equal(classifyDomain({ bin: [] }), undefined)
  })

  test('a manifest whose main ends in .node classifies as napi', () => {
    assert.equal(classifyDomain({ main: 'index.node' }), 'napi')
  })

  test('a manifest whose files array contains a .node entry classifies as napi', () => {
    assert.equal(classifyDomain({ files: ['index.node', 'README.md'] }), 'napi')
  })

  test('bin takes priority over a .node payload', () => {
    assert.equal(
      classifyDomain({ bin: { foo: './bin/foo' }, main: 'index.node' }),
      'cli',
    )
  })

  test('a manifest with neither bin nor a .node payload is out of scope', () => {
    assert.equal(classifyDomain({ main: 'index.js' }), undefined)
  })
})

// ── checkManifest — cli domain ───────────────────────────────────

describe('checkManifest — cli domain', () => {
  test('an unnamed manifest is skipped', () => {
    assert.deepEqual(checkManifest('p/package.json', { bin: 'x' }), [])
  })

  test('a name with no platform suffix at all is out of scope', () => {
    assert.deepEqual(
      checkManifest('p/package.json', { name: '@scope/tool', bin: 'x' }),
      [],
    )
  })

  test('a bin tail suffixed with a napi target is flagged', () => {
    const findings = checkManifest('p/package.json', {
      bin: 'x',
      name: '@scope/tool-linux-x64-gnu',
    })
    assert.equal(findings.length, 1)
    assert.match(findings[0]!.saw, /napi-domain suffix "linux-x64-gnu"/)
    assert.match(findings[0]!.fix, /pack-app triplet/)
  })

  test('a bin tail suffixed with a valid pack-app triplet is clean', () => {
    assert.deepEqual(
      checkManifest('p/package.json', {
        bin: 'x',
        name: '@scope/tool-linux-x64',
      }),
      [],
    )
  })

  test('a bin tail with an os field disagreeing with the triplet is flagged', () => {
    const findings = checkManifest('p/package.json', {
      bin: 'x',
      name: '@scope/tool-linux-x64',
      os: ['darwin'],
    })
    assert.equal(findings.length, 1)
    assert.match(findings[0]!.saw, /os field/)
    assert.match(findings[0]!.fix, /"os": \["linux"\]/)
  })

  test('a bin tail with a cpu field disagreeing with the triplet is flagged', () => {
    const findings = checkManifest('p/package.json', {
      bin: 'x',
      cpu: ['x64'],
      name: '@scope/tool-linux-arm64',
    })
    assert.equal(findings.length, 1)
    assert.match(findings[0]!.saw, /cpu field/)
    assert.match(findings[0]!.fix, /"cpu": \["arm64"\]/)
  })

  test('a bin tail with matching os + cpu fields is clean', () => {
    assert.deepEqual(
      checkManifest('p/package.json', {
        bin: 'x',
        cpu: ['x64'],
        name: '@scope/tool-linux-x64',
        os: ['linux'],
      }),
      [],
    )
  })
})

// ── checkManifest — napi domain ───────────────────────────────────

describe('checkManifest — napi domain', () => {
  test('a .node tail suffixed with a pack-app triplet is flagged', () => {
    const findings = checkManifest('p/package.json', {
      main: 'index.node',
      name: '@scope/addon-linux-x64',
    })
    assert.equal(findings.length, 1)
    assert.match(findings[0]!.saw, /binary-domain\) suffix "linux-x64"/)
    assert.match(findings[0]!.fix, /napi-rs target/)
  })

  test('a .node tail suffixed with a valid napi target is clean', () => {
    assert.deepEqual(
      checkManifest('p/package.json', {
        main: 'index.node',
        name: '@scope/addon-linux-x64-gnu',
      }),
      [],
    )
  })

  test('the wasm32-wasi fallback target is exempt from engine-field checks', () => {
    // wasm32-wasi is universal — no os/cpu restriction applies, and it must
    // not be flagged as "missing a napi target" the way `undefined` is.
    assert.deepEqual(
      checkManifest('p/package.json', {
        main: 'index.node',
        name: '@scope/addon-wasm32-wasi',
        os: ['linux'],
      }),
      [],
    )
  })

  test('a .node tail with an os field disagreeing with the napi target is flagged', () => {
    const findings = checkManifest('p/package.json', {
      main: 'index.node',
      name: '@scope/addon-linux-x64-gnu',
      os: ['darwin'],
    })
    assert.equal(findings.length, 1)
    assert.match(findings[0]!.saw, /os field/)
    assert.match(findings[0]!.fix, /"os": \["linux"\]/)
  })

  test('a .node tail with a cpu field disagreeing with the napi target is flagged', () => {
    const findings = checkManifest('p/package.json', {
      cpu: ['x64'],
      main: 'index.node',
      name: '@scope/addon-linux-arm64-gnu',
    })
    assert.equal(findings.length, 1)
    assert.match(findings[0]!.saw, /cpu field/)
    assert.match(findings[0]!.fix, /"cpu": \["arm64"\]/)
  })

  test('a .node tail with matching os + cpu fields is clean', () => {
    assert.deepEqual(
      checkManifest('p/package.json', {
        cpu: ['x64'],
        main: 'index.node',
        name: '@scope/addon-linux-x64-gnu',
        os: ['linux'],
      }),
      [],
    )
  })
})

// ── collectManifestPaths ───────────────────────────────────────────

function makeRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'platform-tails-'))
}

describe('collectManifestPaths', () => {
  test('a repo with no packages/ dir contributes nothing', () => {
    const dir = makeRepo()
    assert.deepEqual(collectManifestPaths(dir), [])
  })

  test('walks nested packages/ dirs, skipping node_modules and dotfiles', () => {
    const dir = makeRepo()
    mkdirSync(path.join(dir, 'packages', 'foo'), { recursive: true })
    mkdirSync(path.join(dir, 'packages', 'foo', 'node_modules', 'dep'), {
      recursive: true,
    })
    mkdirSync(path.join(dir, 'packages', '.hidden'), { recursive: true })
    writeFileSync(
      path.join(dir, 'packages', 'foo', 'package.json'),
      '{"name":"foo"}',
    )
    writeFileSync(
      path.join(dir, 'packages', 'foo', 'node_modules', 'dep', 'package.json'),
      '{"name":"dep"}',
    )
    writeFileSync(
      path.join(dir, 'packages', '.hidden', 'package.json'),
      '{"name":"hidden"}',
    )
    const found = collectManifestPaths(dir)
    assert.deepEqual(found, [path.join(dir, 'packages', 'foo', 'package.json')])
  })
})

// ── runCheck — end-to-end fixture ─────────────────────────────────

describe('runCheck', () => {
  test('returns 0 for a repo with no packages/ dir', () => {
    assert.equal(runCheck(makeRepo()), 0)
  })

  test('returns 0 when every platform tail matches its naming domain', () => {
    const dir = makeRepo()
    mkdirSync(path.join(dir, 'packages', 'tool-linux-x64'), {
      recursive: true,
    })
    writeFileSync(
      path.join(dir, 'packages', 'tool-linux-x64', 'package.json'),
      JSON.stringify({
        bin: 'bin/tool',
        cpu: ['x64'],
        name: '@scope/tool-linux-x64',
        os: ['linux'],
      }),
    )
    assert.equal(runCheck(dir), 0)
  })

  test('returns 1 when a tail violates its naming domain', () => {
    const dir = makeRepo()
    mkdirSync(path.join(dir, 'packages', 'addon-linux-x64'), {
      recursive: true,
    })
    writeFileSync(
      path.join(dir, 'packages', 'addon-linux-x64', 'package.json'),
      JSON.stringify({ main: 'index.node', name: '@scope/addon-linux-x64' }),
    )
    assert.equal(runCheck(dir), 1)
  })

  test('a malformed package.json is skipped, not thrown', () => {
    const dir = makeRepo()
    mkdirSync(path.join(dir, 'packages', 'broken'), { recursive: true })
    writeFileSync(
      path.join(dir, 'packages', 'broken', 'package.json'),
      '{not valid json',
    )
    assert.equal(runCheck(dir), 0)
  })
})
