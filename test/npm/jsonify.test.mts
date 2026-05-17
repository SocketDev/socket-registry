/**
 * @fileoverview Tests for jsonify NPM package override.
 * Ported 1:1 from upstream v0.0.1 (7629309d):
 * https://github.com/ljharb/jsonify/blob/7629309dc2f145cdd7680ea174979330f1e39855/test/stringify.js
 * https://github.com/ljharb/jsonify/blob/7629309dc2f145cdd7680ea174979330f1e39855/test/parse.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: json,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('parse', () => {
    it('parses values the same as JSON.parse', () => {
      const testValues = [
        '42',
        '"hello"',
        'true',
        'false',
        'null',
        '[1,2,3]',
        '{"a":1,"b":2}',
        '{"nested":{"key":"value"}}',
        '[1,"two",true,null]',
      ]
      for (let i = 0, { length } = testValues; i < length; i += 1) {
        const s = testValues[i]!
        expect(json.parse(s)).toEqual(JSON.parse(s))
      }
    })
  })

  describe('stringify', () => {
    it('stringifies values the same as JSON.stringify', () => {
      const testValues = [
        42,
        'hello',
        true,
        false,
        undefined,
        [1, 2, 3],
        { a: 1, b: 2 },
        { nested: { key: 'value' } },
        [1, 'two', true, undefined],
      ]
      for (let i = 0, { length } = testValues; i < length; i += 1) {
        const obj = testValues[i]
        expect(json.stringify(obj)).toBe(JSON.stringify(obj))
      }
    })
  })
})
