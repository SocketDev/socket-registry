import { describe, expect, it } from 'vitest'

// Helper functions moved to outer scope.
const jsonReviver = (_key: string, value: any) =>
  typeof value === 'number' ? value * 2 : value

// Test multiple utility modules that are simple to test
describe('utility modules tests', () => {
  describe('arrays utilities', () => {
    const arrays = require('@socketsecurity/registry/lib/arrays')

    it('should provide arrayUnique function', () => {
      expect(arrays.arrayUnique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(arrays.arrayUnique(['a', 'b', 'a'])).toEqual(['a', 'b'])
    })

    it('should provide arrayChunk function', () => {
      expect(arrays.arrayChunk([1, 2, 3, 4, 5], 2)).toEqual([
        [1, 2],
        [3, 4],
        [5],
      ])
      expect(arrays.arrayChunk([], 3)).toEqual([])
    })

    it('should provide joinAnd function', () => {
      expect(arrays.joinAnd(['a', 'b', 'c'])).toBe('a, b, and c')
      expect(arrays.joinAnd(['a', 'b'])).toBe('a and b')
      expect(arrays.joinAnd(['a'])).toBe('a')
      expect(arrays.joinAnd([])).toBe('')
    })

    it('should provide joinOr function', () => {
      expect(arrays.joinOr(['a', 'b', 'c'])).toBe('a, b, or c')
      expect(arrays.joinOr(['a', 'b'])).toBe('a or b')
      expect(arrays.joinOr(['a'])).toBe('a')
    })
  })

  describe('json utilities', () => {
    const json = require('@socketsecurity/registry/lib/json')

    it('should parse JSON safely', () => {
      expect(json.jsonParse('{"a": 1}')).toEqual({ a: 1 })
      expect(json.jsonParse('[1, 2, 3]')).toEqual([1, 2, 3])
      expect(json.jsonParse('"string"')).toBe('string')
      expect(json.jsonParse('null')).toBe(null)
    })

    it('should handle parse errors', () => {
      expect(json.jsonParse('invalid', { throws: false })).toBe(null)
      expect(() => json.jsonParse('invalid')).toThrow()
    })

    it('should parse with reviver', () => {
      expect(json.jsonParse('{"a": 1}', { reviver: jsonReviver })).toEqual({
        a: 2,
      })
    })
  })

  describe('functions utilities', () => {
    const functions = require('@socketsecurity/registry/lib/functions')

    it('should provide noop function', () => {
      expect(typeof functions.noop).toBe('function')
      expect(functions.noop()).toBe(undefined)
      expect(functions.noop(1, 2, 3)).toBe(undefined)
    })

    it('should provide once function', () => {
      let count = 0
      const fn = () => ++count
      const onceFn = functions.once(fn)

      expect(onceFn()).toBe(1)
      expect(onceFn()).toBe(1)
      expect(onceFn()).toBe(1)
      expect(count).toBe(1)
    })

    it('should provide trampoline function', () => {
      const factorial = (n: number, acc = 1): any => {
        if (n <= 1) {
          return acc
        }
        return () => factorial(n - 1, n * acc)
      }

      const trampolinedFactorial = functions.trampoline(factorial)
      expect(trampolinedFactorial(5)).toBe(120)
    })
  })

  describe('objects utilities', () => {
    const objects = require('@socketsecurity/registry/lib/objects')

    it('should check if value is object', () => {
      expect(objects.isObject({})).toBe(true)
      expect(objects.isObject([])).toBe(true)
      expect(objects.isObject(null)).toBe(false)
      expect(objects.isObject('string')).toBe(false)
    })

    it('should check if value is plain object', () => {
      expect(objects.isObjectObject({})).toBe(true)
      expect(objects.isObjectObject([])).toBe(false)
      expect(objects.isObjectObject(null)).toBe(false)
      expect(objects.isObjectObject(new Date())).toBe(false)
    })

    it('should get object keys', () => {
      expect(objects.getKeys({ a: 1, b: 2 })).toEqual(['a', 'b'])
      expect(objects.getKeys({})).toEqual([])
    })

    it('should check hasOwn', () => {
      const obj = { a: 1 }
      expect(objects.hasOwn(obj, 'a')).toBe(true)
      expect(objects.hasOwn(obj, 'b')).toBe(false)
      expect(objects.hasOwn(obj, 'toString')).toBe(false)
    })

    it('should merge objects', () => {
      const target = { a: 1, b: { c: 2 } }
      const source = { b: { d: 3 }, e: 4 }
      const result = objects.merge(target, source)

      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 })
      expect(result).toBe(target)
    })

    it('should convert to sorted object', () => {
      const obj = { z: 1, a: 2, m: 3 }
      const sorted = objects.toSortedObject(obj)
      expect(Object.keys(sorted)).toEqual(['a', 'm', 'z'])
    })
  })

  describe('strings utilities', () => {
    const strings = require('@socketsecurity/registry/lib/strings')

    it('should check non-empty strings', () => {
      expect(strings.isNonEmptyString('hello')).toBe(true)
      expect(strings.isNonEmptyString('')).toBe(false)
      expect(strings.isNonEmptyString('  ')).toBe(true)
      expect(strings.isNonEmptyString(null)).toBe(false)
    })

    it('should check blank strings', () => {
      expect(strings.isBlankString('  ')).toBe(true)
      expect(strings.isBlankString('\t\n')).toBe(true)
      expect(strings.isBlankString('hello')).toBe(false)
      expect(strings.isBlankString('')).toBe(true)
    })

    it('should strip ANSI codes', () => {
      expect(strings.stripAnsi('\u001b[31mRed\u001b[0m')).toBe('Red')
      expect(strings.stripAnsi('Plain text')).toBe('Plain text')
    })

    it('should strip BOM', () => {
      expect(strings.stripBom('\uFEFFHello')).toBe('Hello')
      expect(strings.stripBom('Hello')).toBe('Hello')
    })

    it('should convert camelCase to kebab-case', () => {
      expect(strings.camelToKebab('camelCase')).toBe('camel-case')
      expect(strings.camelToKebab('PascalCase')).toBe('pascal-case')
      expect(strings.camelToKebab('already-kebab')).toBe('already-kebab')
    })

    it('should trim newlines', () => {
      expect(strings.trimNewlines('\n\nhello\n\n')).toBe('hello')
      expect(strings.trimNewlines('hello\nworld')).toBe('hello\nworld')
    })
  })

  describe('regexps utilities', () => {
    const regexps = require('@socketsecurity/registry/lib/regexps')

    it('should escape regex special characters', () => {
      expect(regexps.escapeRegExp('hello.world')).toBe('hello\\.world')
      expect(regexps.escapeRegExp('a+b*c?')).toBe('a\\+b\\*c\\?')
      expect(regexps.escapeRegExp('[abc]')).toBe('\\[abc\\]')
      expect(regexps.escapeRegExp('$100')).toBe('\\$100')
    })

    it('should handle plain strings', () => {
      expect(regexps.escapeRegExp('hello')).toBe('hello')
      expect(regexps.escapeRegExp('')).toBe('')
    })
  })

  describe('sorts utilities', () => {
    const sorts = require('@socketsecurity/registry/lib/sorts')

    it('should provide compareStr', () => {
      expect(sorts.compareStr('a', 'b')).toBeLessThan(0)
      expect(sorts.compareStr('b', 'a')).toBeGreaterThan(0)
      expect(sorts.compareStr('a', 'a')).toBe(0)
    })

    it('should provide compareSemver', () => {
      expect(sorts.compareSemver('1.0.0', '2.0.0')).toBeLessThan(0)
      expect(sorts.compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0)
      expect(sorts.compareSemver('1.0.0', '1.0.0')).toBe(0)
    })

    it('should handle invalid semver', () => {
      expect(sorts.compareSemver('invalid', '1.0.0')).toBeLessThan(0)
      expect(sorts.compareSemver('1.0.0', 'invalid')).toBeGreaterThan(0)
    })
  })

  describe('path utilities', () => {
    const pathUtils = require('@socketsecurity/registry/lib/path')

    it('should normalize paths', () => {
      expect(pathUtils.normalizePath('/foo//bar')).toBe('/foo/bar')
      expect(pathUtils.normalizePath('foo\\bar')).toBe('foo/bar')
      expect(pathUtils.normalizePath('./foo/../bar')).toBe('bar')
    })

    it('should check if path is node_modules', () => {
      expect(pathUtils.isNodeModules('/path/node_modules/pkg')).toBe(true)
      expect(pathUtils.isNodeModules('node_modules/pkg')).toBe(true)
      expect(pathUtils.isNodeModules('/path/src/file.js')).toBe(false)
    })

    it('should get relative path', () => {
      expect(pathUtils.relativeResolve('/a/b', '/a/b/c')).toBe('c')
      expect(pathUtils.relativeResolve('/a/b', '/a/d')).toBe('../d')
    })
  })
})
