/**
 * @fileoverview Tests for regexp.prototype.flags NPM package override.
 * Ported 1:1 from upstream v1.5.4 (8e2eeaab):
 * https://github.com/es-shims/RegExp.prototype.flags/blob/8e2eeaabb66e005d34c9508ab6d83456ff1d4010/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: flags,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasOwn = (obj: any, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key)

const getRegexLiteral = (stringRegex: string) => {
  try {
    // eslint-disable-next-line no-new-func
    return Function('return ' + stringRegex + ';')()
  } catch (_e) {
    return undefined
  }
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws when called with a non-object receiver', () => {
    const primitives = [
      undefined,
      undefined,
      false,
      true,
      0,
      -0,
      NaN,
      42,
      Infinity,
      -Infinity,
      '',
      'foo',
    ]
    for (let i = 0, { length } = primitives; i < length; i += 1) {
      const nonObject = primitives[i]
      expect(() => flags(nonObject)).toThrow(TypeError)
    }
  })

  it('basic flag extraction', () => {
    expect(flags(/a/g)).toBe('g')
    expect(flags(/a/gim)).toBe('gim')
    expect(flags(new RegExp('a', 'gmi'))).toBe('gim')
    expect(flags(/a/)).toBe('')
    expect(flags(new RegExp('a'))).toBe('')
  })

  it('sorting', () => {
    expect(flags(/a/gim)).toBe('gim')
    expect(flags(/a/gim)).toBe('gim')
    expect(flags(/a/gim)).toBe('gim')
    if (hasOwn(RegExp.prototype, 'sticky')) {
      expect(flags(getRegexLiteral('/a/gyim'))).toBe('gimy')
    }
    if (hasOwn(RegExp.prototype, 'unicode')) {
      expect(flags(getRegexLiteral('/a/ugmi'))).toBe('gimu')
    }
    if (hasOwn(RegExp.prototype, 'dotAll')) {
      expect(flags(getRegexLiteral('/a/sgmi'))).toBe('gims')
    }
  })

  it('generic flags', () => {
    expect(flags({})).toBe('')
    expect(flags({ ignoreCase: true })).toBe('i')
    expect(flags({ dotAll: 1, global: 0, sticky: 1, unicode: 1 })).toBe('suy')
    expect(flags({ __proto__: { multiline: true } })).toBe('m')
  })

  it('getters are called in expected order', () => {
    let calls = ''
    const re: Record<string, any> = {}
    Object.defineProperty(re, 'hasIndices', {
      get() {
        calls += 'd'
      },
    })
    Object.defineProperty(re, 'global', {
      get() {
        calls += 'g'
      },
    })
    Object.defineProperty(re, 'ignoreCase', {
      get() {
        calls += 'i'
      },
    })
    Object.defineProperty(re, 'multiline', {
      get() {
        calls += 'm'
      },
    })
    Object.defineProperty(re, 'dotAll', {
      get() {
        calls += 's'
      },
    })
    Object.defineProperty(re, 'unicode', {
      get() {
        calls += 'u'
      },
    })
    Object.defineProperty(re, 'sticky', {
      get() {
        calls += 'y'
      },
    })

    flags(re)
    expect(calls).toBe('dgimsuy')
  })
})
