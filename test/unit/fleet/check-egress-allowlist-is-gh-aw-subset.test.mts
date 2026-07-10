// vitest spec for check-egress-allowlist-is-gh-aw-subset. The two exported pure
// functions (collectGhAwAllowDomains + isCovered) are exercised with inline
// string/set fixtures — no repo, no network, no git. The module-level side
// effects (reading the live allowlist + git ls-files + process.exitCode) run in
// the isolated vitest context and do not affect these assertions.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  collectGhAwAllowDomains,
  isCovered,
} from '../../../scripts/fleet/check/egress-allowlist-is-gh-aw-subset.mts'

// A gh-aw lock embeds its allowlist as a printf'd JSON blob; only the
// "allowDomains":[...] array shape matters to the collector.
function makeLockBlob(hosts: string[]): string {
  const list = hosts.map(h => `"${h}"`).join(',')
  return `printf '%s' '{"network":{"allowDomains":[${list}]},"apiProxy":{}}'`
}

describe('collectGhAwAllowDomains', () => {
  test('extracts every host from a single allowDomains array', () => {
    const text = makeLockBlob(['github.com', 'api.github.com', 'pypi.org'])
    assert.deepEqual(collectGhAwAllowDomains(text), [
      'github.com',
      'api.github.com',
      'pypi.org',
    ])
  })

  test('collects from multiple allowDomains arrays (main + threat-detection)', () => {
    // gh-aw writes the list into more than one blob, sometimes with a delta.
    const text =
      makeLockBlob(['github.com', 'www.googleapis.com']) +
      '\n' +
      makeLockBlob(['github.com', 'pypi.org'])
    const hosts = collectGhAwAllowDomains(text)
    // Every host across both arrays is present (the caller unions via a Set).
    assert.ok(hosts.includes('www.googleapis.com'))
    assert.ok(hosts.includes('pypi.org'))
    assert.ok(hosts.includes('github.com'))
  })

  test('tolerates whitespace around the key and brackets', () => {
    const text = '"allowDomains"  :  [ "github.com" , "pypi.org" ]'
    assert.deepEqual(collectGhAwAllowDomains(text), ['github.com', 'pypi.org'])
  })

  test('returns an empty array when no allowDomains array is present', () => {
    assert.deepEqual(collectGhAwAllowDomains('jobs:\n  run: {}'), [])
  })

  test('returns an empty array for an empty string', () => {
    assert.deepEqual(collectGhAwAllowDomains(''), [])
  })
})

describe('isCovered', () => {
  const gh = new Set<string>([
    '*.githubusercontent.com',
    'api.anthropic.com',
    'github.com',
    'registry.npmjs.org',
  ])

  test('an exact member of the gh-aw set is covered', () => {
    assert.equal(isCovered('github.com', gh), true)
    assert.equal(isCovered('registry.npmjs.org', gh), true)
  })

  test('a gh-aw *.suffix wildcard covers a subdomain', () => {
    assert.equal(isCovered('raw.githubusercontent.com', gh), true)
    assert.equal(isCovered('objects.githubusercontent.com', gh), true)
  })

  test('a gh-aw *.suffix wildcard covers the bare suffix itself', () => {
    assert.equal(isCovered('githubusercontent.com', gh), true)
  })

  test('a host not present and not wildcard-covered is NOT covered', () => {
    assert.equal(isCovered('evil.example.com', gh), false)
    // a similarly-named host that is not a subdomain of the suffix
    assert.equal(isCovered('notgithubusercontent.com', gh), false)
  })

  test('a fleet *.suffix wildcard is covered ONLY by an identical gh-aw wildcard, never widened', () => {
    // gh-aw grants the exact wildcard → covered.
    assert.equal(isCovered('*.githubusercontent.com', gh), true)
    // gh-aw grants only the bare host, not the wildcard → a fleet wildcard is NOT covered.
    const bareOnly = new Set<string>(['example.com'])
    assert.equal(isCovered('*.example.com', bareOnly), false)
  })
})
