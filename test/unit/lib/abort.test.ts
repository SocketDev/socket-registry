/**
 * @fileoverview Tests for abort signal utilities.
 *
 * Validates composite abort signal creation and timeout signal functionality.
 */

import {
  createCompositeAbortSignal,
  createTimeoutSignal,
} from '@socketsecurity/lib/abort'
import { describe, expect, it } from 'vitest'

describe('abort utilities', () => {
  describe('createCompositeAbortSignal', () => {
    it('should create signal from single valid signal', () => {
      const controller = new AbortController()
      const result = createCompositeAbortSignal(controller.signal)
      expect(result).toBeInstanceOf(AbortSignal)
      expect(result.aborted).toBe(false)
    })

    it('should return same signal when only one valid signal provided', () => {
      const controller = new AbortController()
      const result = createCompositeAbortSignal(controller.signal)
      expect(result).toBe(controller.signal)
    })

    it('should create new signal for empty signals array', () => {
      const result = createCompositeAbortSignal()
      expect(result).toBeInstanceOf(AbortSignal)
      expect(result.aborted).toBe(false)
    })

    it('should filter out null signals', () => {
      const controller = new AbortController()
      const result = createCompositeAbortSignal(null, controller.signal, null)
      expect(result).toBe(controller.signal)
    })

    it('should filter out undefined signals', () => {
      const controller = new AbortController()
      const result = createCompositeAbortSignal(
        undefined,
        controller.signal,
        undefined,
      )
      expect(result).toBe(controller.signal)
    })

    it('should filter out all null and undefined signals', () => {
      const result = createCompositeAbortSignal(null, undefined, null)
      expect(result).toBeInstanceOf(AbortSignal)
      expect(result.aborted).toBe(false)
    })

    it('should create composite signal from multiple signals', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const result = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )
      expect(result).toBeInstanceOf(AbortSignal)
      expect(result.aborted).toBe(false)
    })

    it('should abort when first signal aborts', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )

      expect(composite.aborted).toBe(false)
      controller1.abort()
      expect(composite.aborted).toBe(true)
    })

    it('should abort when second signal aborts', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )

      expect(composite.aborted).toBe(false)
      controller2.abort()
      expect(composite.aborted).toBe(true)
    })

    it('should abort when any signal aborts in multiple signals', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const controller3 = new AbortController()
      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
        controller3.signal,
      )

      expect(composite.aborted).toBe(false)
      controller2.abort()
      expect(composite.aborted).toBe(true)
    })

    it('should return aborted signal when any input signal is already aborted', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      controller1.abort()

      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )
      expect(composite.aborted).toBe(true)
    })

    it('should return aborted signal when first signal is already aborted', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      controller1.abort()

      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )
      expect(composite.aborted).toBe(true)
    })

    it('should return aborted signal when last signal is already aborted', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      controller2.abort()

      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )
      expect(composite.aborted).toBe(true)
    })

    it('should handle mix of null, undefined, and valid signals', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const result = createCompositeAbortSignal(
        null,
        controller1.signal,
        undefined,
        controller2.signal,
        null,
      )
      expect(result).toBeInstanceOf(AbortSignal)
      expect(result.aborted).toBe(false)
    })

    it('should trigger abort event listeners', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )

      let abortCalled = false
      composite.addEventListener('abort', () => {
        abortCalled = true
      })

      controller1.abort()
      // Give event loop a tick
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(abortCalled).toBe(true)
    })

    it('should only abort once when multiple signals abort', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )

      let abortCount = 0
      composite.addEventListener('abort', () => {
        abortCount++
      })

      controller1.abort()
      await new Promise(resolve => setTimeout(resolve, 0))
      controller2.abort()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(abortCount).toBe(1)
    })

    it('should handle many signals', () => {
      const controllers = Array.from(
        { length: 10 },
        () => new AbortController(),
      )
      const signals = controllers.map(c => c.signal)
      const composite = createCompositeAbortSignal(...signals)

      expect(composite.aborted).toBe(false)
      controllers[5]?.abort()
      expect(composite.aborted).toBe(true)
    })
  })

  describe('createTimeoutSignal', () => {
    it('should create signal that aborts after timeout', async () => {
      const signal = createTimeoutSignal(10)
      expect(signal.aborted).toBe(false)

      await new Promise(resolve => setTimeout(resolve, 20))
      expect(signal.aborted).toBe(true)
    })

    it('should throw TypeError for non-number timeout', () => {
      expect(() => createTimeoutSignal('100' as any)).toThrow(TypeError)
      expect(() => createTimeoutSignal('100' as any)).toThrow(
        'timeout must be a number',
      )
    })

    it('should throw TypeError for NaN timeout', () => {
      expect(() => createTimeoutSignal(Number.NaN)).toThrow(TypeError)
      expect(() => createTimeoutSignal(Number.NaN)).toThrow(
        'timeout must be a number',
      )
    })

    it('should throw TypeError for infinite timeout', () => {
      expect(() => createTimeoutSignal(Number.POSITIVE_INFINITY)).toThrow(
        TypeError,
      )
      expect(() => createTimeoutSignal(Number.POSITIVE_INFINITY)).toThrow(
        'timeout must be a finite number',
      )
    })

    it('should throw TypeError for negative infinite timeout', () => {
      expect(() => createTimeoutSignal(Number.NEGATIVE_INFINITY)).toThrow(
        TypeError,
      )
      expect(() => createTimeoutSignal(Number.NEGATIVE_INFINITY)).toThrow(
        'timeout must be a finite number',
      )
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

    it('should accept minimum positive timeout', () => {
      const signal = createTimeoutSignal(1)
      expect(signal).toBeInstanceOf(AbortSignal)
    })

    it('should accept large timeout values', () => {
      const signal = createTimeoutSignal(100_000)
      expect(signal).toBeInstanceOf(AbortSignal)
      expect(signal.aborted).toBe(false)
    })

    it('should trigger abort event on timeout', async () => {
      const signal = createTimeoutSignal(10)
      let abortCalled = false

      signal.addEventListener('abort', () => {
        abortCalled = true
      })

      await new Promise(resolve => setTimeout(resolve, 20))
      expect(abortCalled).toBe(true)
    })

    it('should return different signals for multiple calls', () => {
      const signal1 = createTimeoutSignal(100)
      const signal2 = createTimeoutSignal(100)
      expect(signal1).not.toBe(signal2)
    })

    it('should work with decimal timeouts', async () => {
      const signal = createTimeoutSignal(10.5)
      expect(signal.aborted).toBe(false)

      await new Promise(resolve => setTimeout(resolve, 20))
      expect(signal.aborted).toBe(true)
    })

    it('should throw TypeError for undefined', () => {
      expect(() => createTimeoutSignal(undefined as any)).toThrow(TypeError)
    })

    it('should throw TypeError for null', () => {
      expect(() => createTimeoutSignal(null as any)).toThrow(TypeError)
    })

    it('should throw TypeError for object', () => {
      expect(() => createTimeoutSignal({} as any)).toThrow(TypeError)
    })

    it('should throw TypeError for array', () => {
      expect(() => createTimeoutSignal([] as any)).toThrow(TypeError)
    })

    it('should throw TypeError for boolean', () => {
      expect(() => createTimeoutSignal(true as any)).toThrow(TypeError)
    })
  })

  describe('integration scenarios', () => {
    it('should combine timeout signal with manual signal', async () => {
      const controller = new AbortController()
      const timeout = createTimeoutSignal(50)
      const composite = createCompositeAbortSignal(controller.signal, timeout)

      expect(composite.aborted).toBe(false)

      // Manual abort should trigger composite immediately
      controller.abort()
      expect(composite.aborted).toBe(true)
    })

    it('should abort via timeout when manual signal not aborted', async () => {
      const controller = new AbortController()
      const timeout = createTimeoutSignal(10)
      const composite = createCompositeAbortSignal(controller.signal, timeout)

      expect(composite.aborted).toBe(false)

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(composite.aborted).toBe(true)
    })

    it('should handle multiple timeout signals', async () => {
      const timeout1 = createTimeoutSignal(50)
      const timeout2 = createTimeoutSignal(10)
      const composite = createCompositeAbortSignal(timeout1, timeout2)

      expect(composite.aborted).toBe(false)

      // Shorter timeout should trigger first
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(composite.aborted).toBe(true)
    })

    it('should work with composite signals as inputs', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const composite1 = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )

      const controller3 = new AbortController()
      const composite2 = createCompositeAbortSignal(
        composite1,
        controller3.signal,
      )

      expect(composite2.aborted).toBe(false)
      controller1.abort()
      expect(composite1.aborted).toBe(true)
      expect(composite2.aborted).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle signal that is aborted immediately', () => {
      const controller = new AbortController()
      controller.abort()
      const composite = createCompositeAbortSignal(controller.signal)
      expect(composite.aborted).toBe(true)
    })

    it('should handle empty array of signals', () => {
      const result = createCompositeAbortSignal(...[])
      expect(result).toBeInstanceOf(AbortSignal)
      expect(result.aborted).toBe(false)
    })

    it('should handle very short timeout', async () => {
      const signal = createTimeoutSignal(1)
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(signal.aborted).toBe(true)
    })

    it('should handle fractional milliseconds', () => {
      const signal = createTimeoutSignal(0.5)
      expect(signal).toBeInstanceOf(AbortSignal)
    })

    it('should not interfere with original signals after composite creation', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const composite = createCompositeAbortSignal(
        controller1.signal,
        controller2.signal,
      )

      // Original signals should remain independent
      expect(controller1.signal.aborted).toBe(false)
      expect(controller2.signal.aborted).toBe(false)

      // Aborting composite should not affect originals
      controller1.abort()
      expect(composite.aborted).toBe(true)
      expect(controller2.signal.aborted).toBe(false)
    })
  })
})
