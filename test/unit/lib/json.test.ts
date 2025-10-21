/**
 * @fileoverview Tests for JSON parsing utilities.
 *
 * Validates jsonParse and isJsonPrimitive functions with Buffer handling and BOM stripping.
 */

import { isJsonPrimitive, jsonParse } from '@socketsecurity/lib/json'
import { describe, expect, it } from 'vitest'

describe('json utilities', () => {
  describe('isJsonPrimitive', () => {
    it('should return true for null', () => {
      expect(isJsonPrimitive(null)).toBe(true)
    })

    it('should return true for booleans', () => {
      expect(isJsonPrimitive(true)).toBe(true)
      expect(isJsonPrimitive(false)).toBe(true)
    })

    it('should return true for numbers', () => {
      expect(isJsonPrimitive(0)).toBe(true)
      expect(isJsonPrimitive(42)).toBe(true)
      expect(isJsonPrimitive(-123)).toBe(true)
      expect(isJsonPrimitive(3.14)).toBe(true)
      expect(isJsonPrimitive(Number.NaN)).toBe(true)
      expect(isJsonPrimitive(Number.POSITIVE_INFINITY)).toBe(true)
    })

    it('should return true for strings', () => {
      expect(isJsonPrimitive('')).toBe(true)
      expect(isJsonPrimitive('hello')).toBe(true)
      expect(isJsonPrimitive('123')).toBe(true)
    })

    it('should return false for objects', () => {
      expect(isJsonPrimitive({})).toBe(false)
      expect(isJsonPrimitive({ key: 'value' })).toBe(false)
    })

    it('should return false for arrays', () => {
      expect(isJsonPrimitive([])).toBe(false)
      expect(isJsonPrimitive([1, 2, 3])).toBe(false)
    })

    it('should return false for functions', () => {
      expect(isJsonPrimitive(() => {})).toBe(false)
      expect(isJsonPrimitive(() => {})).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isJsonPrimitive(undefined)).toBe(false)
    })

    it('should return false for symbols', () => {
      expect(isJsonPrimitive(Symbol('test'))).toBe(false)
    })

    it('should return false for bigints', () => {
      expect(isJsonPrimitive(BigInt(123))).toBe(false)
    })
  })

  describe('jsonParse', () => {
    describe('basic parsing', () => {
      it('should parse valid JSON string', () => {
        const result = jsonParse('{"name":"test","value":42}')
        expect(result).toEqual({ name: 'test', value: 42 })
      })

      it('should parse JSON arrays', () => {
        const result = jsonParse('[1,2,3,4,5]')
        expect(result).toEqual([1, 2, 3, 4, 5])
      })

      it('should parse JSON primitives', () => {
        expect(jsonParse('null')).toBeNull()
        expect(jsonParse('true')).toBe(true)
        expect(jsonParse('false')).toBe(false)
        expect(jsonParse('42')).toBe(42)
        expect(jsonParse('"hello"')).toBe('hello')
      })

      it('should parse nested objects', () => {
        const json = '{"outer":{"inner":{"value":123}}}'
        const result = jsonParse(json)
        expect(result).toEqual({ outer: { inner: { value: 123 } } })
      })

      it('should parse empty objects and arrays', () => {
        expect(jsonParse('{}')).toEqual({})
        expect(jsonParse('[]')).toEqual([])
      })
    })

    describe('Buffer support', () => {
      it('should parse JSON from Buffer', () => {
        const buffer = Buffer.from('{"key":"value"}')
        const result = jsonParse(buffer)
        expect(result).toEqual({ key: 'value' })
      })

      it('should parse JSON array from Buffer', () => {
        const buffer = Buffer.from('[1,2,3]')
        const result = jsonParse(buffer)
        expect(result).toEqual([1, 2, 3])
      })

      it('should handle UTF-8 encoded Buffer', () => {
        const buffer = Buffer.from('{"unicode":"世界"}', 'utf8')
        const result = jsonParse(buffer)
        expect(result).toEqual({ unicode: '世界' })
      })
    })

    describe('BOM stripping', () => {
      it('should strip BOM from string', () => {
        const jsonWithBom = '\uFEFF{"key":"value"}'
        const result = jsonParse(jsonWithBom)
        expect(result).toEqual({ key: 'value' })
      })

      it('should strip BOM from Buffer', () => {
        const jsonWithBom = Buffer.from('\uFEFF{"key":"value"}')
        const result = jsonParse(jsonWithBom)
        expect(result).toEqual({ key: 'value' })
      })

      it('should parse JSON without BOM normally', () => {
        const result = jsonParse('{"key":"value"}')
        expect(result).toEqual({ key: 'value' })
      })
    })

    describe('error handling', () => {
      it('should throw on invalid JSON by default', () => {
        expect(() => jsonParse('invalid json')).toThrow()
      })

      it('should throw on unclosed braces', () => {
        expect(() => jsonParse('{"key":"value"')).toThrow()
      })

      it('should throw on trailing commas', () => {
        expect(() => jsonParse('{"key":"value",}')).toThrow()
      })

      it('should return undefined when throws is false', () => {
        const result = jsonParse('invalid json', { throws: false })
        expect(result).toBeUndefined()
      })

      it('should include filepath in error message', () => {
        try {
          jsonParse('invalid', { filepath: '/path/to/file.json' })
        } catch (error: any) {
          expect(error.message).toContain('/path/to/file.json')
        }
      })

      it('should throw by default even when throws not specified', () => {
        expect(() => jsonParse('invalid')).toThrow()
      })

      it('should not throw when throws is explicitly false', () => {
        expect(() => jsonParse('invalid', { throws: false })).not.toThrow()
      })
    })

    describe('reviver function', () => {
      it('should apply reviver to parsed values', () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const reviver = (_key: string, value: unknown) => {
          if (typeof value === 'number') {
            return value * 2
          }
          return value
        }

        const result = jsonParse('{"a":1,"b":2}', { reviver })
        expect(result).toEqual({ a: 2, b: 4 })
      })

      it('should receive key and value in reviver', () => {
        const keys: string[] = []
        const reviver = (key: string, value: unknown) => {
          keys.push(key)
          return value
        }

        jsonParse('{"name":"test","value":42}', { reviver })
        expect(keys).toContain('name')
        expect(keys).toContain('value')
      })

      it('should allow reviver to transform values', () => {
        const reviver = (key: string, value: unknown) => {
          if (key === 'date' && typeof value === 'string') {
            return new Date(value)
          }
          return value
        }

        const result = jsonParse('{"date":"2024-01-01T00:00:00.000Z"}', {
          reviver,
        }) as any
        expect(result.date).toBeInstanceOf(Date)
      })
    })

    describe('combined options', () => {
      it('should handle reviver with throws false', () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const reviver = (_key: string, value: unknown) => value
        const result = jsonParse('invalid', { reviver, throws: false })
        expect(result).toBeUndefined()
      })

      it('should handle filepath with throws false', () => {
        const result = jsonParse('invalid', {
          filepath: '/test.json',
          throws: false,
        })
        expect(result).toBeUndefined()
      })

      it('should handle all options together', () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const reviver = (_key: string, value: unknown) => value
        try {
          jsonParse('invalid', {
            filepath: '/test.json',
            reviver,
            throws: true,
          })
        } catch (error: any) {
          expect(error.message).toContain('/test.json')
        }
      })
    })

    describe('edge cases', () => {
      it('should handle empty string with throws false', () => {
        const result = jsonParse('', { throws: false })
        expect(result).toBeUndefined()
      })

      it('should handle whitespace-only string', () => {
        expect(() => jsonParse('   ')).toThrow()
      })

      it('should parse JSON with escaped characters', () => {
        const result = jsonParse('{"text":"line1\\nline2\\ttab"}')
        expect(result).toEqual({ text: 'line1\nline2\ttab' })
      })

      it('should parse JSON with Unicode escapes', () => {
        const result = jsonParse('{"unicode":"\\u4e16\\u754c"}')
        expect(result).toEqual({ unicode: '世界' })
      })

      it('should handle very large JSON', () => {
        const largeArray = JSON.stringify(
          Array.from({ length: 1000 }, (_, i) => i),
        )
        const result = jsonParse(largeArray) as number[]
        expect(result.length).toBe(1000)
      })

      it('should handle deeply nested JSON', () => {
        const nested = '{"a":{"b":{"c":{"d":{"e":"value"}}}}}'
        const result = jsonParse(nested)
        expect(result).toEqual({ a: { b: { c: { d: { e: 'value' } } } } })
      })
    })
  })
})
