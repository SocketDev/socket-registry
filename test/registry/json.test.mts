import { describe, expect, it } from 'vitest'

const { isJsonPrimitive, jsonParse } = require('../../registry/dist/lib/json')

describe('json module', () => {
  describe('isJsonPrimitive', () => {
    it('should return true for JSON primitives', () => {
      expect(isJsonPrimitive(null)).toBe(true)
      expect(isJsonPrimitive(true)).toBe(true)
      expect(isJsonPrimitive(false)).toBe(true)
      expect(isJsonPrimitive(123)).toBe(true)
      expect(isJsonPrimitive(3.14)).toBe(true)
      expect(isJsonPrimitive('string')).toBe(true)
      expect(isJsonPrimitive('')).toBe(true)
    })

    it('should return false for non-primitives', () => {
      expect(isJsonPrimitive(undefined)).toBe(false)
      expect(isJsonPrimitive({})).toBe(false)
      expect(isJsonPrimitive([])).toBe(false)
      expect(isJsonPrimitive(new Date())).toBe(false)
      expect(isJsonPrimitive(/regex/)).toBe(false)
      expect(isJsonPrimitive(() => {})).toBe(false)
      expect(isJsonPrimitive(Symbol('test'))).toBe(false)
    })

    it('should handle special number values', () => {
      expect(isJsonPrimitive(Infinity)).toBe(true)
      expect(isJsonPrimitive(-Infinity)).toBe(true)
      expect(isJsonPrimitive(NaN)).toBe(true)
    })
  })

  describe('jsonParse', () => {
    it('should parse valid JSON strings', () => {
      expect(jsonParse('{}')).toEqual({})
      expect(jsonParse('[]')).toEqual([])
      expect(jsonParse('"string"')).toBe('string')
      expect(jsonParse('123')).toBe(123)
      expect(jsonParse('true')).toBe(true)
      expect(jsonParse('false')).toBe(false)
      expect(jsonParse('null')).toBeNull()
    })

    it('should parse complex objects', () => {
      const json =
        '{"name": "test", "value": 123, "nested": {"array": [1, 2, 3]}}'
      const result = jsonParse(json)
      expect(result).toEqual({
        name: 'test',
        value: 123,
        nested: { array: [1, 2, 3] },
      })
    })

    it('should return undefined for invalid JSON when throws is false', () => {
      expect(jsonParse('{invalid}', { throws: false })).toBeUndefined()
      expect(jsonParse('undefined', { throws: false })).toBeUndefined()
      expect(jsonParse('', { throws: false })).toBeUndefined()
      expect(jsonParse('{key: value}', { throws: false })).toBeUndefined()
    })

    it('should throw for invalid JSON by default', () => {
      expect(() => jsonParse('{invalid}')).toThrow()
      expect(() => jsonParse('undefined')).toThrow()
      expect(() => jsonParse('')).toThrow()
      expect(() => jsonParse('{key: value}')).toThrow()
    })

    it('should handle arrays', () => {
      expect(jsonParse('[1, 2, 3]')).toEqual([1, 2, 3])
      expect(jsonParse('["a", "b", "c"]')).toEqual(['a', 'b', 'c'])
    })

    it('should handle nested structures', () => {
      const json = '{"a": {"b": {"c": [1, 2, {"d": true}]}}}'
      const result = jsonParse(json)
      expect(result).toEqual({
        a: { b: { c: [1, 2, { d: true }] } },
      })
    })

    it('should handle escaped characters', () => {
      expect(jsonParse('"hello\\nworld"')).toBe('hello\nworld')
      expect(jsonParse('"tab\\ttab"')).toBe('tab\ttab')
      expect(jsonParse('"quote\\"quote"')).toBe('quote"quote')
    })

    it('should handle Unicode characters', () => {
      expect(jsonParse('"emoji: 😀"')).toBe('emoji: 😀')
      expect(jsonParse('"unicode: \\u0041"')).toBe('unicode: A')
    })

    it('should handle large numbers', () => {
      expect(jsonParse('9007199254740991')).toBe(9007199254740991)
      expect(jsonParse('-9007199254740991')).toBe(-9007199254740991)
    })

    it('should handle decimal numbers', () => {
      expect(jsonParse('3.14159')).toBe(3.14159)
      expect(jsonParse('-0.5')).toBe(-0.5)
      expect(jsonParse('1.0e-10')).toBe(1.0e-10)
    })

    it('should handle empty arrays and objects', () => {
      expect(jsonParse('{"empty": []}')).toEqual({ empty: [] })
      expect(jsonParse('{"empty": {}}')).toEqual({ empty: {} })
    })
  })
})
