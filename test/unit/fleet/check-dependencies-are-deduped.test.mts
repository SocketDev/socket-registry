// Tests for the dedup gate's pure cores. The lockfile parse (`scan`) and the
// reviewed-record read touch disk and aren't unit-tested here; `majorOf` and
// `partitionDuplicates` carry the judgment the gate enforces — which families
// count as reviewed (left duplicated by the decision tree) vs unreviewed (the
// actionable signal that the dedup posture drifted).

import { describe, expect, test } from 'vitest'

import {
  majorOf,
  partitionDuplicates,
} from '../../../scripts/fleet/check/dependencies-are-deduped.mts'

describe('majorOf', () => {
  test('a >=1.0.0 version reduces to its major', () => {
    expect(majorOf('7.8.1')).toBe('7')
  })
  test('a 0.x version keeps the minor as the breaking axis', () => {
    expect(majorOf('0.30.21')).toBe('0.30')
  })
})

describe('partitionDuplicates', () => {
  const reviewed = new Map([
    ['ansi-regex', { majors: ['5', '6'], reason: 'format flip' }],
    ['commander', { majors: ['8', '13'], reason: 'wide API span' }],
  ])

  test('a family whose every major is recorded is reviewed', () => {
    const p = partitionDuplicates(
      [{ majors: ['5', '6'], name: 'ansi-regex' }],
      reviewed,
    )
    expect(p.reviewed.map(f => f.name)).toEqual(['ansi-regex'])
    expect(p.unreviewed).toEqual([])
  })

  test('an unrecorded family is unreviewed (the actionable signal)', () => {
    const p = partitionDuplicates(
      [{ majors: ['1', '2'], name: 'newpkg' }],
      reviewed,
    )
    expect(p.unreviewed.map(f => f.name)).toEqual(['newpkg'])
    expect(p.reviewed).toEqual([])
  })

  test('a recorded family that gained a NEW major re-flags as unreviewed', () => {
    const p = partitionDuplicates(
      [{ majors: ['5', '6', '7'], name: 'ansi-regex' }],
      reviewed,
    )
    expect(p.unreviewed.map(f => f.name)).toEqual(['ansi-regex'])
  })

  test('a recorded family that is no longer a duplicate is stale', () => {
    const p = partitionDuplicates([], reviewed)
    expect(p.stale).toEqual(['ansi-regex', 'commander'])
  })

  test('no record → every family is unreviewed (informational mode)', () => {
    const p = partitionDuplicates(
      [
        { majors: ['1', '2'], name: 'a' },
        { majors: ['1', '2'], name: 'b' },
      ],
      undefined,
    )
    expect(p.unreviewed).toHaveLength(2)
    expect(p.reviewed).toEqual([])
    expect(p.stale).toEqual([])
  })
})
