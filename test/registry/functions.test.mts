import { describe, expect, it } from 'vitest'

const { silentWrapAsync } = require('@socketsecurity/registry/lib/functions')

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

describe('functions module', () => {
  describe('silentWrapAsync', () => {
    it('should wrap async functions', async () => {
      const wrapped = silentWrapAsync(asyncFn)
      const result = await wrapped()
      expect(result).toBe('success')
    })

    it('should wrap sync functions and make them async', async () => {
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
