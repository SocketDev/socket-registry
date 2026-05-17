/**
 * @fileoverview Tests for safe-buffer NPM package override.
 * Ported 1:1 from upstream v5.2.1 (c937d657):
 * https://github.com/feross/safe-buffer/blob/c937d657/test/basic.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: safeBufferModule,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const SafeBuffer = safeBufferModule?.Buffer

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('new SafeBuffer(value) works just like Buffer', () => {
    expect(new SafeBuffer('hey')).toEqual(Buffer.from('hey'))
    expect(new SafeBuffer('hey', 'utf8')).toEqual(Buffer.from('hey', 'utf8'))
    expect(new SafeBuffer('686579', 'hex')).toEqual(
      Buffer.from('686579', 'hex'),
    )
    expect(new SafeBuffer([1, 2, 3])).toEqual(Buffer.from([1, 2, 3]))
    expect(new SafeBuffer(new Uint8Array([1, 2, 3]))).toEqual(
      Buffer.from(new Uint8Array([1, 2, 3])),
    )

    expect(typeof SafeBuffer.isBuffer).toBe('function')
    expect(SafeBuffer.isBuffer(new SafeBuffer('hey'))).toBe(true)
    expect(Buffer.isBuffer(new SafeBuffer('hey'))).toBe(true)
    expect(SafeBuffer.isBuffer({})).toBe(false)
  })

  it('SafeBuffer.from(value) converts to a Buffer', () => {
    expect(SafeBuffer.from('hey')).toEqual(Buffer.from('hey'))
    expect(SafeBuffer.from('hey', 'utf8')).toEqual(Buffer.from('hey', 'utf8'))
    expect(SafeBuffer.from('686579', 'hex')).toEqual(
      Buffer.from('686579', 'hex'),
    )
    expect(SafeBuffer.from([1, 2, 3])).toEqual(Buffer.from([1, 2, 3]))
    expect(SafeBuffer.from(new Uint8Array([1, 2, 3]))).toEqual(
      Buffer.from(new Uint8Array([1, 2, 3])),
    )
  })

  it('SafeBuffer.alloc(number) returns zeroed-out memory', () => {
    for (let i = 0; i < 10; i++) {
      const buf1 = SafeBuffer.alloc(1000)
      expect(buf1.length).toBe(1000)
      expect(buf1.every((b: number) => b === 0)).toBe(true)
    }

    const buf2 = SafeBuffer.alloc(1000 * 1000)
    expect(buf2.length).toBe(1000 * 1000)
    expect(buf2.every((b: number) => b === 0)).toBe(true)
  })

  it('SafeBuffer.allocUnsafe(number)', () => {
    const buf = SafeBuffer.allocUnsafe(100)
    expect(buf.length).toBe(100)
    expect(SafeBuffer.isBuffer(buf)).toBe(true)
    expect(Buffer.isBuffer(buf)).toBe(true)
  })

  it('SafeBuffer.from() throws with number types', () => {
    expect(() => SafeBuffer.from(0)).toThrow()
    expect(() => SafeBuffer.from(-1)).toThrow()
    expect(() => SafeBuffer.from(NaN)).toThrow()
    expect(() => SafeBuffer.from(Infinity)).toThrow()
    expect(() => SafeBuffer.from(99)).toThrow()
  })

  it('SafeBuffer.allocUnsafe() throws with non-number types', () => {
    expect(() => SafeBuffer.allocUnsafe('hey')).toThrow()
    expect(() => SafeBuffer.allocUnsafe('hey', 'utf8')).toThrow()
    expect(() => SafeBuffer.allocUnsafe([1, 2, 3])).toThrow()
    expect(() => SafeBuffer.allocUnsafe({})).toThrow()
  })

  it('SafeBuffer.alloc() throws with non-number types', () => {
    expect(() => SafeBuffer.alloc('hey')).toThrow()
    expect(() => SafeBuffer.alloc('hey', 'utf8')).toThrow()
    expect(() => SafeBuffer.alloc([1, 2, 3])).toThrow()
    expect(() => SafeBuffer.alloc({})).toThrow()
  })
})
