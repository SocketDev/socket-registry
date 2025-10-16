/**
 * @fileoverview Tests for function utilities.
 *
 * Validates noop, once, silentWrapAsync, and trampoline functions.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  noop,
  once,
  silentWrapAsync,
  trampoline,
} from '../../../registry/dist/lib/functions.js'

describe('functions utilities', () => {
  describe('noop', () => {
    it('should be a function', () => {
      expect(typeof noop).toBe('function')
    })

    it('should do nothing', () => {
      expect(() => noop()).not.toThrow()
    })

    it('should return undefined', () => {
      expect(noop()).toBeUndefined()
    })

    it('should accept any arguments without error', () => {
      expect(() => (noop as any)(1, 2, 3, 'test', {}, [])).not.toThrow()
    })
  })

  describe('once', () => {
    it('should execute function only once', () => {
      let count = 0
      const increment = once(() => {
        count++
        return count
      })

      expect(increment()).toBe(1)
      expect(increment()).toBe(1)
      expect(increment()).toBe(1)
      expect(count).toBe(1)
    })

    it('should return same result on subsequent calls', () => {
      const fn = once(() => ({ value: Math.random() }))
      const firstResult = fn()
      const secondResult = fn()

      expect(firstResult).toBe(secondResult)
      expect(firstResult.value).toBe(secondResult.value)
    })

    it('should work with functions that take arguments', () => {
      const fn = once(
        (...args: unknown[]) => (args[0] as number) + (args[1] as number),
      )
      expect(fn(2, 3)).toBe(5)
      expect(fn(10, 20)).toBe(5)
    })

    it('should work with functions that return undefined', () => {
      let called = false
      const fn = once(() => {
        called = true
        return undefined
      })

      expect(fn()).toBeUndefined()
      expect(fn()).toBeUndefined()
      expect(called).toBe(true)
    })

    it('should work with functions that return null', () => {
      let called = false
      const fn = once(() => {
        called = true
        return null
      })

      expect(fn()).toBeNull()
      expect(fn()).toBeNull()
      expect(called).toBe(true)
    })

    it('should preserve this context', () => {
      const obj = {
        value: 42,
        getValue: once(function (this: { value: number }) {
          return this.value
        }),
      }

      expect(obj.getValue()).toBe(42)
      expect(obj.getValue()).toBe(42)
    })

    it('should work with async functions', async () => {
      let count = 0
      const asyncFn = once(async () => {
        count++
        return count
      })

      const result1 = await asyncFn()
      const result2 = await asyncFn()

      expect(result1).toBe(1)
      expect(result2).toBe(1)
      expect(count).toBe(1)
    })
  })

  describe('silentWrapAsync', () => {
    it('should return result when function succeeds', async () => {
      const fn = async (x: number) => x * 2
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped(5)
      expect(result).toBe(10)
    })

    it('should return undefined when function throws', async () => {
      const fn = async () => {
        throw new Error('test error')
      }
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped()
      expect(result).toBeUndefined()
    })

    it('should convert null results to undefined', async () => {
      const fn = async () => null
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped()
      expect(result).toBeUndefined()
    })

    it('should preserve non-null results', async () => {
      const fn = async () => 0
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped()
      expect(result).toBe(0)
    })

    it('should work with multiple arguments', async () => {
      const fn = async (a: number, b: number, c: number) => a + b + c
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped(1, 2, 3)
      expect(result).toBe(6)
    })

    it('should silently catch promise rejections', async () => {
      const fn = async () => {
        throw new Error('rejection')
      }
      const wrapped = silentWrapAsync(fn)

      await expect(wrapped()).resolves.toBeUndefined()
    })

    it('should work with async functions that return objects', async () => {
      const fn = async () => ({ success: true })
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped()
      expect(result).toEqual({ success: true })
    })

    it('should work with async functions that return arrays', async () => {
      const fn = async () => [1, 2, 3]
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped()
      expect(result).toEqual([1, 2, 3])
    })
  })

  describe('trampoline', () => {
    it('should execute function normally when no recursion', () => {
      const fn = (...args: unknown[]) => (args[0] as number) * 2
      const trampolined = trampoline(fn)

      expect(trampolined(5)).toBe(10)
    })

    it('should optimize tail recursion via trampoline', () => {
      const factorial = trampoline((...args: unknown[]): any => {
        const n = args[0] as number
        const acc = (args[1] as number) ?? 1
        if (n <= 1) {
          return acc
        }
        return () => factorial(n - 1, n * acc)
      })

      expect(factorial(5)).toBe(120)
      expect(factorial(10)).toBe(3_628_800)
    })

    it('should handle deep recursion without stack overflow', () => {
      const sum = trampoline((...args: unknown[]): any => {
        const n = args[0] as number
        const acc = (args[1] as number) ?? 0
        if (n === 0) {
          return acc
        }
        return () => sum(n - 1, acc + n)
      })

      expect(sum(100)).toBe(5050)
      expect(sum(1000)).toBe(500_500)
    })

    it('should work with functions that return non-function values', () => {
      const fn = (...args: unknown[]) => {
        const x = args[0] as number
        if (x === 0) {
          return 'done'
        }
        return x
      }
      const trampolined = trampoline(fn)

      expect(trampolined(0)).toBe('done')
      expect(trampolined(5)).toBe(5)
    })

    it('should preserve this context', () => {
      const obj = {
        value: 10,
        double: trampoline(function (this: { value: number }) {
          return this.value * 2
        }),
      }

      expect(obj.double()).toBe(20)
    })

    it('should handle functions that return functions multiple times', () => {
      const countdown = trampoline((...args: unknown[]): any => {
        const n = args[0] as number
        if (n === 0) {
          return 'blast off!'
        }
        return () => () => countdown(n - 1)
      })

      expect(countdown(3)).toBe('blast off!')
    })
  })

  describe('edge cases', () => {
    it('should handle once with side effects', () => {
      const spy = vi.fn()
      const fn = once(() => {
        spy()
        return 'result'
      })

      fn()
      fn()
      fn()

      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should handle silentWrapAsync with immediate errors', async () => {
      const fn = async () => {
        throw new Error('immediate')
      }
      const wrapped = silentWrapAsync(fn)

      const result = await wrapped()
      expect(result).toBeUndefined()
    })

    it('should handle trampoline with no recursion', () => {
      const fn = () => 42
      const trampolined = trampoline(fn)

      expect(trampolined()).toBe(42)
    })

    it('should handle once with falsy values', () => {
      const fn1 = once(() => 0)
      const fn2 = once(() => false)
      const fn3 = once(() => '')

      expect(fn1()).toBe(0)
      expect(fn2()).toBe(false)
      expect(fn3()).toBe('')
    })
  })
})
