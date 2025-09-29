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
} from '../../registry/dist/lib/url.js'

describe('url utilities', () => {
  describe('isUrl', () => {
    it('should identify valid URL strings', () => {
      expect(isUrl('https://example.com')).toBe(true)
      expect(isUrl('http://localhost:3000')).toBe(true)
      expect(isUrl('ftp://files.example.com')).toBe(true)
      expect(isUrl('file:///path/to/file')).toBe(true)
    })

    it('should identify valid URL objects', () => {
      expect(isUrl(new URL('https://example.com'))).toBe(true)
      expect(isUrl(new URL('http://localhost:8080/path'))).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isUrl('not-a-url')).toBe(false)
      expect(isUrl('just text')).toBe(false)
      expect(isUrl('')).toBe(false)
      expect(isUrl('http://')).toBe(false)
      expect(isUrl('://invalid')).toBe(false)
    })

    it('should reject non-string, non-object values', () => {
      expect(isUrl(null)).toBe(false)
      expect(isUrl(undefined)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isUrl(123)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isUrl(true)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isUrl([])).toBe(false)
    })

    it('should handle relative URLs', () => {
      // Relative URLs are not valid URLs
      expect(isUrl('/path/to/resource')).toBe(false)
      expect(isUrl('./relative')).toBe(false)
      expect(isUrl('../parent')).toBe(false)
    })

    it('should handle complex URLs', () => {
      expect(isUrl('https://example.com:8080/path?query=value#fragment')).toBe(
        true,
      )
      expect(isUrl('http://user:pass@example.com/path')).toBe(true)
    })
  })

  describe('parseUrl', () => {
    it('should parse valid URL strings', () => {
      const url = parseUrl('https://example.com/path')
      expect(url).toBeInstanceOf(URL)
      expect(url?.hostname).toBe('example.com')
      expect(url?.pathname).toBe('/path')
    })

    it('should parse URL objects', () => {
      const original = new URL('https://example.com')
      const parsed = parseUrl(original)
      expect(parsed).toBeInstanceOf(URL)
      expect(parsed?.href).toBe(original.href)
    })

    it('should return null for invalid URLs', () => {
      expect(parseUrl('not-a-url')).toBeUndefined()
      expect(parseUrl('')).toBeUndefined()
      expect(parseUrl('http://')).toBeUndefined()
      expect(parseUrl('://invalid')).toBeUndefined()
    })

    it('should handle complex URLs', () => {
      const urlString =
        'https://user:pass@example.com:8080/path?query=value#fragment'
      const url = parseUrl(urlString)
      expect(url).toBeInstanceOf(URL)
      expect(url?.protocol).toBe('https:')
      expect(url?.username).toBe('user')
      expect(url?.password).toBe('pass')
      expect(url?.hostname).toBe('example.com')
      expect(url?.port).toBe('8080')
      expect(url?.pathname).toBe('/path')
      expect(url?.search).toBe('?query=value')
      expect(url?.hash).toBe('#fragment')
    })

    it('should handle different protocols', () => {
      expect(parseUrl('http://example.com')).toBeInstanceOf(URL)
      expect(parseUrl('https://example.com')).toBeInstanceOf(URL)
      expect(parseUrl('ftp://example.com')).toBeInstanceOf(URL)
      expect(parseUrl('file:///path')).toBeInstanceOf(URL)
    })
  })

  describe('urlSearchParamAsArray', () => {
    it('should split comma-separated values', () => {
      expect(urlSearchParamAsArray('a,b,c')).toEqual(['a', 'b', 'c'])
      expect(urlSearchParamAsArray('one, two, three')).toEqual([
        'one',
        'two',
        'three',
      ])
    })

    it('should handle single values', () => {
      expect(urlSearchParamAsArray('single')).toEqual(['single'])
      expect(urlSearchParamAsArray('  single  ')).toEqual(['single'])
    })

    it('should filter empty values', () => {
      expect(urlSearchParamAsArray('a,,b,c')).toEqual(['a', 'b', 'c'])
      expect(urlSearchParamAsArray('a, , b, c')).toEqual(['a', 'b', 'c'])
      expect(urlSearchParamAsArray('  ,  ,  ')).toEqual([])
    })

    it('should handle empty string', () => {
      expect(urlSearchParamAsArray('')).toEqual([])
      expect(urlSearchParamAsArray('   ')).toEqual([])
    })

    it('should handle non-string values', () => {
      expect(urlSearchParamAsArray(null)).toEqual([])
      expect(urlSearchParamAsArray(undefined)).toEqual([])
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsArray(123)).toEqual([])
    })

    it('should trim whitespace from individual values', () => {
      expect(urlSearchParamAsArray('  a  ,  b  ,  c  ')).toEqual([
        'a',
        'b',
        'c',
      ])
      expect(urlSearchParamAsArray('left , middle , right')).toEqual([
        'left',
        'middle',
        'right',
      ])
    })
  })

  describe('urlSearchParamAsBoolean', () => {
    it('should handle string true values', () => {
      expect(urlSearchParamAsBoolean('true')).toBe(true)
      expect(urlSearchParamAsBoolean('TRUE')).toBe(true)
      expect(urlSearchParamAsBoolean('True')).toBe(true)
      expect(urlSearchParamAsBoolean('1')).toBe(true)
    })

    it('should handle string false values', () => {
      expect(urlSearchParamAsBoolean('false')).toBe(false)
      expect(urlSearchParamAsBoolean('FALSE')).toBe(false)
      expect(urlSearchParamAsBoolean('0')).toBe(false)
      expect(urlSearchParamAsBoolean('no')).toBe(false)
      expect(urlSearchParamAsBoolean('')).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(urlSearchParamAsBoolean('  true  ')).toBe(true)
      expect(urlSearchParamAsBoolean('  false  ')).toBe(false)
      expect(urlSearchParamAsBoolean('  1  ')).toBe(true)
    })

    it('should handle null/undefined with default values', () => {
      expect(urlSearchParamAsBoolean(null)).toBe(false)
      expect(urlSearchParamAsBoolean(undefined)).toBe(false)
      expect(urlSearchParamAsBoolean(null, true)).toBe(true)
      expect(urlSearchParamAsBoolean(undefined, true)).toBe(true)
    })

    it('should handle non-string values', () => {
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsBoolean(true)).toBe(true)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsBoolean(false)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsBoolean(1)).toBe(true)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsBoolean(0)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsBoolean({})).toBe(true)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsBoolean([])).toBe(true)
    })
  })

  describe('urlSearchParamAsNumber', () => {
    it('should convert valid number strings', () => {
      const params = new URLSearchParams('num=42')
      expect(urlSearchParamAsNumber(params, 'num')).toBe(42)
    })

    it('should handle decimal numbers', () => {
      const params = new URLSearchParams('decimal=3.14')
      expect(urlSearchParamAsNumber(params, 'decimal')).toBe(3.14)
    })

    it('should handle negative numbers', () => {
      const params = new URLSearchParams('negative=-10')
      expect(urlSearchParamAsNumber(params, 'negative')).toBe(-10)
    })

    it('should return default for invalid numbers', () => {
      const params = new URLSearchParams('invalid=not-a-number')
      expect(urlSearchParamAsNumber(params, 'invalid')).toBe(0)
      expect(urlSearchParamAsNumber(params, 'invalid', 100)).toBe(100)
    })

    it('should return default for missing parameters', () => {
      const params = new URLSearchParams('')
      expect(urlSearchParamAsNumber(params, 'missing')).toBe(0)
      expect(urlSearchParamAsNumber(params, 'missing', 42)).toBe(42)
    })

    it('should handle null/invalid URLSearchParams', () => {
      expect(urlSearchParamAsNumber(null, 'key')).toBe(0)
      expect(urlSearchParamAsNumber(undefined, 'key')).toBe(0)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsNumber({}, 'key')).toBe(0)
    })

    it('should handle edge cases', () => {
      const params = new URLSearchParams()
      params.set('zero', '0')
      params.set('empty', '')
      params.set('space', ' ')

      expect(urlSearchParamAsNumber(params, 'zero')).toBe(0)
      expect(urlSearchParamAsNumber(params, 'empty')).toBe(0)
      expect(urlSearchParamAsNumber(params, 'space')).toBe(0)
    })
  })

  describe('urlSearchParamAsString', () => {
    it('should get string values from URLSearchParams', () => {
      const params = new URLSearchParams('name=value')
      expect(urlSearchParamAsString(params, 'name')).toBe('value')
    })

    it('should return default for missing parameters', () => {
      const params = new URLSearchParams('')
      expect(urlSearchParamAsString(params, 'missing')).toBe('')
      expect(urlSearchParamAsString(params, 'missing', 'default')).toBe(
        'default',
      )
    })

    it('should handle null/invalid URLSearchParams', () => {
      expect(urlSearchParamAsString(null, 'key')).toBe('')
      expect(urlSearchParamAsString(undefined, 'key')).toBe('')
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamAsString({}, 'key')).toBe('')
      expect(urlSearchParamAsString(null, 'key', 'default')).toBe('default')
    })

    it('should handle empty string values', () => {
      const params = new URLSearchParams('empty=')
      expect(urlSearchParamAsString(params, 'empty')).toBe('')
    })

    it('should handle special characters', () => {
      const params = new URLSearchParams()
      params.set('special', 'hello world!@#$%')
      expect(urlSearchParamAsString(params, 'special')).toBe('hello world!@#$%')
    })
  })

  describe('urlSearchParamsGetArray', () => {
    it('should get multiple values for same key', () => {
      const params = new URLSearchParams()
      params.append('tags', 'one')
      params.append('tags', 'two')
      params.append('tags', 'three')

      expect(urlSearchParamsGetArray(params, 'tags')).toEqual([
        'one',
        'two',
        'three',
      ])
    })

    it('should split comma-separated single value', () => {
      const params = new URLSearchParams('tags=one,two,three')
      expect(urlSearchParamsGetArray(params, 'tags')).toEqual([
        'one',
        'two',
        'three',
      ])
    })

    it('should handle missing parameters', () => {
      const params = new URLSearchParams('')
      expect(urlSearchParamsGetArray(params, 'missing')).toEqual([])
    })

    it('should handle null/invalid URLSearchParams', () => {
      expect(urlSearchParamsGetArray(null, 'key')).toEqual([])
      expect(urlSearchParamsGetArray(undefined, 'key')).toEqual([])
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamsGetArray({}, 'key')).toEqual([])
    })

    it('should handle single value without commas', () => {
      const params = new URLSearchParams('single=value')
      expect(urlSearchParamsGetArray(params, 'single')).toEqual(['value'])
    })

    it('should prefer multiple entries over comma splitting', () => {
      const params = new URLSearchParams()
      params.append('items', 'a,b')
      params.append('items', 'c,d')

      // Should return the two entries as-is, not split the commas
      expect(urlSearchParamsGetArray(params, 'items')).toEqual(['a,b', 'c,d'])
    })
  })

  describe('urlSearchParamsGetBoolean', () => {
    it('should get boolean values from URLSearchParams', () => {
      const params = new URLSearchParams('enabled=true&disabled=false')
      expect(urlSearchParamsGetBoolean(params, 'enabled')).toBe(true)
      expect(urlSearchParamsGetBoolean(params, 'disabled')).toBe(false)
    })

    it('should handle numeric boolean values', () => {
      const params = new URLSearchParams('on=1&off=0')
      expect(urlSearchParamsGetBoolean(params, 'on')).toBe(true)
      expect(urlSearchParamsGetBoolean(params, 'off')).toBe(false)
    })

    it('should return default for missing parameters', () => {
      const params = new URLSearchParams('')
      expect(urlSearchParamsGetBoolean(params, 'missing')).toBe(false)
      expect(urlSearchParamsGetBoolean(params, 'missing', true)).toBe(true)
    })

    it('should handle null/invalid URLSearchParams', () => {
      expect(urlSearchParamsGetBoolean(null, 'key')).toBe(false)
      expect(urlSearchParamsGetBoolean(undefined, 'key')).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(urlSearchParamsGetBoolean({}, 'key')).toBe(false)
      expect(urlSearchParamsGetBoolean(null, 'key', true)).toBe(true)
    })

    it('should handle case variations', () => {
      const params = new URLSearchParams('upper=TRUE&lower=false&mixed=True')
      expect(urlSearchParamsGetBoolean(params, 'upper')).toBe(true)
      expect(urlSearchParamsGetBoolean(params, 'lower')).toBe(false)
      expect(urlSearchParamsGetBoolean(params, 'mixed')).toBe(true)
    })
  })

  describe('createRelativeUrl', () => {
    it('should create relative URLs by removing leading slash', () => {
      expect(createRelativeUrl('/path/to/resource')).toBe('path/to/resource')
      expect(createRelativeUrl('/api/users')).toBe('api/users')
    })

    it('should handle paths without leading slash', () => {
      expect(createRelativeUrl('path/to/resource')).toBe('path/to/resource')
      expect(createRelativeUrl('relative')).toBe('relative')
    })

    it('should handle base URLs', () => {
      expect(createRelativeUrl('/path', 'https://example.com')).toBe(
        'https://example.com/path',
      )
      expect(createRelativeUrl('/api', 'https://api.example.com/')).toBe(
        'https://api.example.com/api',
      )
    })

    it('should add trailing slash to base if needed', () => {
      expect(createRelativeUrl('/path', 'https://example.com')).toBe(
        'https://example.com/path',
      )
      expect(createRelativeUrl('path', 'https://example.com')).toBe(
        'https://example.com/path',
      )
    })

    it('should handle empty paths', () => {
      expect(createRelativeUrl('')).toBe('')
      expect(createRelativeUrl('/', '')).toBe('')
      expect(createRelativeUrl('', 'https://example.com')).toBe(
        'https://example.com/',
      )
    })

    it('should handle root path', () => {
      expect(createRelativeUrl('/')).toBe('')
      expect(createRelativeUrl('/', 'https://example.com')).toBe(
        'https://example.com/',
      )
    })

    it('should handle complex paths', () => {
      expect(createRelativeUrl('/path/to/resource?query=value')).toBe(
        'path/to/resource?query=value',
      )
      expect(createRelativeUrl('/path#fragment')).toBe('path#fragment')
    })
  })
})
