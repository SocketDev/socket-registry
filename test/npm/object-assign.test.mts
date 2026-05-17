/**
 * @fileoverview Tests for object-assign NPM package override.
 * Ported 1:1 from upstream v4.1.1 (a29ce505):
 * https://github.com/sindresorhus/object-assign/blob/a29ce5053398661d882e368e60da6553d3d82434/test.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: objectAssign,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('has the correct length', () => {
    expect(objectAssign.length).toBe(2)
  })

  it('throws when target is not an object', () => {
    expect(() => objectAssign(undefined)).toThrow(TypeError)
    expect(() => objectAssign(undefined)).toThrow(TypeError)
  })

  it('assigns own enumerable properties from source to target object', () => {
    expect(objectAssign({ foo: 0 }, { bar: 1 })).toEqual({ foo: 0, bar: 1 })
    expect(objectAssign({ foo: 0 }, undefined, undefined)).toEqual({ foo: 0 })
    expect(
      objectAssign({ foo: 0 }, undefined, undefined, { bar: 1 }, undefined),
    ).toEqual({ foo: 0, bar: 1 })
  })

  it('throws on null/undefined target', () => {
    expect(() => objectAssign(undefined, {})).toThrow()
    expect(() => objectAssign(undefined, {})).toThrow()
    expect(() => objectAssign(undefined, undefined)).toThrow()
  })

  it('does not throw on null/undefined sources', () => {
    expect(() => objectAssign({}, undefined)).not.toThrow()
    expect(() => objectAssign({}, undefined)).not.toThrow()
    expect(() => objectAssign({}, undefined, undefined)).not.toThrow()
  })

  it('supports multiple sources', () => {
    expect(objectAssign({ foo: 0 }, { bar: 1 }, { bar: 2 })).toEqual({
      foo: 0,
      bar: 2,
    })
    expect(objectAssign({}, {}, { foo: 1 })).toEqual({ foo: 1 })
  })

  it('only iterates own keys', () => {
    const Unicorn = function (this: any) {} as any
    Unicorn.prototype.rainbows = 'many'
    const unicorn = new Unicorn()
    unicorn.bar = 1

    expect(objectAssign({ foo: 1 }, unicorn)).toEqual({ foo: 1, bar: 1 })
  })

  it('returns the modified target object', () => {
    const target = {}
    const returned = objectAssign(target, { a: 1 })
    expect(returned).toBe(target)
  })

  it('supports Object.create(null) objects', () => {
    // oxlint-disable-next-line socket/prefer-undefined-over-null -- Object.create only accepts object | null
    const obj = Object.create(null)
    obj.foo = true
    expect(objectAssign({}, obj)).toEqual({ foo: true })
  })

  it('preserves property order', () => {
    const letters = 'abcdefghijklmnopqrst'
    const source: Record<string, string> = {}
    const splitLetters = letters.split('')
    for (let i = 0, { length } = splitLetters; i < length; i += 1) {
      const letter = splitLetters[i]!
      source[letter] = letter
    }
    const target = objectAssign({}, source)
    expect(Object.keys(target).join('')).toBe(letters)
  })

  it('accepts primitives as target', () => {
    const target = objectAssign('abcdefg', { foo: 'bar' })
    const strObj = Object('abcdefg')
    strObj.foo = 'bar'
    expect(target).toEqual(strObj)
  })

  it('supports symbol properties', () => {
    const target = {}
    const source: Record<symbol, string> = {}
    const sym = Symbol('foo')
    source[sym] = 'bar'
    objectAssign(target, source)
    expect((target as any)[sym]).toBe('bar')
  })

  it('only copies enumerable symbols', () => {
    const target = {}
    const source = {}
    const sym = Symbol('foo')
    Object.defineProperty(source, sym, {
      enumerable: false,
      value: 'bar',
    })
    objectAssign(target, source)
    expect((target as any)[sym]).toBe(undefined)
  })
})
