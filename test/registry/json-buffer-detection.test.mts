import { describe, expect, it } from 'vitest'

import { jsonParse } from '../../registry/dist/lib/json.js'

describe('json module - Buffer detection edge cases', () => {
  describe('jsonParse with Buffer-like objects', () => {
    it('should handle objects with missing copy method', () => {
      const bufferLike = {
        length: 5,
        slice: () => {},
        0: 123,
      }
      // Should not be treated as Buffer, falls back to regular JSON parsing
      expect(() =>
        jsonParse(bufferLike as any),
      ).toThrow()
    })

    it('should handle objects with missing slice method', () => {
      const bufferLike = {
        length: 5,
        copy: () => {},
        0: 123,
      }
      // Should not be treated as Buffer
      expect(() =>
        jsonParse(bufferLike as any),
      ).toThrow()
    })

    it('should handle Buffer with length > 0 and non-number at index 0', () => {
      const bufferLike = {
        length: 1,
        copy: () => {},
        slice: () => {},
        0: 'not a number',
        constructor: {
          isBuffer: () => true,
        },
      }
      // Should not pass Buffer validation
      expect(() =>
        jsonParse(bufferLike as any),
      ).toThrow()
    })

    it('should handle empty Buffer-like object (length 0)', () => {
      const emptyBufferLike = {
        length: 0,
        copy: () => {},
        slice: () => {},
        constructor: {
          isBuffer: (obj: any) => obj === emptyBufferLike,
        },
      }
      // Empty buffer should parse as empty JSON
      expect(() =>
        jsonParse(emptyBufferLike as any, { throws: false }),
      ).not.toThrow()
    })

    it('should parse actual Buffer with valid JSON', () => {
      const buffer = Buffer.from('{"valid": true}')
      const result = jsonParse(buffer)
      expect(result).toEqual({ valid: true })
    })

    it('should parse Buffer with numeric content at index 0', () => {
      const buffer = Buffer.from('[123, 456]')
      expect(buffer[0]).toBe(91) // '[' character code
      const result = jsonParse(buffer)
      expect(result).toEqual([123, 456])
    })
  })
})
