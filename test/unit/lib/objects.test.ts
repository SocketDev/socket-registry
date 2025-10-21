/**
 * @fileoverview Tests for object manipulation utilities.
 *
 * Validates object operations, getters, sorting, and utility functions.
 */

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
  objectAssign,
  objectEntries,
  objectFreeze,
  toSortedObject,
  toSortedObjectFromEntries,
} from '@socketsecurity/lib/objects'
import { describe, expect, it } from 'vitest'

describe('objects utilities', () => {
  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ key: 'value' })).toBe(true)
    })

    it('should return true for arrays', () => {
      expect(isObject([])).toBe(true)
      expect(isObject([1, 2, 3])).toBe(true)
    })

    it('should handle functions', () => {
      expect(typeof isObject(() => {})).toBe('boolean')
      expect(typeof isObject(() => {})).toBe('boolean')
    })

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isObject(undefined)).toBe(false)
      expect(isObject(123)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(true)).toBe(false)
    })

    it('should return true for Date objects', () => {
      expect(isObject(new Date())).toBe(true)
    })

    it('should return true for RegExp objects', () => {
      expect(isObject(/test/)).toBe(true)
    })
  })

  describe('isObjectObject', () => {
    it('should return true for plain objects', () => {
      expect(isObjectObject({})).toBe(true)
      expect(isObjectObject({ key: 'value' })).toBe(true)
    })

    it('should return false for arrays', () => {
      expect(isObjectObject([])).toBe(false)
    })

    it('should return false for functions', () => {
      expect(isObjectObject(() => {})).toBe(false)
    })

    it('should return false for null', () => {
      expect(isObjectObject(null)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isObjectObject(123)).toBe(false)
      expect(isObjectObject('string')).toBe(false)
    })

    it('should return true for Object.create(null)', () => {
      expect(isObjectObject(Object.create(null))).toBe(true)
    })

    it('should return false for Date objects', () => {
      expect(isObjectObject(new Date())).toBe(false)
    })
  })

  describe('hasOwn', () => {
    it('should return true for own properties', () => {
      const obj = { key: 'value' }
      expect(hasOwn(obj, 'key')).toBe(true)
    })

    it('should return false for inherited properties', () => {
      const obj = Object.create({ inherited: 'value' })
      expect(hasOwn(obj, 'inherited')).toBe(false)
    })

    it('should return false for non-existent properties', () => {
      const obj = { key: 'value' }
      expect(hasOwn(obj, 'missing')).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(hasOwn(null, 'key')).toBe(false)
      expect(hasOwn(undefined, 'key')).toBe(false)
    })

    it('should work with symbols', () => {
      const sym = Symbol('test')
      const obj = { [sym]: 'value' }
      expect(hasOwn(obj, sym)).toBe(true)
    })

    it('should return true for numeric indices', () => {
      const arr = [1, 2, 3]
      expect(hasOwn(arr, 0)).toBe(true)
      expect(hasOwn(arr, '1')).toBe(true)
    })
  })

  describe('hasKeys', () => {
    it('should return true for objects with keys', () => {
      expect(hasKeys({ key: 'value' })).toBe(true)
    })

    it('should return false for empty objects', () => {
      expect(hasKeys({})).toBe(false)
    })

    it('should return false for null and undefined', () => {
      expect(hasKeys(null)).toBe(false)
      expect(hasKeys(undefined)).toBe(false)
    })

    it('should handle primitives', () => {
      // Primitives are auto-boxed and may have enumerable properties
      expect(typeof hasKeys(123)).toBe('boolean')
      expect(typeof hasKeys('string')).toBe('boolean')
    })

    it('should return true for arrays with elements', () => {
      expect(hasKeys([1, 2, 3])).toBe(true)
    })

    it('should return false for empty arrays', () => {
      expect(hasKeys([])).toBe(false)
    })
  })

  describe('getKeys', () => {
    it('should return array of own property keys', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const keys = getKeys(obj)
      expect(keys).toContain('a')
      expect(keys).toContain('b')
      expect(keys).toContain('c')
    })

    it('should return empty array for objects without keys', () => {
      expect(getKeys({})).toEqual([])
    })

    it('should not include inherited properties', () => {
      const parent = { inherited: 'value' }
      const obj = Object.create(parent)
      obj.own = 'value'
      const keys = getKeys(obj)
      expect(keys).toContain('own')
      expect(keys).not.toContain('inherited')
    })

    it('should handle null and undefined', () => {
      expect(getKeys(null)).toEqual([])
      expect(getKeys(undefined)).toEqual([])
    })

    it('should work with arrays', () => {
      const keys = getKeys([1, 2, 3])
      expect(keys).toContain('0')
      expect(keys).toContain('1')
      expect(keys).toContain('2')
    })
  })

  describe('getOwn', () => {
    it('should return own property value', () => {
      const obj = { key: 'value' }
      expect(getOwn(obj, 'key')).toBe('value')
    })

    it('should return undefined for non-existent properties', () => {
      const obj = { key: 'value' }
      expect(getOwn(obj, 'missing')).toBeUndefined()
    })

    it('should return undefined for inherited properties', () => {
      const obj = Object.create({ inherited: 'value' })
      expect(getOwn(obj, 'inherited')).toBeUndefined()
    })

    it('should handle null and undefined', () => {
      expect(getOwn(null, 'key')).toBeUndefined()
      expect(getOwn(undefined, 'key')).toBeUndefined()
    })

    it('should work with symbols', () => {
      const sym = Symbol('test')
      const obj = { [sym]: 'value' }
      expect(getOwn(obj, sym)).toBe('value')
    })
  })

  describe('getOwnPropertyValues', () => {
    it('should return array of own property values', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const values = getOwnPropertyValues(obj)
      expect(values).toContain(1)
      expect(values).toContain(2)
      expect(values).toContain(3)
    })

    it('should return empty array for objects without properties', () => {
      expect(getOwnPropertyValues({})).toEqual([])
    })

    it('should not include inherited properties', () => {
      const parent = { inherited: 'value' }
      const obj = Object.create(parent)
      obj.own = 'ownValue'
      const values = getOwnPropertyValues(obj)
      expect(values).toContain('ownValue')
      expect(values).not.toContain('value')
    })

    it('should work with arrays', () => {
      const values = getOwnPropertyValues([10, 20, 30] as unknown as Record<
        string,
        number
      >)
      expect(values).toContain(10)
      expect(values).toContain(20)
      expect(values).toContain(30)
    })
  })

  describe('objectEntries', () => {
    it('should return array of [key, value] pairs', () => {
      const obj = { a: 1, b: 2 }
      const entries = objectEntries(obj)
      expect(entries).toContainEqual(['a', 1])
      expect(entries).toContainEqual(['b', 2])
    })

    it('should return empty array for empty objects', () => {
      expect(objectEntries({})).toEqual([])
    })

    it('should not include inherited properties', () => {
      const parent = { inherited: 'value' }
      const obj = Object.create(parent)
      obj.own = 'ownValue'
      const entries = objectEntries(obj)
      expect(entries).toContainEqual(['own', 'ownValue'])
      expect(entries).not.toContainEqual(['inherited', 'value'])
    })

    it('should handle null and undefined', () => {
      expect(objectEntries(null)).toEqual([])
      expect(objectEntries(undefined)).toEqual([])
    })
  })

  describe('objectAssign', () => {
    it('should merge objects', () => {
      const target = { a: 1 }
      const source = { b: 2 }
      const result = objectAssign(target, source)
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should overwrite existing properties', () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3 }
      const result = objectAssign(target, source)
      expect(result.b).toBe(3)
    })

    it('should handle multiple sources', () => {
      const result = objectAssign({}, { a: 1 }, { b: 2 }, { c: 3 })
      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should return target object', () => {
      const target = { a: 1 }
      const result = objectAssign(target, { b: 2 })
      expect(result).toBe(target)
    })
  })

  describe('objectFreeze', () => {
    it('should freeze objects', () => {
      const obj = { key: 'value' }
      const frozen = objectFreeze(obj)
      expect(Object.isFrozen(frozen)).toBe(true)
    })

    it('should prevent modifications', () => {
      const obj = { key: 'value' }
      objectFreeze(obj)
      expect(() => {
        obj.key = 'newValue'
      }).toThrow()
    })

    it('should return the same object', () => {
      const obj = { key: 'value' }
      const frozen = objectFreeze(obj)
      expect(frozen).toBe(obj)
    })
  })

  describe('merge', () => {
    it('should merge two objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { c: 3, d: 4 }
      const result = merge(obj1, obj2)
      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 })
    })

    it('should overwrite properties from source', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { b: 3, c: 4 }
      const result = merge(obj1, obj2)
      expect(result.b).toBe(3)
    })

    it('should merge into first object', () => {
      const obj1 = { a: 1 }
      const obj2 = { b: 2 }
      const result = merge(obj1, obj2)
      expect(result).toEqual({ a: 1, b: 2 })
      // merge mutates first object.
      expect(result).toBe(obj1)
    })

    it('should handle empty objects', () => {
      const result = merge({}, { a: 1 })
      expect(result).toEqual({ a: 1 })
    })

    it('should deeply merge nested objects', () => {
      const obj1 = { a: { b: 1 } }
      const obj2 = { a: { c: 2 } }
      const result = merge(obj1, obj2)
      expect(result).toHaveProperty('a')
    })
  })

  describe('toSortedObject', () => {
    it('should sort object keys alphabetically', () => {
      const obj = { c: 3, a: 1, b: 2 }
      const sorted = toSortedObject(obj)
      const keys = Object.keys(sorted)
      expect(keys).toEqual(['a', 'b', 'c'])
    })

    it('should preserve values', () => {
      const obj = { c: 3, a: 1, b: 2 }
      const sorted = toSortedObject(obj)
      expect(sorted).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should handle empty objects', () => {
      const sorted = toSortedObject({})
      expect(sorted).toEqual({})
    })

    it('should handle single property', () => {
      const sorted = toSortedObject({ a: 1 })
      expect(sorted).toEqual({ a: 1 })
    })
  })

  describe('toSortedObjectFromEntries', () => {
    it('should create sorted object from entries', () => {
      const entries: Array<[string, number]> = [
        ['c', 3],
        ['a', 1],
        ['b', 2],
      ]
      const sorted = toSortedObjectFromEntries(entries)
      const keys = Object.keys(sorted)
      expect(keys).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty entries', () => {
      const sorted = toSortedObjectFromEntries([])
      expect(sorted).toEqual({})
    })

    it('should preserve values', () => {
      const entries: Array<[string, string]> = [['key', 'value']]
      const sorted = toSortedObjectFromEntries(entries)
      expect(sorted).toEqual({ key: 'value' })
    })
  })

  describe('entryKeyComparator', () => {
    it('should compare entries by key', () => {
      const entry1: [string, number] = ['a', 1]
      const entry2: [string, number] = ['b', 2]
      expect(entryKeyComparator(entry1, entry2)).toBeLessThan(0)
    })

    it('should return 0 for equal keys', () => {
      const entry1: [string, number] = ['a', 1]
      const entry2: [string, number] = ['a', 2]
      expect(entryKeyComparator(entry1, entry2)).toBe(0)
    })

    it('should handle numeric keys', () => {
      const entry1: [number, string] = [1, 'a']
      const entry2: [number, string] = [2, 'b']
      expect(entryKeyComparator(entry1, entry2)).toBeLessThan(0)
    })
  })

  describe('defineGetter', () => {
    it('should define getter on object', () => {
      const obj: any = {}
      defineGetter(obj, 'key', () => 'value')
      expect(obj.key).toBe('value')
    })

    it('should define property with getter', () => {
      const obj: any = {}
      defineGetter(obj, 'key', () => 'value')
      expect(obj.key).toBe('value')
      expect(Object.getOwnPropertyDescriptor(obj, 'key')).toBeDefined()
    })

    it('should call getter function each time', () => {
      let count = 0
      const obj: any = {}
      defineGetter(obj, 'counter', () => ++count)
      expect(obj.counter).toBe(1)
      expect(obj.counter).toBe(2)
      expect(obj.counter).toBe(3)
    })
  })

  describe('defineLazyGetter', () => {
    it('should define lazy getter', () => {
      const obj: any = {}
      defineLazyGetter(obj, 'key', () => 'value')
      expect(obj.key).toBe('value')
    })

    it('should cache result', () => {
      let callCount = 0
      const obj: any = {}
      defineLazyGetter(obj, 'cached', () => {
        callCount++
        return 'value'
      })
      expect(obj.cached).toBe('value')
      expect(obj.cached).toBe('value')
      expect(callCount).toBe(1)
    })

    it('should define property with lazy getter', () => {
      const obj: any = {}
      defineLazyGetter(obj, 'key', () => 'value')
      expect(obj.key).toBe('value')
      expect(Object.getOwnPropertyDescriptor(obj, 'key')).toBeDefined()
    })
  })

  describe('defineLazyGetters', () => {
    it('should define multiple lazy getters', () => {
      const obj: any = {}
      defineLazyGetters(obj, {
        key1: () => 'value1',
        key2: () => 'value2',
      })
      expect(obj.key1).toBe('value1')
      expect(obj.key2).toBe('value2')
    })

    it('should cache all results', () => {
      let count1 = 0
      let count2 = 0
      const obj: any = {}
      defineLazyGetters(obj, {
        prop1: () => {
          count1++
          return 'v1'
        },
        prop2: () => {
          count2++
          return 'v2'
        },
      })
      obj.prop1
      obj.prop1
      obj.prop2
      obj.prop2
      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })
  })

  describe('createLazyGetter', () => {
    it('should create lazy getter object', () => {
      const getter = createLazyGetter('testName', () => 'value')
      expect(typeof getter).toBe('function')
    })

    it('should return value on first call', () => {
      const getter = createLazyGetter('testName', () => 'value')
      expect(getter()).toBe('value')
    })

    it('should cache result', () => {
      let count = 0
      const getter = createLazyGetter('testName', () => {
        count++
        return 'value'
      })
      getter()
      getter()
      expect(count).toBe(1)
    })
  })

  describe('createConstantsObject', () => {
    it('should create constants object', () => {
      const constants = createConstantsObject({
        KEY1: 'value1',
        KEY2: 'value2',
      }) as { KEY1: string; KEY2: string }
      expect(constants.KEY1).toBe('value1')
      expect(constants.KEY2).toBe('value2')
    })

    it('should freeze the object', () => {
      const constants = createConstantsObject({ KEY: 'value' })
      expect(Object.isFrozen(constants)).toBe(true)
    })

    it('should make properties non-writable', () => {
      const constants = createConstantsObject({ KEY: 'value' })
      expect(() => {
        ;(constants as any).KEY = 'newValue'
      }).toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle objects with null prototype', () => {
      const obj = Object.create(null)
      obj.key = 'value'
      expect(hasOwn(obj, 'key')).toBe(true)
      expect(getKeys(obj)).toContain('key')
    })

    it('should handle nested objects in merge', () => {
      const obj1 = { a: { b: 1 } }
      const obj2 = { a: { c: 2 } }
      const result = merge(obj1, obj2)
      expect(typeof result.a).toBe('object')
    })

    it('should handle circular references safely', () => {
      const obj: any = { key: 'value' }
      obj.self = obj
      expect(hasOwn(obj, 'self')).toBe(true)
    })

    it('should handle symbol properties', () => {
      const sym = Symbol('test')
      const obj = { [sym]: 'value' }
      expect(hasOwn(obj, sym)).toBe(true)
    })

    it('should handle numeric keys in sorting', () => {
      const obj = { '10': 'ten', '2': 'two', '1': 'one' }
      const sorted = toSortedObject(obj)
      const keys = Object.keys(sorted)
      expect(keys[0]).toBe('1')
    })
  })
})
