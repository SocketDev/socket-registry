/**
 * @fileoverview Tests for querystringify NPM package override.
 * Ported 1:1 from upstream v2.2.0 (73db95a5):
 * https://github.com/unshiftio/querystringify/blob/73db95a504f988dce3f790e174e298ceb2b46a8e/test.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: qs,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('#stringify', () => {
    const obj = { foo: 'bar', bar: 'foo' }

    it('is exposed as method', () => {
      expect(typeof qs.stringify).toBe('function')
    })

    it('transforms an object', () => {
      expect(qs.stringify(obj)).toBe('foo=bar&bar=foo')
    })

    it('can optionally prefix', () => {
      expect(qs.stringify(obj, true)).toBe('?foo=bar&bar=foo')
    })

    it('can prefix with custom things', () => {
      expect(qs.stringify(obj, '&')).toBe('&foo=bar&bar=foo')
    })

    it('doesnt prefix empty query strings', () => {
      expect(qs.stringify({}, true)).toBe('')
      expect(qs.stringify({})).toBe('')
    })

    it('works with object keys with empty string values', () => {
      expect(qs.stringify({ foo: '' })).toBe('foo=')
    })

    it('works with nulled objects', () => {
      const o = Object.create(null)
      o.foo = 'bar'
      expect(qs.stringify(o)).toBe('foo=bar')
    })

    it('transforms undefined into nothing', () => {
      expect(qs.stringify({ foo: undefined })).toBe('foo=')
    })

    it('transforms NaN into nothing', () => {
      expect(qs.stringify({ foo: NaN })).toBe('foo=')
    })

    it('transforms null into nothing', () => {
      expect(qs.stringify({ foo: null })).toBe('foo=')
    })
  })

  describe('#parse', () => {
    it('is exposed as method', () => {
      expect(typeof qs.parse).toBe('function')
    })

    it('will parse a querystring to an object', () => {
      const obj = qs.parse('foo=bar')
      expect(typeof obj).toBe('object')
      expect(obj.foo).toBe('bar')
    })

    it('will also work if querystring is prefixed with ?', () => {
      const obj = qs.parse('?foo=bar&shizzle=mynizzle')
      expect(typeof obj).toBe('object')
      expect(obj.foo).toBe('bar')
      expect(obj.shizzle).toBe('mynizzle')
    })

    it('will also work if querystring is prefixed with #', () => {
      const obj = qs.parse('#foo=bar&shizzle=mynizzle')
      expect(typeof obj).toBe('object')
      expect(obj.foo).toBe('bar')
      expect(obj.shizzle).toBe('mynizzle')
    })

    it('does not override prototypes', () => {
      const obj = qs.parse('?toString&__proto__=lol')
      expect(typeof obj).toBe('object')
      expect(typeof obj.toString).toBe('function')
      // eslint-disable-next-line no-proto -- testing prototype pollution protection.
      expect(obj.__proto__).not.toBe('lol')
    })

    it('works with querystring parameters without values', () => {
      const obj = qs.parse('?foo&bar=&shizzle=mynizzle')
      expect(typeof obj).toBe('object')
      expect(obj.foo).toBe('')
      expect(obj.bar).toBe('')
      expect(obj.shizzle).toBe('mynizzle')
    })

    it('first value wins', () => {
      const obj = qs.parse('foo=1&foo=2')
      expect(obj.foo).toBe('1')
    })

    it('decodes plus signs', () => {
      let obj = qs.parse('foo+bar=baz+qux')
      expect(typeof obj).toBe('object')
      expect(obj['foo bar']).toBe('baz qux')

      obj = qs.parse('foo+bar=baz%2Bqux')
      expect(typeof obj).toBe('object')
      expect(obj['foo bar']).toBe('baz+qux')
    })

    it('does not throw on invalid input', () => {
      expect(() => qs.parse('?%&')).not.toThrow()
    })

    it('does not include invalid output', () => {
      const obj = qs.parse('?%&')
      expect(typeof obj).toBe('object')
      expect(Object.keys(obj).length).toBe(0)
    })
  })
})
