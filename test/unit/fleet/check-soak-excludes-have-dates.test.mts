// vitest specs for scripts/fleet/check/soak-excludes-have-dates.mts.
//
// Covers the pure `scan` (missing / stale detection) and the `--fix`
// promote helper `removeStaleEntries`, which the daily `updating-daily`
// job runs to drop soak-exclude entries whose `removable:` date has
// passed. The promote helper must remove the bullet AND its annotation
// comment while leaving every other entry + comment verbatim.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  removeStaleEntries,
  scan,
} from '../../../scripts/fleet/check/soak-excludes-have-dates.mts'

const YAML = `minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  - '@socketsecurity/*'
  - '@stuie/*'
  - '@ultrathink/*'
  - 'packages/*'
  - 'sfw'
  - 'socket'
  - 'socket-evil'
  - '@yuku-parser/*'
  # published: 2026-05-01 | removable: 2026-05-08
  - 'old-pkg@1.0.0'
  # published: 2026-05-25 | removable: 2026-06-01
  - 'fresh-pkg@2.0.0'
  - 'bare-name'

catalog:
  'x': 1.0.0
`

// Both list blocks present: a stale trust waiver, a still-active one, and a
// soak entry — to prove scan tags each finding with its originating block.
const BOTH_BLOCKS_YAML = `trustPolicy: no-downgrade
trustPolicyExclude:
  # published: 2026-05-01 | removable: 2026-05-08
  - 'waived-pkg@1.0.2'
  # published: 2026-05-25 | removable: 2026-06-01
  - 'still-waived@3.0.0'
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  # published: 2026-05-01 | removable: 2026-05-08
  - 'old-pkg@1.0.0'
`

describe('check-soak-excludes-have-dates / scan', () => {
  test('flags a stale entry (removable in the past)', () => {
    const stale = scan(YAML, '2026-05-20').filter(f => f.kind === 'stale')
    assert.equal(stale.length, 1)
    assert.equal(stale[0]!.name, 'old-pkg')
    assert.equal(stale[0]!.version, '1.0.0')
  })

  test('does not flag a not-yet-soaked entry', () => {
    // On 2026-05-20, fresh-pkg (removable 2026-06-01) is still active.
    const names = scan(YAML, '2026-05-20')
      .filter(f => f.kind === 'stale')
      .map(f => f.name)
    assert.ok(!names.includes('fresh-pkg'))
  })

  test('flags a bare (unpinned) concrete entry; globs stay exempt', () => {
    const all = scan(YAML, '2026-12-31')
    // A concrete entry must be `name@version`; a bare name is `unpinned`.
    const unpinned = all.filter(f => f.kind === 'unpinned')
    assert.ok(unpinned.some(f => f.name === 'bare-name'))
    // First-party scope globs are exempt from version-pinning.
    assert.ok(!all.some(f => f.name === '@socketsecurity/*'))
  })

  test('Socket-owned scope globs + exact names + workspace paths are exempt', () => {
    const all = scan(YAML, '2026-12-31')
    for (const exempt of [
      '@socketsecurity/*',
      '@stuie/*',
      '@ultrathink/*',
      'packages/*',
      'sfw',
      'socket',
    ]) {
      assert.ok(
        !all.some(f => f.name === exempt),
        `${exempt} should be soak-pin exempt`,
      )
    }
  })

  test('an unscoped socket-prefixed THIRD-PARTY name is NOT exempt (security)', () => {
    // The `socket-*` prefix glob was removed — only the exact name `socket`
    // (the live CLI) is exempt. A `socket-evil` an attacker could publish must
    // still be flagged, not blanket-bypassed.
    const unpinned = scan(YAML, '2026-12-31').filter(f => f.kind === 'unpinned')
    assert.ok(unpinned.some(f => f.name === 'socket-evil'))
  })

  test('a THIRD-PARTY scope glob is flagged unpinned (@yuku-parser/*)', () => {
    const unpinned = scan(YAML, '2026-12-31').filter(f => f.kind === 'unpinned')
    // A non-Socket scope glob blanket-bypasses someone else's releases — must
    // pin concrete `@scope/pkg@version` members instead.
    assert.ok(unpinned.some(f => f.name === '@yuku-parser/*'))
  })

  test('a first-party Socket binary tool bare name is exempt (sfw)', () => {
    const all = scan(YAML, '2026-12-31')
    // `sfw` ships as a GitHub-release binary, no npm @version to pin.
    assert.ok(!all.some(f => f.name === 'sfw'))
  })

  test('tags soak-block findings with block=minimumReleaseAgeExclude', () => {
    const stale = scan(YAML, '2026-05-20').filter(f => f.kind === 'stale')
    assert.equal(stale.length, 1)
    assert.equal(stale[0]!.block, 'minimumReleaseAgeExclude')
  })
})

describe('check-soak-excludes-have-dates / trustPolicyExclude block', () => {
  test('flags a stale trust waiver, tagged block=trustPolicyExclude', () => {
    // On 2026-05-15: waived-pkg (removable 2026-05-08) is stale; still-waived
    // (removable 2026-06-01) is not yet; old-pkg (soak) is stale too.
    const trustStale = scan(BOTH_BLOCKS_YAML, '2026-05-15').filter(
      f => f.kind === 'stale' && f.block === 'trustPolicyExclude',
    )
    assert.equal(trustStale.length, 1)
    assert.equal(trustStale[0]!.name, 'waived-pkg')
    assert.equal(trustStale[0]!.version, '1.0.2')
  })

  test('does not flag a not-yet-removable trust waiver', () => {
    const names = scan(BOTH_BLOCKS_YAML, '2026-05-15')
      .filter(f => f.kind === 'stale' && f.block === 'trustPolicyExclude')
      .map(f => f.name)
    assert.ok(!names.includes('still-waived'))
  })

  test('keeps the two blocks distinct — a soak entry is not tagged trust', () => {
    const soakStale = scan(BOTH_BLOCKS_YAML, '2026-05-15').filter(
      f => f.kind === 'stale' && f.block === 'minimumReleaseAgeExclude',
    )
    assert.equal(soakStale.length, 1)
    assert.equal(soakStale[0]!.name, 'old-pkg')
  })
})

describe('check-soak-excludes-have-dates / removeStaleEntries', () => {
  test('removes the stale bullet + its annotation, keeps the rest', () => {
    const stale = scan(YAML, '2026-05-20').filter(f => f.kind === 'stale')
    const out = removeStaleEntries(YAML, stale)
    // old-pkg + its annotation gone.
    assert.ok(!out.includes('old-pkg@1.0.0'))
    assert.ok(!out.includes('removable: 2026-05-08'))
    // fresh-pkg + its annotation + bare-name + glob preserved verbatim.
    assert.ok(out.includes("- 'fresh-pkg@2.0.0'"))
    assert.ok(out.includes('removable: 2026-06-01'))
    assert.ok(out.includes("- 'bare-name'"))
    assert.ok(out.includes("- '@socketsecurity/*'"))
    // Unrelated blocks untouched.
    assert.ok(out.includes("'x': 1.0.0"))
  })

  test('no-op when nothing is stale', () => {
    assert.equal(removeStaleEntries(YAML, []), YAML)
  })

  test('removes multiple stale entries in one pass', () => {
    const everythingStale = scan(YAML, '2026-12-31').filter(
      f => f.kind === 'stale',
    )
    // Both dated entries are now past removable.
    assert.equal(everythingStale.length, 2)
    const out = removeStaleEntries(YAML, everythingStale)
    assert.ok(!out.includes('old-pkg@1.0.0'))
    assert.ok(!out.includes('fresh-pkg@2.0.0'))
    assert.ok(!out.includes('removable: 2026-05-08'))
    assert.ok(!out.includes('removable: 2026-06-01'))
    // Bare + glob survive.
    assert.ok(out.includes("- 'bare-name'"))
  })
})
