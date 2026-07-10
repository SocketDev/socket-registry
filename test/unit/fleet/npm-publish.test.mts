// vitest specs for scripts/fleet/npm-publish.mts isStagingExpected().
//
// Covers the four behaviors that gate the --direct refusal path:
//
//   1. First-publish (registry returns empty `versions` object) → false
//   2. Prior version carries `_npmUser.approver` → true (refuses --direct)
//   3. Prior version has `_npmUser` but no `approver` → false
//   4. Network failure / 404 → false (don't block --direct on a registry blip)
//
// Mocking strategy: nock under disableNetConnect(). isStagingExpected reaches
// the npm registry via fetchVersionTrustInfo → httpJson, whose Node transport is
// node:http — NOT globalThis.fetch — so the request is intercepted at the HTTP
// layer with nock (the fleet-wide pattern; mocking globalThis.fetch is inert in
// Node). Each test stubs the packument for its own package name.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import nock from 'nock'
import { afterAll, afterEach, beforeAll, describe, test, vi } from 'vitest'

// The failure-path cases below intentionally drive verifyStagedEntry through
// its logger.fail branches. Silence the default logger so the fixture package
// (@x/y@1.0.0) never prints "Pre-approve verify FAILED" into CI logs, where it
// reads as a real publish-verification failure.
vi.mock('@socketsecurity/lib-stable/logger/default', () => ({
  getDefaultLogger: () =>
    new Proxy(
      {},
      {
        get: () => () => {},
      },
    ),
}))

import {
  isStagingExpected,
  readStagedShasum,
  resolveBumpScript,
  verifyStagedEntry,
} from '../../../scripts/fleet/npm-publish.mts'

const REGISTRY = 'https://registry.npmjs.org'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

describe('publish / isStagingExpected', () => {
  test('first-publish (no versions) returns false', async () => {
    nock(REGISTRY)
      .get(/never-published/)
      .reply(200, { versions: {} })
    const result = await isStagingExpected('@some/never-published')
    assert.equal(result, false)
  })

  test('prior version with `_npmUser.approver` returns true', async () => {
    nock(REGISTRY)
      .get(/staged-package/)
      .reply(200, {
        versions: { '1.0.0': { _npmUser: { approver: 'human-approver-id' } } },
      })
    const result = await isStagingExpected('@some/staged-package')
    assert.equal(result, true)
  })

  test('prior version with `_npmUser` but no approver returns false', async () => {
    nock(REGISTRY)
      .get(/direct-only/)
      .reply(200, {
        versions: { '1.0.0': { _npmUser: { name: 'someone' } } },
      })
    const result = await isStagingExpected('@some/direct-only')
    assert.equal(result, false)
  })

  test('mix: at least one version with approver returns true', async () => {
    // Real-world packages migrate from --direct to --staged mid-history.
    // ANY version with an approver is the signal we want to preserve.
    nock(REGISTRY)
      .get(/mixed-history/)
      .reply(200, {
        versions: {
          '1.0.0': { _npmUser: { name: 'old' } },
          '1.1.0': { _npmUser: { approver: 'new-approver' } },
          '1.2.0': { _npmUser: { name: 'subsequent' } },
        },
      })
    const result = await isStagingExpected('@some/mixed-history')
    assert.equal(result, true)
  })

  test('network failure returns false (does not block --direct)', async () => {
    nock(REGISTRY)
      .get(/whatever/)
      .replyWithError('simulated network failure')
    const result = await isStagingExpected('@some/whatever')
    assert.equal(result, false)
  })

  test('404 response returns false', async () => {
    nock(REGISTRY)
      .get(/not-on-registry/)
      .reply(404)
    const result = await isStagingExpected('@some/not-on-registry')
    assert.equal(result, false)
  })

  test('malformed JSON in response returns false', async () => {
    nock(REGISTRY)
      .get(/malformed/)
      .reply(200, 'not-json-at-all')
    const result = await isStagingExpected('@some/malformed')
    assert.equal(result, false)
  })
})

describe('publish / main-guard', () => {
  test('importing the module does not run main()', async () => {
    // The main-guard is `if (process.argv[1] === fileURLToPath(import.meta.url))`.
    // When this test file imports `../publish.mts`, process.argv[1] points at
    // the node:test runner — not at publish.mts — so main() must not run.
    // If the guard regressed (e.g. someone deleted the `if` branch), the
    // import would trigger a real publish-prep run: read package.json,
    // probe npm registry, spawn child processes. That's catastrophic in a
    // test context.
    //
    // We assert two things: (1) the import resolves without throwing,
    // (2) the resolved module exports the public API. If main() ran
    // synchronously at import time, throws inside it would either reject
    // the import promise OR `process.exitCode = 1` would set, both of
    // which would fail this test.
    const mod = await import('../../../scripts/fleet/npm-publish.mts')
    assert.equal(typeof mod.isStagingExpected, 'function')
    // exitCode is 0 (or undefined) when nothing has set it; a regressed
    // main-guard would have run main() which sets exitCode on error.
    assert.ok(
      process.exitCode === 0 || process.exitCode === undefined,
      `process.exitCode is ${process.exitCode}; main() likely ran during import`,
    )
  })

  test("process.argv[1] doesn't match import.meta.url under test runner", () => {
    // Sanity check the test environment: the runner's argv[1] is the
    // test entry, not publish.mts itself. If this assumption changes
    // (e.g. a different test runner), the main-guard test above could
    // give a false-positive pass.
    const fileURLToPath = (url: string): string =>
      new URL(url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
    const publishUrl = new URL(
      '../../../scripts/fleet/npm-publish.mts',
      import.meta.url,
    ).href
    assert.notEqual(process.argv[1], fileURLToPath(publishUrl))
  })
})

describe('resolveBumpScript (overlay-first)', () => {
  test('prefers a repo overlay scripts/repo/bump.mts when present', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'resolve-bump-repo-'))
    mkdirSync(path.join(root, 'scripts', 'repo'), { recursive: true })
    writeFileSync(path.join(root, 'scripts', 'repo', 'bump.mts'), '')
    assert.equal(
      resolveBumpScript(root),
      path.join(root, 'scripts', 'repo', 'bump.mts'),
    )
  })

  test('falls back to canonical scripts/fleet/bump.mts with no overlay', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'resolve-bump-fleet-'))
    assert.equal(
      resolveBumpScript(root),
      path.join(root, 'scripts', 'fleet', 'bump.mts'),
    )
  })
})

describe('readStagedShasum', () => {
  test('reads a top-level shasum', () => {
    assert.equal(readStagedShasum({ shasum: 'aa11' }), 'aa11')
  })
  test('falls back to dist.shasum', () => {
    assert.equal(readStagedShasum({ dist: { shasum: 'bb22' } }), 'bb22')
  })
  test('returns undefined when no digest field is present', () => {
    assert.equal(readStagedShasum({}), undefined)
  })
})

describe('verifyStagedEntry (pre-approve gate)', () => {
  const SHA_A = 'a0000000000000000000000000000000000000aa'
  const SHA_B = 'b0000000000000000000000000000000000000bb'
  const okDeps = {
    hashLocalTarball: () => ({ integrity: 'sha512-AAAA', shasum: SHA_A }),
    packTarball: async () => '/tmp/pkg-1.0.0.tgz',
  }

  test('verified (true) when local pack sha1 matches the staged shasum', async () => {
    const ok = await verifyStagedEntry(
      { name: '@x/y', shasum: SHA_A, stageId: 's1', version: '1.0.0' },
      okDeps,
    )
    assert.equal(ok, true)
  })

  test('false when the staged shasum diverges from the local pack', async () => {
    const ok = await verifyStagedEntry(
      { name: '@x/y', shasum: SHA_B, stageId: 's1', version: '1.0.0' },
      okDeps,
    )
    assert.equal(ok, false)
  })

  test('false (never packs/approves) when the staged shasum is missing', async () => {
    let packed = false
    const ok = await verifyStagedEntry(
      { name: '@x/y', stageId: 's1', version: '1.0.0' },
      {
        hashLocalTarball: () => ({ integrity: 'sha512-AAAA', shasum: SHA_A }),
        packTarball: async () => {
          packed = true
          return '/tmp/pkg-1.0.0.tgz'
        },
      },
    )
    assert.equal(ok, false)
    assert.equal(packed, false)
  })

  test('false when name/version/stageId is incomplete', async () => {
    const ok = await verifyStagedEntry({ name: '@x/y', shasum: SHA_A }, okDeps)
    assert.equal(ok, false)
  })

  test('false when the local pack fails (no tarball path)', async () => {
    const ok = await verifyStagedEntry(
      { name: '@x/y', shasum: SHA_A, stageId: 's1', version: '1.0.0' },
      {
        hashLocalTarball: () => ({ integrity: 'sha512-AAAA', shasum: SHA_A }),
        packTarball: async () => undefined,
      },
    )
    assert.equal(ok, false)
  })
})
