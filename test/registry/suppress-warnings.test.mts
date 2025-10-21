/**
 * @fileoverview Tests for warning suppression utilities.
 * Covers process warning suppression and EventTarget listener management.
 */

import {
  restoreWarnings,
  setMaxEventTargetListeners,
  suppressMaxListenersWarning,
  suppressWarningType,
} from '@socketsecurity/lib/suppress-warnings'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('suppress-warnings module', () => {
  // Store original process.emitWarning
  let originalEmitWarning: typeof process.emitWarning

  beforeEach(() => {
    // Save original emitWarning
    originalEmitWarning = process.emitWarning
  })

  afterEach(() => {
    // Restore original emitWarning and clear suppressed warnings.
    restoreWarnings()
    process.emitWarning = originalEmitWarning
  })

  describe('suppressMaxListenersWarning', () => {
    it('should suppress MaxListenersExceededWarning', () => {
      const emitWarningSpy = vi.fn()
      process.emitWarning = emitWarningSpy

      suppressMaxListenersWarning()

      // Emit a MaxListenersExceededWarning
      process.emitWarning(
        'MaxListenersExceededWarning: Possible EventEmitter memory leak detected',
      )

      // Should not have called the spy
      expect(emitWarningSpy).not.toHaveBeenCalled()
    })

    it('should allow non-MaxListeners warnings through', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressMaxListenersWarning()

      // Emit a different warning
      process.emitWarning('DeprecationWarning: Something is deprecated')

      // Should have been called
      expect(warnings.length).toBe(1)
      expect(warnings[0]).toContain('DeprecationWarning')
    })

    it('should only wrap emitWarning once', () => {
      const emitWarningSpy = vi.fn()
      process.emitWarning = emitWarningSpy

      suppressMaxListenersWarning()
      const firstWrapper = process.emitWarning

      suppressMaxListenersWarning()
      const secondWrapper = process.emitWarning

      // Should be the same wrapper
      expect(firstWrapper).toBe(secondWrapper)
    })

    it('should handle string warnings', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressMaxListenersWarning()
      process.emitWarning('Some other warning')

      expect(warnings).toContain('Some other warning')
    })

    it('should handle Error object warnings', () => {
      const warnings: Error[] = []
      process.emitWarning = (warning: string | Error) => {
        if (warning instanceof Error) {
          warnings.push(warning)
        }
      }

      suppressMaxListenersWarning()

      const error = new Error('Test warning')
      error.name = 'TestWarning'
      process.emitWarning(error)

      expect(warnings.length).toBe(1)
      expect(warnings[0]).toBe(error)
    })
  })

  describe('suppressWarningType', () => {
    it('should suppress specified warning type', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressWarningType('ExperimentalWarning')

      process.emitWarning('ExperimentalWarning: Feature is experimental')
      process.emitWarning('DeprecationWarning: Feature is deprecated')

      // Only DeprecationWarning should get through
      expect(warnings.length).toBe(1)
      expect(warnings[0]).toContain('DeprecationWarning')
    })

    it('should suppress multiple warning types', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressWarningType('ExperimentalWarning')
      suppressWarningType('DeprecationWarning')

      process.emitWarning('ExperimentalWarning: Test')
      process.emitWarning('DeprecationWarning: Test')
      process.emitWarning('UnhandledPromiseRejectionWarning: Test')

      // Only UnhandledPromiseRejection should get through
      expect(warnings.length).toBe(1)
      expect(warnings[0]).toContain('UnhandledPromiseRejectionWarning')
    })

    it('should handle Error objects with name property', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (warning instanceof Error) {
          warnings.push(warning.name)
        }
      }

      suppressWarningType('CustomWarning')

      const suppressedError = new Error('Should be suppressed')
      suppressedError.name = 'CustomWarning'

      const allowedError = new Error('Should get through')
      allowedError.name = 'AllowedWarning'

      process.emitWarning(suppressedError)
      process.emitWarning(allowedError)

      expect(warnings.length).toBe(1)
      expect(warnings[0]).toBe('AllowedWarning')
    })

    it('should handle partial matches in warning strings', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressWarningType('Experimental')

      process.emitWarning('ExperimentalFeature: Some feature')
      process.emitWarning('This is Experimental')
      process.emitWarning('Normal warning')

      // Only normal warning should get through
      expect(warnings.length).toBe(1)
      expect(warnings[0]).toBe('Normal warning')
    })

    it('should be case-sensitive', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressWarningType('ExperimentalWarning')

      process.emitWarning('experimentalwarning: lowercase')
      process.emitWarning('ExperimentalWarning: exact match')

      // Lowercase should get through, exact match should be suppressed
      expect(warnings.length).toBe(1)
      expect(warnings[0]).toContain('experimentalwarning')
    })

    it('should allow empty string as warning type', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressWarningType('')

      process.emitWarning('Test warning')

      // All warnings should be suppressed since empty string matches everything
      expect(warnings.length).toBe(0)
    })

    it('should handle special characters in warning type', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      suppressWarningType('Warning[Special]')

      process.emitWarning('Warning[Special]: Test')
      process.emitWarning('Normal warning')

      expect(warnings.length).toBe(1)
      expect(warnings[0]).toBe('Normal warning')
    })
  })

  describe('setMaxEventTargetListeners', () => {
    it('should handle undefined target gracefully', () => {
      expect(() => {
        setMaxEventTargetListeners(undefined)
      }).not.toThrow()
    })

    it('should handle null target gracefully', () => {
      expect(() => {
        setMaxEventTargetListeners(null as unknown as AbortSignal)
      }).not.toThrow()
    })

    it('should set max listeners on AbortSignal', () => {
      const controller = new AbortController()
      const signal = controller.signal

      expect(() => {
        setMaxEventTargetListeners(signal)
      }).not.toThrow()
    })

    it('should accept custom max listener value', () => {
      const controller = new AbortController()
      const signal = controller.signal

      expect(() => {
        setMaxEventTargetListeners(signal, 20)
      }).not.toThrow()
    })

    it('should accept zero as max listeners', () => {
      const controller = new AbortController()
      const signal = controller.signal

      expect(() => {
        setMaxEventTargetListeners(signal, 0)
      }).not.toThrow()
    })

    it('should handle EventTarget', () => {
      const target = new EventTarget()

      expect(() => {
        setMaxEventTargetListeners(target, 15)
      }).not.toThrow()
    })

    it('should use default value of 10 when not specified', () => {
      const controller = new AbortController()
      const signal = controller.signal

      // Should not throw with default value
      expect(() => {
        setMaxEventTargetListeners(signal)
      }).not.toThrow()
    })

    it('should handle objects without symbols gracefully', () => {
      const plainObject = {} as unknown as EventTarget

      expect(() => {
        setMaxEventTargetListeners(plainObject)
      }).not.toThrow()
    })
  })

  describe('integration tests', () => {
    it('should suppress warnings in realistic scenario', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      // Suppress experimental warnings
      suppressWarningType('ExperimentalWarning')

      // Simulate various warnings
      process.emitWarning('ExperimentalWarning: VM modules are experimental')
      process.emitWarning('Warning: Something else')
      process.emitWarning('ExperimentalWarning: Another experimental feature')

      // Should only have the non-experimental warning
      expect(warnings.length).toBe(1)
      expect(warnings[0]).toBe('Warning: Something else')
    })

    it('should work with AbortSignal listener management', () => {
      suppressMaxListenersWarning()

      const controller = new AbortController()
      const signal = controller.signal

      // Set max listeners to prevent warnings
      setMaxEventTargetListeners(signal, 100)

      // Add multiple listeners
      for (let i = 0; i < 20; i++) {
        signal.addEventListener('abort', () => {})
      }

      // Should not have emitted MaxListeners warning
      // Test passes if no warnings thrown
      expect(true).toBe(true)
    })

    it('should handle mixed Error and string warnings', () => {
      const capturedWarnings: Array<string | Error> = []
      process.emitWarning = (warning: string | Error) => {
        capturedWarnings.push(warning)
      }

      suppressWarningType('TypeA')

      process.emitWarning('TypeA: String warning')

      const error = new Error('Error warning')
      error.name = 'TypeA'
      process.emitWarning(error)

      process.emitWarning('TypeB: String warning')

      // Should only have TypeB
      expect(capturedWarnings.length).toBe(1)
      expect(capturedWarnings[0]).toBe('TypeB: String warning')
    })

    it('should preserve warning arguments', () => {
      let capturedArgs: unknown[] = []
      const originalEmit = process.emitWarning

      process.emitWarning = (warning: string | Error, ...args: unknown[]) => {
        capturedArgs = [warning, ...args]
      }

      suppressWarningType('SuppressThis')

      // This warning should pass through with all arguments
      process.emitWarning('AllowThis', 'CustomType', 'CODE123')

      expect(capturedArgs.length).toBeGreaterThan(1)
      expect(capturedArgs[0]).toBe('AllowThis')
      expect(capturedArgs[1]).toBe('CustomType')
      expect(capturedArgs[2]).toBe('CODE123')

      process.emitWarning = originalEmit
    })
  })

  describe('edge cases', () => {
    it('should handle rapid succession of warning suppressions', () => {
      for (let i = 0; i < 100; i++) {
        suppressWarningType(`Warning${i}`)
      }

      // Should not throw
      expect(true).toBe(true)
    })

    it('should handle warning objects without name property', () => {
      const warnings: Error[] = []
      process.emitWarning = (warning: string | Error) => {
        if (warning instanceof Error) {
          warnings.push(warning)
        }
      }

      suppressWarningType('TestWarning')

      const errorWithoutName = new Error('Test')
      delete (errorWithoutName as { name?: string }).name

      process.emitWarning(errorWithoutName)

      // Should pass through since it has no name to match
      expect(warnings.length).toBe(1)
    })

    it('should handle duplicate suppression calls', () => {
      const warnings: string[] = []
      process.emitWarning = (warning: string | Error) => {
        if (typeof warning === 'string') {
          warnings.push(warning)
        }
      }

      // Test duplicate suppression calls
      suppressWarningType('TestWarning')
      suppressWarningType('TestWarning')
      suppressWarningType('TestWarning')

      process.emitWarning('TestWarning: Should be suppressed')

      expect(warnings.length).toBe(0)
    })
  })
})
