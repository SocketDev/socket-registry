/**
 * @fileoverview Tests for object.getownpropertydescriptors NPM package override.
 * Ported 1:1 from upstream v2.1.9 (d4bfaba1):
 * https://github.com/es-shims/object.getownpropertydescriptors/blob/d4bfaba101663919e4066f0502f3083138ad1cc6/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: getDescriptors,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const enumDescriptor = {
    configurable: true,
    enumerable: false,
    value: true,
    writable: false,
  }
  const writableDescriptor = {
    configurable: true,
    enumerable: true,
    value: 42,
    writable: true,
  }

  it('gets all expected non-Symbol descriptors', () => {
    const obj: Record<string, any> = { normal: Infinity }
    Object.defineProperty(obj, 'enumerable', enumDescriptor)
    Object.defineProperty(obj, 'writable', writableDescriptor)

    const descriptors = getDescriptors(obj)

    expect(descriptors).toEqual({
      enumerable: enumDescriptor,
      normal: {
        configurable: true,
        enumerable: true,
        value: Infinity,
        writable: true,
      },
      writable: writableDescriptor,
    })
  })

  it('gets Symbol descriptors too', () => {
    const symbol = Symbol('sym')
    const symDescriptor = {
      configurable: false,
      enumerable: true,
      value: [symbol],
      writable: true,
    }
    const obj: Record<string | symbol, any> = { normal: Infinity }
    Object.defineProperty(obj, 'enumerable', enumDescriptor)
    Object.defineProperty(obj, 'writable', writableDescriptor)
    Object.defineProperty(obj, 'symbol', symDescriptor)

    const descriptors = getDescriptors(obj)

    expect(descriptors).toEqual({
      enumerable: enumDescriptor,
      normal: {
        configurable: true,
        enumerable: true,
        value: Infinity,
        writable: true,
      },
      symbol: symDescriptor,
      writable: writableDescriptor,
    })
  })

  it('Proxies that return an undefined descriptor', () => {
    const obj: Record<string, any> = { foo: true }
    const fooDescriptor = Object.getOwnPropertyDescriptor(obj, 'foo')

    const proxy = new Proxy(obj, {
      getOwnPropertyDescriptor(target, key) {
        return Object.getOwnPropertyDescriptor(target, key)
      },
      ownKeys() {
        return ['foo', 'bar']
      },
    })
    expect(getDescriptors(proxy)).toEqual({ foo: fooDescriptor })
  })
})
