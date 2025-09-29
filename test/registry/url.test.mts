import { describe, expect, it } from 'vitest'

const {
  createRelativeUrl,
  isUrl,
  parseUrl,
  urlSearchParamAsArray,
  urlSearchParamAsBoolean,
  urlSearchParamsGetArray,
  urlSearchParamsGetBoolean,
} = require('../../registry/dist/lib/url')

describe('url module', () => {
  describe('isUrl', () => {
    it('should identify valid URLs', () => {
      expect(isUrl('https://example.com')).toBe(true)
      expect(isUrl('http://localhost:3000')).toBe(true)
      expect(isUrl('ftp://ftp.example.com')).toBe(true)
      expect(isUrl('file:///path/to/file')).toBe(true)
      expect(isUrl('https://example.com/path?query=value')).toBe(true)
      expect(isUrl(new URL('https://example.com'))).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(isUrl('not a url')).toBe(false)
      expect(isUrl('/path/to/file')).toBe(false)
      expect(isUrl('example.com')).toBe(false)
      expect(isUrl('')).toBe(false)
      expect(isUrl(null)).toBe(false)
      expect(isUrl(undefined)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isUrl('http://')).toBe(false)
      expect(isUrl('https://')).toBe(false)
      expect(isUrl('://example.com')).toBe(false)
    })
  })

  describe('parseUrl', () => {
    it('should parse valid URLs', () => {
      const url = parseUrl('https://example.com/path?query=value#hash')
      expect(url).not.toBe(null)
      expect(url?.protocol).toBe('https:')
      expect(url?.hostname).toBe('example.com')
      expect(url?.pathname).toBe('/path')
      expect(url?.search).toBe('?query=value')
      expect(url?.hash).toBe('#hash')
    })

    it('should parse URLs with port', () => {
      const url = parseUrl('http://localhost:3000/api')
      expect(url?.hostname).toBe('localhost')
      expect(url?.port).toBe('3000')
      expect(url?.pathname).toBe('/api')
    })

    it('should return null for invalid URLs', () => {
      expect(parseUrl('not a url')).toBe(undefined)
      expect(parseUrl('')).toBe(undefined)
      expect(parseUrl('//invalid')).toBe(undefined)
    })

    it('should handle URL objects', () => {
      const urlObj = new URL('https://example.com')
      const parsed = parseUrl(urlObj)
      expect(parsed?.hostname).toBe('example.com')
    })
  })

  describe('urlSearchParamAsArray', () => {
    it('should parse comma-separated string to array', () => {
      expect(urlSearchParamAsArray('a,b,c')).toEqual(['a', 'b', 'c'])
      expect(urlSearchParamAsArray('one, two, three')).toEqual([
        'one',
        'two',
        'three',
      ])
    })

    it('should return single value as array', () => {
      expect(urlSearchParamAsArray('value')).toEqual(['value'])
      expect(urlSearchParamAsArray('single')).toEqual(['single'])
    })

    it('should return empty array for non-string', () => {
      expect(urlSearchParamAsArray(null)).toEqual([])
      expect(urlSearchParamAsArray(undefined)).toEqual([])
      expect(urlSearchParamAsArray(123)).toEqual([])
      expect(urlSearchParamAsArray({})).toEqual([])
    })

    it('should filter empty values after split', () => {
      expect(urlSearchParamAsArray('a,,b,,,c')).toEqual(['a', 'b', 'c'])
      expect(urlSearchParamAsArray('')).toEqual([])
      // trimmed to empty
      expect(urlSearchParamAsArray('   ')).toEqual([])
    })

    it('should handle values with spaces', () => {
      expect(urlSearchParamAsArray(' a , b , c ')).toEqual(['a', 'b', 'c'])
      expect(urlSearchParamAsArray('  item  ')).toEqual(['item'])
    })
  })

  describe('urlSearchParamAsBoolean', () => {
    it('should parse boolean string values correctly', () => {
      expect(urlSearchParamAsBoolean('true')).toBe(true)
      expect(urlSearchParamAsBoolean('TRUE')).toBe(true)
      expect(urlSearchParamAsBoolean('True')).toBe(true)
      expect(urlSearchParamAsBoolean('1')).toBe(true)

      expect(urlSearchParamAsBoolean('false')).toBe(false)
      expect(urlSearchParamAsBoolean('FALSE')).toBe(false)
      expect(urlSearchParamAsBoolean('0')).toBe(false)
    })

    it('should return false for other string values', () => {
      expect(urlSearchParamAsBoolean('yes')).toBe(false)
      expect(urlSearchParamAsBoolean('no')).toBe(false)
      expect(urlSearchParamAsBoolean('on')).toBe(false)
      expect(urlSearchParamAsBoolean('off')).toBe(false)
      expect(urlSearchParamAsBoolean('2')).toBe(false)
      expect(urlSearchParamAsBoolean('random')).toBe(false)
    })

    it('should handle empty and whitespace', () => {
      expect(urlSearchParamAsBoolean('')).toBe(false)
      expect(urlSearchParamAsBoolean('   ')).toBe(false)
      // trimmed to '1'
      expect(urlSearchParamAsBoolean(' 1 ')).toBe(true)
      // trimmed to 'true'
      expect(urlSearchParamAsBoolean(' true ')).toBe(true)
    })

    it('should handle null/undefined with default', () => {
      expect(urlSearchParamAsBoolean(null)).toBe(false)
      expect(urlSearchParamAsBoolean(undefined)).toBe(false)
      expect(urlSearchParamAsBoolean(null, true)).toBe(true)
      expect(urlSearchParamAsBoolean(undefined, true)).toBe(true)
      expect(urlSearchParamAsBoolean(null, false)).toBe(false)
    })

    it('should handle non-string truthy values', () => {
      expect(urlSearchParamAsBoolean(123)).toBe(true)
      expect(urlSearchParamAsBoolean({})).toBe(true)
      expect(urlSearchParamAsBoolean([])).toBe(true)
      expect(urlSearchParamAsBoolean(true)).toBe(true)
    })

    it('should handle non-string falsy values', () => {
      expect(urlSearchParamAsBoolean(0)).toBe(false)
      expect(urlSearchParamAsBoolean(false)).toBe(false)
      expect(urlSearchParamAsBoolean(NaN)).toBe(false)
    })
  })

  describe('urlSearchParamsGetArray', () => {
    it('should extract array from URLSearchParams with multiple values', () => {
      const url = new URL('https://example.com?items=1&items=2&items=3')
      const result = urlSearchParamsGetArray(url.searchParams, 'items')
      expect(result).toEqual(['1', '2', '3'])
    })

    it('should handle comma-separated single value', () => {
      const url = new URL('https://example.com?tags=a,b,c')
      const result = urlSearchParamsGetArray(url.searchParams, 'tags')
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should return single value as array', () => {
      const url = new URL('https://example.com?item=value')
      const result = urlSearchParamsGetArray(url.searchParams, 'item')
      expect(result).toEqual(['value'])
    })

    it('should return empty array for missing param', () => {
      const url = new URL('https://example.com')
      const result = urlSearchParamsGetArray(url.searchParams, 'missing')
      expect(result).toEqual([])
    })

    it('should handle null/undefined params', () => {
      expect(urlSearchParamsGetArray(null, 'key')).toEqual([])
      expect(urlSearchParamsGetArray(undefined, 'key')).toEqual([])
    })
  })

  describe('urlSearchParamsGetBoolean', () => {
    it('should extract boolean from URLSearchParams', () => {
      const trueUrl = new URL('https://example.com?flag=true')
      expect(urlSearchParamsGetBoolean(trueUrl.searchParams, 'flag')).toBe(true)

      const oneUrl = new URL('https://example.com?flag=1')
      expect(urlSearchParamsGetBoolean(oneUrl.searchParams, 'flag')).toBe(true)

      const falseUrl = new URL('https://example.com?flag=false')
      expect(urlSearchParamsGetBoolean(falseUrl.searchParams, 'flag')).toBe(
        false,
      )

      const zeroUrl = new URL('https://example.com?flag=0')
      expect(urlSearchParamsGetBoolean(zeroUrl.searchParams, 'flag')).toBe(
        false,
      )
    })

    it('should handle missing param with default', () => {
      const url = new URL('https://example.com')
      expect(urlSearchParamsGetBoolean(url.searchParams, 'missing')).toBe(false)
      expect(urlSearchParamsGetBoolean(url.searchParams, 'missing', true)).toBe(
        true,
      )
      expect(
        urlSearchParamsGetBoolean(url.searchParams, 'missing', false),
      ).toBe(false)
    })

    it('should handle empty value', () => {
      const emptyUrl = new URL('https://example.com?flag=')
      expect(urlSearchParamsGetBoolean(emptyUrl.searchParams, 'flag')).toBe(
        false,
      )

      const noValueUrl = new URL('https://example.com?flag')
      expect(urlSearchParamsGetBoolean(noValueUrl.searchParams, 'flag')).toBe(
        false,
      )
    })

    it('should handle null/undefined params', () => {
      expect(urlSearchParamsGetBoolean(null, 'key')).toBe(false)
      expect(urlSearchParamsGetBoolean(undefined, 'key')).toBe(false)
      expect(urlSearchParamsGetBoolean(null, 'key', true)).toBe(true)
    })
  })

  describe('createRelativeUrl', () => {
    it('should create relative URLs', () => {
      expect(createRelativeUrl('path/to/resource')).toBe('path/to/resource')
      expect(createRelativeUrl('/path/to/resource')).toBe('path/to/resource')
    })

    it('should handle base URLs', () => {
      expect(createRelativeUrl('resource', '/base')).toBe('/base/resource')
      expect(createRelativeUrl('/resource', '/base/')).toBe('/base/resource')
      expect(createRelativeUrl('path/resource', '/base')).toBe(
        '/base/path/resource',
      )
    })

    it('should handle empty inputs', () => {
      expect(createRelativeUrl('')).toBe('')
      expect(createRelativeUrl('', '/base')).toBe('/base/')
      expect(createRelativeUrl('resource', '')).toBe('resource')
    })

    it('should normalize slashes', () => {
      expect(createRelativeUrl('/path', '/base/')).toBe('/base/path')
      expect(createRelativeUrl('//path', '/base')).toBe('/base//path')
    })
  })
})
