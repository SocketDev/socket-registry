// vitest specs for fleet-soak-exclude-parity's pure helpers. Focused on
// expiredExpectedPins — the second invariant that fails the gate when an
// EXPECTED soak-pin has cleared its 7-day window (the dead entry that
// tug-of-wars between the cascade's insert + prune loops).

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  diffSoakExclude,
  expiredExpectedPins,
  mismatchedPublishDates,
  parseSoakExcludeBlock,
} from '../../../scripts/fleet/check/fleet-soak-exclude-parity.mts'

const TODAY = '2026-06-09'

// Build an injected publish-date fetcher from a `name@version → date` map.
// Anything absent resolves to undefined (the offline / unknown-version case).
function fakeFetch(
  byTag: Readonly<Record<string, string | undefined>>,
): (name: string, version: string) => Promise<string | undefined> {
  return (name, version) => Promise.resolve(byTag[`${name}@${version}`])
}

// ── expiredExpectedPins ─────────────────────────────────────────

test('expiredExpectedPins flags a version-pin whose removable date has passed', () => {
  const annotations = {
    'rolldown@1.0.3': { published: '2026-05-27', removable: '2026-06-03' },
  }
  assert.deepEqual(
    expiredExpectedPins(['rolldown@1.0.3'], annotations, TODAY),
    ['rolldown@1.0.3'],
  )
})

test('expiredExpectedPins treats removable === today as still soaking (exclusive)', () => {
  // pnpm clears the 7×24h window at the publish TIMESTAMP + 7d, which lands
  // somewhere on the `removable` date (not at 00:00). So on removable === today
  // the unpinned install may still be rejected — keep the pin one more day.
  const annotations = {
    'pkg@1.0.0': { published: '2026-06-02', removable: TODAY },
  }
  assert.deepEqual(expiredExpectedPins(['pkg@1.0.0'], annotations, TODAY), [])
})

test('expiredExpectedPins flags a pin whose removable date is strictly before today', () => {
  const annotations = {
    'pkg@1.0.0': { published: '2026-06-01', removable: '2026-06-08' },
  }
  assert.deepEqual(expiredExpectedPins(['pkg@1.0.0'], annotations, TODAY), [
    'pkg@1.0.0',
  ])
})

test('expiredExpectedPins keeps a pin still inside its soak window', () => {
  const annotations = {
    'fresh@2.0.0': { published: '2026-06-06', removable: '2026-06-13' },
  }
  assert.deepEqual(expiredExpectedPins(['fresh@2.0.0'], annotations, TODAY), [])
})

test('expiredExpectedPins skips globs (no version to soak)', () => {
  assert.deepEqual(
    expiredExpectedPins(['@socketsecurity/*', '@stuie/*'], {}, TODAY),
    [],
  )
})

test('expiredExpectedPins skips bare names (no @version)', () => {
  assert.deepEqual(expiredExpectedPins(['shell-quote'], {}, TODAY), [])
})

test('expiredExpectedPins skips a version-pin with no annotation', () => {
  // Can't date it offline; the parity arm separately requires versioned
  // entries to be annotated, so an unannotated pin is left for that arm.
  assert.deepEqual(expiredExpectedPins(['mystery@1.0.0'], {}, TODAY), [])
})

test('expiredExpectedPins keys a scoped name on the LAST @ (the version)', () => {
  const annotations = {
    '@vitest/ui@4.1.6': { published: '2026-05-11', removable: '2026-05-18' },
  }
  assert.deepEqual(
    expiredExpectedPins(['@vitest/ui@4.1.6'], annotations, TODAY),
    ['@vitest/ui@4.1.6'],
  )
})

test('expiredExpectedPins returns only the cleared subset of a mixed list', () => {
  const expected = [
    '@socketsecurity/*', // glob — skip
    'shell-quote', // bare — skip
    'cleared@1.0.0', // expired — flag
    'fresh@2.0.0', // soaking — keep
    'undated@3.0.0', // no annotation — skip
  ]
  const annotations = {
    'cleared@1.0.0': { published: '2026-05-01', removable: '2026-05-08' },
    'fresh@2.0.0': { published: '2026-06-06', removable: '2026-06-13' },
  }
  assert.deepEqual(expiredExpectedPins(expected, annotations, TODAY), [
    'cleared@1.0.0',
  ])
})

test('expiredExpectedPins skips a Socket-owned versioned pin (soak-exempt)', () => {
  // Socket packages ship through Socket's own provenance pipeline — the soak
  // never guards them, so even an "expired" Socket pin must NOT be flagged.
  const annotations = {
    '@socketsecurity/lib@6.0.8': {
      published: '2026-05-01',
      removable: '2026-05-08',
    },
  }
  assert.deepEqual(
    expiredExpectedPins(['@socketsecurity/lib@6.0.8'], annotations, TODAY),
    [],
  )
})

// ── mismatchedPublishDates ──────────────────────────────────────

test('mismatchedPublishDates passes when the registry date matches the annotation', async () => {
  const annotations = {
    'oxfmt@0.55.0': { published: '2026-06-15', removable: '2026-06-22' },
  }
  const got = await mismatchedPublishDates(
    annotations,
    TODAY,
    fakeFetch({ 'oxfmt@0.55.0': '2026-06-15' }),
  )
  assert.deepEqual(got, [])
})

test('mismatchedPublishDates flags an annotation whose date the registry disagrees with', async () => {
  const annotations = {
    'oxfmt@0.55.0': { published: '2026-06-15', removable: '2026-06-22' },
  }
  const got = await mismatchedPublishDates(
    annotations,
    TODAY,
    // Registry says it really published a day earlier — the window is wrong.
    fakeFetch({ 'oxfmt@0.55.0': '2026-06-14' }),
  )
  assert.deepEqual(got, [
    { actual: '2026-06-14', annotated: '2026-06-15', entry: 'oxfmt@0.55.0' },
  ])
})

test('mismatchedPublishDates is FAIL-OPEN: an unverifiable (undefined) date is skipped', async () => {
  const annotations = {
    'pkg@1.0.0': { published: '2026-06-06', removable: '2026-06-13' },
  }
  // Empty map → fetch resolves undefined (offline / unknown version).
  const got = await mismatchedPublishDates(annotations, TODAY, fakeFetch({}))
  assert.deepEqual(got, [])
})

test('mismatchedPublishDates skips soak-cleared pins (expiredExpectedPins owns those)', async () => {
  const annotations = {
    'cleared@1.0.0': { published: '2026-05-01', removable: '2026-05-08' },
  }
  // Even a wrong registry date must NOT be flagged here — the pin is on its way
  // out, and double-reporting would muddy the fix.
  const got = await mismatchedPublishDates(
    annotations,
    TODAY,
    fakeFetch({ 'cleared@1.0.0': '2026-04-30' }),
  )
  assert.deepEqual(got, [])
})

test('mismatchedPublishDates skips globs, bare names, and unannotated entries', async () => {
  const annotations = {
    '@socketsecurity/*': { published: undefined, removable: undefined },
    'mystery@1.0.0': { published: undefined, removable: undefined },
    'shell-quote': { published: undefined, removable: undefined },
  }
  const got = await mismatchedPublishDates(
    annotations,
    TODAY,
    fakeFetch({ 'mystery@1.0.0': '2099-01-01' }),
  )
  assert.deepEqual(got, [])
})

test('mismatchedPublishDates returns only the mismatched subset, sorted by entry', async () => {
  const annotations = {
    'alpha@1.0.0': { published: '2026-06-06', removable: '2026-06-13' },
    'beta@2.0.0': { published: '2026-06-06', removable: '2026-06-13' },
    'gamma@3.0.0': { published: '2026-06-06', removable: '2026-06-13' },
  }
  const got = await mismatchedPublishDates(
    annotations,
    TODAY,
    fakeFetch({
      'alpha@1.0.0': '2026-06-06', // matches → ok
      'beta@2.0.0': '2026-06-05', // mismatch
      'gamma@3.0.0': undefined, // unverifiable → skip
    }),
  )
  assert.deepEqual(got, [
    { actual: '2026-06-05', annotated: '2026-06-06', entry: 'beta@2.0.0' },
  ])
})

test('mismatchedPublishDates skips a Socket-owned pin (soak-exempt, never verified)', async () => {
  const annotations = {
    '@socketsecurity/lib@6.0.8': {
      published: '2026-06-15',
      removable: '2026-06-22',
    },
  }
  // Even with a deliberately wrong registry date, a Socket package's soak is
  // never guarded, so it is never registry-verified → no mismatch.
  const got = await mismatchedPublishDates(
    annotations,
    TODAY,
    fakeFetch({ '@socketsecurity/lib@6.0.8': '2020-01-01' }),
  )
  assert.deepEqual(got, [])
})

// ── parseSoakExcludeBlock (sanity — the existing helper, previously untested) ──

test('parseSoakExcludeBlock reads the minimumReleaseAgeExclude bullets', () => {
  const yaml = [
    'foo: bar',
    'minimumReleaseAgeExclude:',
    "  - '@socketsecurity/*'",
    "  - 'rolldown@1.1.0'  # published: 2026-06-03 | removable: 2026-06-10",
    '',
    'catalog:',
    '  rolldown: 1.1.0',
  ].join('\n')
  assert.deepEqual(parseSoakExcludeBlock(yaml), [
    '@socketsecurity/*',
    'rolldown@1.1.0',
  ])
})

test('parseSoakExcludeBlock returns [] when the block is absent', () => {
  assert.deepEqual(parseSoakExcludeBlock('catalog:\n  foo: 1.0.0\n'), [])
})

// ── diffSoakExclude (sanity — the parity arm) ───────────────────

test('diffSoakExclude surfaces a wheelhouse pin with no canonical counterpart', () => {
  assert.deepEqual(diffSoakExclude(['orphan@1.0.0'], ['@socketsecurity/*']), [
    'orphan@1.0.0',
  ])
})

test('diffSoakExclude treats a glob + a bare→pinned upgrade as covered', () => {
  assert.deepEqual(
    diffSoakExclude(
      ['@socketsecurity/sdk', 'rolldown'],
      ['@socketsecurity/*', 'rolldown@1.1.0'],
    ),
    [],
  )
})
