/**
 * @file Parity tests for the deep-equal override's portable (non-node) export
 *   branch — packages/npm/deep-equal/package/index.js. The main suites
 *   (deep-equal.test.mts, deep-equal-types.test.mts) load the override through
 *   the `node` export condition, which resolves to index.cjs (a thin
 *   node:assert / node:util delegation). This file loads package/index.js
 *   DIRECTLY so the hand-rolled algorithm — the branch that historically pulled
 *   in the es-shims micro-deps (which-typed-array, which-collection, is-regex,
 *   object-is, …) — is exercised. It pins behavior across every type path so a
 *   zero-dependency rewrite (inlining the subset of each shim that is actually
 *   used) can be verified to preserve semantics.
 */

import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

type DeepEqual = (a: unknown, b: unknown, options?: unknown) => boolean

const { eco, pkgPath, skip, sockRegPkgName } = setupNpmPackageTest(
  import.meta.url,
  { package: 'deep-equal' },
)

function loadDeepEqual(): DeepEqual {
  if (skip) {
    return () => false
  }
  return require(path.join(pkgPath, 'package', 'index.js'))
}

const deepEqual = loadDeepEqual()

function loose(a: unknown, b: unknown): boolean {
  return deepEqual(a, b)
}

function strict(a: unknown, b: unknown): boolean {
  return deepEqual(a, b, { strict: true })
}

function makeArguments(): IArguments {
  // oxlint-disable-next-line prefer-rest-params -- isArguments needs a genuine arguments exotic object; a rest array is not one.
  return arguments
}

describe(`${eco} > ${sockRegPkgName} (portable branch)`, { skip }, () => {
  describe('primitives', () => {
    it('equal numbers and strings', () => {
      expect(loose(1, 1)).toBe(true)
      expect(strict(1, 1)).toBe(true)
      expect(loose('a', 'a')).toBe(true)
      expect(loose(1, 2)).toBe(false)
    })

    it('NaN: strict via Object.is, loose via ==', () => {
      expect(strict(NaN, NaN)).toBe(true)
      expect(loose(NaN, NaN)).toBe(false)
    })

    it('signed zero: strict distinguishes, loose does not', () => {
      expect(loose(0, -0)).toBe(true)
      expect(strict(0, -0)).toBe(false)
    })

    it('loose cross-type coercion', () => {
      expect(loose(1, '1')).toBe(true)
      expect(strict(1, '1')).toBe(false)
      expect(loose(undefined, undefined)).toBe(true)
      // Upstream deep-equal short-circuits `is(actual, expected)` before any
      // type check, so strict(undefined, undefined) is true — same as the
      // node-branch (index.cjs) and upstream inspect-js/node-deep-equal.
      expect(strict(undefined, undefined)).toBe(true)
    })
  })

  describe('plain objects and arrays', () => {
    it('equal objects, including different key order', () => {
      expect(loose({ a: [2, 3], b: [4] }, { a: [2, 3], b: [4] })).toBe(true)
      expect(loose({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
      expect(strict({ a: 1 }, { a: 1 })).toBe(true)
    })

    it('unequal objects and arrays', () => {
      expect(loose({ a: 1 }, { a: 2 })).toBe(false)
      expect(loose({ a: 1 }, { a: 1, b: 2 })).toBe(false)
      expect(loose([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(loose([1, 2, 3], [1, 2])).toBe(false)
    })

    it('arrays vs objects differ', () => {
      expect(loose([], {})).toBe(false)
    })
  })

  describe('prototype (strict only)', () => {
    it('different prototypes are unequal under strict', () => {
      expect(strict(Object.create(null), {})).toBe(false)
      expect(loose(Object.create(null), {})).toBe(true)
    })
  })

  describe('Dates', () => {
    it('equal and unequal timestamps', () => {
      expect(loose(new Date(1234), new Date(1234))).toBe(true)
      expect(loose(new Date(1234), new Date(5678))).toBe(false)
      expect(strict(new Date(1234), new Date(1234))).toBe(true)
    })
  })

  describe('RegExps', () => {
    it('compares source and flags', () => {
      expect(loose(/abc/g, /abc/g)).toBe(true)
      expect(loose(/abc/g, /abc/i)).toBe(false)
      expect(loose(/abc/, /abd/)).toBe(false)
    })
  })

  describe('Maps', () => {
    it('equal maps regardless of insertion order', () => {
      expect(
        loose(
          new Map([
            ['a', 1],
            ['b', 2],
          ]),
          new Map([
            ['b', 2],
            ['a', 1],
          ]),
        ),
      ).toBe(true)
    })

    it('unequal maps', () => {
      expect(loose(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
      expect(loose(new Map([['a', 1]]), new Map())).toBe(false)
    })

    it('object keys compared by deep equality', () => {
      expect(
        loose(new Map([[{ k: 1 }, 'v']]), new Map([[{ k: 1 }, 'v']])),
      ).toBe(true)
    })
  })

  describe('Sets', () => {
    it('equal and unequal sets', () => {
      // oxlint-disable-next-line socket/sort-set-args -- intentionally unsorted to verify order-independent Set equality.
      expect(loose(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true)
      expect(loose(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false)
    })

    it('object members compared by deep equality', () => {
      expect(loose(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(true)
    })
  })

  describe('TypedArrays', () => {
    it('same kind and contents are equal', () => {
      expect(loose(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(
        true,
      )
      expect(loose(new Int32Array([1, 2]), new Int32Array([1, 2]))).toBe(true)
      expect(
        loose(new Float64Array([1.5, 2.5]), new Float64Array([1.5, 2.5])),
      ).toBe(true)
    })

    it('different kind is unequal even with same values', () => {
      expect(loose(new Uint8Array([1, 2]), new Int8Array([1, 2]))).toBe(false)
    })

    it('different contents or length is unequal', () => {
      expect(loose(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(
        false,
      )
      expect(loose(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(
        false,
      )
    })

    it('BigInt typed arrays', () => {
      expect(
        loose(new BigInt64Array([1n, 2n]), new BigInt64Array([1n, 2n])),
      ).toBe(true)
      expect(
        loose(new BigInt64Array([1n, 2n]), new BigInt64Array([1n, 3n])),
      ).toBe(false)
    })
  })

  describe('ArrayBuffers', () => {
    it('compares byte contents', () => {
      const a = new Uint8Array([1, 2, 3]).buffer
      const b = new Uint8Array([1, 2, 3]).buffer
      const c = new Uint8Array([1, 2, 4]).buffer
      expect(loose(a, b)).toBe(true)
      expect(loose(a, c)).toBe(false)
    })
  })

  describe('arguments objects', () => {
    it('arguments equal to arguments, not to arrays', () => {
      const make = makeArguments as (...rest: number[]) => IArguments
      expect(loose(make(1, 2, 3), make(1, 2, 3))).toBe(true)
      expect(loose(make(1, 2, 3), [1, 2, 3])).toBe(false)
    })
  })

  describe('Errors', () => {
    it('compares name and message', () => {
      expect(loose(new Error('boom'), new Error('boom'))).toBe(true)
      expect(loose(new Error('boom'), new Error('bang'))).toBe(false)
      expect(loose(new TypeError('x'), new Error('x'))).toBe(false)
    })
  })

  describe('circular references', () => {
    it('handles self-referential structures without overflow', () => {
      const a: Record<string, unknown> = { foo: 1 }
      a['self'] = a
      const b: Record<string, unknown> = { foo: 1 }
      b['self'] = b
      expect(loose(a, b)).toBe(true)
    })
  })
})
