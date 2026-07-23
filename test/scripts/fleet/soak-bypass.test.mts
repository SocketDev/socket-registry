/**
 * @file Property/fuzz tests for scripts/fleet/soak-bypass's `parseSpec`
 *   (Tier-1 fast-check). It splits a `<pkg>@<version>` soak-bypass argument
 *   into `{ name, version }`, handling scoped names (`@scope/pkg@1.2.3`) by
 *   splitting on the LAST `@`, and returning undefined when either side is
 *   empty (a leading-`@`-only name, or a trailing `@`).
 *
 *   Specs are CONSTRUCTED from safe (no-`@`) name/version pieces so the split
 *   point — and therefore the expected result — is known without duplicating
 *   the `lastIndexOf('@')` logic.
 */

import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import { parseSpec } from '../../../scripts/fleet/soak-bypass.mts'

// Name/version pieces that contain no `@`, so the only `@` in a constructed
// spec is the separator we insert.
const noAt = fc
  .string({ minLength: 1, maxLength: 12 })
  .map(s => s.replaceAll('@', '_'))

// An unscoped package name: non-empty, no `@`, and not starting with `@`
// (scoped names are covered separately).
const unscopedName = noAt

// A scoped package name `@scope/pkg` built from two safe pieces.
const scopedName = fc
  .tuple(noAt, noAt)
  .map(([scope, pkg]) => `@${scope}/${pkg}`)

const version = noAt

describe('soak-bypass — parseSpec (fuzz)', () => {
  // ROUND-TRIP: an unscoped `name@version` recovers both halves exactly.
  test('round-trips an unscoped name@version', () => {
    fc.assert(
      fc.property(unscopedName, version, (name, ver) => {
        expect(parseSpec(`${name}@${ver}`)).toEqual({ name, version: ver })
      }),
    )
  })

  // ROUND-TRIP: a scoped `@scope/pkg@version` splits on the LAST `@`.
  test('round-trips a scoped @scope/pkg@version', () => {
    fc.assert(
      fc.property(scopedName, version, (name, ver) => {
        expect(parseSpec(`${name}@${ver}`)).toEqual({ name, version: ver })
      }),
    )
  })

  // STRUCTURAL INVARIANT over ALL inputs: parseSpec either returns undefined or
  // returns two non-empty halves that recombine (via a single `@`) back into
  // the exact input. Never throws.
  test('result recombines to the input, with non-empty halves', () => {
    fc.assert(
      fc.property(fc.string(), spec => {
        const result = parseSpec(spec)
        if (result !== undefined) {
          expect(result.name.length).toBeGreaterThan(0)
          expect(result.version.length).toBeGreaterThan(0)
          expect(`${result.name}@${result.version}`).toBe(spec)
        }
      }),
    )
  })

  // RESTRICTED-INPUT: no `@` at a splittable position → undefined. Covers the
  // no-`@`, leading-`@`-only, and trailing-`@` cases.
  test('returns undefined when there is no splittable @', () => {
    // A bare word (no `@` anywhere) can never split.
    fc.assert(
      fc.property(noAt, word => {
        expect(parseSpec(word)).toBeUndefined()
      }),
    )
    // A trailing `@` leaves an empty version.
    fc.assert(
      fc.property(unscopedName, name => {
        expect(parseSpec(`${name}@`)).toBeUndefined()
      }),
    )
    // A leading `@` with no later `@` (index 0) yields an empty name slot.
    fc.assert(
      fc.property(noAt, rest => {
        expect(parseSpec(`@${rest}`)).toBeUndefined()
      }),
    )
  })

  // NEVER-THROWS: arbitrary input yields an object or undefined.
  test('never throws on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), spec => {
        const result = parseSpec(spec)
        expect(result === undefined || typeof result === 'object').toBe(true)
      }),
    )
  })
})
