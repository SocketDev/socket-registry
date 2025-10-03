import { describe, expect, it } from 'vitest'

import {
  defineLazyGetter,
  defineLazyGetters,
} from '../../registry/dist/lib/objects.js'

describe('objects module - lazy getter edge cases', () => {
  describe('defineLazyGetters with stats tracking', () => {
    it('should track lazy getter statistics', () => {
      const obj = {}
      const stats = { initialized: new Set() }

      defineLazyGetters(
        obj,
        {
          value: () => 42,
        },
        stats,
      )

      expect(stats.initialized.size).toBe(0)
      // @ts-expect-error - accessing lazy property
      const value = obj.value
      expect(value).toBe(42)
      expect(stats.initialized.size).toBe(1)
      expect(stats.initialized.has('value')).toBe(true)
    })

    it('should count multiple property accesses', () => {
      const obj = {}
      const stats = { initialized: new Set() }

      defineLazyGetters(
        obj,
        {
          first: () => 'a',
          second: () => 'b',
          third: () => 'c',
        },
        stats,
      )

      // @ts-expect-error - accessing lazy properties
      obj.first
      // @ts-expect-error - accessing lazy properties
      obj.second
      // @ts-expect-error - accessing lazy properties
      obj.third

      expect(stats.initialized.size).toBe(3)
      expect(stats.initialized.has('first')).toBe(true)
      expect(stats.initialized.has('second')).toBe(true)
      expect(stats.initialized.has('third')).toBe(true)
    })

    it('should handle stats parameter with defineLazyGetter', () => {
      const obj = {}
      const stats = { initialized: new Set() }

      defineLazyGetter(obj, 'prop', () => 'value', stats)

      expect(stats.initialized.size).toBe(0)
      // @ts-expect-error - accessing lazy property
      const value = obj.prop
      expect(value).toBe('value')
      expect(stats.initialized.size).toBe(1)
      expect(stats.initialized.has('prop')).toBe(true)
    })

    it('should work without stats parameter', () => {
      const obj = {}

      defineLazyGetters(obj, {
        value: () => 123,
      })

      // @ts-expect-error - accessing lazy property
      expect(obj.value).toBe(123)
    })
  })
})
