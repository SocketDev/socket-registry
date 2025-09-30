import { describe, expect, it } from 'vitest'

import {
  createCompositeAbortSignal,
  createTimeoutSignal,
} from '../../registry/dist/lib/abort.js'

describe('abort module', () => {
  describe('createCompositeAbortSignal', () => {
    it('should return a signal that never aborts when no signals provided', () => {
      const signal = createCompositeAbortSignal()
      expect(signal.aborted).toBe(false)
    })

    it('should return a signal that never aborts when all signals are null/undefined', () => {
      const signal = createCompositeAbortSignal(null, undefined, null)
      expect(signal.aborted).toBe(false)
    })

    it('should return the same signal when only one valid signal provided', () => {
      const controller = new AbortController()
      const signal = createCompositeAbortSignal(controller.signal)
      expect(signal).toBe(controller.signal)
    })

    it('should filter out null and undefined signals', () => {
      const controller = new AbortController()
      const signal = createCompositeAbortSignal(
        null,
        controller.signal,
        undefined,
      )
      expect(signal).toBe(controller.signal)
    })

    it('should return an already aborted signal if any input is aborted', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      controller1.abort()

      const signal = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )
      expect(signal.aborted).toBe(true)
    })

    it('should abort when first signal aborts', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const signal = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )
      expect(signal.aborted).toBe(false)

      controller1.abort()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(signal.aborted).toBe(true)
    })

    it('should abort when second signal aborts', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const signal = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )
      expect(signal.aborted).toBe(false)

      controller2.abort()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(signal.aborted).toBe(true)
    })

    it('should abort when any of multiple signals aborts', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const controller3 = new AbortController()

      const signal = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
        controller3.signal,
      )
      expect(signal.aborted).toBe(false)

      controller2.abort()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(signal.aborted).toBe(true)
    })

    it('should only abort once even if multiple signals abort', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const signal = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )

      let abortCount = 0
      signal.addEventListener('abort', () => {
        abortCount += 1
      })

      controller1.abort()
      await new Promise(resolve => setTimeout(resolve, 0))
      controller2.abort()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(abortCount).toBe(1)
    })

    it('should handle mixed null signals and abort signals', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const signal = createCompositeAbortSignal(
        null,
        controller1.signal,
        undefined,
        controller2.signal,
        null,
      )

      controller1.abort()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(signal.aborted).toBe(true)
    })
  })

  describe('createTimeoutSignal', () => {
    it('should create a signal that aborts after timeout', async () => {
      const signal = createTimeoutSignal(50)
      expect(signal.aborted).toBe(false)

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(signal.aborted).toBe(true)
    })

    it('should throw TypeError for non-number timeout', () => {
      expect(() => createTimeoutSignal(NaN)).toThrow(TypeError)
    })

    it('should throw TypeError for zero timeout', () => {
      expect(() => createTimeoutSignal(0)).toThrow(TypeError)
      expect(() => createTimeoutSignal(0)).toThrow(
        'timeout must be a positive number',
      )
    })

    it('should throw TypeError for negative timeout', () => {
      expect(() => createTimeoutSignal(-100)).toThrow(TypeError)
      expect(() => createTimeoutSignal(-100)).toThrow(
        'timeout must be a positive number',
      )
    })

    it('should throw TypeError for infinity', () => {
      expect(() => createTimeoutSignal(Number.POSITIVE_INFINITY)).toThrow(
        TypeError,
      )
      expect(() => createTimeoutSignal(Number.NEGATIVE_INFINITY)).toThrow(
        TypeError,
      )
    })

    it('should throw TypeError for string', () => {
      // @ts-expect-error - Testing runtime behavior.
      expect(() => createTimeoutSignal('100')).toThrow(TypeError)
    })

    it('should throw TypeError for null', () => {
      // @ts-expect-error - Testing runtime behavior.
      expect(() => createTimeoutSignal(null)).toThrow(TypeError)
    })

    it('should throw TypeError for undefined', () => {
      // @ts-expect-error - Testing runtime behavior.
      expect(() => createTimeoutSignal(undefined)).toThrow(TypeError)
    })

    it('should work with very short timeouts', async () => {
      const signal = createTimeoutSignal(1)
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(signal.aborted).toBe(true)
    })

    it('should trigger abort event listener', async () => {
      const signal = createTimeoutSignal(10)
      let aborted = false

      signal.addEventListener('abort', () => {
        aborted = true
      })

      await new Promise(resolve => setTimeout(resolve, 50))
      expect(aborted).toBe(true)
    })
  })
})
