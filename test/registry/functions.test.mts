import { describe, expect, it } from 'vitest'

import {
  noop,
  once,
  silentWrapAsync,
  trampoline,
} from '../../registry/dist/lib/functions.js'

// Helper functions moved to outer scope.
const asyncFn = async () => 'success'
const syncFn = () => 'sync result'
const asyncAddFn = async (a: number, b: number) => a + b
const errorFn = async () => {
  throw new Error('test error')
}
const syncErrorFn = () => {
  throw new Error('sync error')
}
const promiseFn = () => Promise.resolve('promise result')
const rejectFn = () => Promise.reject(new Error('rejected'))
const multiArgFn = async (a: string, b: string, c: string) => `${a}-${b}-${c}`
const stringErrorFn = async () => {
  throw 'string error'
}
const numberErrorFn = async () => {
  throw 123
}
const objectErrorFn = async () => {
  throw { error: 'object' }
}
const nullFn = async () => null
const undefinedFn = async () => undefined
const testFn = () => 'test'
const fnNumber = () => 42
const fnString = () => 'hello'
const fnObject = () => ({ key: 'value' })
const uppercaseFn = (x: string) => x.toUpperCase()

describe('functions module', () => {
  describe('noop', () => {
    it('should do nothing', () => {
      const result = noop()
      expect(result).toBeUndefined()
    })

    it('should be callable multiple times', () => {
      noop()
      noop()
      noop()
      expect(true).toBe(true)
    })
  })

  describe('once', () => {
    it('should execute function only once', () => {
      let count = 0
      const fn = () => {
        count += 1
        return count
      }
      const wrapped = once(fn)
      expect(wrapped()).toBe(1)
      expect(wrapped()).toBe(1)
      expect(wrapped()).toBe(1)
      expect(count).toBe(1)
    })

    it('should preserve return value', () => {
      const wrapped = once(testFn)
      expect(wrapped()).toBe('test')
      expect(wrapped()).toBe('test')
    })

    it('should work with functions that return different types', () => {
      const wrappedNumber = once(fnNumber)
      const wrappedString = once(fnString)
      const wrappedObject = once(fnObject)

      expect(wrappedNumber()).toBe(42)
      expect(wrappedString()).toBe('hello')
      expect(wrappedObject()).toEqual({ key: 'value' })
    })

    it('should work with functions that take arguments', () => {
      let callCount = 0
      const fn = (a: number, b: number) => {
        callCount += 1
        return a + b
      }
      const wrapped = once(fn)
      expect(wrapped(2, 3)).toBe(5)
      expect(wrapped(10, 20)).toBe(5)
      expect(callCount).toBe(1)
    })

    it('should preserve this context', () => {
      const obj = {
        value: 100,
        getValue() {
          return this.value
        },
      }
      const wrapped = once(obj.getValue)
      expect(wrapped.call(obj)).toBe(100)
      expect(wrapped.call(obj)).toBe(100)
    })

    it('should cache undefined return value', () => {
      let count = 0
      const fn = () => {
        count += 1
        return undefined
      }
      const wrapped = once(fn)
      expect(wrapped()).toBeUndefined()
      expect(wrapped()).toBeUndefined()
      expect(count).toBe(1)
    })
  })

  describe('trampoline', () => {
    it('should execute non-recursive function normally', () => {
      const wrapped = trampoline((x: number) => x * 2)
      expect(wrapped(5)).toBe(10)
    })

    it('should handle tail-recursive functions', () => {
      const factorial = trampoline((n: number, acc = 1): any => {
        if (n <= 1) {
          return acc
        }
        return () => factorial(n - 1, n * acc)
      })
      expect(factorial(5)).toBe(120)
      expect(factorial(10)).toBe(3_628_800)
    })

    it('should handle deep recursion without stack overflow', () => {
      const sum = trampoline((n: number, acc = 0): any => {
        if (n <= 0) {
          return acc
        }
        return () => sum(n - 1, acc + n)
      })
      expect(sum(100)).toBe(5_050)
      expect(sum(1_000)).toBe(500_500)
    })

    it('should preserve this context', () => {
      const obj = {
        multiplier: 3,
        total: 0,
        accumulate(n: number): any {
          if (n <= 0) {
            return this.total
          }
          this.total += this.multiplier
          return () => this.accumulate(n - 1)
        },
      }
      obj.accumulate = trampoline(obj.accumulate)
      expect(obj.accumulate(5)).toBe(15)
    })

    it('should handle multiple levels of function returns', () => {
      function makeNestedThunk(n: number): any {
        if (n <= 0) {
          return 'done'
        }
        function level1() {
          return level2
        }
        function level2() {
          return level3
        }
        function level3() {
          return makeNestedThunk(n - 1)
        }
        return level1
      }
      const wrapped = trampoline(makeNestedThunk)
      expect(wrapped(3)).toBe('done')
    })

    it('should work with different return types', () => {
      const wrapped = trampoline(uppercaseFn)
      expect(wrapped('hello')).toBe('HELLO')
    })
  })

  describe('silentWrapAsync', () => {
    it('should wrap async functions', async () => {
      const wrapped = silentWrapAsync(asyncFn)
      const result = await wrapped()
      expect(result).toBe('success')
    })

    it('should wrap sync functions and make them async', async () => {
      // @ts-expect-error - Testing runtime behavior with sync function.
      const wrapped = silentWrapAsync(syncFn)
      const result = await wrapped()
      expect(result).toBe('sync result')
    })

    it('should pass arguments to wrapped function', async () => {
      const wrapped = silentWrapAsync(asyncAddFn)
      const result = await wrapped(2, 3)
      expect(result).toBe(5)
    })

    it('should silently handle errors', async () => {
      const wrapped = silentWrapAsync(errorFn)
      const result = await wrapped()
      expect(result).toBe(undefined)
    })

    it('should handle sync function errors', async () => {
      const wrapped = silentWrapAsync(syncErrorFn)
      const result = await wrapped()
      expect(result).toBe(undefined)
    })

    it('should preserve this context', async () => {
      const obj = {
        value: 42,
        getValue() {
          return this.value
        },
      }
      // @ts-expect-error - Testing runtime behavior with sync method.
      const wrapped = silentWrapAsync(obj.getValue.bind(obj))
      const result = await wrapped()
      expect(result).toBe(42)
    })

    it('should handle functions returning promises', async () => {
      const wrapped = silentWrapAsync(promiseFn)
      const result = await wrapped()
      expect(result).toBe('promise result')
    })

    it('should handle rejected promises', async () => {
      const wrapped = silentWrapAsync(rejectFn)
      const result = await wrapped()
      expect(result).toBe(undefined)
    })

    it('should handle multiple arguments', async () => {
      const wrapped = silentWrapAsync(multiArgFn)
      const result = await wrapped('one', 'two', 'three')
      expect(result).toBe('one-two-three')
    })

    it('should handle no arguments', async () => {
      let called = false
      const fn = async () => {
        called = true
        return 'called'
      }
      const wrapped = silentWrapAsync(fn)
      const result = await wrapped()
      expect(called).toBe(true)
      expect(result).toBe('called')
    })

    it('should return undefined for any error type', async () => {
      const wrapped1 = silentWrapAsync(stringErrorFn)
      const wrapped2 = silentWrapAsync(numberErrorFn)
      const wrapped3 = silentWrapAsync(objectErrorFn)

      expect(await wrapped1()).toBe(undefined)
      expect(await wrapped2()).toBe(undefined)
      expect(await wrapped3()).toBe(undefined)
    })

    it('should handle null and undefined returns', async () => {
      const wrapped1 = silentWrapAsync(nullFn)
      const wrapped2 = silentWrapAsync(undefinedFn)

      expect(await wrapped1()).toBeUndefined()
      expect(await wrapped2()).toBe(undefined)
    })
  })
})
