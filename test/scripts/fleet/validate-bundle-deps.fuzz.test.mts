/**
 * @file Property/fuzz tests for scripts/fleet/validate-bundle-deps's
 *   `isValidPackageSpecifier` (Tier-1 fast-check). It is a boolean gate over
 *   bare import specifiers extracted from built files: it REJECTS relative
 *   (`.`/`/`) and subpath (`#`) imports, the empty string, a fixed set of
 *   package.json field-name false positives, and anything carrying code-fragment
 *   markers (`${`, backtick, `;`, newline, `function`, `const `, …); everything
 *   else is ACCEPTED.
 *
 *   The never-throws / always-boolean invariant holds for ANY string. Positive
 *   and negative cases are CONSTRUCTED so acceptance is knowable without
 *   re-listing the rejection table inside expect().
 */

import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import { isValidPackageSpecifier } from '../../../scripts/fleet/validate-bundle-deps.mts'

// A safe package-name-ish token: lowercase letters, digits, hyphens; non-empty.
// Contains none of the rejection markers and cannot equal the reserved
// field-name words (those are single alpha words with no hyphen/digit — a token
// with a hyphen or digit can't collide, and we keep length small but non-word).
const nameChars = 'abcdefghijklmnopqrstuvwxyz0123456789-'
const bareName = fc
  .array(fc.constantFrom(...nameChars), { minLength: 1, maxLength: 12 })
  // Prefix a digit so the token can never equal a reserved word like `name`,
  // `version`, `true`, `function`, etc. (all of which are digit-free words).
  .map(chars => `9${chars.join('')}`)

// The exact set the SUT rejects by identity.
const RESERVED = [
  'true',
  'false',
  'null',
  'undefined',
  'name',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'version',
  'description',
] as const

// Substrings the SUT treats as code-fragment / injection markers.
const CODE_MARKERS = ['${', '"}', '`', '\n', ';', 'function', 'const ', 'let ', 'var '] as const

describe('validate-bundle-deps — isValidPackageSpecifier (fuzz)', () => {
  // NEVER-THROWS + INVARIANT: any string yields a boolean.
  test('always returns a boolean for any input', () => {
    fc.assert(
      fc.property(fc.string(), s => {
        expect(typeof isValidPackageSpecifier(s)).toBe('boolean')
      }),
    )
  })

  // ACCEPT: a constructed bare name (unscoped) is valid.
  test('accepts a safe unscoped package name', () => {
    fc.assert(
      fc.property(bareName, name => {
        expect(isValidPackageSpecifier(name)).toBe(true)
      }),
    )
  })

  // ACCEPT: a scoped `@scope/pkg` built from safe tokens is valid.
  test('accepts a safe scoped package name', () => {
    fc.assert(
      fc.property(bareName, bareName, (scope, pkg) => {
        expect(isValidPackageSpecifier(`@${scope}/${pkg}`)).toBe(true)
      }),
    )
  })

  // ACCEPT: a deep subpath (`pkg/sub/leaf`) of safe tokens is valid — only a
  // LEADING `/` is a relative import; interior slashes are fine.
  test('accepts a safe package subpath', () => {
    fc.assert(
      fc.property(bareName, bareName, (pkg, sub) => {
        expect(isValidPackageSpecifier(`${pkg}/${sub}`)).toBe(true)
      }),
    )
  })

  // REJECT: relative and subpath imports (leading `.`, `/`, `#`).
  test('rejects relative / absolute / subpath imports', () => {
    fc.assert(
      fc.property(fc.constantFrom('.', '/', '#'), bareName, (lead, rest) => {
        expect(isValidPackageSpecifier(`${lead}${rest}`)).toBe(false)
      }),
    )
  })

  // REJECT: the empty string.
  test('rejects the empty string', () => {
    expect(isValidPackageSpecifier('')).toBe(false)
  })

  // REJECT: reserved package.json field-name false positives.
  test('rejects reserved field-name tokens', () => {
    fc.assert(
      fc.property(fc.constantFrom(...RESERVED), word => {
        expect(isValidPackageSpecifier(word)).toBe(false)
      }),
    )
  })

  // REJECT (oracle): injecting any code-fragment marker into an otherwise valid
  // name forces rejection. The marker is placed AFTER a safe prefix so the
  // leading-char rules aren't what triggers the rejection.
  test('rejects any specifier containing a code-fragment marker', () => {
    fc.assert(
      fc.property(
        bareName,
        fc.constantFrom(...CODE_MARKERS),
        bareName,
        (pre, marker, post) => {
          expect(isValidPackageSpecifier(`${pre}${marker}${post}`)).toBe(false)
        },
      ),
    )
  })
})
