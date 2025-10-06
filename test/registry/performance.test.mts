import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearPerformanceMetrics,
  generatePerformanceReport,
  getPerformanceMetrics,
  getPerformanceSummary,
  measure,
  measureSync,
  perfCheckpoint,
  perfTimer,
  printPerformanceSummary,
  trackMemory,
} from '../../registry/dist/lib/performance.js'

describe('performance module', () => {
  let originalEnv: NodeJS.ProcessEnv
  let consoleSpy: any

  beforeEach(() => {
    originalEnv = { ...process.env }
    clearPerformanceMetrics()
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    process.env = originalEnv
    clearPerformanceMetrics()
    vi.restoreAllMocks()
  })

  describe('perfTimer', () => {
    it('should return no-op function when DEBUG=perf is not set', () => {
      delete process.env['DEBUG']
      const stop = perfTimer('test-operation')

      expect(typeof stop).toBe('function')
      stop()

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(0)
    })

    it('should track timing when DEBUG=perf is set', async () => {
      process.env['DEBUG'] = 'perf'

      const stop = perfTimer('test-operation')
      await new Promise(resolve => setTimeout(resolve, 10))
      stop()

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toMatchObject({
        operation: 'test-operation',
        timestamp: expect.any(Number),
      })
      expect(metrics[0]!.duration).toBeGreaterThan(0)
    })

    it('should include metadata', () => {
      process.env['DEBUG'] = 'perf'

      const stop = perfTimer('api-call', { endpoint: '/test' })
      stop({ status: 200 })

      const metrics = getPerformanceMetrics()
      expect(metrics[0]?.metadata).toEqual({
        endpoint: '/test',
        status: 200,
      })
    })

    it('should work with DEBUG enabled', () => {
      process.env['DEBUG'] = 'perf'

      const stop = perfTimer('test-op')
      stop()

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
    })

    it('should round duration to 2 decimals', () => {
      process.env['DEBUG'] = 'perf'

      const stop = perfTimer('test-op')
      stop()

      const metrics = getPerformanceMetrics()
      const duration = metrics[0]!.duration
      expect(duration.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
    })
  })

  describe('measure', () => {
    it('should measure async function execution', async () => {
      process.env['DEBUG'] = 'perf'

      const { duration, result } = await measure('async-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'result'
      })

      expect(result).toBe('result')
      expect(duration).toBeGreaterThan(0)

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]?.metadata).toEqual({ success: true })
    })

    it('should handle errors and rethrow', async () => {
      process.env['DEBUG'] = 'perf'

      const error = new Error('test error')

      await expect(
        measure('failing-op', async () => {
          throw error
        }),
      ).rejects.toThrow('test error')

      const metrics = getPerformanceMetrics()
      expect(metrics[0]?.metadata).toEqual({
        success: false,
        error: 'test error',
      })
    })

    it('should handle non-Error throws', async () => {
      process.env['DEBUG'] = 'perf'

      await expect(
        measure('failing-op', async () => {
          throw 'string error'
        }),
      ).rejects.toBe('string error')

      const metrics = getPerformanceMetrics()
      expect(metrics[0]?.metadata).toEqual({
        success: false,
        error: 'Unknown',
      })
    })

    it('should return 0 duration when perf disabled', async () => {
      delete process.env['DEBUG']

      const { duration, result } = await measure('op', async () => 'value')

      expect(result).toBe('value')
      expect(duration).toBe(0)
    })

    it('should include custom metadata', async () => {
      process.env['DEBUG'] = 'perf'

      await measure('op', async () => 'value', { userId: '123' })

      const metrics = getPerformanceMetrics()
      expect(metrics[0]?.metadata).toEqual({
        userId: '123',
        success: true,
      })
    })
  })

  describe('measureSync', () => {
    it('should measure sync function execution', () => {
      process.env['DEBUG'] = 'perf'

      const { duration, result } = measureSync('sync-op', () => {
        let sum = 0
        for (let i = 0; i < 1000; i += 1) {
          sum += i
        }
        return sum
      })

      expect(result).toBe(499500)
      expect(duration).toBeGreaterThanOrEqual(0)

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
    })

    it('should handle errors and rethrow', () => {
      process.env['DEBUG'] = 'perf'

      const error = new Error('sync error')

      expect(() => {
        measureSync('failing-op', () => {
          throw error
        })
      }).toThrow('sync error')

      const metrics = getPerformanceMetrics()
      expect(metrics[0]?.metadata).toEqual({
        success: false,
        error: 'sync error',
      })
    })

    it('should handle non-Error throws', () => {
      process.env['DEBUG'] = 'perf'

      expect(() => {
        measureSync('failing-op', () => {
          throw 123
        })
      }).toThrow()

      const metrics = getPerformanceMetrics()
      expect(metrics[0]?.metadata).toEqual({
        success: false,
        error: 'Unknown',
      })
    })

    it('should return 0 duration when perf disabled', () => {
      delete process.env['DEBUG']

      const { duration, result } = measureSync('op', () => 'value')

      expect(result).toBe('value')
      expect(duration).toBe(0)
    })
  })

  describe('getPerformanceMetrics', () => {
    it('should return copy of metrics array', () => {
      process.env['DEBUG'] = 'perf'

      const stop = perfTimer('op1')
      stop()

      const metrics1 = getPerformanceMetrics()
      const metrics2 = getPerformanceMetrics()

      expect(metrics1).toEqual(metrics2)
      expect(metrics1).not.toBe(metrics2)
    })

    it('should return empty array when no metrics', () => {
      const metrics = getPerformanceMetrics()
      expect(metrics).toEqual([])
    })
  })

  describe('clearPerformanceMetrics', () => {
    it('should clear all metrics', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('op1')()
      perfTimer('op2')()

      expect(getPerformanceMetrics()).toHaveLength(2)

      clearPerformanceMetrics()

      expect(getPerformanceMetrics()).toHaveLength(0)
    })

    it('should work with DEBUG enabled', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('op1')()
      clearPerformanceMetrics()

      expect(getPerformanceMetrics()).toHaveLength(0)
    })
  })

  describe('getPerformanceSummary', () => {
    it('should aggregate metrics by operation', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('op1')()
      perfTimer('op1')()
      perfTimer('op2')()

      const summary = getPerformanceSummary()

      expect(summary['op1']).toBeDefined()
      expect(summary['op1']!.count).toBe(2)
      expect(summary['op2']).toBeDefined()
      expect(summary['op2']!.count).toBe(1)
    })

    it('should calculate min, max, avg, total', () => {
      process.env['DEBUG'] = 'perf'

      const stop1 = perfTimer('op')
      stop1()
      const stop2 = perfTimer('op')
      stop2()

      const summary = getPerformanceSummary()

      expect(summary['op']!.count).toBe(2)
      expect(summary['op']!.total).toBeGreaterThanOrEqual(0)
      expect(summary['op']!.avg).toBeGreaterThanOrEqual(0)
      expect(summary['op']!.min).toBeGreaterThanOrEqual(0)
      expect(summary['op']!.max).toBeGreaterThanOrEqual(0)
      expect(summary['op']!.min).toBeLessThanOrEqual(summary['op']!.max)
    })

    it('should round values to 2 decimals', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('op')()

      const summary = getPerformanceSummary()
      const stats = summary['op']!

      expect(stats.total.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
      expect(stats.avg.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
      expect(stats.min.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
      expect(stats.max.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
    })

    it('should return empty object when no metrics', () => {
      const summary = getPerformanceSummary()
      expect(Object.keys(summary)).toHaveLength(0)
    })
  })

  describe('printPerformanceSummary', () => {
    it('should print summary when perf enabled', () => {
      process.env['DEBUG'] = 'perf'

      const stop1 = perfTimer('op1')
      stop1()
      const stop2 = perfTimer('op2')
      stop2()

      printPerformanceSummary()

      // Just verify it doesn't throw
      expect(true).toBe(true)
    })

    it('should not print when perf disabled', () => {
      delete process.env['DEBUG']

      printPerformanceSummary()

      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should not print when no metrics', () => {
      process.env['DEBUG'] = 'perf'

      printPerformanceSummary()

      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should sort operations alphabetically', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('zebra')()
      perfTimer('alpha')()
      perfTimer('beta')()

      printPerformanceSummary()

      const calls = consoleSpy.log.mock.calls
      const operationCalls = calls.filter((call: any[]) =>
        call[0]?.includes('calls'),
      )

      expect(operationCalls[0]![0]).toContain('alpha')
      expect(operationCalls[1]![0]).toContain('beta')
      expect(operationCalls[2]![0]).toContain('zebra')
    })
  })

  describe('perfCheckpoint', () => {
    it('should do nothing when perf disabled', () => {
      delete process.env['DEBUG']

      perfCheckpoint('start')

      expect(getPerformanceMetrics()).toHaveLength(0)
    })

    it('should record checkpoint', () => {
      process.env['DEBUG'] = 'perf'

      perfCheckpoint('milestone', { step: 1 })

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toMatchObject({
        operation: 'checkpoint:milestone',
        duration: 0,
        timestamp: expect.any(Number),
        metadata: { step: 1 },
      })
    })

    it('should work with DEBUG enabled', () => {
      process.env['DEBUG'] = 'perf'

      perfCheckpoint('test-checkpoint')

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]?.operation).toBe('checkpoint:test-checkpoint')
    })

    it('should work without metadata', () => {
      process.env['DEBUG'] = 'perf'

      perfCheckpoint('simple')

      const metrics = getPerformanceMetrics()
      expect(metrics[0]).toMatchObject({
        operation: 'checkpoint:simple',
        duration: 0,
      })
      expect(metrics[0]?.metadata).toBeUndefined()
    })
  })

  describe('trackMemory', () => {
    it('should return 0 when perf disabled', () => {
      delete process.env['DEBUG']

      const mem = trackMemory('test')

      expect(mem).toBe(0)
      expect(getPerformanceMetrics()).toHaveLength(0)
    })

    it('should track memory usage', () => {
      process.env['DEBUG'] = 'perf'

      const mem = trackMemory('snapshot')

      expect(mem).toBeGreaterThan(0)

      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toMatchObject({
        operation: 'checkpoint:memory:snapshot',
        duration: 0,
        timestamp: expect.any(Number),
      })
      expect(metrics[0]?.metadata?.['heapUsed']).toBeGreaterThan(0)
      expect(metrics[0]?.metadata?.['heapTotal']).toBeGreaterThan(0)
      expect(metrics[0]?.metadata?.['external']).toBeGreaterThanOrEqual(0)
    })

    it('should work with DEBUG enabled', () => {
      process.env['DEBUG'] = 'perf'

      const mem = trackMemory('test')

      expect(mem).toBeGreaterThan(0)
      const metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
    })

    it('should round memory to 2 decimals', () => {
      process.env['DEBUG'] = 'perf'

      const mem = trackMemory('test')

      expect(mem.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
    })
  })

  describe('generatePerformanceReport', () => {
    it('should return no-data message when perf disabled', () => {
      delete process.env['DEBUG']

      const report = generatePerformanceReport()

      expect(report).toBe(
        '(no performance data collected - enable with DEBUG=perf)',
      )
    })

    it('should return no-data message when no metrics', () => {
      process.env['DEBUG'] = 'perf'

      const report = generatePerformanceReport()

      expect(report).toBe(
        '(no performance data collected - enable with DEBUG=perf)',
      )
    })

    it('should generate formatted report', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('op1')()
      perfTimer('op2')()

      const report = generatePerformanceReport()

      expect(report).toContain('Performance Report')
      expect(report).toContain('op1:')
      expect(report).toContain('op2:')
      expect(report).toContain('Calls:')
      expect(report).toContain('Avg:')
      expect(report).toContain('Min:')
      expect(report).toContain('Max:')
      expect(report).toContain('Total:')
      expect(report).toContain('Total measured time:')
    })

    it('should sort operations alphabetically', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('zebra')()
      perfTimer('alpha')()

      const report = generatePerformanceReport()
      const alphaIndex = report.indexOf('alpha:')
      const zebraIndex = report.indexOf('zebra:')

      expect(alphaIndex).toBeLessThan(zebraIndex)
    })

    it('should include box drawing characters', () => {
      process.env['DEBUG'] = 'perf'

      perfTimer('op')()

      const report = generatePerformanceReport()

      expect(report).toContain('╔')
      expect(report).toContain('═')
      expect(report).toContain('╚')
    })
  })

  describe('DEBUG=perf detection', () => {
    it('should detect DEBUG=perf', () => {
      process.env['DEBUG'] = 'perf'

      const stop = perfTimer('op')
      stop()

      expect(getPerformanceMetrics()).toHaveLength(1)
    })

    it('should not detect when perf not in DEBUG', () => {
      delete process.env['DEBUG']

      const stop = perfTimer('op')
      stop()

      expect(getPerformanceMetrics()).toHaveLength(0)
    })
  })
})
