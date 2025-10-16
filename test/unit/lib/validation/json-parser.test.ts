/**
 * @fileoverview Tests for safe JSON parsing with validation.
 *
 * Tests critical security features including prototype pollution prevention,
 * size limits, schema validation, NDJSON parsing, and streaming.
 */

import { describe, expect, it } from 'vitest'
import {
  createJsonParser,
  parseJsonWithResult,
  parseNdjson,
  safeJsonParse,
  streamNdjson,
  tryJsonParse,
} from '../../../../registry/src/lib/validation/json-parser'
import type {
  JsonParseOptions,
  Schema,
} from '../../../../registry/src/lib/validation/types'

// Mock schema for testing validation.
const createMockSchema = <T>(
  validator: (data: unknown) => boolean,
): Schema<T> => {
  return {
    safeParse: (data: unknown) => {
      if (validator(data)) {
        return { success: true, data: data as T }
      }
      return {
        success: false,
        error: {
          issues: [
            {
              path: ['root'],
              message: 'Validation failed',
            },
          ],
        },
      }
    },
    parse: (data: unknown): T => {
      if (validator(data)) {
        return data as T
      }
      throw new Error('Validation failed')
    },
  }
}

describe('json-parser', () => {
  describe('safeJsonParse', () => {
    describe('basic functionality', () => {
      it('should parse valid JSON string', () => {
        const result = safeJsonParse('{"key":"value"}')
        expect(result).toEqual({ key: 'value' })
      })

      it('should parse JSON array', () => {
        const result = safeJsonParse('[1,2,3]')
        expect(result).toEqual([1, 2, 3])
      })

      it('should parse JSON primitives', () => {
        expect(safeJsonParse('42')).toBe(42)
        expect(safeJsonParse('"string"')).toBe('string')
        expect(safeJsonParse('true')).toBe(true)
        expect(safeJsonParse('false')).toBe(false)
        expect(safeJsonParse('null')).toBe(null)
      })

      it('should parse nested objects', () => {
        const json = '{"a":{"b":{"c":"deep"}}}'
        const result = safeJsonParse(json)
        expect(result).toEqual({ a: { b: { c: 'deep' } } })
      })

      it('should parse empty objects and arrays', () => {
        expect(safeJsonParse('{}')).toEqual({})
        expect(safeJsonParse('[]')).toEqual([])
      })

      it('should throw on invalid JSON', () => {
        expect(() => safeJsonParse('not json')).toThrow('Failed to parse JSON')
        expect(() => safeJsonParse('{')).toThrow('Failed to parse JSON')
        expect(() => safeJsonParse('undefined')).toThrow('Failed to parse JSON')
      })
    })

    describe('prototype pollution prevention', () => {
      it('should throw on __proto__ key by default', () => {
        const malicious = '{"__proto__":{"isAdmin":true}}'
        expect(() => safeJsonParse(malicious)).toThrow(
          'JSON contains potentially malicious prototype pollution keys',
        )
      })

      it('should throw on constructor key by default', () => {
        const malicious = '{"constructor":{"prototype":{"isAdmin":true}}}'
        expect(() => safeJsonParse(malicious)).toThrow(
          'JSON contains potentially malicious prototype pollution keys',
        )
      })

      it('should throw on prototype key by default', () => {
        const malicious = '{"prototype":{"isAdmin":true}}'
        expect(() => safeJsonParse(malicious)).toThrow(
          'JSON contains potentially malicious prototype pollution keys',
        )
      })

      it('should allow dangerous keys when allowPrototype is true', () => {
        const options: JsonParseOptions = { allowPrototype: true }
        const result = safeJsonParse(
          '{"__proto__":{"isAdmin":true}}',
          undefined,
          options,
        )
        // When allowPrototype is true, the function should not throw.
        expect(result).toBeDefined()
        expect(Object.hasOwn(result as object, '__proto__')).toBe(true)
      })

      it('should not check prototype pollution for arrays', () => {
        const json = '[{"__proto__":"value"}]'
        const result = safeJsonParse(json)
        // Arrays don't get checked for prototype pollution.
        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(1)
      })

      it('should not check prototype pollution for primitives', () => {
        expect(safeJsonParse('"string"')).toBe('string')
        expect(safeJsonParse('42')).toBe(42)
        expect(safeJsonParse('true')).toBe(true)
        expect(safeJsonParse('null')).toBe(null)
      })

      it('should allow nested objects without dangerous keys', () => {
        const json = '{"safe":{"nested":{"data":"value"}}}'
        const result = safeJsonParse(json)
        expect(result).toEqual({ safe: { nested: { data: 'value' } } })
      })

      it('should only check top-level keys for pollution', () => {
        const json = '{"safe":{"__proto__":"nested"}}'
        const result = safeJsonParse(json)
        // Only top-level is checked, so nested __proto__ is allowed but won't be set.
        expect(result).toHaveProperty('safe')
        expect(typeof (result as { safe: unknown }).safe).toBe('object')
      })
    })

    describe('size limit enforcement', () => {
      it('should enforce default 10MB size limit', () => {
        const largeJson = `{"data":"${'x'.repeat(11 * 1024 * 1024)}"}`
        expect(() => safeJsonParse(largeJson)).toThrow(
          'JSON string exceeds maximum size limit',
        )
      })

      it('should allow JSON within default size limit', () => {
        const smallJson = `{"data":"${'x'.repeat(100)}"}`
        const result = safeJsonParse(smallJson)
        expect(result).toHaveProperty('data')
      })

      it('should enforce custom size limit', () => {
        const json = '{"data":"test"}'
        const options: JsonParseOptions = { maxSize: 5 }
        expect(() => safeJsonParse(json, undefined, options)).toThrow(
          'JSON string exceeds maximum size limit of 5 bytes',
        )
      })

      it('should allow JSON within custom size limit', () => {
        const json = '{"a":1}'
        const options: JsonParseOptions = { maxSize: 100 }
        const result = safeJsonParse(json, undefined, options)
        expect(result).toEqual({ a: 1 })
      })

      it('should handle exact size limit boundary', () => {
        const json = '{"a":1}'
        const byteLength = Buffer.byteLength(json, 'utf8')
        const options: JsonParseOptions = { maxSize: byteLength }
        const result = safeJsonParse(json, undefined, options)
        expect(result).toEqual({ a: 1 })
      })

      it('should handle multi-byte UTF-8 characters in size calculation', () => {
        const json = '{"emoji":"😀"}'
        const byteLength = Buffer.byteLength(json, 'utf8')
        const options: JsonParseOptions = { maxSize: byteLength - 1 }
        expect(() => safeJsonParse(json, undefined, options)).toThrow(
          'JSON string exceeds maximum size limit',
        )
      })
    })

    describe('schema validation', () => {
      it('should validate against schema', () => {
        const schema = createMockSchema<{ name: string }>(
          data => typeof data === 'object' && data !== null && 'name' in data,
        )
        const result = safeJsonParse('{"name":"test"}', schema)
        expect(result).toEqual({ name: 'test' })
      })

      it('should throw on schema validation failure', () => {
        const schema = createMockSchema<{ name: string }>(
          data => typeof data === 'object' && data !== null && 'name' in data,
        )
        expect(() => safeJsonParse('{"invalid":"data"}', schema)).toThrow(
          'Validation failed: root: Validation failed',
        )
      })

      it('should return validated data from schema', () => {
        const schema = createMockSchema<{ value: number }>(
          data =>
            typeof data === 'object' &&
            data !== null &&
            'value' in data &&
            typeof (data as { value: unknown }).value === 'number',
        )
        const result = safeJsonParse('{"value":42}', schema)
        expect(result).toEqual({ value: 42 })
      })

      it('should handle schema validation with multiple issues', () => {
        const schema: Schema<{ name: string; age: number }> = {
          safeParse: () => ({
            success: false,
            error: {
              issues: [
                { path: ['name'], message: 'Required' },
                { path: ['age'], message: 'Must be a number' },
              ],
            },
          }),
          parse: () => {
            throw new Error('Validation failed')
          },
        }
        expect(() => safeJsonParse('{}', schema)).toThrow(
          'Validation failed: name: Required, age: Must be a number',
        )
      })

      it('should handle nested path in validation errors', () => {
        const schema: Schema<unknown> = {
          safeParse: () => ({
            success: false,
            error: {
              issues: [
                {
                  path: ['user', 'address', 'city'],
                  message: 'Required field',
                },
              ],
            },
          }),
          parse: () => {
            throw new Error('Validation failed')
          },
        }
        expect(() => safeJsonParse('{}', schema)).toThrow(
          'Validation failed: user.address.city: Required field',
        )
      })

      it('should check prototype pollution before schema validation', () => {
        const schema = createMockSchema<unknown>(() => true)
        const malicious = '{"__proto__":{"isAdmin":true}}'
        expect(() => safeJsonParse(malicious, schema)).toThrow(
          'JSON contains potentially malicious prototype pollution keys',
        )
      })

      it('should check size limit before schema validation', () => {
        const schema = createMockSchema<unknown>(() => true)
        const json = '{"data":"test"}'
        const options: JsonParseOptions = { maxSize: 5 }
        expect(() => safeJsonParse(json, schema, options)).toThrow(
          'JSON string exceeds maximum size limit',
        )
      })
    })

    describe('combined options', () => {
      it('should apply both size limit and prototype check', () => {
        const malicious = '{"__proto__":{"isAdmin":true}}'
        const options: JsonParseOptions = { maxSize: 1000 }
        expect(() => safeJsonParse(malicious, undefined, options)).toThrow(
          'JSON contains potentially malicious prototype pollution keys',
        )
      })

      it('should allow dangerous keys with size limit', () => {
        const json = '{"__proto__":"test"}'
        const options: JsonParseOptions = {
          allowPrototype: true,
          maxSize: 1000,
        }
        const result = safeJsonParse(json, undefined, options)
        // Should not throw when allowPrototype is true.
        expect(result).toBeDefined()
      })

      it('should apply all checks with schema', () => {
        const schema = createMockSchema<{ key: string }>(
          data => typeof data === 'object' && data !== null && 'key' in data,
        )
        const options: JsonParseOptions = { maxSize: 1000 }
        const result = safeJsonParse('{"key":"value"}', schema, options)
        expect(result).toEqual({ key: 'value' })
      })
    })
  })

  describe('tryJsonParse', () => {
    it('should return parsed data on success', () => {
      const result = tryJsonParse('{"key":"value"}')
      expect(result).toEqual({ key: 'value' })
    })

    it('should return undefined on parse failure', () => {
      const result = tryJsonParse('invalid json')
      expect(result).toBeUndefined()
    })

    it('should return undefined on prototype pollution', () => {
      const result = tryJsonParse('{"__proto__":{"isAdmin":true}}')
      expect(result).toBeUndefined()
    })

    it('should return undefined on size limit exceeded', () => {
      const json = '{"data":"test"}'
      const options: JsonParseOptions = { maxSize: 5 }
      const result = tryJsonParse(json, undefined, options)
      expect(result).toBeUndefined()
    })

    it('should return undefined on schema validation failure', () => {
      const schema = createMockSchema<{ name: string }>(
        data => typeof data === 'object' && data !== null && 'name' in data,
      )
      const result = tryJsonParse('{"invalid":"data"}', schema)
      expect(result).toBeUndefined()
    })

    it('should return validated data on success', () => {
      const schema = createMockSchema<{ name: string }>(
        data => typeof data === 'object' && data !== null && 'name' in data,
      )
      const result = tryJsonParse('{"name":"test"}', schema)
      expect(result).toEqual({ name: 'test' })
    })

    it('should handle options parameter', () => {
      const options: JsonParseOptions = { allowPrototype: true }
      const result = tryJsonParse('{"__proto__":"test"}', undefined, options)
      // Should not throw when allowPrototype is true.
      expect(result).toBeDefined()
    })
  })

  describe('parseJsonWithResult', () => {
    it('should return success result with data', () => {
      const result = parseJsonWithResult('{"key":"value"}')
      expect(result).toEqual({
        success: true,
        data: { key: 'value' },
      })
    })

    it('should return error result on parse failure', () => {
      const result = parseJsonWithResult('invalid json')
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Failed to parse JSON'),
      })
    })

    it('should return error result on prototype pollution', () => {
      const result = parseJsonWithResult('{"__proto__":{"isAdmin":true}}')
      expect(result).toEqual({
        success: false,
        error: 'JSON contains potentially malicious prototype pollution keys',
      })
    })

    it('should return error result on size limit exceeded', () => {
      const json = '{"data":"test"}'
      const options: JsonParseOptions = { maxSize: 5 }
      const result = parseJsonWithResult(json, undefined, options)
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining(
          'JSON string exceeds maximum size limit',
        ),
      })
    })

    it('should return error result on schema validation failure', () => {
      const schema = createMockSchema<{ name: string }>(
        data => typeof data === 'object' && data !== null && 'name' in data,
      )
      const result = parseJsonWithResult('{"invalid":"data"}', schema)
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Validation failed'),
      })
    })

    it('should return success with validated data', () => {
      const schema = createMockSchema<{ name: string }>(
        data => typeof data === 'object' && data !== null && 'name' in data,
      )
      const result = parseJsonWithResult('{"name":"test"}', schema)
      expect(result).toEqual({
        success: true,
        data: { name: 'test' },
      })
    })

    it('should handle non-Error exceptions', () => {
      const schema: Schema<unknown> = {
        safeParse: () => {
          throw 'string error'
        },
        parse: () => {
          throw new Error('never called')
        },
      }
      const result = parseJsonWithResult('{}', schema)
      expect(result).toEqual({
        success: false,
        error: 'Unknown error',
      })
    })
  })

  describe('createJsonParser', () => {
    it('should create parser function', () => {
      const parser = createJsonParser()
      expect(typeof parser).toBe('function')
    })

    it('should parse JSON with created parser', () => {
      const parser = createJsonParser()
      const result = parser('{"key":"value"}')
      expect(result).toEqual({ key: 'value' })
    })

    it('should apply schema in created parser', () => {
      const schema = createMockSchema<{ name: string }>(
        data => typeof data === 'object' && data !== null && 'name' in data,
      )
      const parser = createJsonParser(schema)
      const result = parser('{"name":"test"}')
      expect(result).toEqual({ name: 'test' })
    })

    it('should throw on schema validation failure', () => {
      const schema = createMockSchema<{ name: string }>(
        data => typeof data === 'object' && data !== null && 'name' in data,
      )
      const parser = createJsonParser(schema)
      expect(() => parser('{"invalid":"data"}')).toThrow('Validation failed')
    })

    it('should apply default options', () => {
      const defaultOptions: JsonParseOptions = { maxSize: 50 }
      const parser = createJsonParser(undefined, defaultOptions)
      expect(() => parser(`{"data":"${'x'.repeat(100)}"}`)).toThrow(
        'JSON string exceeds maximum size limit',
      )
    })

    it('should merge options with defaults', () => {
      const defaultOptions: JsonParseOptions = { maxSize: 1000 }
      const parser = createJsonParser(undefined, defaultOptions)
      const result = parser('{"key":"value"}', { allowPrototype: true })
      expect(result).toEqual({ key: 'value' })
    })

    it('should override default options with call-time options', () => {
      const defaultOptions: JsonParseOptions = { maxSize: 50 }
      const parser = createJsonParser(undefined, defaultOptions)
      const json = `{"data":"${'x'.repeat(100)}"}`
      const result = parser(json, { maxSize: 1000 })
      expect(result).toHaveProperty('data')
    })

    it('should create parser with both schema and options', () => {
      const schema = createMockSchema<{ name: string }>(
        data => typeof data === 'object' && data !== null && 'name' in data,
      )
      const defaultOptions: JsonParseOptions = { maxSize: 1000 }
      const parser = createJsonParser(schema, defaultOptions)
      const result = parser('{"name":"test"}')
      expect(result).toEqual({ name: 'test' })
    })
  })

  describe('parseNdjson', () => {
    it('should parse single line NDJSON', () => {
      const ndjson = '{"a":1}'
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }])
    })

    it('should parse multiple lines NDJSON', () => {
      const ndjson = '{"a":1}\n{"b":2}\n{"c":3}'
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
    })

    it('should handle CRLF line endings', () => {
      const ndjson = '{"a":1}\r\n{"b":2}\r\n{"c":3}'
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
    })

    it('should skip empty lines', () => {
      const ndjson = '{"a":1}\n\n{"b":2}\n  \n{"c":3}'
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
    })

    it('should handle trailing newlines', () => {
      const ndjson = '{"a":1}\n{"b":2}\n'
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }, { b: 2 }])
    })

    it('should handle leading newlines', () => {
      const ndjson = '\n{"a":1}\n{"b":2}'
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }, { b: 2 }])
    })

    it('should trim whitespace from lines', () => {
      const ndjson = '  {"a":1}  \n  {"b":2}  '
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }, { b: 2 }])
    })

    it('should parse mixed types in NDJSON', () => {
      const ndjson = '{"a":1}\n[1,2,3]\n"string"\n42\ntrue\nnull'
      const result = parseNdjson(ndjson)
      expect(result).toEqual([{ a: 1 }, [1, 2, 3], 'string', 42, true, null])
    })

    it('should throw on invalid JSON line', () => {
      const ndjson = '{"a":1}\ninvalid\n{"b":2}'
      expect(() => parseNdjson(ndjson)).toThrow(
        'Failed to parse NDJSON at line 2',
      )
    })

    it('should include line number in error message', () => {
      const ndjson = '{"a":1}\n{"b":2}\ninvalid line\n{"c":3}'
      expect(() => parseNdjson(ndjson)).toThrow(
        'Failed to parse NDJSON at line 3',
      )
    })

    it('should throw on prototype pollution in line', () => {
      const ndjson = '{"a":1}\n{"__proto__":{"isAdmin":true}}'
      expect(() => parseNdjson(ndjson)).toThrow(
        'Failed to parse NDJSON at line 2',
      )
    })

    it('should validate each line against schema', () => {
      const schema = createMockSchema<{ id: number }>(
        data =>
          typeof data === 'object' &&
          data !== null &&
          'id' in data &&
          typeof (data as { id: unknown }).id === 'number',
      )
      const ndjson = '{"id":1}\n{"id":2}\n{"id":3}'
      const result = parseNdjson(ndjson, schema)
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })

    it('should throw on schema validation failure', () => {
      const schema = createMockSchema<{ id: number }>(
        data =>
          typeof data === 'object' &&
          data !== null &&
          'id' in data &&
          typeof (data as { id: unknown }).id === 'number',
      )
      const ndjson = '{"id":1}\n{"name":"invalid"}\n{"id":3}'
      expect(() => parseNdjson(ndjson, schema)).toThrow(
        'Failed to parse NDJSON at line 2',
      )
    })

    it('should enforce size limit per line', () => {
      const ndjson = `{"a":1}\n{"data":"${'x'.repeat(100)}"}`
      const options: JsonParseOptions = { maxSize: 50 }
      expect(() => parseNdjson(ndjson, undefined, options)).toThrow(
        'Failed to parse NDJSON at line 2',
      )
    })

    it('should handle empty NDJSON string', () => {
      const result = parseNdjson('')
      expect(result).toEqual([])
    })

    it('should handle NDJSON with only whitespace', () => {
      const result = parseNdjson('   \n  \n  ')
      expect(result).toEqual([])
    })

    it('should preserve error message details', () => {
      const ndjson = '{"a":1}\n{"__proto__":{"bad":true}}'
      expect(() => parseNdjson(ndjson)).toThrow(
        'Failed to parse NDJSON at line 2: JSON contains potentially malicious prototype pollution keys',
      )
    })

    it('should handle non-Error exceptions', () => {
      const schema: Schema<unknown> = {
        safeParse: () => {
          throw 'string error'
        },
        parse: () => {
          throw new Error('never called')
        },
      }
      const ndjson = '{"a":1}'
      expect(() => parseNdjson(ndjson, schema)).toThrow(
        'Failed to parse NDJSON at line 1: string error',
      )
    })
  })

  describe('streamNdjson', () => {
    it('should yield single line NDJSON', () => {
      const ndjson = '{"a":1}'
      const results = [...streamNdjson(ndjson)]
      expect(results).toEqual([{ a: 1 }])
    })

    it('should yield multiple lines NDJSON', () => {
      const ndjson = '{"a":1}\n{"b":2}\n{"c":3}'
      const results = [...streamNdjson(ndjson)]
      expect(results).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
    })

    it('should handle CRLF line endings', () => {
      const ndjson = '{"a":1}\r\n{"b":2}\r\n{"c":3}'
      const results = [...streamNdjson(ndjson)]
      expect(results).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
    })

    it('should skip empty lines', () => {
      const ndjson = '{"a":1}\n\n{"b":2}\n  \n{"c":3}'
      const results = [...streamNdjson(ndjson)]
      expect(results).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
    })

    it('should be lazy and yield one at a time', () => {
      const ndjson = '{"a":1}\n{"b":2}\n{"c":3}'
      const generator = streamNdjson(ndjson)
      expect(generator.next().value).toEqual({ a: 1 })
      expect(generator.next().value).toEqual({ b: 2 })
      expect(generator.next().value).toEqual({ c: 3 })
      expect(generator.next().done).toBe(true)
    })

    it('should throw on invalid JSON line', () => {
      const ndjson = '{"a":1}\ninvalid\n{"b":2}'
      const generator = streamNdjson(ndjson)
      expect(generator.next().value).toEqual({ a: 1 })
      expect(() => generator.next()).toThrow('Failed to parse NDJSON at line 2')
    })

    it('should include line number in error message', () => {
      const ndjson = '{"a":1}\n{"b":2}\ninvalid line'
      const generator = streamNdjson(ndjson)
      generator.next()
      generator.next()
      expect(() => generator.next()).toThrow('Failed to parse NDJSON at line 3')
    })

    it('should throw on prototype pollution in line', () => {
      const ndjson = '{"a":1}\n{"__proto__":{"isAdmin":true}}'
      const generator = streamNdjson(ndjson)
      generator.next()
      expect(() => generator.next()).toThrow('Failed to parse NDJSON at line 2')
    })

    it('should validate each line against schema', () => {
      const schema = createMockSchema<{ id: number }>(
        data =>
          typeof data === 'object' &&
          data !== null &&
          'id' in data &&
          typeof (data as { id: unknown }).id === 'number',
      )
      const ndjson = '{"id":1}\n{"id":2}\n{"id":3}'
      const results = [...streamNdjson(ndjson, schema)]
      expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })

    it('should throw on schema validation failure', () => {
      const schema = createMockSchema<{ id: number }>(
        data =>
          typeof data === 'object' &&
          data !== null &&
          'id' in data &&
          typeof (data as { id: unknown }).id === 'number',
      )
      const ndjson = '{"id":1}\n{"name":"invalid"}'
      const generator = streamNdjson(ndjson, schema)
      generator.next()
      expect(() => generator.next()).toThrow('Failed to parse NDJSON at line 2')
    })

    it('should enforce size limit per line', () => {
      const ndjson = `{"a":1}\n{"data":"${'x'.repeat(100)}"}`
      const options: JsonParseOptions = { maxSize: 50 }
      const generator = streamNdjson(ndjson, undefined, options)
      generator.next()
      expect(() => generator.next()).toThrow('Failed to parse NDJSON at line 2')
    })

    it('should handle empty NDJSON string', () => {
      const results = [...streamNdjson('')]
      expect(results).toEqual([])
    })

    it('should handle NDJSON with only whitespace', () => {
      const results = [...streamNdjson('   \n  \n  ')]
      expect(results).toEqual([])
    })

    it('should trim whitespace from lines', () => {
      const ndjson = '  {"a":1}  \n  {"b":2}  '
      const results = [...streamNdjson(ndjson)]
      expect(results).toEqual([{ a: 1 }, { b: 2 }])
    })

    it('should preserve error message details', () => {
      const ndjson = '{"a":1}\n{"__proto__":{"bad":true}}'
      const generator = streamNdjson(ndjson)
      generator.next()
      expect(() => generator.next()).toThrow(
        'Failed to parse NDJSON at line 2: JSON contains potentially malicious prototype pollution keys',
      )
    })

    it('should handle non-Error exceptions', () => {
      const schema: Schema<unknown> = {
        safeParse: () => {
          throw 'string error'
        },
        parse: () => {
          throw new Error('never called')
        },
      }
      const ndjson = '{"a":1}'
      const generator = streamNdjson(ndjson, schema)
      expect(() => generator.next()).toThrow(
        'Failed to parse NDJSON at line 1: string error',
      )
    })

    it('should support early termination', () => {
      const ndjson = '{"a":1}\n{"b":2}\n{"c":3}'
      const generator = streamNdjson(ndjson)
      expect(generator.next().value).toEqual({ a: 1 })
      // Stop iterating early.
      expect(generator.return?.()).toEqual({ done: true, value: undefined })
    })

    it('should handle mixed types in NDJSON', () => {
      const ndjson = '{"a":1}\n[1,2,3]\n"string"\n42\ntrue\nnull'
      const results = [...streamNdjson(ndjson)]
      expect(results).toEqual([{ a: 1 }, [1, 2, 3], 'string', 42, true, null])
    })
  })

  describe('integration tests', () => {
    it('should handle complex real-world JSON', () => {
      const json = JSON.stringify({
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
        ],
        metadata: {
          total: 2,
          page: 1,
          timestamp: '2024-01-01T00:00:00Z',
        },
      })
      const result = safeJsonParse(json)
      expect(result).toHaveProperty('users')
      expect(result).toHaveProperty('metadata')
    })

    it('should handle NDJSON logs format', () => {
      const ndjson = [
        '{"level":"info","message":"Server started","timestamp":"2024-01-01T00:00:00Z"}',
        '{"level":"warn","message":"Deprecated API used","timestamp":"2024-01-01T00:01:00Z"}',
        '{"level":"error","message":"Request failed","timestamp":"2024-01-01T00:02:00Z"}',
      ].join('\n')
      const results = parseNdjson(ndjson)
      expect(results).toHaveLength(3)
      expect(results[0]).toHaveProperty('level', 'info')
      expect(results[1]).toHaveProperty('level', 'warn')
      expect(results[2]).toHaveProperty('level', 'error')
    })

    it('should handle streaming large NDJSON efficiently', () => {
      const lines = Array.from({ length: 100 }, (_, i) =>
        JSON.stringify({ id: i }),
      )
      const ndjson = lines.join('\n')
      let count = 0
      for (const item of streamNdjson(ndjson)) {
        expect(item).toHaveProperty('id', count)
        count += 1
      }
      expect(count).toBe(100)
    })

    it('should combine all security features', () => {
      const schema = createMockSchema<{ safe: string }>(
        data =>
          typeof data === 'object' &&
          data !== null &&
          'safe' in data &&
          typeof (data as { safe: unknown }).safe === 'string',
      )
      const options: JsonParseOptions = { maxSize: 1000 }
      const json = '{"safe":"data"}'
      const result = safeJsonParse(json, schema, options)
      expect(result).toEqual({ safe: 'data' })
    })
  })
})
