/**
 * @file Property/fuzz tests for scripts/fleet/sync-package-manager-pins
 *   (Tier-1 fast-check). Two pure version/pin-math primitives:
 *
 *   - compareSemver(a, b): numeric -1/0/1 over the first three dot-separated
 *     segments (prerelease/build tails ignored; non-numeric parts coerced to
 *     0 via `parseInt || 0`). A total order the drift classifier relies on.
 *   - extractPinVersion(field): pulls the first `X.Y.Z(-pre|+build)` out of a
 *     pin field (`pnpm@11.8.0`, `>=11.8.0`, plain `11.8.0`) or undefined.
 *
 *   Arbitraries CONSTRUCT the version strings (joined numeric parts + known
 *   range prefixes) so the expected outcome is knowable without reimplementing
 *   either function.
 */

import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import {
  compareSemver,
  extractPinVersion,
} from '../../../scripts/fleet/sync-package-manager-pins.mts'

// A single numeric segment (kept modest so triples are dense enough to hit
// equal / less / greater outcomes frequently).
const seg = fc.nat({ max: 50 })

// A numeric (major, minor, patch) triple — the release core the comparator
// actually reads.
const triple = fc.tuple(seg, seg, seg)

// A valid `X.Y.Z` string built from a triple.
const versionArb = triple.map(t => t.join('.'))

// Range/tool prefixes that carry no `\d+\.\d+\.\d+` of their own, so the first
// regex match inside extractPinVersion is always the version we appended.
const prefixArb = fc.constantFrom(
  '',
  'v',
  '^',
  '~',
  '>=',
  '<=',
  '>',
  '<',
  '=',
  'pnpm@',
  'npm@',
  'yarn@',
  'node@',
)

// Prerelease identifiers restricted to `[\w.]` (no hyphen) so the whole tail is
// captured by the `[-+][\w.]+` group rather than truncated at an inner hyphen.
const preIdent = fc.oneof(
  fc.nat({ max: 200 }).map(String),
  fc.constantFrom('alpha', 'beta', 'rc', 'next', 'canary'),
)
const preRelease = fc
  .array(preIdent, { minLength: 1, maxLength: 3 })
  .map(ids => ids.join('.'))

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

describe('sync-package-manager-pins — compareSemver (fuzz)', () => {
  // INVARIANT: reflexivity — a version compares equal to itself.
  test('reflexivity: compareSemver(v, v) === 0', () => {
    fc.assert(
      fc.property(versionArb, v => {
        expect(compareSemver(v, v)).toBe(0)
      }),
    )
  })

  // INVARIANT: the result is always exactly one of -1, 0, 1.
  test('result is always one of {-1, 0, 1}', () => {
    fc.assert(
      fc.property(versionArb, versionArb, (a, b) => {
        expect([-1, 0, 1]).toContain(compareSemver(a, b))
      }),
    )
  })

  // INVARIANT: antisymmetry — swapping arguments negates the sign.
  test('antisymmetry: sign(cmp(a,b)) === -sign(cmp(b,a))', () => {
    fc.assert(
      fc.property(versionArb, versionArb, (a, b) => {
        const ab = compareSemver(a, b)
        const ba = compareSemver(b, a)
        expect(sign(ab)).toBe(-sign(ba))
      }),
    )
  })

  // INVARIANT: transitivity of the ordering.
  test('transitivity: a<=b and b<=c implies a<=c', () => {
    fc.assert(
      fc.property(versionArb, versionArb, versionArb, (a, b, c) => {
        const ab = compareSemver(a, b)
        const bc = compareSemver(b, c)
        const ac = compareSemver(a, c)
        if (ab <= 0 && bc <= 0) {
          expect(ac).toBeLessThanOrEqual(0)
        }
        if (ab >= 0 && bc >= 0) {
          expect(ac).toBeGreaterThanOrEqual(0)
        }
      }),
    )
  })

  // ORACLE (derived-from-input): the order is exactly the lexicographic order
  // of the numeric (major, minor, patch) triple. The expected sign is computed
  // from the raw triples in a var — NOT from the SUT — so this is a genuine
  // independent oracle, not a reimplementation fed back into expect().
  test('order matches the numeric (major, minor, patch) triple order', () => {
    fc.assert(
      fc.property(triple, triple, (ta, tb) => {
        let expected: -1 | 0 | 1 = 0
        for (let i = 0; i < 3; i += 1) {
          if (ta[i]! < tb[i]!) {
            expected = -1
            break
          }
          if (ta[i]! > tb[i]!) {
            expected = 1
            break
          }
        }
        expect(compareSemver(ta.join('.'), tb.join('.'))).toBe(expected)
      }),
    )
  })

  // DERIVED CHARACTERISTIC: only the first three segments matter — appending a
  // fourth numeric segment to both sides never changes the comparison.
  test('segments past patch are ignored', () => {
    fc.assert(
      fc.property(versionArb, versionArb, seg, seg, (a, b, extraA, extraB) => {
        expect(compareSemver(`${a}.${extraA}`, `${b}.${extraB}`)).toBe(
          compareSemver(a, b),
        )
      }),
    )
  })

  // NEVER-THROWS: arbitrary strings are tolerated (non-numeric parts coerce to
  // 0) and still yield a value in {-1, 0, 1}.
  test('never throws on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect([-1, 0, 1]).toContain(compareSemver(a, b))
      }),
    )
  })
})

describe('sync-package-manager-pins — extractPinVersion (fuzz)', () => {
  // ROUND-TRIP: a clean `X.Y.Z` core preceded by any range/tool prefix is
  // recovered verbatim.
  test('recovers X.Y.Z from any prefixed pin field', () => {
    fc.assert(
      fc.property(prefixArb, versionArb, (prefix, core) => {
        expect(extractPinVersion(`${prefix}${core}`)).toBe(core)
      }),
    )
  })

  // ROUND-TRIP with a prerelease tail: the whole `X.Y.Z-pre` is captured.
  test('recovers X.Y.Z-prerelease including the tail', () => {
    fc.assert(
      fc.property(prefixArb, versionArb, preRelease, (prefix, core, pre) => {
        const full = `${core}-${pre}`
        expect(extractPinVersion(`${prefix}${full}`)).toBe(full)
      }),
    )
  })

  // INVARIANT: the extracted value, when present, is itself a self-consistent
  // pin — re-extracting it is the identity.
  test('extraction is idempotent', () => {
    fc.assert(
      fc.property(fc.string(), field => {
        const first = extractPinVersion(field)
        if (first !== undefined) {
          expect(extractPinVersion(first)).toBe(first)
        }
      }),
    )
  })

  // RESTRICTED-INPUT: a field with no `X.Y.Z` triple yields undefined. These
  // are constructed to lack any three-dot-separated numeric run.
  test('returns undefined when no version triple is present', () => {
    const noVersion = fc.constantFrom(
      '',
      'latest',
      'undefined',
      'pnpm',
      'workspace:*',
      '1',
      '1.2',
      'v1.2',
      'x.y.z',
      'next',
    )
    fc.assert(
      fc.property(noVersion, field => {
        expect(extractPinVersion(field)).toBeUndefined()
      }),
    )
  })

  // NEVER-THROWS: arbitrary input yields a string or undefined, never a throw.
  test('never throws on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), field => {
        const result = extractPinVersion(field)
        expect(result === undefined || typeof result === 'string').toBe(true)
      }),
    )
  })
})
