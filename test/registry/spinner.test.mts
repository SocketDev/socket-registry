import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  Spinner,
  ciSpinner,
  getCliSpinners,
  spinner,
} from '../../registry/dist/lib/spinner.js'

describe('spinner module', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ciSpinner', () => {
    it('should have frames property', () => {
      expect(ciSpinner.frames).toBeDefined()
      expect(Array.isArray(ciSpinner.frames)).toBe(true)
    })

    it('should have empty frame for CI', () => {
      expect(ciSpinner.frames).toEqual([''])
    })

    it('should have large interval for CI', () => {
      expect(ciSpinner.interval).toBe(2147483647)
    })
  })

  describe('getCliSpinners', () => {
    it('should return all spinners when called without argument', () => {
      const spinners = getCliSpinners()
      expect(typeof spinners).toBe('object')
      expect(spinners).not.toBeNull()
    })

    it('should return specific spinner by name', () => {
      const dots = getCliSpinners('dots')
      if (dots && typeof dots === 'object' && 'frames' in dots) {
        expect(Array.isArray(dots.frames)).toBe(true)
      } else {
        expect(dots).toBeUndefined()
      }
    })

    it('should return undefined for invalid spinner name', () => {
      const invalid = getCliSpinners('nonexistent-spinner-name')
      expect(invalid).toBeUndefined()
    })

    it('should cache spinners on subsequent calls', () => {
      const first = getCliSpinners()
      const second = getCliSpinners()
      expect(first).toBe(second)
    })
  })

  describe('Spinner', () => {
    let testSpinner: any

    beforeEach(() => {
      testSpinner = Spinner()
    })

    afterEach(() => {
      try {
        if (testSpinner && testSpinner.isSpinning) {
          testSpinner.stop()
        }
      } catch {}
    })

    describe('constructor', () => {
      it('should create spinner with default options', () => {
        const s = Spinner()
        expect(s).toBeDefined()
        expect(typeof s.start).toBe('function')
        expect(typeof s.stop).toBe('function')
      })

      it('should create spinner with custom options', () => {
        const s = Spinner({
          text: 'Loading...',
          color: 'blue',
        })
        expect(s).toBeDefined()
      })

      it('should accept spinner style option', () => {
        const s = Spinner({
          spinner: ciSpinner,
        })
        expect(s).toBeDefined()
        if (s.isSpinning) {
          s.stop()
        }
      })
    })

    describe('start and stop', () => {
      it('should have start and stop methods', () => {
        expect(typeof testSpinner.start).toBe('function')
        expect(typeof testSpinner.stop).toBe('function')
      })

      it('should have isSpinning property', () => {
        expect(typeof testSpinner.isSpinning).toBe('boolean')
      })
    })

    describe('setText and getText', () => {
      it('should set text', () => {
        testSpinner.setText('New text')
        expect(testSpinner.getText()).toBe('New text')
      })

      it('should trim leading whitespace from text', () => {
        testSpinner.setText('  \t Text')
        expect(testSpinner.getText()).toBe('Text')
      })

      it('should handle non-string values', () => {
        testSpinner.setText(null)
        expect(testSpinner.getText()).toBe('')
      })

      it('should return this for chaining', () => {
        const result = testSpinner.setText('test')
        expect(result).toBe(testSpinner)
      })
    })

    describe('methods', () => {
      it('should have success methods', () => {
        expect(typeof testSpinner.success).toBe('function')
        expect(typeof testSpinner.successAndStop).toBe('function')
      })

      it('should call success method with text', () => {
        const result = testSpinner.success('Success message')
        expect(result).toBe(testSpinner)
      })

      it('should call successAndStop method with text', () => {
        testSpinner.start()
        const result = testSpinner.successAndStop('Done successfully')
        expect(result).toBe(testSpinner)
      })

      it('should call success methods with extras', () => {
        testSpinner.success('Success', 'extra1', 'extra2')
        testSpinner.successAndStop('Done', { data: 'test' })
      })

      it('should have fail/error methods', () => {
        expect(typeof testSpinner.fail).toBe('function')
        expect(typeof testSpinner.failAndStop).toBe('function')
        expect(typeof testSpinner.error).toBe('function')
        expect(typeof testSpinner.errorAndStop).toBe('function')
      })

      it('should call fail method with text', () => {
        const result = testSpinner.fail('Failure message')
        expect(result).toBe(testSpinner)
      })

      it('should call failAndStop method with text', () => {
        testSpinner.start()
        const result = testSpinner.failAndStop('Failed to complete')
        expect(result).toBe(testSpinner)
      })

      it('should call fail methods with extras', () => {
        testSpinner.fail('Error', 'extra1', 'extra2')
        testSpinner.start()
        testSpinner.failAndStop('Failed', { error: 'test' })
      })

      it('should have warn methods', () => {
        expect(typeof testSpinner.warn).toBe('function')
        expect(typeof testSpinner.warnAndStop).toBe('function')
      })

      it('should call warn method with text', () => {
        const result = testSpinner.warn('Warning message')
        expect(result).toBe(testSpinner)
      })

      it('should call warnAndStop method with text', () => {
        testSpinner.start()
        const result = testSpinner.warnAndStop('Warning: check this')
        expect(result).toBe(testSpinner)
      })

      it('should call warn methods with extras', () => {
        testSpinner.warn('Warning', 'extra1')
        testSpinner.start()
        testSpinner.warnAndStop('Alert', { warning: 'test' })
      })

      it('should have info methods', () => {
        expect(typeof testSpinner.info).toBe('function')
        expect(typeof testSpinner.infoAndStop).toBe('function')
      })

      it('should call info method with text', () => {
        const result = testSpinner.info('Info message')
        expect(result).toBe(testSpinner)
      })

      it('should call infoAndStop method with text', () => {
        testSpinner.start()
        const result = testSpinner.infoAndStop('Information here')
        expect(result).toBe(testSpinner)
      })

      it('should call info methods with extras', () => {
        testSpinner.info('Info', 'detail1', 'detail2')
        testSpinner.start()
        testSpinner.infoAndStop('FYI', { data: 'info' })
      })

      it('should have log methods', () => {
        expect(typeof testSpinner.log).toBe('function')
        expect(typeof testSpinner.logAndStop).toBe('function')
      })

      it('should call log method with text', () => {
        const result = testSpinner.log('Log message')
        expect(result).toBe(testSpinner)
      })

      it('should call logAndStop method with text', () => {
        testSpinner.start()
        const result = testSpinner.logAndStop('Final log')
        expect(result).toBe(testSpinner)
      })

      it('should call log methods with extras', () => {
        testSpinner.log('Log', 'data1', 'data2')
        testSpinner.start()
        testSpinner.logAndStop('Done logging', { result: 'success' })
      })

      it('should have debug methods', () => {
        expect(typeof testSpinner.debug).toBe('function')
        expect(typeof testSpinner.debugAndStop).toBe('function')
      })

      it('should call debug method with text', () => {
        const result = testSpinner.debug('Debug message')
        expect(result).toBe(testSpinner)
      })

      it('should call debugAndStop method with text', () => {
        testSpinner.start()
        const result = testSpinner.debugAndStop('Debug info')
        expect(result).toBe(testSpinner)
      })

      it('should call debug methods with extras', () => {
        testSpinner.debug('Debug', 'value1', 'value2')
        testSpinner.start()
        testSpinner.debugAndStop('Debug done', { debug: 'data' })
      })

      it('should handle methods called with no arguments', () => {
        testSpinner.info()
        testSpinner.warn()
        testSpinner.success()
        testSpinner.fail()
      })

      it('should handle methods called with non-string first argument', () => {
        testSpinner.info(123, 'extra')
        testSpinner.warn({ obj: 'value' }, 'extra')
        testSpinner.success(null, 'extra')
      })
    })

    describe('indent operations', () => {
      it('should have indent method', () => {
        expect(typeof testSpinner.indent).toBe('function')
      })

      it('should have dedent method', () => {
        expect(typeof testSpinner.dedent).toBe('function')
      })

      it('should have resetIndent method', () => {
        expect(typeof testSpinner.resetIndent).toBe('function')
      })
    })

    describe('color property', () => {
      it('should have color property', () => {
        expect(testSpinner.color).toBeDefined()
      })

      it('should allow setting color', () => {
        const s = Spinner({ color: 'green' })
        expect(s.color).toBe('green')
        if (s.isSpinning) {
          s.stop()
        }
      })
    })

    describe('spinner property', () => {
      it('should have spinner style property', () => {
        expect(testSpinner.spinner).toBeDefined()
        expect(testSpinner.spinner.frames).toBeDefined()
      })
    })

    describe('chaining', () => {
      it('should have chainable methods', () => {
        expect(testSpinner.setText('test')).toBe(testSpinner)
      })
    })
  })

  describe('spinner instance', () => {
    it('should be a spinner instance', () => {
      expect(spinner).toBeDefined()
      expect(typeof spinner.start).toBe('function')
    })

    it('should have isSpinning property', () => {
      expect(typeof spinner.isSpinning).toBe('boolean')
    })
  })

  describe('CI environment', () => {
    it('should use ciSpinner in CI environment', () => {
      const originalCI = process.env['CI']
      try {
        process.env['CI'] = 'true'
        const s = Spinner()
        expect(s).toBeDefined()
      } finally {
        if (originalCI === undefined) {
          delete process.env['CI']
        } else {
          process.env['CI'] = originalCI
        }
      }
    })
  })
})
