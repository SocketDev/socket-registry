/**
 * @file API-surface parity tests for @socketregistry/safer-buffer npm package
 *   override — method presence + static/prototype inheritance. The behavior
 *   tests (alloc/from return values, lengths, fills, throwing) live in
 *   safer-buffer-behavior.test.mts; both bind to the `safer-buffer` override.
 */
/* eslint-disable n/no-deprecated-api */
import buffer from 'node:buffer'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const { eco, pkgPath, skip, sockRegPkgName } = setupNpmPackageTest(
  import.meta.url,
)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const safer = skip ? undefined : require(path.join(pkgPath, 'safer.js'))
  const dangerous = skip
    ? undefined
    : require(path.join(pkgPath, 'dangerous.js'))
  const implementations = [safer, dangerous]

  it('Default is Safer', () => {
    expect(safer === dangerous).toBe(false)
  })

  it('Is not a function', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(typeof impl).toBe('object')
      expect(typeof impl.Buffer).toBe('object')
    }
    expect(typeof buffer).toBe('object')
    expect(typeof buffer.Buffer).toBe('function')
  })

  it('Constructor throws', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(() => {
        impl.Buffer()
      }).toThrow()
      expect(() => {
        impl.Buffer(0)
      }).toThrow()
      expect(() => {
        impl.Buffer('a')
      }).toThrow()
      expect(() => {
        impl.Buffer('a', 'utf-8')
      }).toThrow()
      expect(() => {
        // eslint-disable-next-line no-new
        new impl.Buffer()
      }).toThrow()
      expect(() => {
        // eslint-disable-next-line no-new
        new impl.Buffer(0)
      }).toThrow()
      expect(() => {
        // eslint-disable-next-line no-new
        new impl.Buffer('a')
      }).toThrow()
      expect(() => {
        // eslint-disable-next-line no-new
        new impl.Buffer('a', 'utf-8')
      }).toThrow()
    }
  })

  it('Safe methods exist', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(typeof impl.Buffer.alloc).toBe('function')
      expect(typeof impl.Buffer.from).toBe('function')
    }
  })

  it('Unsafe methods exist only in Dangerous', () => {
    expect(typeof safer.Buffer.allocUnsafe).toBe('undefined')
    expect(typeof safer.Buffer.allocUnsafeSlow).toBe('undefined')
    expect(typeof dangerous.Buffer.allocUnsafe).toBe('function')
    expect(typeof dangerous.Buffer.allocUnsafeSlow).toBe('function')
  })

  it('Generic methods/properties are defined and equal', () => {
    for (const method of ['poolSize', 'isBuffer', 'concat', 'byteLength']) {
      for (let i = 0, { length } = implementations; i < length; i += 1) {
        const impl = implementations[i]
        expect(impl.Buffer[method]).toBe(
          (buffer.Buffer as unknown as Record<string, unknown>)[method],
        )
        expect(typeof impl.Buffer[method]).not.toBe('undefined')
      }
    }
  })

  it('Built-in buffer static methods/properties are inherited', () => {
    const bufferMethods = Object.keys(buffer)
    for (let i = 0, { length } = bufferMethods; i < length; i += 1) {
      const method = bufferMethods[i]!
      if (method === 'Buffer' || method === 'SlowBuffer') {
        continue
      }
      for (
        let j = 0, implementationsLength = implementations.length;
        j < implementationsLength;
        j += 1
      ) {
        const impl = implementations[j]
        expect(impl[method]).toBe(
          (buffer as unknown as Record<string, unknown>)[method],
        )
        expect(typeof impl[method]).not.toBe('undefined')
      }
    }
  })

  it('Built-in Buffer static methods/properties are inherited', () => {
    const bufferBufferMethods = Object.keys(buffer.Buffer)
    for (let i = 0, { length } = bufferBufferMethods; i < length; i += 1) {
      const method = bufferBufferMethods[i]!
      if (method === 'allocUnsafe' || method === 'allocUnsafeSlow') {
        continue
      }
      for (
        let j = 0, implementationsLength = implementations.length;
        j < implementationsLength;
        j += 1
      ) {
        const impl = implementations[j]
        expect(impl.Buffer[method]).toBe(
          (buffer.Buffer as unknown as Record<string, unknown>)[method],
        )
        expect(typeof impl.Buffer[method]).not.toBe('undefined')
      }
    }
  })

  it('.prototype property of Buffer is inherited', () => {
    for (let i = 0, { length } = implementations; i < length; i += 1) {
      const impl = implementations[i]
      expect(impl.Buffer.prototype).toBe(buffer.Buffer.prototype)
      expect(typeof impl.Buffer.prototype).not.toBe('undefined')
    }
  })

  it('All Safer methods are present in Dangerous', () => {
    const saferMethods = Object.keys(safer)
    for (let i = 0, { length } = saferMethods; i < length; i += 1) {
      const method = saferMethods[i]!
      if (method === 'Buffer') {
        continue
      }
      for (
        let j = 0, implementationsLength = implementations.length;
        j < implementationsLength;
        j += 1
      ) {
        const impl = implementations[j]
        expect(impl[method]).toBe(safer[method])
        expect(typeof impl[method]).not.toBe('undefined')
      }
    }
    const saferBufferMethods = Object.keys(safer.Buffer)
    for (let i = 0, { length } = saferBufferMethods; i < length; i += 1) {
      const method = saferBufferMethods[i]!
      for (
        let j = 0, implementationsLength = implementations.length;
        j < implementationsLength;
        j += 1
      ) {
        const impl = implementations[j]
        expect(impl.Buffer[method]).toBe(safer.Buffer[method])
        expect(typeof impl.Buffer[method]).not.toBe('undefined')
      }
    }
  })

  it('Safe methods from Dangerous methods are present in Safer', () => {
    const dangerousMethods = Object.keys(dangerous)
    for (let i = 0, { length } = dangerousMethods; i < length; i += 1) {
      const method = dangerousMethods[i]!
      if (method === 'Buffer') {
        continue
      }
      for (
        let j = 0, implementationsLength = implementations.length;
        j < implementationsLength;
        j += 1
      ) {
        const impl = implementations[j]
        expect(impl[method]).toBe(dangerous[method])
        expect(typeof impl[method]).not.toBe('undefined')
      }
    }
    const dangerousBufferMethods = Object.keys(dangerous.Buffer)
    for (let i = 0, { length } = dangerousBufferMethods; i < length; i += 1) {
      const method = dangerousBufferMethods[i]!
      if (method === 'allocUnsafe' || method === 'allocUnsafeSlow') {
        continue
      }
      for (
        let j = 0, implementationsLength = implementations.length;
        j < implementationsLength;
        j += 1
      ) {
        const impl = implementations[j]
        expect(impl.Buffer[method]).toBe(dangerous.Buffer[method])
        expect(typeof impl.Buffer[method]).not.toBe('undefined')
      }
    }
  })
})
