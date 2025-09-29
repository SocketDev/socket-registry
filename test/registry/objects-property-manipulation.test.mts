import { describe, expect, it } from 'vitest'

import {
  createConstantsObject,
  createLazyGetter,
  defineGetter,
  defineLazyGetter,
  defineLazyGetters,
  entryKeyComparator,
  getKeys,
  getOwn,
  getOwnPropertyValues,
  hasKeys,
  hasOwn,
  isObject,
  isObjectObject,
  merge,
  objectEntries,
  toSortedObject,
  toSortedObjectFromEntries,
} from '../../registry/dist/lib/objects.js'

describe('objects property manipulation and utilities', () => {
  describe('createConstantsObject', () => {
    it('should create constants object from entries', () => {
      const entries = [
        ['KEY1', 'value1'],
        ['KEY2', 'value2'],
      ]
      const constants = createConstantsObject(entries)
      expect(constants.length).toBe(2)
      expect(constants[0]).toEqual(['KEY1', 'value1'])
      expect(constants[1]).toEqual(['KEY2', 'value2'])
      expect(Object.isFrozen(constants)).toBe(true)
    })

    it('should handle empty entries', () => {
      const constants = createConstantsObject([])
      expect(constants.length).toBe(0)
      expect(Object.isFrozen(constants)).toBe(true)
    })
  })

  describe('createLazyGetter', () => {
    it('should create lazy getter function', () => {
      let callCount = 0
      const lazyFn = () => {
        callCount++
        return 'computed value'
      }

      const getter = createLazyGetter('testProp', lazyFn)
      expect(typeof getter).toBe('function')

      const result1 = getter()
      const result2 = getter()

      expect(result1).toBe('computed value')
      expect(result2).toBe('computed value')
      // Should only call once due to caching
      expect(callCount).toBe(1)
    })
  })

  describe('defineGetter', () => {
    it('should define property getter', () => {
      const obj: any = {}
      defineGetter(obj, 'computed', () => 'getter value')

      expect(obj.computed).toBe('getter value')
      expect(
        Object.getOwnPropertyDescriptor(obj, 'computed')?.get,
      ).toBeDefined()
    })
  })

  describe('defineLazyGetter', () => {
    it('should define lazy property getter', () => {
      const obj: any = {}
      let callCount = 0

      defineLazyGetter(obj, 'lazy', () => {
        callCount++
        return 'lazy value'
      })

      expect(obj.lazy).toBe('lazy value')
      // Second access
      expect(obj.lazy).toBe('lazy value')
      // Should only call once
      expect(callCount).toBe(1)
    })
  })

  describe('defineLazyGetters', () => {
    it('should define multiple lazy getters', () => {
      const obj: any = {}
      const getters = {
        prop1: () => 'value1',
        prop2: () => 'value2',
      }

      defineLazyGetters(obj, getters)

      expect(obj.prop1).toBe('value1')
      expect(obj.prop2).toBe('value2')
    })
  })

  describe('entryKeyComparator', () => {
    it('should compare entry keys', () => {
      const entry1 = ['a', 1]
      const entry2 = ['b', 2]
      const entry3 = ['a', 3]

      expect(entryKeyComparator(entry1, entry2)).toBeLessThan(0)
      expect(entryKeyComparator(entry2, entry1)).toBeGreaterThan(0)
      expect(entryKeyComparator(entry1, entry3)).toBe(0)
    })
  })

  describe('getKeys', () => {
    it('should get object keys', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const keys = getKeys(obj)
      expect(keys).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty object', () => {
      const keys = getKeys({})
      expect(keys).toEqual([])
    })
  })

  describe('getOwn', () => {
    it('should get own property', () => {
      const obj = { a: 1, b: 2 }
      expect(getOwn(obj, 'a')).toBe(1)
      expect(getOwn(obj, 'b')).toBe(2)
    })

    it('should return undefined for non-existent property', () => {
      const obj = { a: 1 }
      expect(getOwn(obj, 'nonexistent')).toBeUndefined()
    })

    it('should not get inherited properties', () => {
      const parent = { inherited: 'value' }
      const child = Object.create(parent)
      child.own = 'mine'

      expect(getOwn(child, 'own')).toBe('mine')
      expect(getOwn(child, 'inherited')).toBeUndefined()
    })
  })

  describe('getOwnPropertyValues', () => {
    it('should get own property values', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const values = getOwnPropertyValues(obj)
      expect(values).toEqual([1, 2, 3])
    })

    it('should handle empty object', () => {
      const values = getOwnPropertyValues({})
      expect(values).toEqual([])
    })
  })

  describe('hasKeys', () => {
    it('should check if object has keys', () => {
      expect(hasKeys({})).toBe(false)
      expect(hasKeys({ a: 1 })).toBe(true)
      expect(hasKeys({ a: 1, b: 2 })).toBe(true)
    })
  })

  describe('hasOwn', () => {
    it('should check own property', () => {
      const obj = { a: 1 }
      expect(hasOwn(obj, 'a')).toBe(true)
      expect(hasOwn(obj, 'b')).toBe(false)
    })

    it('should not check inherited properties', () => {
      const parent = { inherited: true }
      const child = Object.create(parent)
      expect(hasOwn(child, 'inherited')).toBe(false)
    })
  })

  describe('isObject', () => {
    it('should identify objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject([])).toBe(true)
      // Functions are not considered objects by this implementation.
      expect(isObject(() => {})).toBe(false)
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(123)).toBe(false)
    })
  })

  describe('isObjectObject', () => {
    it('should identify plain objects', () => {
      expect(isObjectObject({})).toBe(true)
      expect(isObjectObject(Object.create(null))).toBe(true)
      expect(isObjectObject([])).toBe(false)
      expect(isObjectObject(null)).toBe(false)
      expect(isObjectObject(() => {})).toBe(false)
    })
  })

  describe('merge', () => {
    it('should merge objects', () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3, c: 4 }
      merge(target, source)
      expect(target).toEqual({ a: 1, b: 3, c: 4 })
    })

    it('should merge deeply', () => {
      const target = { a: { b: 1 } }
      const source = { a: { c: 2 } }
      merge(target, source)
      expect(target).toEqual({ a: { b: 1, c: 2 } })
    })

    it('should handle null prototype objects', () => {
      const target = Object.create(null)
      target.a = 1
      const source = { b: 2 }
      merge(target, source)
      expect(target.a).toBe(1)
      expect(target.b).toBe(2)
    })
  })

  describe('objectEntries', () => {
    it('should get object entries', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const entries = objectEntries(obj)
      expect(entries).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])
    })

    it('should handle empty object', () => {
      const entries = objectEntries({})
      expect(entries).toEqual([])
    })
  })

  describe('toSortedObject', () => {
    it('should create sorted object', () => {
      const obj = { c: 3, a: 1, b: 2 }
      const sorted = toSortedObject(obj)
      const keys = Object.keys(sorted)
      expect(keys).toEqual(['a', 'b', 'c'])
      expect(sorted).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should handle empty object', () => {
      const sorted = toSortedObject({})
      expect(sorted).toEqual({})
    })
  })

  describe('toSortedObjectFromEntries', () => {
    it('should create sorted object from entries', () => {
      const entries = [
        ['c', 3],
        ['a', 1],
        ['b', 2],
      ]
      const sorted = toSortedObjectFromEntries(entries)
      const keys = Object.keys(sorted)
      expect(keys).toEqual(['a', 'b', 'c'])
      expect(sorted).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should handle empty entries', () => {
      const sorted = toSortedObjectFromEntries([])
      expect(sorted).toEqual({})
    })

    it('should handle duplicate keys', () => {
      const entries = [
        ['a', 1],
        ['b', 2],
        ['a', 3],
      ]
      const sorted = toSortedObjectFromEntries(entries)
      // Last value wins
      expect(sorted.a).toBe(3)
      expect(sorted.b).toBe(2)
    })
  })
})
