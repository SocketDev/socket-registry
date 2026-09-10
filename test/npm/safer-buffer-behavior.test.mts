/**
 * @file Behavior tests for @socketregistry/safer-buffer npm package override —
 *   alloc/from return values, lengths, fills, and invalid-call throwing. The
 *   API-surface parity tests (method presence + inheritance) live in
 *   safer-buffer.test.mts; both bind to the `safer-buffer` override.
 */
/* eslint-disable n/no-deprecated-api */
import buffer from 'node:buffer'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { setupNpmPackageTest } from '../util/npm-package.mts'

const { eco, pkgPath, skip, sockRegPkgName } = setupNpmPackageTest(
  import.meta.url,
  { package: 'safer-buffer' },
)

describe(`${eco} > ${sockRegPkgName} > behavior`, { skip }, () => {
  const safer = skip ? undefined : require(path.join(pkgPath, 'safer.js'))
  const dangerous = skip
    ? undefined
    : require(path.join(pkgPath, 'dangerous.js'))
  const implementations = [safer, dangerous]

  it('Methods return Buffers', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(0))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(0, 10))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(0, 'a'))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(10))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(10, 'x'))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.alloc(9, 'ab'))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.from(''))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.from('string'))).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.from('string', 'utf-8'))).toBe(
        true,
      )
      expect(
        buffer.Buffer.isBuffer(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64')),
      ).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.from([0, 42, 3]))).toBe(true)
      expect(
        buffer.Buffer.isBuffer(impl.Buffer.from(new Uint8Array([0, 42, 3]))),
      ).toBe(true)
      expect(buffer.Buffer.isBuffer(impl.Buffer.from([]))).toBe(true)
    }
    for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
      expect(buffer.Buffer.isBuffer(dangerous.Buffer[method](0))).toBe(true)
      expect(buffer.Buffer.isBuffer(dangerous.Buffer[method](10))).toBe(true)
    }
  })

  it('Constructor is buffer.Buffer', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(impl.Buffer.alloc(0).constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.alloc(0, 10).constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.alloc(0, 'a').constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.alloc(10).constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.alloc(10, 'x').constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.alloc(9, 'ab').constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.from('').constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.from('string').constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.from('string', 'utf-8').constructor).toBe(
        buffer.Buffer,
      )
      expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64').constructor).toBe(
        buffer.Buffer,
      )
      expect(impl.Buffer.from([0, 42, 3]).constructor).toBe(buffer.Buffer)
      expect(impl.Buffer.from(new Uint8Array([0, 42, 3])).constructor).toBe(
        buffer.Buffer,
      )
      expect(impl.Buffer.from([]).constructor).toBe(buffer.Buffer)
    }
    for (const arg of [0, 10, 100]) {
      expect(dangerous.Buffer.allocUnsafe(arg).constructor).toBe(buffer.Buffer)
      expect(dangerous.Buffer.allocUnsafeSlow(arg).constructor).toBe(
        buffer.Buffer,
      )
    }
  })

  it('Invalid calls throw', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(() => {
        impl.Buffer.from(0)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(10)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(10, 'utf-8')
      }).toThrow()
      expect(() => {
        impl.Buffer.from('string', 'invalid encoding')
      }).toThrow()
      expect(() => {
        impl.Buffer.from(-10)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(1e90)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(Number.POSITIVE_INFINITY)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(Number.NEGATIVE_INFINITY)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(Number.NaN)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(null)
      }).toThrow()
      expect(() => {
        impl.Buffer.from(undefined)
      }).toThrow()
      expect(() => {
        impl.Buffer.from()
      }).toThrow()
      expect(() => {
        impl.Buffer.from({})
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc('')
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc('string')
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc('string', 'utf-8')
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc('b25ldHdvdGhyZWU=', 'base64')
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc(-10)
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc(1e90)
      }).toThrow()
      expect(impl.Buffer.alloc).toBe(buffer.Buffer.alloc)
      expect(() => impl.Buffer.alloc(buffer.constants.MAX_LENGTH + 1)).toThrow(
        RangeError,
      )
      expect(() => {
        impl.Buffer.alloc(Number.POSITIVE_INFINITY)
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc(Number.NEGATIVE_INFINITY)
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc(null)
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc(undefined)
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc()
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc([])
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc([0, 42, 3])
      }).toThrow()
      expect(() => {
        impl.Buffer.alloc({})
      }).toThrow()
    }
    for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
      expect(() => {
        dangerous.Buffer[method]('')
      }).toThrow()
      expect(() => {
        dangerous.Buffer[method]('string')
      }).toThrow()
      expect(() => {
        dangerous.Buffer[method]('string', 'utf-8')
      }).toThrow()
      expect(dangerous.Buffer[method]).toBe(
        buffer.Buffer[method as 'allocUnsafe' | 'allocUnsafeSlow'],
      )
      expect(() =>
        dangerous.Buffer[method](buffer.constants.MAX_LENGTH + 1),
      ).toThrow(RangeError)
      expect(() => {
        dangerous.Buffer[method](Number.POSITIVE_INFINITY)
      }).toThrow()
      for (const size of [-10, -1e90, Number.NEGATIVE_INFINITY]) {
        expect(() => dangerous.Buffer[method](size)).toThrow(RangeError)
      }
      expect(() => {
        dangerous.Buffer[method](null)
      }).toThrow()
      expect(() => {
        dangerous.Buffer[method](undefined)
      }).toThrow()
      expect(() => {
        dangerous.Buffer[method]()
      }).toThrow()
      expect(() => {
        dangerous.Buffer[method]([])
      }).toThrow()
      expect(() => {
        dangerous.Buffer[method]([0, 42, 3])
      }).toThrow()
      expect(() => {
        dangerous.Buffer[method]({})
      }).toThrow()
    }
  })

  it('Buffers have appropriate lengths', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(impl.Buffer.alloc(0).length).toBe(0)
      expect(impl.Buffer.alloc(10).length).toBe(10)
      expect(impl.Buffer.from('').length).toBe(0)
      expect(impl.Buffer.from('string').length).toBe(6)
      expect(impl.Buffer.from('string', 'utf-8').length).toBe(6)
      expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64').length).toBe(11)
      expect(impl.Buffer.from([0, 42, 3]).length).toBe(3)
      expect(impl.Buffer.from(new Uint8Array([0, 42, 3])).length).toBe(3)
      expect(impl.Buffer.from([]).length).toBe(0)
    }
    for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
      expect(dangerous.Buffer[method](0).length).toBe(0)
      expect(dangerous.Buffer[method](10).length).toBe(10)
    }
  })

  it('Allocation lengths cover empty, small, and buffer-pool boundaries', () => {
    for (const method of [
      safer.Buffer.alloc,
      dangerous.Buffer.allocUnsafe,
      dangerous.Buffer.allocUnsafeSlow,
    ]) {
      for (const length of [0, 1, 255, 4095, 4096, 4097, 8192, 8193]) {
        const result = method(length)
        expect(buffer.Buffer.isBuffer(result)).toBe(true)
        expect(result.length).toBe(length)
      }
    }
  })

  it('.alloc(size) is zero-filled and has correct length', () => {
    for (const length of [0, 1, 255, 4095, 4096, 4097, 8192, 8193]) {
      const result = safer.Buffer.alloc(length)
      expect(result).toEqual(buffer.Buffer.from(new Uint8Array(length)))
      result.fill(1)
      expect(result).toEqual(buffer.Buffer.from(new Uint8Array(length).fill(1)))
    }
  })

  it('.allocUnsafe / .allocUnsafeSlow are fillable and have correct lengths', () => {
    for (const method of ['allocUnsafe', 'allocUnsafeSlow']) {
      for (const length of [0, 1, 255, 4095, 4096, 4097, 8192, 8193]) {
        const result = dangerous.Buffer[method](length)
        expect(buffer.Buffer.isBuffer(result)).toBe(true)
        expect(result.length).toBe(length)
        for (const fill of [0, 1]) {
          result.fill(fill, 0, length)
          expect(result).toEqual(
            buffer.Buffer.from(new Uint8Array(length).fill(fill)),
          )
        }
      }
    }
  })

  it('.alloc(size, fill) is fill-filled', () => {
    for (const length of [0, 1, 255, 4095, 4096, 4097, 8192, 8193]) {
      for (const fill of [0, 1, 127, 255]) {
        expect(safer.Buffer.alloc(length, fill)).toEqual(
          buffer.Buffer.from(new Uint8Array(length).fill(fill)),
        )
      }
    }
    expect(safer.Buffer.alloc(9, 'a')).toEqual(safer.Buffer.alloc(9, 97))
    expect(safer.Buffer.alloc(9, 'a')).not.toEqual(safer.Buffer.alloc(9, 98))
    expect(safer.Buffer.alloc(5, 'ok')).toEqual(safer.Buffer.from('okoko'))
    expect(safer.Buffer.alloc(5, 'ok')).not.toEqual(safer.Buffer.from('kokok'))
  })

  it('safer.Buffer.from returns results same as Buffer constructor', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(impl.Buffer.from('')).toEqual(new buffer.Buffer(''))
      expect(impl.Buffer.from('string')).toEqual(new buffer.Buffer('string'))
      expect(impl.Buffer.from('string', 'utf-8')).toEqual(
        new buffer.Buffer('string', 'utf-8'),
      )
      expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64')).toEqual(
        new buffer.Buffer('b25ldHdvdGhyZWU=', 'base64'),
      )
      expect(impl.Buffer.from([0, 42, 3])).toEqual(
        new buffer.Buffer([0, 42, 3]),
      )
      expect(impl.Buffer.from(new Uint8Array([0, 42, 3]))).toEqual(
        new buffer.Buffer(new Uint8Array([0, 42, 3])),
      )
      expect(impl.Buffer.from([])).toEqual(new buffer.Buffer([]))
    }
  })

  it('safer.Buffer.from returns consistent results', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(impl.Buffer.from('')).toEqual(impl.Buffer.alloc(0))
      expect(impl.Buffer.from([])).toEqual(impl.Buffer.alloc(0))
      expect(impl.Buffer.from(new Uint8Array([]))).toEqual(impl.Buffer.alloc(0))
      expect(impl.Buffer.from('string', 'utf-8')).toEqual(
        impl.Buffer.from('string'),
      )
      expect(impl.Buffer.from('string')).toEqual(
        impl.Buffer.from([115, 116, 114, 105, 110, 103]),
      )
      expect(impl.Buffer.from('string')).toEqual(
        impl.Buffer.from(impl.Buffer.from('string')),
      )
      expect(impl.Buffer.from('b25ldHdvdGhyZWU=', 'base64')).toEqual(
        impl.Buffer.from('onetwothree'),
      )
      expect(impl.Buffer.from('b25ldHdvdGhyZWU=')).not.toEqual(
        impl.Buffer.from('onetwothree'),
      )
    }
  })
})
