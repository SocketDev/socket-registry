import { describe, expect, it } from 'vitest'

const isBoolean = require('../../packages/npm/is-boolean-object')

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe('is-boolean-object', () => {
  describe('not Booleans', () => {
    describe('primitives', () => {
      it('should return false for undefined', () => {
        expect(isBoolean(undefined)).toBe(false)
      })

      it('should return false for null', () => {
        expect(isBoolean(null)).toBe(false)
      })

      it('should return false for 0', () => {
        expect(isBoolean(0)).toBe(false)
      })

      it('should return false for NaN', () => {
        expect(isBoolean(NaN)).toBe(false)
      })

      it('should return false for Infinity', () => {
        expect(isBoolean(Infinity)).toBe(false)
      })

      it('should return false for string', () => {
        expect(isBoolean('foo')).toBe(false)
      })
    })

    describe('objects', () => {
      it('should return false for number object', () => {
        expect(isBoolean(Object(42))).toBe(false)
      })

      it('should return false for array', () => {
        expect(isBoolean([])).toBe(false)
      })

      it('should return false for object', () => {
        expect(isBoolean({})).toBe(false)
      })

      it('should return false for function', () => {
        expect(isBoolean(() => {})).toBe(false)
      })

      it('should return false for regex literal', () => {
        expect(isBoolean(/a/g)).toBe(false)
      })

      it('should return false for regex object', () => {
        expect(isBoolean(new RegExp('a', 'g'))).toBe(false)
      })

      it('should return false for new Date()', () => {
        expect(isBoolean(new Date())).toBe(false)
      })
    })
  })

  describe('@@toStringTag', { skip: !hasToStringTag }, () => {
    it('should return false for fake Boolean with @@toStringTag', () => {
      const fakeBoolean = {
        toString() {
          return 'true'
        },
        valueOf() {
          return true
        },
        [Symbol.toStringTag]: 'Boolean',
      }
      expect(isBoolean(fakeBoolean)).toBe(false)
    })
  })

  describe('Booleans', () => {
    it('should return true for true', () => {
      expect(isBoolean(true)).toBe(true)
    })

    it('should return true for false', () => {
      expect(isBoolean(false)).toBe(true)
    })

    it('should return true for Object(true)', () => {
      expect(isBoolean(Object(true))).toBe(true)
    })

    it('should return true for Object(false)', () => {
      expect(isBoolean(Object(false))).toBe(true)
    })
  })

  describe(
    'Proxy',
    { skip: typeof Proxy !== 'function' || !hasToStringTag },
    () => {
      it('should return false for Proxy with Boolean @@toStringTag', () => {
        const target: Record<PropertyKey, unknown> = {}
        target[Symbol.toStringTag] = 'Boolean'
        const fake = new Proxy(target, { has: () => false })

        expect(isBoolean(target)).toBe(false)
        expect(isBoolean(fake)).toBe(false)
      })
    },
  )
})
