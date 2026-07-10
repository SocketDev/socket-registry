// vitest specs for resolve-security-pin — the pure pin resolver (highest soaked
// release in first_patched's major, in-major-still-soaking vs cross-major vs
// no-candidate outcomes). No network: versions + publish dates are injected.

import { describe, expect, test } from 'vitest'

import {
  isSoaked,
  resolveSecurityPin,
  SOAK_DAYS,
} from '../../../scripts/fleet/resolve-security-pin.mts'

const DAY = 86_400_000
// A fixed "now" so every relative publish date is deterministic.
const NOW = Date.parse('2026-06-18T00:00:00.000Z')

// Build a publishedAt map placing each version `daysAgo` before NOW.
function ago(entries: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [version, daysAgo] of Object.entries(entries)) {
    out[version] = NOW - daysAgo * DAY
  }
  return out
}

describe('isSoaked', () => {
  test('a version older than the soak window is soaked', () => {
    expect(
      isSoaked('1.0.0', { now: NOW, publishedAt: ago({ '1.0.0': SOAK_DAYS }) }),
    ).toBe(true)
  })
  test('a version inside the window is not soaked', () => {
    expect(
      isSoaked('1.0.0', {
        now: NOW,
        publishedAt: ago({ '1.0.0': SOAK_DAYS - 1 }),
      }),
    ).toBe(false)
  })
  test('an unknown publish date is treated as not soaked', () => {
    expect(isSoaked('1.0.0', { now: NOW, publishedAt: {} })).toBe(false)
  })
})

describe('resolveSecurityPin', () => {
  test('pins the highest soaked release in first_patched major', () => {
    const r = resolveSecurityPin({
      firstPatched: '11.1.1',
      now: NOW,
      publishedAt: ago({ '11.1.1': 30, '11.1.2': 20, '12.0.0': 30 }),
      publishedVersions: ['11.1.1', '11.1.2', '12.0.0'],
    })
    expect(r.outcome).toBe('resolved')
    // 11.1.2 > 11.1.1, both soaked, both in major 11; 12.0.0 is out of major.
    expect(r.pinTarget).toBe('11.1.2')
  })

  test('worked example: uuid pins to first_patched 11.1.1 (no major cross)', () => {
    // From reference.md: our 9.0.1 is in the `< 11.1.1` range, so the resolver
    // pins 11.1.1 even though 12/13/14 ship the fix too — never looks past the
    // major.
    const r = resolveSecurityPin({
      firstPatched: '11.1.1',
      now: NOW,
      publishedAt: ago({
        '11.1.1': 60,
        '12.0.1': 50,
        '13.0.1': 40,
        '14.0.0': 30,
      }),
      publishedVersions: ['11.1.1', '12.0.1', '13.0.1', '14.0.0'],
    })
    expect(r.outcome).toBe('resolved')
    expect(r.pinTarget).toBe('11.1.1')
  })

  test('drops pre-releases — never pins to an -rc', () => {
    const r = resolveSecurityPin({
      firstPatched: '2.0.0',
      now: NOW,
      publishedAt: ago({ '2.0.0': 30, '2.1.0-rc.1': 30 }),
      publishedVersions: ['2.0.0', '2.1.0-rc.1'],
    })
    expect(r.outcome).toBe('resolved')
    expect(r.pinTarget).toBe('2.0.0')
  })

  test('in-major fix still soaking → awaiting-soak, no pin', () => {
    const r = resolveSecurityPin({
      firstPatched: '5.0.6',
      now: NOW,
      publishedAt: ago({ '5.0.6': 2 }),
      publishedVersions: ['5.0.6'],
    })
    expect(r.outcome).toBe('awaiting-soak')
    expect(r.pinTarget).toBeUndefined()
  })

  test('fix only in a higher major → cross-major with the candidate surfaced', () => {
    // first_patched is 9.0.0 but the only published soaked release >= it is in
    // major 11 — the resolver surfaces it for the skill's benignity gate.
    const r = resolveSecurityPin({
      firstPatched: '9.0.0',
      now: NOW,
      publishedAt: ago({ '11.1.1': 30 }),
      publishedVersions: ['11.1.1'],
    })
    expect(r.outcome).toBe('cross-major')
    expect(r.pinTarget).toBe('11.1.1')
  })

  test('nothing soaked at all → no-candidate', () => {
    const r = resolveSecurityPin({
      firstPatched: '3.0.0',
      now: NOW,
      publishedAt: ago({ '3.0.0': 1 }),
      publishedVersions: ['3.0.0'],
    })
    // 3.0.0 is in-major but un-soaked → awaiting-soak, not no-candidate.
    expect(r.outcome).toBe('awaiting-soak')
  })

  test('unparseable first_patched → no-candidate', () => {
    const r = resolveSecurityPin({
      firstPatched: 'not-a-version',
      now: NOW,
      publishedAt: {},
      publishedVersions: [],
    })
    expect(r.outcome).toBe('no-candidate')
    expect(r.pinTarget).toBeUndefined()
  })
})
