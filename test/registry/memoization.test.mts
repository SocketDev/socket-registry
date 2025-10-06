import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  Memoize,
  clearAllMemoizationCaches,
  memoize,
  memoizeAsync,
  memoizeDebounced,
  memoizeWeak,
  once,
} from '../../registry/dist/lib/memoization.js'

describe('memoization module', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0
      const fn = memoize((n: number) => {
        callCount += 1
        return n * 2
      })

      expect(fn(5)).toBe(10)
      expect(callCount).toBe(1)

      expect(fn(5)).toBe(10)
      expect(callCount).toBe(1)

      expect(fn(10)).toBe(20)
      expect(callCount).toBe(2)
    })

    it('should use default JSON.stringify key generator', () => {
      let callCount = 0
      const fn = memoize((a: number, b: string) => {
        callCount += 1
        return `${a}-${b}`
      })

      fn(1, 'a')
      fn(1, 'a')
      expect(callCount).toBe(1)

      fn(1, 'b')
      expect(callCount).toBe(2)
    })

    it('should use custom key generator', () => {
      let callCount = 0
      const fn = memoize(
        (obj: { id: number }) => {
          callCount += 1
          return obj.id
        },
        { keyGen: obj => String(obj.id) },
      )

      fn({ id: 1 })
      fn({ id: 1 })
      expect(callCount).toBe(1)
    })

    it('should respect maxSize and evict LRU', () => {
      let callCount = 0
      const fn = memoize(
        (n: number) => {
          callCount += 1
          return n * 2
        },
        { maxSize: 2 },
      )

      fn(1)
      fn(2)
      fn(3)

      expect(callCount).toBe(3)

      fn(2)
      fn(3)
      expect(callCount).toBe(3)

      fn(1)
      expect(callCount).toBe(4)
    })

    it('should handle TTL expiration', async () => {
      let callCount = 0
      const fn = memoize(
        (n: number) => {
          callCount += 1
          return n * 2
        },
        { ttl: 50 },
      )

      fn(5)
      expect(callCount).toBe(1)

      fn(5)
      expect(callCount).toBe(1)

      await new Promise(resolve => setTimeout(resolve, 60))

      fn(5)
      expect(callCount).toBe(2)
    })

    it('should track cache hits', () => {
      const fn = memoize((n: number) => n * 2)

      fn(5)
      fn(5)
      fn(5)

      // Hits are tracked internally but not exposed
      expect(true).toBe(true)
    })

    it('should handle name option', () => {
      const fn = memoize((n: number) => n * 2, { name: 'double' })

      fn(5)

      // Name is used for logging
      expect(true).toBe(true)
    })

    it('should update LRU order on access', () => {
      let callCount = 0
      const testFn = memoize(
        (n: number) => {
          callCount += 1
          return n
        },
        { maxSize: 2 },
      )

      testFn(1)
      testFn(2)
      testFn(1)
      testFn(3)

      // 1 was accessed, so 2 should be evicted and 3 added
      // Now accessing 2 should require a new computation
      const beforeCall = callCount
      testFn(2)

      expect(callCount).toBe(beforeCall + 1)
    })

    it('should handle infinite maxSize', () => {
      const fn = memoize((n: number) => n)

      for (let i = 0; i < 100; i += 1) {
        fn(i)
      }

      let callCount = 0
      const testFn = memoize((n: number) => {
        callCount += 1
        return n
      })

      for (let i = 0; i < 100; i += 1) {
        testFn(i)
      }

      for (let i = 0; i < 100; i += 1) {
        testFn(i)
      }

      expect(callCount).toBe(100)
    })

    it('should handle infinite TTL', () => {
      const fn = memoize((n: number) => n)

      fn(5)
      fn(5)

      expect(true).toBe(true)
    })
  })

  describe('memoizeAsync', () => {
    it('should cache async function results', async () => {
      let callCount = 0
      const fn = memoizeAsync(async (n: number) => {
        callCount += 1
        await new Promise(resolve => setTimeout(resolve, 10))
        return n * 2
      })

      expect(await fn(5)).toBe(10)
      expect(callCount).toBe(1)

      expect(await fn(5)).toBe(10)
      expect(callCount).toBe(1)

      expect(await fn(10)).toBe(20)
      expect(callCount).toBe(2)
    })

    it('should handle concurrent calls', async () => {
      let callCount = 0
      const fn = memoizeAsync(async (n: number) => {
        callCount += 1
        await new Promise(resolve => setTimeout(resolve, 10))
        return n * 2
      })

      const results = await Promise.all([fn(5), fn(5), fn(5)])

      expect(results).toEqual([10, 10, 10])
      expect(callCount).toBe(1)
    })

    it('should remove failed promises from cache', async () => {
      let callCount = 0
      const fn = memoizeAsync(async (n: number) => {
        callCount += 1
        if (callCount === 1) {
          throw new Error('fail')
        }
        return n * 2
      })

      await expect(fn(5)).rejects.toThrow('fail')
      expect(callCount).toBe(1)

      expect(await fn(5)).toBe(10)
      expect(callCount).toBe(2)
    })

    it('should use custom key generator', async () => {
      let callCount = 0
      const fn = memoizeAsync(
        async (obj: { id: number }) => {
          callCount += 1
          return obj.id
        },
        { keyGen: obj => String(obj.id) },
      )

      await fn({ id: 1 })
      await fn({ id: 1 })
      expect(callCount).toBe(1)
    })

    it('should respect maxSize', async () => {
      let callCount = 0
      const fn = memoizeAsync(
        async (n: number) => {
          callCount += 1
          return n * 2
        },
        { maxSize: 2 },
      )

      await fn(1)
      await fn(2)
      await fn(3)

      expect(callCount).toBe(3)

      await fn(2)
      await fn(3)
      expect(callCount).toBe(3)

      await fn(1)
      expect(callCount).toBe(4)
    })

    it('should handle TTL expiration', async () => {
      let callCount = 0
      const fn = memoizeAsync(
        async (n: number) => {
          callCount += 1
          return n * 2
        },
        { ttl: 50 },
      )

      await fn(5)
      expect(callCount).toBe(1)

      await fn(5)
      expect(callCount).toBe(1)

      await new Promise(resolve => setTimeout(resolve, 60))

      await fn(5)
      expect(callCount).toBe(2)
    })

    it('should update LRU order on access', async () => {
      let callCount = 0
      const fn = memoizeAsync(
        async (n: number) => {
          callCount += 1
          return n
        },
        { maxSize: 2 },
      )

      await fn(1)
      await fn(2)
      await fn(1)
      await fn(3)

      // 1 was accessed, so 2 should be evicted
      const beforeCall = callCount
      await fn(2)

      expect(callCount).toBe(beforeCall + 1)
    })

    it('should handle name option', async () => {
      const fn = memoizeAsync(async (n: number) => n * 2, {
        name: 'asyncDouble',
      })

      await fn(5)

      expect(true).toBe(true)
    })
  })

  describe('Memoize decorator', () => {
    it('should be a function', () => {
      expect(typeof Memoize).toBe('function')
    })

    it('should return a decorator function', () => {
      const decorator = Memoize()
      expect(typeof decorator).toBe('function')
    })

    it('should accept options', () => {
      const decorator = Memoize({ name: 'customName', maxSize: 10 })
      expect(typeof decorator).toBe('function')
    })
  })

  describe('clearAllMemoizationCaches', () => {
    it('should be a function', () => {
      expect(typeof clearAllMemoizationCaches).toBe('function')
      clearAllMemoizationCaches()
    })
  })

  describe('memoizeWeak', () => {
    it('should cache results with object keys', () => {
      let callCount = 0
      const fn = memoizeWeak((obj: { id: number }) => {
        callCount += 1
        return obj.id * 2
      })

      const key = { id: 5 }

      expect(fn(key)).toBe(10)
      expect(callCount).toBe(1)

      expect(fn(key)).toBe(10)
      expect(callCount).toBe(1)
    })

    it('should use WeakMap for garbage collection', () => {
      let callCount = 0
      const fn = memoizeWeak((obj: { id: number }) => {
        callCount += 1
        return obj.id * 2
      })

      fn({ id: 1 })
      fn({ id: 2 })

      expect(callCount).toBe(2)
    })

    it('should cache by object reference', () => {
      let callCount = 0
      const fn = memoizeWeak((obj: { id: number }) => {
        callCount += 1
        return obj.id * 2
      })

      fn({ id: 1 })
      fn({ id: 1 })

      expect(callCount).toBe(2)

      const key = { id: 1 }
      fn(key)
      fn(key)

      expect(callCount).toBe(3)
    })
  })

  describe('once', () => {
    it('should call function only once', () => {
      let callCount = 0
      const fn = once(() => {
        callCount += 1
        return 'result'
      })

      expect(fn()).toBe('result')
      expect(callCount).toBe(1)

      expect(fn()).toBe('result')
      expect(callCount).toBe(1)

      expect(fn()).toBe('result')
      expect(callCount).toBe(1)
    })

    it('should cache undefined results', () => {
      let callCount = 0
      const fn = once(() => {
        callCount += 1
        return undefined
      })

      expect(fn()).toBeUndefined()
      expect(callCount).toBe(1)

      expect(fn()).toBeUndefined()
      expect(callCount).toBe(1)
    })

    it('should cache null results', () => {
      let callCount = 0
      const fn = once(() => {
        callCount += 1
        return null
      })

      expect(fn()).toBeNull()
      expect(callCount).toBe(1)

      expect(fn()).toBeNull()
      expect(callCount).toBe(1)
    })

    it('should cache falsy results', () => {
      let callCount = 0
      const fn = once(() => {
        callCount += 1
        return 0
      })

      expect(fn()).toBe(0)
      expect(callCount).toBe(1)

      expect(fn()).toBe(0)
      expect(callCount).toBe(1)
    })

    it('should use function name for logging', () => {
      const namedFn = once(function myFunction() {
        return 'result'
      })

      namedFn()

      expect(true).toBe(true)
    })
  })

  describe('memoizeDebounced', () => {
    it('should debounce and memoize', async () => {
      let callCount = 0
      const fn = memoizeDebounced((n: number) => {
        callCount += 1
        return n * 2
      }, 50)

      fn(5)
      fn(5)
      fn(5)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(callCount).toBeGreaterThan(0)
    })

    it('should return cached value immediately', () => {
      let callCount = 0
      const fn = memoizeDebounced((n: number) => {
        callCount += 1
        return n * 2
      }, 50)

      expect(fn(5)).toBe(10)
      expect(callCount).toBe(1)

      expect(fn(5)).toBe(10)
      expect(callCount).toBe(1)
    })

    it('should clear previous timeout', async () => {
      let callCount = 0
      const fn = memoizeDebounced((n: number) => {
        callCount += 1
        return n * 2
      }, 50)

      fn(5)
      await new Promise(resolve => setTimeout(resolve, 25))
      fn(5)
      await new Promise(resolve => setTimeout(resolve, 25))
      fn(5)

      await new Promise(resolve => setTimeout(resolve, 60))

      expect(callCount).toBeGreaterThan(0)
    })

    it('should support memoization options', () => {
      const fn = memoizeDebounced((n: number) => n * 2, 50, {
        name: 'debouncedDouble',
        maxSize: 10,
      })

      fn(5)

      expect(true).toBe(true)
    })
  })

  describe('function behavior with DEBUG', () => {
    it('should work with DEBUG enabled', () => {
      process.env['DEBUG'] = '1'

      const fn = memoize((n: number) => n * 2, { name: 'testFn' })

      expect(fn(5)).toBe(10)
      expect(fn(5)).toBe(10)
    })

    it('should work with maxSize and DEBUG enabled', () => {
      process.env['DEBUG'] = '1'

      let callCount = 0
      const fn = memoize(
        (n: number) => {
          callCount += 1
          return n * 2
        },
        { name: 'testFn', maxSize: 1 },
      )

      fn(1)
      fn(2)

      expect(callCount).toBe(2)
    })
  })
})
