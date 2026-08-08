/**
 * @file Tests for the staged-publishing leg of the trusted-package gate. The
 *   four states the gate has to keep apart are: a package whose dist-tag
 *   `latest` published through npm's staged approval queue (pass), one that
 *   didn't (fail), one the registry has never heard of (handled, never a
 *   failure — the roster legitimately holds packages whose bump is in flight),
 *   and a registry read that failed for any reason other than a 404 (must
 *   throw, so a run can't report a package trustworthy because its fetch died).
 *   The pure classifier is exercised directly; the I/O wrapper is exercised
 *   through socket-lib's injectable `http` adapter seam, so no test touches the
 *   network. The roster half asserts the union of `registry/manifest.json` with
 *   the `packages/npm/*` working tree — the manifest omits `0.0.0` placeholders
 *   on purpose, and a placeholder is exactly the package whose trusted
 *   publisher has never been set up, so a manifest-only roster hid them.
 */

import crypto from 'node:crypto'

import { HttpResponseError } from '@socketsecurity/lib/http-request/response-types'
import { createNpmMetaCache } from '@socketsecurity/lib/npm/meta'
import { describe, expect, test } from 'vitest'

import {
  classifyStagedTrust,
  collectStagedRoster,
  describeStagedTrust,
  formatStagedTrustProblem,
  isStagedTrustFailure,
  loadStagedRoster,
  mergeStagedRosters,
  readLocalNpmPackages,
  readStagedTrust,
} from '../../../scripts/repo/npm/check-trusted-packages-staged.mts'

import type {
  StagedManifestRow,
  StagedRosterEntry,
} from '../../../scripts/repo/npm/check-trusted-packages-staged.mts'
import type { PackumentMetaSlim } from '@socketsecurity/lib/npm/meta-types'

interface VersionSpec {
  staged?: boolean | undefined
  version: string
}

// Build a slimmed packument the way socket-lib's slicer would, with only the
// fields the classifier reads.
function metaOf(
  name: string,
  specs: VersionSpec[],
  latest?: string | undefined,
): PackumentMetaSlim {
  const versions: PackumentMetaSlim['versions'] = {}
  for (let i = 0, { length } = specs; i < length; i += 1) {
    const spec = specs[i]!
    versions[spec.version] = {
      staged: spec.staged,
      time: '2026-01-01T00:00:00.000Z',
    }
  }
  const distTags: Record<string, string> = {}
  const resolvedLatest = latest ?? specs[specs.length - 1]?.version
  if (resolvedLatest !== undefined) {
    distTags['latest'] = resolvedLatest
  }
  return {
    distTags,
    lastSynced: 0,
    name,
    versions,
  }
}

// A raw packument body, the shape socket-lib's injectable http adapter returns.
function rawPackument(
  name: string,
  specs: VersionSpec[],
): Record<string, unknown> {
  const versions: Record<string, unknown> = {}
  for (let i = 0, { length } = specs; i < length; i += 1) {
    const spec = specs[i]!
    versions[spec.version] = {
      _npmUser: spec.staged ? { approver: { name: 'socket-bot' } } : {},
      dist: { tarball: `https://example.test/${name}-${spec.version}.tgz` },
      name,
      version: spec.version,
    }
  }
  return {
    'dist-tags': { latest: specs[specs.length - 1]?.version },
    name,
    time: Object.fromEntries(
      specs.map(s => [s.version, '2026-01-01T00:00:00.000Z']),
    ),
    versions,
  }
}

// A per-test cache instance so no test can be served another test's entry, and
// nothing leaks into the shared default packument cache.
function isolatedOptions(json: (url: string) => Promise<unknown>) {
  return {
    cache: createNpmMetaCache({ prefix: `staged-test-${crypto.randomUUID()}` }),
    http: { json: json as <T>(url: string) => Promise<T> },
    retries: 0,
  }
}

function entryOf(
  name: string,
  manifestVersion?: string | undefined,
): StagedRosterEntry {
  return { manifestVersion, name }
}

describe('collectStagedRoster', () => {
  test('derives the roster from the manifest rows, sorted and deduped', () => {
    const rows: StagedManifestRow[] = [
      [
        'pkg:npm/%40socketregistry/zebra@1.0.0',
        { name: '@socketregistry/zebra', version: '1.0.0' },
      ],
      [
        'pkg:npm/%40socketregistry/abab@1.0.9',
        { name: '@socketregistry/abab', version: '1.0.9' },
      ],
      [
        'pkg:npm/%40socketregistry/abab@1.0.9',
        { name: '@socketregistry/abab', version: '1.0.9' },
      ],
    ]
    expect(collectStagedRoster({ npm: rows })).toEqual([
      { manifestVersion: '1.0.9', name: '@socketregistry/abab' },
      { manifestVersion: '1.0.0', name: '@socketregistry/zebra' },
    ])
  })

  test('skips rows with no usable name rather than guessing one', () => {
    const rows: StagedManifestRow[] = [
      ['pkg:npm/broken', undefined],
      ['pkg:npm/%40socketregistry/ok@1.0.0', { name: '@socketregistry/ok' }],
    ]
    expect(collectStagedRoster({ npm: rows })).toEqual([
      { manifestVersion: undefined, name: '@socketregistry/ok' },
    ])
  })

  test('returns an empty roster for a manifest with no npm array', () => {
    expect(collectStagedRoster({})).toEqual([])
    expect(collectStagedRoster(undefined)).toEqual([])
  })
})

describe('mergeStagedRosters', () => {
  test('keeps a placeholder package the manifest deliberately omits', () => {
    // `update-manifest.mts` drops a package whose npm latest is the 0.0.0 name
    // reservation, so the manifest alone hides exactly the packages whose
    // trusted publisher has never been set up.
    const merged = mergeStagedRosters(
      [entryOf('@socketregistry/abab', '1.0.9')],
      [
        { name: '@socketregistry/abab', version: '1.0.9' },
        { name: '@socketregistry/own-keys', version: '1.0.0' },
      ],
    )
    expect(merged).toEqual([
      { manifestVersion: '1.0.9', name: '@socketregistry/abab' },
      { manifestVersion: '1.0.0', name: '@socketregistry/own-keys' },
    ])
  })

  test('the manifest wins a name collision, since it carries the version of record', () => {
    const merged = mergeStagedRosters(
      [entryOf('@socketregistry/abab', '1.0.9')],
      [{ name: '@socketregistry/abab', version: '1.0.8' }],
    )
    expect(merged).toEqual([
      { manifestVersion: '1.0.9', name: '@socketregistry/abab' },
    ])
  })

  test('sorts the union and skips a nameless working-tree row', () => {
    const merged = mergeStagedRosters(
      [entryOf('@socketregistry/zebra', '1.0.0')],
      [
        { name: '', version: '1.0.0' },
        { name: '@socketregistry/alpha', version: undefined },
      ],
    )
    expect(merged.map(e => e.name)).toEqual([
      '@socketregistry/alpha',
      '@socketregistry/zebra',
    ])
  })
})

describe('readLocalNpmPackages', () => {
  test('reads every packages/npm package, placeholders included', async () => {
    const local = await readLocalNpmPackages()
    const names = local.map(e => e.name)
    expect(names).toContain('@socketregistry/abab')
    // A 0.0.0 placeholder is absent from registry/manifest.json by design.
    expect(names).toContain('@socketregistry/own-keys')
    expect(local.every(e => e.name.startsWith('@'))).toBe(true)
  })
})

describe('loadStagedRoster', () => {
  test('the roster includes packages the manifest omits as placeholders', async () => {
    const roster = await loadStagedRoster({ scopes: ['@socketregistry/'] })
    const names = new Set(roster.map(e => e.name))
    const placeholders = [
      '@socketregistry/data-view-buffer',
      '@socketregistry/es-to-primitive',
      '@socketregistry/is-async-function',
      '@socketregistry/own-keys',
      '@socketregistry/stop-iteration-iterator',
    ]
    for (let i = 0, { length } = placeholders; i < length; i += 1) {
      const name = placeholders[i]!
      expect(names.has(name)).toBe(true)
    }
  })

  test('the scope filter still narrows the union', async () => {
    const roster = await loadStagedRoster({ scopes: ['@nothing-publishes/'] })
    expect(roster).toEqual([])
  })
})

describe('classifyStagedTrust', () => {
  test('a staged latest passes', () => {
    const report = classifyStagedTrust('@socketregistry/ok', {
      meta: metaOf('@socketregistry/ok', [
        { staged: false, version: '1.0.0' },
        { staged: true, version: '1.0.1' },
      ]),
    })
    expect(report.verdict).toBe('staged')
    expect(report.latestVersion).toBe('1.0.1')
    expect(report.stagedVersionCount).toBe(1)
    expect(report.publishedVersionCount).toBe(2)
    expect(isStagedTrustFailure(report)).toBe(false)
  })

  test('an unstaged latest fails even when older versions were staged', () => {
    const report = classifyStagedTrust('@socketregistry/regressed', {
      meta: metaOf('@socketregistry/regressed', [
        { staged: true, version: '1.0.0' },
        { staged: false, version: '1.0.1' },
      ]),
    })
    expect(report.verdict).toBe('not-staged')
    expect(isStagedTrustFailure(report)).toBe(true)
    // The history count is what separates "staged today, not before" from
    // "never staged" — the failure block has to carry it.
    expect(report.stagedVersionCount).toBe(1)
    expect(formatStagedTrustProblem(report)).toContain(
      '1 of 2 published version(s)',
    )
  })

  test('gates on dist-tag latest, not the newest key in the version map', () => {
    const report = classifyStagedTrust('@socketregistry/tagged', {
      meta: metaOf(
        '@socketregistry/tagged',
        [
          { staged: true, version: '1.0.0' },
          { staged: false, version: '2.0.0-beta.1' },
        ],
        '1.0.0',
      ),
    })
    expect(report.latestVersion).toBe('1.0.0')
    expect(report.verdict).toBe('staged')
  })

  test('an unpublished package is handled, never failed', () => {
    const report = classifyStagedTrust('@socketregistry/brand-new', {
      manifestVersion: '1.0.15',
      meta: undefined,
    })
    expect(report.verdict).toBe('unpublished')
    expect(report.latestVersion).toBeUndefined()
    expect(report.manifestVersionIsPublished).toBe(false)
    expect(isStagedTrustFailure(report)).toBe(false)
    expect(describeStagedTrust(report)).toContain('not yet published')
  })

  test('an in-flight bump reads the published latest and is reported, not failed', () => {
    // The manifest declares 1.0.15; only 1.0.14 is on the registry. The verdict
    // comes off 1.0.14 — an unlanded bump must never read as a regression.
    const report = classifyStagedTrust('@socketregistry/bumping', {
      manifestVersion: '1.0.15',
      meta: metaOf('@socketregistry/bumping', [
        { staged: true, version: '1.0.14' },
      ]),
    })
    expect(report.verdict).toBe('staged')
    expect(report.latestVersion).toBe('1.0.14')
    expect(report.manifestVersionIsPublished).toBe(false)
    expect(isStagedTrustFailure(report)).toBe(false)
    expect(describeStagedTrust(report)).toContain(
      'manifest version 1.0.15 is not on the registry yet',
    )
  })

  test('a published manifest version is marked as such', () => {
    const report = classifyStagedTrust('@socketregistry/current', {
      manifestVersion: '1.0.14',
      meta: metaOf('@socketregistry/current', [
        { staged: true, version: '1.0.14' },
      ]),
    })
    expect(report.manifestVersionIsPublished).toBe(true)
    expect(describeStagedTrust(report)).not.toContain('not on the registry yet')
  })
})

describe('formatStagedTrustProblem', () => {
  test('reports What / Where / Saw / Wanted / Fix in order', () => {
    const report = classifyStagedTrust('@socketregistry/date', {
      meta: metaOf('@socketregistry/date', [
        { staged: false, version: '1.0.8' },
      ]),
    })
    const lines = formatStagedTrustProblem(report).split(/\r?\n/)
    expect(lines[0]).toMatch(/^What: /)
    expect(lines[1]).toMatch(/^Where: /)
    expect(lines[2]).toMatch(/^Saw: /)
    expect(lines[3]).toMatch(/^Wanted: /)
    expect(lines[4]).toMatch(/^Fix: /)
    expect(lines[1]).toContain(
      'https://www.npmjs.com/package/@socketregistry/date/access',
    )
  })
})

describe('readStagedTrust', () => {
  test('reads the staged marker off the full packument', async () => {
    const name = `@socketregistry/read-staged-${crypto.randomUUID()}`
    const seen: string[] = []
    const report = await readStagedTrust(
      entryOf(name, '1.0.1'),
      isolatedOptions(async url => {
        seen.push(url)
        return rawPackument(name, [
          { staged: false, version: '1.0.0' },
          { staged: true, version: '1.0.1' },
        ])
      }),
    )
    expect(report.verdict).toBe('staged')
    expect(report.manifestVersionIsPublished).toBe(true)
    // variant 'full' is mandatory: the abbreviated packument omits _npmUser, so
    // an abbreviated request would report every version unstaged.
    expect(seen).toHaveLength(1)
    expect(seen[0]).not.toContain('install-v1')
  })

  test('reports not-staged when the latest version carries no marker', async () => {
    const name = `@socketregistry/read-unstaged-${crypto.randomUUID()}`
    const report = await readStagedTrust(
      entryOf(name),
      isolatedOptions(async () =>
        rawPackument(name, [{ staged: false, version: '1.0.0' }]),
      ),
    )
    expect(report.verdict).toBe('not-staged')
    expect(isStagedTrustFailure(report)).toBe(true)
  })

  test('a 404 resolves to unpublished instead of throwing', async () => {
    const name = `@socketregistry/read-404-${crypto.randomUUID()}`
    const report = await readStagedTrust(
      entryOf(name, '1.0.0'),
      isolatedOptions(async () => {
        throw new HttpResponseError({
          body: '',
          headers: {},
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as never)
      }),
    )
    expect(report.verdict).toBe('unpublished')
    expect(isStagedTrustFailure(report)).toBe(false)
  })

  test('a non-404 registry failure propagates instead of reading green', async () => {
    const name = `@socketregistry/read-500-${crypto.randomUUID()}`
    await expect(
      readStagedTrust(
        entryOf(name),
        isolatedOptions(async () => {
          throw new HttpResponseError({
            body: '',
            headers: {},
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
          } as never)
        }),
      ),
    ).rejects.toThrow()
  })

  test('a transport failure propagates instead of reading green', async () => {
    const name = `@socketregistry/read-econnreset-${crypto.randomUUID()}`
    await expect(
      readStagedTrust(
        entryOf(name),
        isolatedOptions(async () => {
          throw new Error('ECONNRESET')
        }),
      ),
    ).rejects.toThrow(/ECONNRESET/)
  })
})
