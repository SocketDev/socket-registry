import { describe, expect, it } from 'vitest'

import {
  createConstantsObject,
  createLazyGetter,
  defineGetter,
  defineLazyGetter,
  defineLazyGetters,
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

describe('objects module', () => {
  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject([])).toBe(true)
      expect(isObject(new Date())).toBe(true)
      expect(isObject(/regex/)).toBe(true)
      expect(isObject(new Map())).toBe(true)
      expect(isObject(new Set())).toBe(true)
    })

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject(42)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(true)).toBe(false)
      expect(isObject(Symbol('test'))).toBe(false)
    })
  })

  describe('isObjectObject', () => {
    it('should return true for plain objects', () => {
      expect(isObjectObject({})).toBe(true)
      expect(isObjectObject({ a: 1 })).toBe(true)
      expect(isObjectObject(Object.create(null))).toBe(true)
    })

    it('should return false for non-plain objects', () => {
      expect(isObjectObject([])).toBe(false)
      expect(isObjectObject(new Date())).toBe(false)
      expect(isObjectObject(/regex/)).toBe(false)
      expect(isObjectObject(new Map())).toBe(false)
      expect(isObjectObject(null)).toBe(false)
      expect(isObjectObject(undefined)).toBe(false)
      expect(isObjectObject(42)).toBe(false)
    })
  })

  describe('hasOwn', () => {
    it('should check own properties', () => {
      const obj = { a: 1, b: 2 }
      expect(hasOwn(obj, 'a')).toBe(true)
      expect(hasOwn(obj, 'b')).toBe(true)
      expect(hasOwn(obj, 'c')).toBe(false)
    })

    it('should not check inherited properties', () => {
      const obj = Object.create({ inherited: true })
      obj.own = true
      expect(hasOwn(obj, 'own')).toBe(true)
      expect(hasOwn(obj, 'inherited')).toBe(false)
    })

    it('should handle null prototype objects', () => {
      const obj = Object.create(null) as Record<string, unknown>
      obj['prop'] = true
      expect(hasOwn(obj, 'prop')).toBe(true)
    })
  })

  describe('getOwn', () => {
    it('should get own property values', () => {
      const obj = { a: 1, b: 2 }
      expect(getOwn(obj, 'a')).toBe(1)
      expect(getOwn(obj, 'b')).toBe(2)
      expect(getOwn(obj, 'c')).toBe(undefined)
    })

    it('should not get inherited properties', () => {
      const obj = Object.create({ inherited: 'value' })
      obj.own = 'ownValue'
      expect(getOwn(obj, 'own')).toBe('ownValue')
      expect(getOwn(obj, 'inherited')).toBe(undefined)
    })
  })

  describe('hasKeys', () => {
    it('should check if object has enumerable keys', () => {
      expect(hasKeys({})).toBe(false)
      expect(hasKeys({ a: 1 })).toBe(true)
      expect(hasKeys({ a: 1, b: 2 })).toBe(true)
    })

    it('should handle objects with null prototype', () => {
      const obj = Object.create(null) as Record<string, unknown>
      expect(hasKeys(obj)).toBe(false)
      obj['prop'] = true
      expect(hasKeys(obj)).toBe(true)
    })

    it('should ignore non-enumerable properties', () => {
      const obj = {}
      Object.defineProperty(obj, 'hidden', {
        value: true,
        enumerable: false,
      })
      expect(hasKeys(obj)).toBe(false)
    })
  })

  describe('getKeys', () => {
    it('should return enumerable keys', () => {
      expect(getKeys({})).toEqual([])
      expect(getKeys({ a: 1, b: 2 })).toEqual(['a', 'b'])
    })

    it('should handle objects with null prototype', () => {
      const obj = Object.create(null) as Record<string, unknown>
      obj['a'] = 1
      obj['b'] = 2
      expect(getKeys(obj)).toEqual(['a', 'b'])
    })
  })

  describe('getOwnPropertyValues', () => {
    it('should return all own property values', () => {
      const obj = { a: 1, b: 2, c: 3 }
      expect(getOwnPropertyValues(obj).sort()).toEqual([1, 2, 3])
    })

    it('should include non-enumerable properties', () => {
      const obj = { visible: true }
      Object.defineProperty(obj, 'hidden', {
        value: 'secret',
        enumerable: false,
      })
      const values = getOwnPropertyValues(obj)
      expect(values).toContain(true)
      expect(values).toContain('secret')
    })
  })

  describe('objectEntries', () => {
    it('should return entries of an object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      expect(objectEntries(obj)).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])
    })

    it('should handle empty objects', () => {
      expect(objectEntries({})).toEqual([])
    })

    it('should handle objects with null prototype', () => {
      const obj = Object.create(null) as Record<string, unknown>
      obj['x'] = 10
      obj['y'] = 20
      expect(objectEntries(obj)).toEqual([
        ['x', 10],
        ['y', 20],
      ])
    })
  })

  describe('toSortedObject', () => {
    it('should sort object keys alphabetically', () => {
      const obj = { z: 3, a: 1, m: 2 }
      const sorted = toSortedObject(obj)
      expect(Object.keys(sorted)).toEqual(['a', 'm', 'z'])
    })

    it('should preserve values', () => {
      const obj = { z: 'last', a: 'first', m: 'middle' }
      const sorted = toSortedObject(obj)
      expect(sorted).toEqual({ a: 'first', m: 'middle', z: 'last' })
    })
  })

  describe('toSortedObjectFromEntries', () => {
    it('should create sorted object from entries', () => {
      const entries = [
        ['z', 3],
        ['a', 1],
        ['m', 2],
      ] as Iterable<[PropertyKey, string | number]>
      const sorted = toSortedObjectFromEntries(entries)
      expect(Object.keys(sorted)).toEqual(['a', 'm', 'z'])
      expect(sorted).toEqual({ a: 1, m: 2, z: 3 })
    })

    it('should handle empty entries', () => {
      expect(toSortedObjectFromEntries([])).toEqual({})
    })
  })

  describe('merge', () => {
    it('should merge two objects', () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3, c: 4 }
      const result = merge(target, source)
      expect(result).toEqual({ a: 1, b: 3, c: 4 })
      expect(result).toBe(target)
    })

    it('should deep merge nested objects', () => {
      const target = { a: { x: 1, y: 2 }, b: 3 }
      const source = { a: { y: 20, z: 30 }, c: 4 }
      const result = merge(target, source)
      expect(result).toEqual({
        a: { x: 1, y: 20, z: 30 },
        b: 3,
        c: 4,
      })
    })

    it('should handle arrays by replacing', () => {
      const target = { arr: [1, 2] }
      const source = { arr: [3, 4, 5] }
      const result = merge(target, source)
      expect(result.arr).toEqual([3, 4, 5])
    })

    it('should handle null and undefined values', () => {
      const target = { a: 1, b: 2 }
      const source = { b: null, c: undefined }
      const result = merge(target, source)
      expect(result).toEqual({ a: 1, b: null, c: undefined })
    })

    it('should detect circular references', () => {
      const target = { a: 1 }
      const source = { b: 2 } as Record<string, unknown>
      source['circular'] = source
      const result = merge(target, source)
      expect(result['b']).toBe(2)
      expect(result['circular']).toBe(source)
    })
  })

  describe('defineGetter', () => {
    it('should define a getter on an object', () => {
      const obj = {} as Record<string, unknown>
      let callCount = 0
      defineGetter(obj, 'prop', () => {
        callCount++
        return 'value'
      })
      expect(obj['prop']).toBe('value')
      expect(obj['prop']).toBe('value')
      expect(callCount).toBe(2)
    })

    it('should make getter non-enumerable', () => {
      const obj = {}
      defineGetter(obj, 'prop', () => 'value')
      expect(Object.keys(obj)).toEqual([])
    })
  })

  describe('defineLazyGetter', () => {
    it('should define a lazy getter that caches result', () => {
      const obj = {} as Record<string, unknown>
      let callCount = 0
      defineLazyGetter(obj, 'prop', () => {
        callCount++
        return 'value'
      })
      expect(obj['prop']).toBe('value')
      expect(obj['prop']).toBe('value')
      expect(callCount).toBe(1)
    })

    it('should track stats if provided', () => {
      const obj = {} as Record<string, unknown>
      const stats = { initialized: new Set() } as any
      defineLazyGetter(obj, 'prop', () => 'value', stats)
      expect(stats.initialized.has('prop')).toBe(false)
      obj['prop']
      expect(stats.initialized.has('prop')).toBe(true)
    })
  })

  describe('defineLazyGetters', () => {
    it('should define multiple lazy getters', () => {
      const obj = {} as Record<string, unknown>
      let countA = 0
      let countB = 0
      defineLazyGetters(obj, {
        a: () => {
          countA++
          return 'valueA'
        },
        b: () => {
          countB++
          return 'valueB'
        },
      })
      expect(obj['a']).toBe('valueA')
      expect(obj['a']).toBe('valueA')
      expect(obj['b']).toBe('valueB')
      expect(countA).toBe(1)
      expect(countB).toBe(1)
    })
  })

  describe('createLazyGetter', () => {
    it('should create a lazy getter function', () => {
      let callCount = 0
      const getter = createLazyGetter('prop', () => {
        callCount++
        return 'value'
      })
      expect(getter()).toBe('value')
      expect(getter()).toBe('value')
      // Should only call once
      expect(callCount).toBe(1)
    })
  })

  describe('createConstantsObject', () => {
    it('should create a frozen constants object', () => {
      const props = { CONST_A: 1, CONST_B: 2 }
      const constants = createConstantsObject(props)
      expect((constants as any).CONST_A).toBe(1)
      expect((constants as any).CONST_B).toBe(2)
      expect(Object.isFrozen(constants)).toBe(true)
    })

    it('should support getters', () => {
      let callCount = 0
      const props = { CONST_A: 1 }
      const constants = createConstantsObject(props, {
        getters: {
          LAZY: () => {
            callCount++
            return 'lazy'
          },
        },
      })
      expect((constants as any).LAZY).toBe('lazy')
      expect((constants as any).LAZY).toBe('lazy')
      expect(callCount).toBe(1)
    })

    it('should support internals symbol', () => {
      const props = { CONST_A: 1 }
      const constants = createConstantsObject(props, {
        internals: {
          internal: 'value',
        },
      })
      const kInternalsSymbol = (constants as any).kInternalsSymbol
      expect((constants as any)[kInternalsSymbol]).toBeDefined()
      expect((constants as any)[kInternalsSymbol].internal).toBe('value')
    })

    it('should support mixin objects', () => {
      const props = { CONST_A: 1 }
      const mixin = { mixedIn: true }
      const constants = createConstantsObject(props, { mixin })
      expect((constants as any).CONST_A).toBe(1)
      expect((constants as any).mixedIn).toBe(true)
    })
  })
})
