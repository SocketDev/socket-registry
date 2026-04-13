/**
 * @fileoverview Tests for is-generator-function NPM package override.
 * Ported 1:1 from upstream v1.1.2 (625a966a):
 * https://github.com/inspect-js/is-generator-function/blob/625a966a49815f5dd4aa484acd118b49c9ea8fc8/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isGeneratorFunction,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('returns false for non-functions', () => {
    it.each([
      true,
      false,
      null,
      undefined,
      {},
      [],
      /a/g,
      'string',
      42,
      new Date(),
    ])('returns false for %s', nonFunc => {
      expect(isGeneratorFunction(nonFunc)).toBe(false)
    })
  })

  describe('returns false for non-generator functions', () => {
    it('anonymous function is not a generator function', () => {
      expect(isGeneratorFunction(function () {})).toBe(false)
    })

    it('named function is not a generator function', () => {
      expect(isGeneratorFunction(function foo() {})).toBe(false)
    })
  })

  describe('returns false for non-generator function with faked toString', () => {
    it('faked toString does not fool the check', () => {
      const func = function () {}
      func.toString = function () {
        return 'function* () { return "TOTALLY REAL I SWEAR!"; }'
      }
      expect(isGeneratorFunction(func)).toBe(false)
    })
  })

  describe(
    'returns false for non-generator function with faked @@toStringTag',
    { skip: !hasToStringTag },
    () => {
      it('faked GeneratorFunction toStringTag does not fool the check', () => {
        let genFunc: GeneratorFunction | undefined
        try {
          genFunc = new Function(
            'return function* () {}',
          )() as GeneratorFunction
        } catch (_e) {
          // generator functions not supported
        }
        if (genFunc) {
          const fakeGenFunction: Record<PropertyKey, unknown> = {
            toString: function () {
              return String(genFunc)
            },
            valueOf: function () {
              return genFunc
            },
          }
          fakeGenFunction[Symbol.toStringTag] = 'GeneratorFunction'
          expect(isGeneratorFunction(fakeGenFunction)).toBe(false)
        }
      })
    },
  )

  describe('returns true for generator functions', () => {
    it('generator function is detected', () => {
      let genFunc: GeneratorFunction | undefined
      try {
        genFunc = new Function('return function* () {}')() as GeneratorFunction
      } catch (_e) {
        // generator functions not supported
      }
      if (genFunc) {
        expect(isGeneratorFunction(genFunc)).toBe(true)
      }
    })
  })
})
