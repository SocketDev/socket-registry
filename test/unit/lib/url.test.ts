/**
 * @fileoverview Tests for URL parsing and validation utilities.
 *
 * Validates URL parsing, validation, and URLSearchParams helper functions.
 */
import { describe, expect, it } from 'vitest'

import {
  createRelativeUrl,
  isUrl,
  parseUrl,
  urlSearchParamAsArray,
  urlSearchParamAsBoolean,
  urlSearchParamAsNumber,
  urlSearchParamAsString,
  urlSearchParamsGetArray,
  urlSearchParamsGetBoolean,
} from '../../../registry/dist/lib/url.js'

describe('url utilities', () => {
  describe('isUrl', () => {
    it('should return true for valid HTTP URL string', () => {
      expect(isUrl('https://example.com')).toBe(true)
    })

    it('should return true for valid HTTP URL with path', () => {
      expect(isUrl('https://example.com/path')).toBe(true)
    })

    it('should return true for valid HTTP URL with query', () => {
      expect(isUrl('https://example.com?query=1')).toBe(true)
    })

    it('should return true for URL object', () => {
      const url = new URL('https://example.com')
      expect(isUrl(url)).toBe(true)
    })

    it('should return true for file protocol', () => {
      expect(isUrl('file:///path/to/file')).toBe(true)
    })

    it('should return false for empty string', () => {
      expect(isUrl('')).toBe(false)
    })

    it('should return false for null', () => {
      expect(isUrl(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isUrl(undefined)).toBe(false)
    })

    it('should return false for invalid URL string', () => {
      expect(isUrl('not a url')).toBe(false)
    })

    it('should return false for relative path', () => {
      expect(isUrl('/path/to/file')).toBe(false)
    })

    it('should return false for path without protocol', () => {
      expect(isUrl('example.com')).toBe(false)
    })

    it('should return true for data URL', () => {
      expect(isUrl('data:text/plain;base64,SGVsbG8=')).toBe(true)
    })

    it('should return true for custom protocol', () => {
      expect(isUrl('custom://example.com')).toBe(true)
    })
  })

  describe('parseUrl', () => {
    it('should parse valid HTTP URL string', () => {
      const result = parseUrl('https://example.com')
      expect(result).toBeInstanceOf(URL)
      expect(result?.hostname).toBe('example.com')
    })

    it('should parse URL with path', () => {
      const result = parseUrl('https://example.com/path')
      expect(result?.pathname).toBe('/path')
    })

    it('should parse URL with query parameters', () => {
      const result = parseUrl('https://example.com?key=value')
      expect(result?.searchParams.get('key')).toBe('value')
    })

    it('should parse URL with hash', () => {
      const result = parseUrl('https://example.com#section')
      expect(result?.hash).toBe('#section')
    })

    it('should return URL object as-is', () => {
      const url = new URL('https://example.com')
      const result = parseUrl(url)
      expect(result).toBeInstanceOf(URL)
      expect(result?.href).toBe(url.href)
    })

    it('should return undefined for invalid URL', () => {
      const result = parseUrl('not a url')
      expect(result).toBeUndefined()
    })

    it('should return undefined for relative path', () => {
      const result = parseUrl('/path/to/file')
      expect(result).toBeUndefined()
    })

    it('should parse file protocol URL', () => {
      const result = parseUrl('file:///path/to/file')
      expect(result).toBeInstanceOf(URL)
      expect(result?.protocol).toBe('file:')
    })

    it('should parse data URL', () => {
      const result = parseUrl('data:text/plain;base64,SGVsbG8=')
      expect(result).toBeInstanceOf(URL)
      expect(result?.protocol).toBe('data:')
    })

    it('should parse URL with port', () => {
      const result = parseUrl('https://example.com:8080')
      expect(result?.port).toBe('8080')
    })

    it('should parse URL with credentials', () => {
      const result = parseUrl('https://user:pass@example.com')
      expect(result?.username).toBe('user')
      expect(result?.password).toBe('pass')
    })
  })

  describe('urlSearchParamAsArray', () => {
    it('should split comma-separated values', () => {
      const result = urlSearchParamAsArray('foo,bar,baz')
      expect(result).toEqual(['foo', 'bar', 'baz'])
    })

    it('should handle single value', () => {
      const result = urlSearchParamAsArray('foo')
      expect(result).toEqual(['foo'])
    })

    it('should trim whitespace around values', () => {
      const result = urlSearchParamAsArray('foo, bar , baz')
      expect(result).toEqual(['foo', 'bar', 'baz'])
    })

    it('should filter out empty values', () => {
      const result = urlSearchParamAsArray('foo,,bar')
      expect(result).toEqual(['foo', 'bar'])
    })

    it('should return empty array for null', () => {
      const result = urlSearchParamAsArray(null)
      expect(result).toEqual([])
    })

    it('should return empty array for undefined', () => {
      const result = urlSearchParamAsArray(undefined)
      expect(result).toEqual([])
    })

    it('should return empty array for empty string', () => {
      const result = urlSearchParamAsArray('')
      expect(result).toEqual([])
    })

    it('should return empty array for whitespace only', () => {
      const result = urlSearchParamAsArray('   ')
      expect(result).toEqual([])
    })

    it('should handle values with internal spaces', () => {
      const result = urlSearchParamAsArray('foo bar, baz qux')
      expect(result).toEqual(['foo bar', 'baz qux'])
    })

    it('should handle multiple consecutive commas', () => {
      const result = urlSearchParamAsArray('foo,,,bar')
      expect(result).toEqual(['foo', 'bar'])
    })

    it('should handle leading and trailing commas', () => {
      const result = urlSearchParamAsArray(',foo,bar,')
      expect(result).toEqual(['foo', 'bar'])
    })
  })

  describe('urlSearchParamAsBoolean', () => {
    it('should return true for "true"', () => {
      expect(urlSearchParamAsBoolean('true')).toBe(true)
    })

    it('should return true for "TRUE"', () => {
      expect(urlSearchParamAsBoolean('TRUE')).toBe(true)
    })

    it('should return true for "1"', () => {
      expect(urlSearchParamAsBoolean('1')).toBe(true)
    })

    it('should return false for "false"', () => {
      expect(urlSearchParamAsBoolean('false')).toBe(false)
    })

    it('should return false for "0"', () => {
      expect(urlSearchParamAsBoolean('0')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(urlSearchParamAsBoolean('')).toBe(false)
    })

    it('should return false for null with no default', () => {
      expect(urlSearchParamAsBoolean(null)).toBe(false)
    })

    it('should return false for undefined with no default', () => {
      expect(urlSearchParamAsBoolean(undefined)).toBe(false)
    })

    it('should return true for null with defaultValue true', () => {
      expect(urlSearchParamAsBoolean(null, { defaultValue: true })).toBe(true)
    })

    it('should return true for undefined with defaultValue true', () => {
      expect(urlSearchParamAsBoolean(undefined, { defaultValue: true })).toBe(
        true,
      )
    })

    it('should return false for any other string', () => {
      expect(urlSearchParamAsBoolean('yes')).toBe(false)
      expect(urlSearchParamAsBoolean('no')).toBe(false)
    })

    it('should handle whitespace in value', () => {
      expect(urlSearchParamAsBoolean('  true  ')).toBe(true)
      expect(urlSearchParamAsBoolean('  1  ')).toBe(true)
    })

    it('should handle mixed case', () => {
      expect(urlSearchParamAsBoolean('True')).toBe(true)
      expect(urlSearchParamAsBoolean('TrUe')).toBe(true)
    })

    it('should return default when value is null', () => {
      expect(urlSearchParamAsBoolean(null, { defaultValue: false })).toBe(false)
    })
  })

  describe('urlSearchParamsGetArray', () => {
    it('should get all values for a key', () => {
      const params = new URLSearchParams('key=foo&key=bar&key=baz')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual(['foo', 'bar', 'baz'])
    })

    it('should split comma-separated single value', () => {
      const params = new URLSearchParams('key=foo,bar,baz')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual(['foo', 'bar', 'baz'])
    })

    it('should return empty array for missing key', () => {
      const params = new URLSearchParams('other=value')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual([])
    })

    it('should return empty array for null params', () => {
      const result = urlSearchParamsGetArray(null, 'key')
      expect(result).toEqual([])
    })

    it('should return empty array for undefined params', () => {
      const result = urlSearchParamsGetArray(undefined, 'key')
      expect(result).toEqual([])
    })

    it('should handle single value without commas', () => {
      const params = new URLSearchParams('key=value')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual(['value'])
    })

    it('should not split when multiple values provided', () => {
      const params = new URLSearchParams('key=foo,bar&key=baz')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual(['foo,bar', 'baz'])
    })

    it('should handle empty value', () => {
      const params = new URLSearchParams('key=')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual([''])
    })

    it('should trim whitespace in comma-separated values', () => {
      const params = new URLSearchParams('key=foo, bar , baz')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual(['foo', 'bar', 'baz'])
    })
  })

  describe('urlSearchParamsGetBoolean', () => {
    it('should return true for "true"', () => {
      const params = new URLSearchParams('key=true')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(true)
    })

    it('should return true for "1"', () => {
      const params = new URLSearchParams('key=1')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(true)
    })

    it('should return false for "false"', () => {
      const params = new URLSearchParams('key=false')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(false)
    })

    it('should return false for "0"', () => {
      const params = new URLSearchParams('key=0')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(false)
    })

    it('should return default for missing key', () => {
      const params = new URLSearchParams('other=value')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(false)
    })

    it('should return custom default for missing key', () => {
      const params = new URLSearchParams('other=value')
      expect(
        urlSearchParamsGetBoolean(params, 'key', { defaultValue: true }),
      ).toBe(true)
    })

    it('should return default for null params', () => {
      expect(urlSearchParamsGetBoolean(null, 'key')).toBe(false)
    })

    it('should return default for undefined params', () => {
      expect(urlSearchParamsGetBoolean(undefined, 'key')).toBe(false)
    })

    it('should return custom default for null params', () => {
      expect(
        urlSearchParamsGetBoolean(null, 'key', { defaultValue: true }),
      ).toBe(true)
    })

    it('should handle empty value as false', () => {
      const params = new URLSearchParams('key=')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(false)
    })

    it('should handle case insensitive "true"', () => {
      const params = new URLSearchParams('key=TRUE')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(true)
    })

    it('should handle whitespace', () => {
      const params = new URLSearchParams('key= true ')
      expect(urlSearchParamsGetBoolean(params, 'key')).toBe(true)
    })
  })

  describe('createRelativeUrl', () => {
    it('should remove leading slash', () => {
      const result = createRelativeUrl('/path/to/file')
      expect(result).toBe('path/to/file')
    })

    it('should handle path without leading slash', () => {
      const result = createRelativeUrl('path/to/file')
      expect(result).toBe('path/to/file')
    })

    it('should add base URL', () => {
      const result = createRelativeUrl('/path', { base: 'https://example.com' })
      expect(result).toBe('https://example.com/path')
    })

    it('should add trailing slash to base if missing', () => {
      const result = createRelativeUrl('/path', { base: 'https://example.com' })
      expect(result).toBe('https://example.com/path')
    })

    it('should not add extra slash if base has trailing slash', () => {
      const result = createRelativeUrl('/path', {
        base: 'https://example.com/',
      })
      expect(result).toBe('https://example.com/path')
    })

    it('should handle empty path', () => {
      const result = createRelativeUrl('')
      expect(result).toBe('')
    })

    it('should handle empty path with base', () => {
      const result = createRelativeUrl('', { base: 'https://example.com' })
      expect(result).toBe('https://example.com/')
    })

    it('should handle path with query string', () => {
      const result = createRelativeUrl('/path?query=1')
      expect(result).toBe('path?query=1')
    })

    it('should handle path with hash', () => {
      const result = createRelativeUrl('/path#section')
      expect(result).toBe('path#section')
    })

    it('should combine base with complex path', () => {
      const result = createRelativeUrl('/path/to/file.html', {
        base: 'https://example.com/subdir',
      })
      expect(result).toBe('https://example.com/subdir/path/to/file.html')
    })

    it('should handle base with path', () => {
      const result = createRelativeUrl('/file', {
        base: 'https://example.com/dir',
      })
      expect(result).toBe('https://example.com/dir/file')
    })

    it('should handle multiple leading slashes', () => {
      const result = createRelativeUrl('//path')
      expect(result).toBe('/path')
    })
  })

  describe('urlSearchParamAsString', () => {
    it('should get string value', () => {
      const params = new URLSearchParams('key=value')
      expect(urlSearchParamAsString(params, 'key')).toBe('value')
    })

    it('should return empty string for missing key', () => {
      const params = new URLSearchParams('other=value')
      expect(urlSearchParamAsString(params, 'key')).toBe('')
    })

    it('should return custom default for missing key', () => {
      const params = new URLSearchParams('other=value')
      expect(
        urlSearchParamAsString(params, 'key', { defaultValue: 'default' }),
      ).toBe('default')
    })

    it('should return empty string for null params', () => {
      expect(urlSearchParamAsString(null, 'key')).toBe('')
    })

    it('should return empty string for undefined params', () => {
      expect(urlSearchParamAsString(undefined, 'key')).toBe('')
    })

    it('should return custom default for null params', () => {
      expect(
        urlSearchParamAsString(null, 'key', { defaultValue: 'default' }),
      ).toBe('default')
    })

    it('should handle empty value', () => {
      const params = new URLSearchParams('key=')
      expect(urlSearchParamAsString(params, 'key')).toBe('')
    })

    it('should preserve whitespace in value', () => {
      const params = new URLSearchParams('key= value ')
      expect(urlSearchParamAsString(params, 'key')).toBe(' value ')
    })

    it('should handle special characters', () => {
      const params = new URLSearchParams('key=hello%20world')
      expect(urlSearchParamAsString(params, 'key')).toBe('hello world')
    })

    it('should get first value when multiple exist', () => {
      const params = new URLSearchParams('key=first&key=second')
      expect(urlSearchParamAsString(params, 'key')).toBe('first')
    })
  })

  describe('urlSearchParamAsNumber', () => {
    it('should parse integer', () => {
      const params = new URLSearchParams('key=42')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(42)
    })

    it('should parse float', () => {
      const params = new URLSearchParams('key=3.14')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(3.14)
    })

    it('should parse negative number', () => {
      const params = new URLSearchParams('key=-10')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(-10)
    })

    it('should return 0 for missing key', () => {
      const params = new URLSearchParams('other=value')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(0)
    })

    it('should return custom default for missing key', () => {
      const params = new URLSearchParams('other=value')
      expect(urlSearchParamAsNumber(params, 'key', { defaultValue: 100 })).toBe(
        100,
      )
    })

    it('should return 0 for null params', () => {
      expect(urlSearchParamAsNumber(null, 'key')).toBe(0)
    })

    it('should return 0 for undefined params', () => {
      expect(urlSearchParamAsNumber(undefined, 'key')).toBe(0)
    })

    it('should return custom default for null params', () => {
      expect(urlSearchParamAsNumber(null, 'key', { defaultValue: 100 })).toBe(
        100,
      )
    })

    it('should return default for NaN', () => {
      const params = new URLSearchParams('key=notanumber')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(0)
    })

    it('should return custom default for NaN', () => {
      const params = new URLSearchParams('key=notanumber')
      expect(urlSearchParamAsNumber(params, 'key', { defaultValue: 100 })).toBe(
        100,
      )
    })

    it('should parse zero', () => {
      const params = new URLSearchParams('key=0')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(0)
    })

    it('should parse scientific notation', () => {
      const params = new URLSearchParams('key=1e5')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(100_000)
    })

    it('should handle whitespace', () => {
      const params = new URLSearchParams('key= 42 ')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(42)
    })

    it('should handle empty string as NaN', () => {
      const params = new URLSearchParams('key=')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(0)
    })

    it('should parse Infinity', () => {
      const params = new URLSearchParams('key=Infinity')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(
        Number.POSITIVE_INFINITY,
      )
    })

    it('should parse negative Infinity', () => {
      const params = new URLSearchParams('key=-Infinity')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(
        Number.NEGATIVE_INFINITY,
      )
    })
  })

  describe('edge cases', () => {
    it('should handle URL with special characters', () => {
      const result = parseUrl(
        'https://example.com/path?key=value%20with%20spaces',
      )
      expect(result?.searchParams.get('key')).toBe('value with spaces')
    })

    it('should handle very long URL', () => {
      const longPath = '/path'.repeat(100)
      const result = parseUrl(`https://example.com${longPath}`)
      expect(result?.pathname).toContain('/path')
    })

    it('should handle array with many items', () => {
      const values = Array.from({ length: 100 }).fill('item').join(',')
      const result = urlSearchParamAsArray(values)
      expect(result.length).toBe(100)
    })

    it('should handle URLSearchParams with empty key', () => {
      const params = new URLSearchParams('=value')
      const result = urlSearchParamAsString(params, '')
      expect(typeof result).toBe('string')
    })

    it('should handle createRelativeUrl with no slash at all', () => {
      const result = createRelativeUrl('path')
      expect(result).toBe('path')
    })

    it('should handle boolean param with various truthy strings', () => {
      expect(urlSearchParamAsBoolean('yes')).toBe(false)
      expect(urlSearchParamAsBoolean('on')).toBe(false)
      expect(urlSearchParamAsBoolean('t')).toBe(false)
    })

    it('should handle number param with hex notation', () => {
      const params = new URLSearchParams('key=0xFF')
      expect(urlSearchParamAsNumber(params, 'key')).toBe(255)
    })

    it('should handle isUrl with URL-like strings', () => {
      expect(isUrl('http://')).toBe(false)
      expect(isUrl('https://')).toBe(false)
      expect(isUrl('://example.com')).toBe(false)
    })

    it('should handle parseUrl with malformed URLs', () => {
      expect(parseUrl('ht!tp://example.com')).toBeUndefined()
      expect(parseUrl('http:////')).toBeUndefined()
    })

    it('should handle array param with only commas', () => {
      const result = urlSearchParamAsArray(',,,')
      expect(result).toEqual([])
    })

    it('should handle URLSearchParams getArray with no commas in multiple values', () => {
      const params = new URLSearchParams('key=foo&key=bar')
      const result = urlSearchParamsGetArray(params, 'key')
      expect(result).toEqual(['foo', 'bar'])
    })
  })
})
