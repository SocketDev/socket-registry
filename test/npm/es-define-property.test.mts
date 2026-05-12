/**
 * @fileoverview Tests for es-define-property NPM package override.
 * Ported 1:1 from upstream v1.0.1 (50ef129225ae17336a774f0eefc4e6bc88c79b8e):
 * https://github.com/ljharb/es-define-property/blob/50ef129225ae17336a774f0eefc4e6bc88c79b8e/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: $defineProperty,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('defineProperty: supported', { skip: !$defineProperty }, () => {
    it('is a function', () => {
      expect(typeof $defineProperty).toBe('function')
    })

    it('defines a property with expected descriptor (enumerable, non-writable)', () => {
      const o: Record<string, number> = { a: 1 }
      $defineProperty(o, 'b', { enumerable: true, value: 2 })
      expect(Object.getOwnPropertyDescriptor(o, 'b')).toEqual({
        configurable: false,
        enumerable: true,
        value: 2,
        writable: false,
      })
    })

    it('defines a property with expected descriptor (non-enumerable, writable)', () => {
      const o: Record<string, number> = { a: 1 }
      $defineProperty(o, 'c', { enumerable: false, value: 3, writable: true })
      expect(Object.getOwnPropertyDescriptor(o, 'c')).toEqual({
        configurable: false,
        enumerable: false,
        value: 3,
        writable: true,
      })
    })

    it('is Object.defineProperty', () => {
      expect($defineProperty).toBe(Object.defineProperty)
    })
  })

  describe('defineProperty: not supported', { skip: !!$defineProperty }, () => {
    it('is falsy', () => {
      expect($defineProperty).toBeFalsy()
    })

    it('typeof is undefined or boolean', () => {
      expect(typeof $defineProperty).toMatch(/^(?:boolean|undefined)$/)
    })
  })
})
