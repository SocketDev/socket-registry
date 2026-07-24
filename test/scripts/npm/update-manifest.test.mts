/**
 * @file Tests for the scripts/npm/update-manifest.mts dropped-package guard.
 *   The regeneration loop skips a package whenever its registry fetch fails,
 *   which used to silently DROP it from the rewritten manifest — observed
 *   live when @socketregistry/string.prototype.at vanished on one run and
 *   reappeared on the next. The guard diffs the previous on-disk manifest's
 *   package set against the regenerated one and classifies every vanished
 *   package via the fetch-failure list the run accumulates: a recorded
 *   failure is a fatal `failedDrop`, anything else is an intentional
 *   `removal` that only `--allow-removals` may write.
 */

import { describe, expect, test, vi } from 'vitest'

import { diffDroppedPackages } from '../../../scripts/npm/update-manifest.mts'

import type { ManifestEntry } from '../../../scripts/npm/update-manifest.mts'

interface FakeManifest {
  version: string
}

const entry = (
  name: string,
  origName: string,
  version = '1.0.0',
): ManifestEntry => [
  `pkg:npm/${name.replace('@', '%40')}@${version}`,
  {
    license: 'MIT',
    name,
    package: origName,
    version,
  },
]

const previous: Record<string, ManifestEntry[]> = {
  npm: [
    entry('@socketregistry/abab', 'abab', '1.0.9'),
    entry(
      '@socketregistry/string.prototype.at',
      'string.prototype.at',
      '1.0.8',
    ),
    entry('@socketregistry/is-string', 'is-string', '1.1.2'),
  ],
}

/**
 * Regenerate a manifest the way update-manifest.mts does at the skip-path
 * level: every expected package is fetched; an undefined packument — the
 * fetchPackageManifest result for a 404 — records the original package name
 * into the fetch-failure set and omits the entry from the regenerated data.
 */
async function regenerate(
  expected: Array<{ name: string; origName: string }>,
  fetchPackageManifest: (id: string) => Promise<FakeManifest | undefined>,
): Promise<{
  fetchFailures: Set<string>
  next: Record<string, ManifestEntry[]>
}> {
  const data: ManifestEntry[] = []
  const fetchFailures = new Set<string>()
  for (const { name, origName } of expected) {
    // eslint-disable-next-line no-await-in-loop
    const packument = await fetchPackageManifest(`${origName}@latest`)
    if (!packument) {
      fetchFailures.add(origName)
      continue
    }
    data.push(entry(name, origName, packument.version))
  }
  return { fetchFailures, next: { npm: data } }
}

describe('update-manifest — dropped-package guard', () => {
  test('a transient 404 mid-run surfaces as a fatal failedDrop, not a silent shrink', async () => {
    // Mock a registry that transiently 404s string.prototype.at and serves
    // everything else.
    const fetchPackageManifest = vi.fn(
      async (id: string): Promise<FakeManifest | undefined> =>
        id.startsWith('string.prototype.at@')
          ? undefined
          : { version: '9.9.9' },
    )
    const { fetchFailures, next } = await regenerate(
      [
        { name: '@socketregistry/abab', origName: 'abab' },
        {
          name: '@socketregistry/string.prototype.at',
          origName: 'string.prototype.at',
        },
        { name: '@socketregistry/is-string', origName: 'is-string' },
      ],
      fetchPackageManifest,
    )
    expect(fetchPackageManifest).toHaveBeenCalledTimes(3)
    expect(fetchFailures).toEqual(new Set(['string.prototype.at']))

    const report = diffDroppedPackages(previous, next, fetchFailures)
    expect(report.failedDrops).toEqual(['@socketregistry/string.prototype.at'])
    expect(report.removals).toEqual([])
  })

  test('a package the config no longer lists is a removal, not a failedDrop', async () => {
    // is-string was dropped from the expected set entirely — never attempted,
    // so no fetch failure is recorded for it.
    const fetchPackageManifest = vi.fn(
      async (): Promise<FakeManifest> => ({ version: '9.9.9' }),
    )
    const { fetchFailures, next } = await regenerate(
      [
        { name: '@socketregistry/abab', origName: 'abab' },
        {
          name: '@socketregistry/string.prototype.at',
          origName: 'string.prototype.at',
        },
      ],
      fetchPackageManifest,
    )
    expect(fetchFailures.size).toBe(0)

    const report = diffDroppedPackages(previous, next, fetchFailures)
    expect(report.failedDrops).toEqual([])
    expect(report.removals).toEqual(['@socketregistry/is-string'])
  })

  test('failure recorded under the Socket override name also matches', () => {
    const next: Record<string, ManifestEntry[]> = {
      npm: [entry('@socketregistry/abab', 'abab', '1.0.9')],
    }
    const report = diffDroppedPackages(
      { npm: previous['npm']!.slice(0, 2) },
      next,
      new Set(['@socketregistry/string.prototype.at']),
    )
    expect(report.failedDrops).toEqual(['@socketregistry/string.prototype.at'])
    expect(report.removals).toEqual([])
  })

  test('identical package sets produce no drops even when versions moved', () => {
    const next: Record<string, ManifestEntry[]> = {
      npm: previous['npm']!.map(([, meta]) =>
        entry(meta['name'] as string, meta['package'] as string, '2.0.0'),
      ),
    }
    const report = diffDroppedPackages(previous, next, new Set())
    expect(report.failedDrops).toEqual([])
    expect(report.removals).toEqual([])
  })

  test('no previous manifest disables the guard for first-time generation', () => {
    const report = diffDroppedPackages(
      undefined,
      { npm: [] },
      new Set(['string.prototype.at']),
    )
    expect(report.failedDrops).toEqual([])
    expect(report.removals).toEqual([])
  })

  test('an empty regeneration flags every attempted package as a failedDrop', () => {
    const failures = new Set(['abab', 'is-string', 'string.prototype.at'])
    const report = diffDroppedPackages(previous, {}, failures)
    expect(report.failedDrops).toEqual([
      '@socketregistry/abab',
      '@socketregistry/is-string',
      '@socketregistry/string.prototype.at',
    ])
    expect(report.removals).toEqual([])
  })
})
