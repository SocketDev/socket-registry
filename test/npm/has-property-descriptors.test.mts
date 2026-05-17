/**
 * @fileoverview Tests for has-property-descriptors NPM package override.
 * Ported 1:1 from upstream v1.0.2 (4ac370bb):
 * https://github.com/inspect-js/has-property-descriptors/blob/4ac370bba561e51dacf87cd43b69c26dd44cd173/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: hasPropertyDescriptors,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof hasPropertyDescriptors).toBe('function')
  })

  it('hasArrayLengthDefineBug is a function', () => {
    expect(typeof hasPropertyDescriptors.hasArrayLengthDefineBug).toBe(
      'function',
    )
  })

  const yes = hasPropertyDescriptors()

  describe('property descriptors', { skip: !yes }, () => {
    it('has expected property descriptor', () => {
      const sentinel = {}
      const o = { a: sentinel }

      expect(Object.getOwnPropertyDescriptor(o, 'a')).toEqual({
        configurable: true,
        enumerable: true,
        value: sentinel,
        writable: true,
      })

      Object.defineProperty(o, 'a', { enumerable: false, writable: false })

      expect(Object.getOwnPropertyDescriptor(o, 'a')).toEqual({
        configurable: true,
        enumerable: false,
        value: sentinel,
        writable: false,
      })
    })
  })

  describe(
    'defining array lengths',
    { skip: !yes || hasPropertyDescriptors.hasArrayLengthDefineBug() },
    () => {
      it('can define array length', () => {
        // eslint-disable-next-line no-sparse-arrays
        const arr = [1, , 3]
        expect(arr.length).toBe(3)

        Object.defineProperty(arr, 'length', { value: 5 })
        expect(arr.length).toBe(5)
      })
    },
  )
})
