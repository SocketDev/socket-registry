/**
 * @file Property/fuzz tests for scripts/fleet/make-package-exports's
 *   `matchesGlob` (Tier-1 fast-check). It is a shallow glob matcher used to
 *   decide which export leaves get browser-safe / ignore conditions:
 *
 *   - a leading `./` on the target and a leading `.?/?` on the glob are stripped
 *   - a glob with no `*` matches iff the target equals it or is nested under it
 *     (`dir` matches `dir` and `dir/child`)
 *   - `*` matches within a single path segment, `**` matches across `/`
 *
 *   Path/glob arbitraries are CONSTRUCTED from safe segment characters so the
 *   match outcome is knowable without reimplementing the matcher; the regex it
 *   builds internally is only exercised through these known-answer cases.
 */

import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import { matchesGlob } from '../../../scripts/fleet/make-package-exports.mts'

// A single path segment: lowercase letters + digits, non-empty, containing no
// `.`, `/`, `*` or other regex/glob metacharacter — so it survives verbatim
// through the matcher's dot-escaping and star-expansion.
const segment = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), {
    minLength: 1,
    maxLength: 6,
  })
  .map(chars => chars.join(''))

// A `/`-joined path of 1..4 safe segments.
const segPath = fc
  .array(segment, { minLength: 1, maxLength: 4 })
  .map(segs => segs.join('/'))

describe('make-package-exports — matchesGlob (fuzz)', () => {
  // LITERAL: a glob with no `*` matches its exact target.
  test('literal glob matches an identical target', () => {
    fc.assert(
      fc.property(segPath, p => {
        expect(matchesGlob(p, p)).toBe(true)
      }),
    )
  })

  // LITERAL prefix: a literal glob also matches any path nested beneath it.
  test('literal glob matches a nested descendant', () => {
    fc.assert(
      fc.property(segPath, segPath, (base, rest) => {
        expect(matchesGlob(`${base}/${rest}`, base)).toBe(true)
      }),
    )
  })

  // LITERAL non-match: a literal glob does not match a sibling that merely
  // shares it as a prefix without a `/` boundary.
  test('literal glob does not match a non-boundary prefix sibling', () => {
    fc.assert(
      fc.property(segPath, segment, (base, suffix) => {
        // `${base}${suffix}` shares `base` as a raw prefix but there is no `/`
        // after it, so it is neither equal nor a nested descendant.
        expect(matchesGlob(`${base}${suffix}`, base)).toBe(false)
      }),
    )
  })

  // LEADING `./` tolerance on the target side.
  test('a leading ./ on the target is ignored', () => {
    fc.assert(
      fc.property(segPath, p => {
        expect(matchesGlob(`./${p}`, p)).toBe(matchesGlob(p, p))
        expect(matchesGlob(`./${p}`, p)).toBe(true)
      }),
    )
  })

  // LEADING `./` tolerance on the glob side.
  test('a leading ./ on the glob is ignored', () => {
    fc.assert(
      fc.property(segPath, p => {
        expect(matchesGlob(p, `./${p}`)).toBe(true)
      }),
    )
  })

  // `**` matches across slashes — the universal glob matches any safe path.
  test('** matches any path', () => {
    fc.assert(
      fc.property(segPath, p => {
        expect(matchesGlob(p, '**')).toBe(true)
      }),
    )
  })

  // `dir/**` matches everything nested under dir, and nothing under a different
  // top segment. `other` is derived to be guaranteed-distinct from `dir`
  // (prefixed with `z`) so no `.filter`/`fc.pre` is needed.
  test('dir/** matches descendants of dir only', () => {
    fc.assert(
      fc.property(segment, segPath, (dir, rest) => {
        const other = `z${dir}`
        expect(matchesGlob(`${dir}/${rest}`, `${dir}/**`)).toBe(true)
        expect(matchesGlob(`${other}/${rest}`, `${dir}/**`)).toBe(false)
      }),
    )
  })

  // A single `*` matches exactly one segment: `dir/*` matches `dir/<seg>` but
  // not a deeper `dir/<seg>/<seg>` (the `*` cannot cross a `/`).
  test('* matches one segment but does not cross a slash', () => {
    fc.assert(
      fc.property(segment, segment, segment, (dir, a, b) => {
        expect(matchesGlob(`${dir}/${a}`, `${dir}/*`)).toBe(true)
        expect(matchesGlob(`${dir}/${a}/${b}`, `${dir}/*`)).toBe(false)
      }),
    )
  })

  // NEVER-THROWS + INVARIANT: over constructed globs (safe segments plus glob
  // metachars `*`, `**`, `/`) the matcher always returns a boolean without
  // throwing. Globs are built from a glob alphabet rather than fc.string()
  // because the matcher only escapes `.` — arbitrary regex metacharacters
  // (`(`, `[`, `\`) are outside its documented shallow-glob contract.
  test('always returns a boolean for constructed glob patterns', () => {
    const globToken = fc.oneof(segment, fc.constantFrom('*', '**', '/', '.'))
    const globArb = fc
      .array(globToken, { minLength: 1, maxLength: 8 })
      .map(tokens => tokens.join(''))
    fc.assert(
      fc.property(segPath, globArb, (target, glob) => {
        expect(typeof matchesGlob(target, glob)).toBe('boolean')
      }),
    )
  })
})
