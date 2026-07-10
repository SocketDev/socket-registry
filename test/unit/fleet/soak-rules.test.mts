// vitest specs for scripts/fleet/soak-rules.mts — the shared soak-policy
// reader + allow/soak decision used by update-external-tools.mts and the
// soak-excludes-have-dates check, so all surfaces decide identically.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  excludeEntryMatches,
  isSoakExcluded,
  parseSoakRules,
} from '../../../scripts/fleet/soak-rules.mts'

const YAML = `trustPolicy: no-downgrade
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  - '@socketsecurity/*'
  - 'socket-*'
  - 'sfw'
  # published: 2026-06-03 | removable: 2026-06-10
  - 'rolldown@1.1.0'
  - '@yuku-parser/binding-darwin-arm64@0.5.31'

catalog:
  'x': 1.0.0
`

describe('soak-rules / parseSoakRules', () => {
  test('reads the minimumReleaseAge scalar', () => {
    assert.equal(parseSoakRules(YAML).minutes, 10_080)
  })

  test('reads every exclude bullet, skipping comments + blanks', () => {
    const { exclude } = parseSoakRules(YAML)
    assert.deepEqual(exclude, [
      '@socketsecurity/*',
      'socket-*',
      'sfw',
      'rolldown@1.1.0',
      '@yuku-parser/binding-darwin-arm64@0.5.31',
    ])
  })

  test('stops at the next top-level key (does not bleed into catalog)', () => {
    const { exclude } = parseSoakRules(YAML)
    assert.ok(!exclude.includes('x'))
    assert.ok(!exclude.some(e => e.includes('1.0.0')))
  })

  test('absent keys → no soak, empty list (file is the explicit canon)', () => {
    const rules = parseSoakRules('packages:\n  - "a"\n')
    assert.equal(rules.minutes, 0)
    assert.deepEqual(rules.exclude, [])
  })
})

describe('soak-rules / excludeEntryMatches', () => {
  test('scope glob matches any package in the scope, any version', () => {
    assert.ok(excludeEntryMatches('@socketsecurity/*', '@socketsecurity/lib'))
    assert.ok(
      excludeEntryMatches('@socketsecurity/*', '@socketsecurity/lib', '9.9.9'),
    )
    assert.ok(!excludeEntryMatches('@socketsecurity/*', '@other/lib'))
  })

  test('prefix glob (socket-*) matches by name prefix', () => {
    assert.ok(excludeEntryMatches('socket-*', 'socket-registry'))
    assert.ok(!excludeEntryMatches('socket-*', 'rocket-registry'))
  })

  test('bare name matches exactly, at any version', () => {
    assert.ok(excludeEntryMatches('sfw', 'sfw'))
    assert.ok(excludeEntryMatches('sfw', 'sfw', '2.0.0'))
    assert.ok(!excludeEntryMatches('sfw', 'sfw-free'))
  })

  test('pinned name@version matches only that exact version', () => {
    assert.ok(excludeEntryMatches('rolldown@1.1.0', 'rolldown', '1.1.0'))
    assert.ok(!excludeEntryMatches('rolldown@1.1.0', 'rolldown', '1.1.1'))
    // Name match with unknown version counts (caller doesn't always know it).
    assert.ok(excludeEntryMatches('rolldown@1.1.0', 'rolldown'))
    assert.ok(!excludeEntryMatches('rolldown@1.1.0', 'vite'))
  })

  test('scoped pinned name@version (leading @ not read as version delim)', () => {
    assert.ok(
      excludeEntryMatches(
        '@yuku-parser/binding-darwin-arm64@0.5.31',
        '@yuku-parser/binding-darwin-arm64',
        '0.5.31',
      ),
    )
    assert.ok(
      !excludeEntryMatches(
        '@yuku-parser/binding-darwin-arm64@0.5.31',
        '@yuku-parser/binding-darwin-arm64',
        '0.6.0',
      ),
    )
  })
})

describe('soak-rules / isSoakExcluded', () => {
  const { exclude } = parseSoakRules(YAML)

  test('excluded by glob / bare / pin', () => {
    assert.ok(isSoakExcluded('@socketsecurity/lib', '9.9.9', exclude))
    assert.ok(isSoakExcluded('socket-foo', undefined, exclude))
    assert.ok(isSoakExcluded('sfw', undefined, exclude))
    assert.ok(isSoakExcluded('rolldown', '1.1.0', exclude))
  })

  test('NOT excluded: third-party, or wrong pinned version', () => {
    assert.ok(!isSoakExcluded('left-pad', '1.0.0', exclude))
    assert.ok(!isSoakExcluded('rolldown', '1.2.0', exclude))
    assert.ok(
      !isSoakExcluded('@yuku-parser/binding-darwin-arm64', '0.9.9', exclude),
    )
  })

  test('empty exclude list → nothing excluded', () => {
    assert.ok(!isSoakExcluded('anything', '1.0.0', []))
  })
})
