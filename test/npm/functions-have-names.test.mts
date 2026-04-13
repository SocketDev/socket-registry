/**
 * @fileoverview Tests for functions-have-names NPM package override.
 * Ported 1:1 from upstream v1.2.3 (64b47a22):
 * https://github.com/inspect-js/functions-have-names/blob/64b47a22365205afc910782e99fc4b554d937171/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: hasNames,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('named functions', () => {
    it('is a function', () => {
      expect(typeof hasNames).toBe('function')
    })

    it('returns expected result', () => {
      function f() {}
      const g = function h() {}
      expect(hasNames()).toBe(f.name === 'f' && g.name === 'h')
    })
  })

  describe('functionsHaveConfigurableNames', () => {
    it('is a function', () => {
      expect(typeof hasNames.functionsHaveConfigurableNames).toBe('function')
    })

    it('returns a boolean', () => {
      expect(typeof hasNames.functionsHaveConfigurableNames()).toBe('boolean')
    })

    it('returns correct result based on configurability', () => {
      if (hasNames()) {
        const fn = function f() {}
        const oDP = Object.defineProperty
        if (oDP) {
          try {
            oDP(fn, 'name', { configurable: true, value: 'foo' })
          } catch (_e) {
            // ignore
          }
          if (fn.name === 'f') {
            expect(hasNames.functionsHaveConfigurableNames()).toBe(false)
          } else if (fn.name === 'foo') {
            expect(hasNames.functionsHaveConfigurableNames()).toBe(true)
          }
        } else {
          expect(hasNames.functionsHaveConfigurableNames()).toBe(false)
        }
      } else {
        expect(hasNames.functionsHaveConfigurableNames()).toBe(false)
      }
    })
  })

  describe('boundFunctionsHaveNames', () => {
    it('is a function', () => {
      expect(typeof hasNames.boundFunctionsHaveNames).toBe('function')
    })

    it('returns correct result', () => {
      const fn = function f() {}
      if (typeof fn.bind !== 'function') {
        expect(hasNames.boundFunctionsHaveNames()).toBe(false)
      } else if (hasNames()) {
        expect(hasNames.boundFunctionsHaveNames()).toBe(
          fn.bind(undefined).name !== '',
        )
      } else {
        expect(hasNames.boundFunctionsHaveNames()).toBe(false)
      }
    })
  })
})
