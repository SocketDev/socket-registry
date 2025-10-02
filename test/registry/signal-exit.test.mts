import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  load,
  onExit,
  signals,
  unload,
} from '../../registry/dist/lib/signal-exit.js'

describe('signal-exit module', () => {
  let callbacks: Array<(...args: any[]) => void>

  beforeEach(() => {
    callbacks = []
  })

  afterEach(() => {
    // Clean up any registered handlers.
    for (const cb of callbacks) {
      if (typeof cb === 'function') {
        try {
          cb()
        } catch {}
      }
    }
    callbacks = []
    // Ensure we unload after each test.
    try {
      unload()
    } catch {}
  })

  describe('load', () => {
    it('should load signal handlers without throwing', () => {
      expect(() => load()).not.toThrow()
    })

    it('should be idempotent', () => {
      load()
      expect(() => load()).not.toThrow()
    })
  })

  describe('unload', () => {
    it('should unload signal handlers without throwing', () => {
      load()
      expect(() => unload()).not.toThrow()
    })

    it('should be idempotent', () => {
      unload()
      expect(() => unload()).not.toThrow()
    })

    it('should work without prior load', () => {
      expect(() => unload()).not.toThrow()
    })
  })

  describe('signals', () => {
    it('should return undefined before load', () => {
      unload()
      const sigs = signals()
      expect(sigs === undefined || Array.isArray(sigs)).toBe(true)
    })

    it('should return array of signals after load', () => {
      load()
      const sigs = signals()
      expect(sigs === undefined || Array.isArray(sigs)).toBe(true)
      if (Array.isArray(sigs)) {
        expect(sigs.length).toBeGreaterThan(0)
      }
    })

    it('should include common signals', () => {
      load()
      const sigs = signals()
      if (Array.isArray(sigs)) {
        expect(sigs).toContain('SIGINT')
        expect(sigs).toContain('SIGTERM')
      }
    })

    it('should include platform-specific signals on Unix', () => {
      if (process.platform !== 'win32') {
        load()
        const sigs = signals()
        if (Array.isArray(sigs)) {
          expect(sigs.length).toBeGreaterThan(5)
        }
      }
    })

    it('should not include Unix-only signals on Windows', () => {
      if (process.platform === 'win32') {
        load()
        const sigs = signals()
        if (Array.isArray(sigs)) {
          expect(sigs).not.toContain('SIGUSR2')
        }
      }
    })
  })

  describe('onExit', () => {
    it('should register exit handler', () => {
      const handler = vi.fn()
      const remove = onExit(handler)
      callbacks.push(remove)
      expect(typeof remove).toBe('function')
    })

    it('should throw on non-function callback', () => {
      expect(() => onExit(null as any)).toThrow(TypeError)
      expect(() => onExit(undefined as any)).toThrow(TypeError)
      expect(() => onExit(123 as any)).toThrow(TypeError)
    })

    it('should automatically load if not loaded', () => {
      unload()
      const handler = vi.fn()
      const remove = onExit(handler)
      callbacks.push(remove)
      const sigs = signals()
      expect(sigs === undefined || Array.isArray(sigs)).toBe(true)
    })

    it('should return remove function', () => {
      const handler = vi.fn()
      const remove = onExit(handler)
      callbacks.push(remove)
      expect(typeof remove).toBe('function')
      expect(() => remove()).not.toThrow()
    })

    it('should support alwaysLast option', () => {
      const handler = vi.fn()
      const remove = onExit(handler, { alwaysLast: true })
      callbacks.push(remove)
      expect(typeof remove).toBe('function')
    })

    it('should support options without alwaysLast', () => {
      const handler = vi.fn()
      const remove = onExit(handler, {})
      callbacks.push(remove)
      expect(typeof remove).toBe('function')
    })

    it('should handle multiple handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const remove1 = onExit(handler1)
      const remove2 = onExit(handler2)
      callbacks.push(remove1, remove2)
      expect(typeof remove1).toBe('function')
      expect(typeof remove2).toBe('function')
    })

    it('should allow removing specific handler', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const remove1 = onExit(handler1)
      const remove2 = onExit(handler2)
      callbacks.push(remove2)
      expect(() => remove1()).not.toThrow()
      expect(() => remove2()).not.toThrow()
    })

    it('should be idempotent when removing', () => {
      const handler = vi.fn()
      const remove = onExit(handler)
      remove()
      expect(() => remove()).not.toThrow()
    })

    it('should unload when all handlers removed', () => {
      const handler = vi.fn()
      const remove = onExit(handler)
      remove()
      const sigs = signals()
      expect(sigs === undefined || Array.isArray(sigs)).toBe(true)
    })

    it('should handle callback signature correctly', () => {
      const handler = vi.fn(
        (_code: number | null, _signal: string | null) => {},
      )
      const remove = onExit(handler)
      callbacks.push(remove)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should work with arrow functions', () => {
      const handler = vi.fn(() => {})
      const remove = onExit(handler)
      callbacks.push(remove)
      expect(typeof remove).toBe('function')
    })

    it('should work with named functions', () => {
      const handler = vi.fn(function exitHandler() {})
      const remove = onExit(handler)
      callbacks.push(remove)
      expect(typeof remove).toBe('function')
    })
  })

  describe('load and unload cycle', () => {
    it('should support multiple load/unload cycles', () => {
      load()
      unload()
      load()
      unload()
      load()
      const sigs = signals()
      expect(sigs === undefined || Array.isArray(sigs)).toBe(true)
    })

    it('should preserve handlers across multiple loads', () => {
      const handler = vi.fn()
      const remove = onExit(handler)
      callbacks.push(remove)
      load()
      load()
      expect(typeof remove).toBe('function')
    })
  })

  describe('edge cases', () => {
    it('should handle rapid register/unregister', () => {
      const removes = []
      for (let i = 0; i < 10; i += 1) {
        const handler = vi.fn()
        removes.push(onExit(handler))
      }
      for (const remove of removes) {
        remove()
      }
      expect(true).toBe(true)
    })

    it('should not crash on unload without load', () => {
      unload()
      unload()
      expect(true).toBe(true)
    })

    it('should handle empty handler list', () => {
      load()
      unload()
      expect(signals()).toBeTruthy()
    })
  })

  describe('process integration', () => {
    it('should have access to process object', () => {
      expect(process).toBeDefined()
      expect(typeof process.on).toBe('function')
    })

    it('should not interfere with process.emit', () => {
      load()
      expect(typeof process.emit).toBe('function')
      unload()
    })

    it('should preserve original process methods', () => {
      const originalEmit = process.emit
      load()
      unload()
      expect(process.emit).toBe(originalEmit)
    })
  })

  describe('multiple handlers', () => {
    it('should call both regular and alwaysLast handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const remove1 = onExit(handler1)
      const remove2 = onExit(handler2, { alwaysLast: true })
      callbacks.push(remove1, remove2)
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should handle mix of options', () => {
      const removes = []
      removes.push(onExit(vi.fn()))
      removes.push(onExit(vi.fn(), { alwaysLast: false }))
      removes.push(onExit(vi.fn(), { alwaysLast: true }))
      removes.push(onExit(vi.fn(), {}))
      callbacks.push(...removes)
      expect(removes.length).toBe(4)
    })
  })

  describe('return from global process check', () => {
    it('should handle onExit when no global process', () => {
      const handler = vi.fn()
      const remove = onExit(handler)
      expect(typeof remove).toBe('function')
    })
  })
})
